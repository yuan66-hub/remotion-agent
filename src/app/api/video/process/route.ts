import { NextRequest, NextResponse } from 'next/server';
import { getVideo } from '@/lib/video/storage';
import { VideoProcessor } from '@/lib/video/processor';
import type { Instruction } from '@/lib/instructions/types';
import path from 'path';
import fs from 'fs';

export async function POST(request: NextRequest) {
  try {
    const { videoId, instruction } = await request.json();

    if (!videoId) {
      return NextResponse.json({ error: 'No video selected' }, { status: 400 });
    }

    if (!instruction || !instruction.type) {
      return NextResponse.json({ error: 'Invalid instruction' }, { status: 400 });
    }

    const video = await getVideo(videoId);
    if (!video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    console.log('[Process API] Video:', video)
    console.log('[Process API] Instruction:', instruction)

    // Check if file exists
    try {
      await fs.promises.access(video.path);
      console.log('[Process API] Video file exists:', video.path);
    } catch {
      console.error('[Process API] Video file NOT found:', video.path);
      return NextResponse.json({ error: 'Video file not found on disk' }, { status: 404 });
    }

    // Only process FFmpeg operations
    const ffmpegTypes = ['crop', 'splitClip', 'deleteClip', 'changeSpeed', 'changeVolume'];
    if (!ffmpegTypes.includes(instruction.type)) {
      return NextResponse.json(
        { error: `Unsupported operation type: ${instruction.type}` },
        { status: 400 }
      );
    }

    const outputDir = path.join(process.cwd(), 'public', 'outputs');
    await fs.promises.mkdir(outputDir, { recursive: true });

    const processor = await VideoProcessor.fromFile(video.path, outputDir);
    const outputPath = await processor.executeInstruction(instruction as Instruction);

    return NextResponse.json({
      success: true,
      outputPath: outputPath.replace(process.cwd(), '').replace(/\\/g, '/'),
      message: `Successfully processed video with ${instruction.type}`,
    });
  } catch (error) {
    console.error('Process error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process video' },
      { status: 500 }
    );
  }
}
