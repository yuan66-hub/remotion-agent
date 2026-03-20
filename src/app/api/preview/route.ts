import { NextRequest, NextResponse } from 'next/server';
import { getVideo } from '@/lib/video/storage';
import { isSimpleEdit, validateInstruction } from '@/lib/instructions';
import type { Instruction } from '@/lib/instructions/types';

export async function POST(request: NextRequest) {
  try {
    const { videoId, instructions } = await request.json();

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

    for (const inst of instructions) {
      if (!validateInstruction(inst as Instruction)) {
        return NextResponse.json(
          { error: `Invalid instruction: ${inst.type}` },
          { status: 400 }
        );
      }
    }

    const canQuickPreview = isSimpleEdit(instructions as Instruction[]);

    return NextResponse.json({
      previewAvailable: true,
      quickPreview: canQuickPreview,
      instructionCount: instructions.length,
      estimatedTime: canQuickPreview ? '5-10 seconds' : '30-60 seconds',
    });
  } catch (error) {
    console.error('Preview error:', error);
    return NextResponse.json(
      { error: 'Failed to generate preview' },
      { status: 500 }
    );
  }
}
