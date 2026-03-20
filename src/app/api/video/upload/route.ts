import { NextRequest, NextResponse } from 'next/server';
import { saveVideo, updateVideoMetadata } from '@/lib/video/storage';
import { getVideoMetadata } from '@/lib/instructions/ffmpeg';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const validTypes = ['video/mp4', 'video/quicktime', 'video/webm'];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Supported: MP4, MOV, WebM' },
        { status: 400 }
      );
    }

    const id = `${Date.now()}_${file.name.replace(/\.[^/.]+$/, '')}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const video = await saveVideo(id, file.name, buffer);

    const metadata = await getVideoMetadata(video.path);
    await updateVideoMetadata(id, {
      duration: metadata.duration,
      width: metadata.width,
      height: metadata.height,
    });

    return NextResponse.json({
      id,
      url: video.url,
      duration: metadata.duration,
      width: metadata.width,
      height: metadata.height,
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload video' },
      { status: 500 }
    );
  }
}
