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
- changeSpeed: Change playback speed of a clip (requires startTime, endTime, speed)

**Remotion Operations (for overlays):**
- addText: Add text overlay (requires startTime, endTime, text, position{x,y})
- addHighlight: Add highlight effect (requires startTime, endTime, color)
- addTransition: Add transition effect (requires startTime, endTime, type)

**Control Operations:**
- seek: Jump to a specific time (requires time)
- confirmPlan: Confirm editing plan (requires confirmed: boolean)
- render: Start final render (requires outputFormat: mp4/webm, quality: low/medium/high)

When the user asks to make an edit, respond with a JSON object containing the type and params.

Example responses:
- Cut from 5 to 15 seconds: {"type": "crop", "params": {"startTime": 5, "endTime": 15}}
- Add text at 3 seconds: {"type": "addText", "params": {"startTime": 3, "endTime": 6, "text": "Hello", "position": {"x": 0.5, "y": 0.5}}}
- Jump to 10 seconds: {"type": "seek", "params": {"time": 10}}

CRITICAL: Your response must be ONLY valid JSON. No explanations, no prefixes, no suffixes.`

export async function POST(request: NextRequest) {
  try {
    const { messages, videoId } = await request.json()

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Invalid messages' }, { status: 400 })
    }

    let videoContext = ''
    if (videoId) {
      const video = await getVideo(videoId)
      if (video) {
        videoContext = `Current video: ${video.duration.toFixed(2)}s, ${
          video.width
        }x${video.height}`
      }
    }
    const model = alibaba.chatModel('qwen-max')
    const result = await generateText({
      model: model,
      system: videoContext
        ? `${SYSTEM_PROMPT}\n\n${videoContext}`
        : SYSTEM_PROMPT,
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
