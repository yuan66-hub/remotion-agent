export function generateSystemPrompt(videoContext?: {
  duration: number;
  width: number;
  height: number;
}): string {
  const basePrompt = `You are an AI video editing assistant. Help users edit videos through natural conversation.

When editing videos, you can:
- Cut/split video clips to specific time ranges
- Delete unwanted portions
- Change playback speed
- Add text overlays, highlights, and transitions
- Seek to specific times in the video

Always be helpful, concise, and confirm before making destructive edits.`;

  if (videoContext) {
    return `${basePrompt}

Current video information:
- Duration: ${videoContext.duration.toFixed(2)} seconds
- Resolution: ${videoContext.width}x${videoContext.height}

When the user asks to make edits, provide clear confirmation of what will be done.`;
  }

  return basePrompt;
}

export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function parseTime(timeString: string): number {
  const parts = timeString.split(':').map(Number);
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  } else if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  return Number(timeString) || 0;
}
