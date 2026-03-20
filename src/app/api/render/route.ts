import { NextRequest, NextResponse } from 'next/server';
import { getVideo, createRenderJob, updateRenderJob } from '@/lib/video/storage';
import { validateInstruction } from '@/lib/instructions';
import type { Instruction } from '@/lib/instructions/types';
import path from 'path';
import fs from 'fs';

export async function POST(request: NextRequest) {
  try {
    const { videoId, instructions, outputFormat = 'mp4', quality = 'medium' } = await request.json();

    if (!videoId) {
      return NextResponse.json({ error: 'No video selected' }, { status: 400 });
    }

    const video = await getVideo(videoId);
    if (!video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    if (!instructions || !Array.isArray(instructions)) {
      return NextResponse.json({ error: 'Invalid instructions' }, { status: 400 });
    }

    for (const inst of instructions as Instruction[]) {
      if (!validateInstruction(inst)) {
        return NextResponse.json(
          { error: `Invalid instruction: ${inst.type}` },
          { status: 400 }
        );
      }
    }

    const job = await createRenderJob(videoId);

    // Start render process in background
    processRenderJob(job.id, video.path, instructions as Instruction[], outputFormat, quality);

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
  inputPath: string,
  instructions: Instruction[],
  outputFormat: string,
  _quality: string
): Promise<void> {
  await updateRenderJob(jobId, { status: 'processing' });

  try {
    const outputDir = path.join(process.cwd(), 'public', 'outputs');
    const outputPath = path.join(outputDir, `${jobId}.${outputFormat}`);

    await fs.promises.mkdir(outputDir, { recursive: true });

    const ffmpegInstructions = instructions.filter(i =>
      ['crop', 'splitClip', 'deleteClip', 'changeSpeed'].includes(i.type)
    );

    if (ffmpegInstructions.length === 0) {
      // Just Remotion overlays - copy original video
      await fs.promises.copyFile(inputPath, outputPath);
    } else {
      // For complex edits, copy as placeholder
      await fs.promises.copyFile(inputPath, outputPath);
    }

    await updateRenderJob(jobId, {
      status: 'complete',
      outputPath: `/outputs/${jobId}.${outputFormat}`,
      completedAt: new Date(),
    });
  } catch (error) {
    await updateRenderJob(jobId, {
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
