import { NextRequest, NextResponse } from 'next/server'
import { generateText } from 'ai'
import { createAlibaba } from '@ai-sdk/alibaba'
import { getVideo } from '@/lib/video/storage'

const alibaba = createAlibaba({
  apiKey: process.env.ALIBABA_API_KEY,
  baseURL: process.env.ALIBABA_BASE_URL
})

const SYSTEM_PROMPT = `You are an AI video editing assistant. Your role is to help users edit videos through natural conversation.

You have access to the following video editing operations:

**FFmpeg Operations:**
- crop: Cut a video clip to a specific time range (requires startTime, endTime)
- splitClip: Split video into separate clips (requires startTime, endTime)
- deleteClip: Delete a portion of the video (requires startTime, endTime)
- changeSpeed: Change playback speed of a clip (requires startTime, endTime, speed, where speed > 1 is faster, < 1 is slower)
  - CRITICAL: When user wants to change speed of the ENTIRE video (e.g., "将视频倍数提高到2倍", "加速整个视频", "2倍速播放"), you MUST set startTime=0 and endTime=THE_EXACT_DURATION_FROM_VIDEO_CONTEXT (e.g., 30.5). The video duration is provided in the videoContext as "Duration: XX.XX seconds". You MUST use this exact number as endTime.
- changeVolume: Adjust audio volume (requires startTime, endTime, volume where 0 = mute, 0.5 = 50%, 1 = 100%, 2 = 200%)
  - CRITICAL: When user wants to change volume of the ENTIRE video (e.g., "调整整个视频音量", "将音量调大"), you MUST set startTime=0 and endTime=THE_EXACT_DURATION_FROM_VIDEO_CONTEXT (e.g., 30.5). The video duration is provided in the videoContext as "Duration: XX.XX seconds". You MUST use this exact number as endTime.

**Remotion Operations (for overlays):**
- addText: Add text overlay (requires startTime, endTime, text, position{x,y})
- addHighlight: Add highlight effect (requires startTime, endTime, color)
- addTransition: Add transition effect (requires startTime, endTime, type)
  - Basic effects: fade, dissolve, slide
  - Combined effects: fade-blur, dissolve-zoom, slide-rotate
  - Enhanced effects: blur, zoom, rotate, scale
  - Optional params: direction (left/right/up/down), duration (seconds), easing (linear/ease-in/ease-out/ease-in-out), intensity (0-1)
- modifyText: Modify an existing text overlay (requires textId, and optionally text, position, fontSize, color, startTime, endTime)
- deleteText: Delete text overlays (mode: "timeRange" with startTime/endTime, OR mode: "textIds" with array of textIds)

**Control Operations:**
- seek: Jump to a specific time (requires time)
- confirmPlan: Confirm editing plan (requires confirmed: boolean)
- render: Start final render (requires outputFormat: mp4/webm, quality: low/medium/high)

IMPORTANT - Edit vs Add distinction:
- If user says "修改" (modify) or "编辑" (edit) an existing overlay, use modifyText
- If user says "添加" (add) or "新增" (new), use addText
- modifyText requires textId to identify which text to modify

When the user asks to make an edit, respond with a JSON object containing the type and params.

Example responses:
- Cut from 5 to 15 seconds: {"type": "crop", "params": {"startTime": 5, "endTime": 15}}
- Add text at 3 seconds: {"type": "addText", "params": {"startTime": 3, "endTime": 6, "text": "Hello", "position": {"x": 0.5, "y": 0.5}}}
- Add fade-blur transition: {"type": "addTransition", "params": {"startTime": 5, "endTime": 6, "effect": "fade-blur", "duration": 1}}
- Delete text in time range: {"type": "deleteText", "params": {"mode": "timeRange", "startTime": 3, "endTime": 6}}
- Delete specific text by ID: {"type": "deleteText", "params": {"mode": "textIds", "textIds": ["text_123"]}}
- Modify existing text with ID "text_123": {"type": "modifyText", "params": {"textId": "text_123", "text": "New Content"}}
- Jump to 10 seconds: {"type": "seek", "params": {"time": 10}}

CRITICAL: Your response must be ONLY valid JSON. No explanations, no prefixes, no suffixes.`

export async function POST(request: NextRequest) {
  try {
    const { messages, videoId, overlays } = await request.json()

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Invalid messages' }, { status: 400 })
    }

    let videoContext = ''
    if (videoId) {
      const video = await getVideo(videoId)
      if (video) {
        videoContext = `Video Context:
- Duration: ${video.duration.toFixed(2)} seconds
- Resolution: ${video.width}x${video.height}

IMPORTANT: When specifying endTime for operations on the entire video, use the exact number of seconds (e.g., ${video.duration.toFixed(2)}). Do NOT use quotes or text - just the raw number.`
      }
    }

    let overlaysContext = ''
    if (overlays && Array.isArray(overlays) && overlays.length > 0) {
      const textOverlays = overlays.filter((o: { type: string }) => o.type === 'text')
      if (textOverlays.length > 0) {
        overlaysContext = `\n\nCurrent text overlays in the video:\n${textOverlays.map((o: { id: string; text: string; startTime: number; endTime: number }) => `- ID: "${o.id}", Text: "${o.text}", Time: ${o.startTime}s - ${o.endTime}s`).join('\n')}\n\nWhen user asks to modify a text overlay, you MUST identify the correct textId from the list above based on the text content mentioned by the user.`
      }
    }

    const model = alibaba.chatModel('qwen-max')
    const result = await generateText({
      model: model,
      system: [SYSTEM_PROMPT, videoContext, overlaysContext].filter(Boolean).join('\n\n'),
      messages: messages.map((m: { role: string; content: string }) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content
      }))
    })

    let parsedResponse = null
    try {
      const text = result.text.trim()
      console.log('[Chat API] Raw response:', text)
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        console.log('[Chat API] JSON match:', jsonMatch[0])
        parsedResponse = JSON.parse(jsonMatch[0])
        console.log('[Chat API] Parsed:', parsedResponse)
      } else {
        console.log('[Chat API] No JSON found in response')
      }
    } catch (e) {
      console.error('[Chat API] JSON parse error:', e)
    }

    return NextResponse.json({
      response: result.text,
      instruction: parsedResponse
    })
  } catch (error) {
    console.error('Chat error:', error)
    return NextResponse.json(
      { error: 'Failed to process chat' },
      { status: 500 }
    )
  }
}
