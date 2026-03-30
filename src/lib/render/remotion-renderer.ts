import path from 'path';
import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import type { Overlay } from '@/lib/instructions/remotion';
import type { SerializedOverlay } from '@/remotion/VideoComposition';

// Bundle cache — avoids re-bundling on every render
let cachedBundlePath: string | null = null;

async function ensureBundle(): Promise<string> {
  if (cachedBundlePath) return cachedBundlePath;

  const entryPoint = path.resolve(process.cwd(), 'src/remotion/index.ts');

  cachedBundlePath = await bundle({
    entryPoint,
  });

  return cachedBundlePath;
}

/**
 * Invalidate the bundle cache (e.g. after code changes in development)
 */
export function invalidateBundleCache(): void {
  cachedBundlePath = null;
}

export interface RenderOptions {
  videoPath: string;
  overlays: Overlay[];
  outputPath: string;
  width: number;
  height: number;
  fps: number;
  durationInSeconds: number;
  quality: 'low' | 'medium' | 'high';
  onProgress?: (progress: number) => void;
}

const QUALITY_PRESETS = {
  low: { scale: 0.5, crf: 28 },
  medium: { scale: 0.75, crf: 23 },
  high: { scale: 1, crf: 18 },
} as const;

/**
 * Serialize overlays to plain JSON for Remotion inputProps.
 * Strips any non-serializable fields.
 */
function serializeOverlays(overlays: Overlay[]): SerializedOverlay[] {
  return overlays.map((overlay) => {
    // Create a shallow clone with only serializable properties
    const serialized = { ...overlay };
    return serialized as SerializedOverlay;
  });
}

/**
 * Convert a local file path inside `public/` to an HTTP URL
 * served by the running Next.js server.
 * e.g. "E:\data\remotion-agent\public\uploads\demo.mp4" → "http://localhost:3000/uploads/demo.mp4"
 */
function localPathToHttpUrl(filePath: string): string {
  const normalized = filePath.replace(/\\/g, '/');
  const publicDir = path.resolve(process.cwd(), 'public').replace(/\\/g, '/');
  const relativePath = normalized.startsWith(publicDir)
    ? normalized.slice(publicDir.length)
    : '/' + path.basename(normalized);
  const port = process.env.PORT || 3000;
  return `http://localhost:${port}${relativePath}`;
}

/**
 * Render a video with overlays baked in using Remotion.
 */
export async function renderVideo(options: RenderOptions): Promise<void> {
  const bundlePath = await ensureBundle();

  const durationInFrames = Math.ceil(options.durationInSeconds * options.fps);
  const settings = QUALITY_PRESETS[options.quality];

  // Scale dimensions and round to even integers (H.264 requires even dimensions)
  const scaledWidth = Math.round((options.width * settings.scale) / 2) * 2;
  const scaledHeight = Math.round((options.height * settings.scale) / 2) * 2;

  // Convert local file path to HTTP URL served by Next.js
  // OffthreadVideo requires http(s):// URLs — it downloads frames over HTTP
  const videoSrc = options.videoPath.startsWith('http')
    ? options.videoPath
    : localPathToHttpUrl(options.videoPath);

  const inputProps = {
    videoSrc,
    overlays: serializeOverlays(options.overlays),
    fps: options.fps,
    width: scaledWidth,
    height: scaledHeight,
    durationInFrames,
  };

  const composition = await selectComposition({
    serveUrl: bundlePath,
    id: 'VideoEditor',
    inputProps,
  });

  // Override composition dimensions/duration with scaled values
  composition.width = scaledWidth;
  composition.height = scaledHeight;
  composition.fps = options.fps;
  composition.durationInFrames = durationInFrames;

  await renderMedia({
    serveUrl: bundlePath,
    composition,
    codec: 'h264',
    outputLocation: options.outputPath,
    crf: settings.crf,
    onProgress: ({ progress }) => {
      options.onProgress?.(progress);
    },
  });
}
