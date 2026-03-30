import { NextRequest, NextResponse } from 'next/server';
import { getVideo, createRenderJob, updateRenderJob } from '@/lib/video/storage';
import { renderVideo } from '@/lib/render/remotion-renderer';
import type { Overlay } from '@/lib/instructions/remotion';
import path from 'path';
import fs from 'fs';

export async function POST(request: NextRequest) {
  try {
    const {
      videoId,
      overlays,
      outputFormat = 'mp4',
      quality = 'medium',
    } = await request.json();

    if (!videoId) {
      return NextResponse.json({ error: 'No video selected' }, { status: 400 });
    }

    const video = await getVideo(videoId);
    if (!video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    if (!overlays || !Array.isArray(overlays)) {
      return NextResponse.json({ error: 'Invalid overlays' }, { status: 400 });
    }

    const job = await createRenderJob(videoId);

    // Start render process in background
    processRenderJob(
      job.id,
      video,
      overlays as Overlay[],
      outputFormat,
      quality as 'low' | 'medium' | 'high'
    );

    return NextResponse.json({
      jobId: job.id,
      status: 'pending',
      message: 'Render job started',
    });
  } catch (error) {
    console.error('Render error:', error);
    return NextResponse.json(
      { error: 'Failed to start render' },
      { status: 500 }
    );
  }
}

async function processRenderJob(
  jobId: string,
  video: { path: string; duration: number; width: number; height: number },
  overlays: Overlay[],
  outputFormat: string,
  quality: 'low' | 'medium' | 'high'
): Promise<void> {
  await updateRenderJob(jobId, { status: 'processing', progress: 0 });

  try {
    const outputDir = path.join(process.cwd(), 'public', 'outputs');
    const outputPath = path.join(outputDir, `${jobId}.${outputFormat}`);

    await fs.promises.mkdir(outputDir, { recursive: true });

    // Use sensible defaults if video metadata is missing
    const width = video.width || 1920;
    const height = video.height || 1080;
    const fps = 30;
    const duration = video.duration || 10;

    if (overlays.length === 0) {
      // No overlays — just copy the original video
      await fs.promises.copyFile(video.path, outputPath);
    } else {
      // Render with Remotion — overlays baked into the video
      await renderVideo({
        videoPath: video.path,
        overlays,
        outputPath,
        width,
        height,
        fps,
        durationInSeconds: duration,
        quality,
        onProgress: (progress) => {
          // Update job progress (fire-and-forget)
          updateRenderJob(jobId, { progress });
        },
      });
    }

    await updateRenderJob(jobId, {
      status: 'complete',
      progress: 1,
      outputPath: `/outputs/${jobId}.${outputFormat}`,
      completedAt: new Date(),
    });
  } catch (error) {
    console.error(`[Render] Job ${jobId} failed:`, error);
    await updateRenderJob(jobId, {
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
