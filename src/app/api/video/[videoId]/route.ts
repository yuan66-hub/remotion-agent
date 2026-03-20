import { NextRequest, NextResponse } from 'next/server';
import { getVideo } from '@/lib/video/storage';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ videoId: string }> }
) {
  const { videoId } = await params;

  try {
    const video = await getVideo(videoId);

    if (!video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    return NextResponse.json(video);
  } catch (error) {
    console.error('Get video error:', error);
    return NextResponse.json(
      { error: 'Failed to get video' },
      { status: 500 }
    );
  }
}
