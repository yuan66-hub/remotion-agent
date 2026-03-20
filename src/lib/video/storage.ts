import fs from 'fs';
import path from 'path';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');
const OUTPUT_DIR = path.join(process.cwd(), 'public', 'outputs');

export interface StoredVideo {
  id: string;
  filename: string;
  path: string;
  url: string;
  duration: number;
  width: number;
  height: number;
  createdAt: Date;
}

export interface RenderJob {
  id: string;
  videoId: string;
  status: 'pending' | 'processing' | 'complete' | 'error';
  outputPath?: string;
  error?: string;
  createdAt: Date;
  completedAt?: Date;
}

const videos = new Map<string, StoredVideo>();
const renderJobs = new Map<string, RenderJob>();

export async function ensureDirectories(): Promise<void> {
  await fs.promises.mkdir(UPLOAD_DIR, { recursive: true });
  await fs.promises.mkdir(OUTPUT_DIR, { recursive: true });
}

export async function saveVideo(
  id: string,
  filename: string,
  buffer: Buffer
): Promise<StoredVideo> {
  await ensureDirectories();

  const ext = path.extname(filename);
  const filenameSafe = `${id}${ext}`;
  const filePath = path.join(UPLOAD_DIR, filenameSafe);

  await fs.promises.writeFile(filePath, buffer);

  const video: StoredVideo = {
    id,
    filename,
    path: filePath,
    url: `/uploads/${filenameSafe}`,
    duration: 0,
    width: 0,
    height: 0,
    createdAt: new Date(),
  };

  videos.set(id, video);
  return video;
}

export async function getVideo(id: string): Promise<StoredVideo | null> {
  return videos.get(id) || null;
}

export async function updateVideoMetadata(
  id: string,
  metadata: { duration: number; width: number; height: number }
): Promise<void> {
  const video = videos.get(id);
  if (video) {
    video.duration = metadata.duration;
    video.width = metadata.width;
    video.height = metadata.height;
    videos.set(id, video);
  }
}

export async function createRenderJob(videoId: string): Promise<RenderJob> {
  const job: RenderJob = {
    id: `render_${Date.now()}`,
    videoId,
    status: 'pending',
    createdAt: new Date(),
  };

  renderJobs.set(job.id, job);
  return job;
}

export async function getRenderJob(id: string): Promise<RenderJob | null> {
  return renderJobs.get(id) || null;
}

export async function updateRenderJob(
  id: string,
  updates: Partial<RenderJob>
): Promise<void> {
  const job = renderJobs.get(id);
  if (job) {
    renderJobs.set(id, { ...job, ...updates });
  }
}

export async function saveRenderedVideo(
  jobId: string,
  buffer: Buffer,
  format: string
): Promise<string> {
  await ensureDirectories();

  const filename = `${jobId}.${format}`;
  const outputPath = path.join(OUTPUT_DIR, filename);
  const publicPath = `/outputs/${filename}`;

  await fs.promises.writeFile(outputPath, buffer);

  await updateRenderJob(jobId, {
    status: 'complete',
    outputPath: publicPath,
    completedAt: new Date(),
  });

  return publicPath;
}

export { UPLOAD_DIR, OUTPUT_DIR };
