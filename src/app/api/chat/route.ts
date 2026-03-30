import { NextRequest, NextResponse } from 'next/server'
import { generateText } from 'ai'
import { createAlibaba } from '@ai-sdk/alibaba'
import { getVideo } from '@/lib/video/storage'
import { generateTemplateDoc } from '@/lib/instructions/remotion/effectTemplates'

const alibaba = createAlibaba({
  apiKey: process.env.ALIBABA_API_KEY,
  baseURL: process.env.ALIBABA_BASE_URL
})

const SYSTEM_PROMPT = `You are an AI video editing assistant. Help users edit videos through natural conversation.
Your response must be ONLY valid JSON — no explanations, no prefixes, no suffixes.

# Operations Reference

## 1. FFmpeg Operations (modify the actual video file)

### crop — Cut video to a time range
{"type":"crop","params":{"startTime":5,"endTime":15}}

### splitClip — Split video into clips
{"type":"splitClip","params":{"startTime":5,"endTime":15}}

### deleteClip — Remove a portion
{"type":"deleteClip","params":{"startTime":5,"endTime":15}}

### changeSpeed — Adjust playback speed
{"type":"changeSpeed","params":{"startTime":0,"endTime":30.5,"speed":2}}
- speed: >1 faster, <1 slower (e.g., 0.5 = half speed, 2 = double speed)
- CRITICAL: For the ENTIRE video, set startTime=0 and endTime=EXACT duration from videoContext.

### changeVolume — Adjust audio volume
{"type":"changeVolume","params":{"startTime":0,"endTime":30.5,"volume":1.5}}
- volume: 0=mute, 0.5=50%, 1=100%, 2=200%
- CRITICAL: For the ENTIRE video, set startTime=0 and endTime=EXACT duration from videoContext.

## 2. Remotion Operations (visual overlays rendered on top of video)

### addText — Add text overlay (花字/字幕)
Required params: startTime, endTime, text
Optional params: template, position, fontSize, color, animation/entranceAnimation/exitAnimation, animationDuration
When "template" is provided, position/fontSize/color/animation use template defaults; explicit params override them.

**position**: Normalized coordinates {x: 0-1, y: 0-1} where {x:0.5, y:0.5} = center
  Common positions:
  - Top center: {x:0.5, y:0.1}
  - Center: {x:0.5, y:0.5}
  - Bottom center (subtitle): {x:0.5, y:0.85}
  - Lower third: {x:0.3, y:0.8}

**fontSize**: Default 48. Use 24-36 for subtitles, 48-72 for titles, 80+ for impact text.

**color**: CSS color string. Default "#FFFFFF". Examples: "#FF0000" (red), "#FFD700" (gold), "rgba(255,255,255,0.8)"

**Animation system** — Two ways to specify:

Way 1 (simple): Use entranceAnimation and/or exitAnimation directly
{"type":"addText","params":{"startTime":2,"endTime":5,"text":"Hello","position":{"x":0.5,"y":0.5},"entranceAnimation":"slideUp","exitAnimation":"fade","animationDuration":500}}

Way 2 (advanced): Use animation object for full control
{"type":"addText","params":{"startTime":2,"endTime":5,"text":"Hello","position":{"x":0.5,"y":0.5},"animation":{"entrance":{"type":"springIn","duration":500,"easing":"spring","intensity":1.2},"exit":{"type":"fade","duration":300}}}}

**Available animation types:**
| Category | Types | Visual Effect |
|----------|-------|---------------|
| Basic | fade | Opacity 0→1 |
| Slide | slideUp, slideDown, slideLeft, slideRight | Slide in from direction |
| Scale | scaleIn, scaleOut, scaleInBounce, scaleOutBounce | Grow/shrink with optional bounce |
| Bounce | bounceIn, bounceOut | Elastic bounce effect |
| Rotate | rotateIn, rotateOut, rotateInCCW, rotateOutCCW | Spin in (CW or CCW) |
| Blur | blurIn, blurOut | Blur to clear / clear to blur |
| Shake | shakeIn, shakeOut | Vibrating entrance/exit |
| Spring | springIn, springOut | Physics-based spring with overshoot |
| Special | typewriter | Characters appear one by one (best with duration 800-1500ms) |

**Animation config details:**
- duration: milliseconds, default 300. Use 200-400 for quick, 500-800 for smooth, 800-1500 for dramatic
- easing: "linear" | "ease-in" | "ease-out" | "ease-in-out" | "spring" | "spring-bouncy" | "spring-snappy"
- intensity: 0-2, default 1. Controls amplitude of movement/rotation/blur
- delay: milliseconds, default 0. Delay before animation starts

**Recommended animation combos for common scenarios:**
- Subtitle: entranceAnimation="fade", animationDuration=200
- Title card: entranceAnimation="scaleInBounce", exitAnimation="fade", animationDuration=400
- Emphasis text: entranceAnimation="springIn", exitAnimation="springOut", animationDuration=500
- Pop-up annotation: entranceAnimation="bounceIn", exitAnimation="scaleOut", animationDuration=350
- Dramatic reveal: entranceAnimation="blurIn", exitAnimation="blurOut", animationDuration=600
- Typewriter: entranceAnimation="typewriter", animationDuration=1000
- Energetic: entranceAnimation="shakeIn", exitAnimation="fade", animationDuration=450

${generateTemplateDoc()}

### addHighlight — Add color highlight overlay
{"type":"addHighlight","params":{"startTime":3,"endTime":6,"color":"rgba(255,255,0,0.3)"}}
- color: Use rgba with low alpha (0.2-0.4) for subtle highlights
- Good for: marking important segments, visual emphasis

### addTransition — Add transition effect between scenes
{"type":"addTransition","params":{"startTime":5,"endTime":6,"effect":"fade-blur","duration":1,"intensity":0.8}}

**Transition effects:**
| Type | Visual | Best for |
|------|--------|----------|
| fade | Simple opacity transition | General use |
| dissolve | Cross-dissolve blend | Scene changes |
| slide | Sliding wipe | Dynamic transitions |
| fade-blur | Fade + gaussian blur | Dreamy/soft transitions |
| dissolve-zoom | Dissolve + zoom | Cinematic scene changes |
| slide-rotate | Slide + rotation | Energetic/dynamic |
| blur | Pure blur in/out | Focus transitions |
| zoom | Scale up/down | Dramatic emphasis |
| rotate | Rotation effect | Creative/playful |
| scale | Size scaling | Subtle transitions |

Optional params: direction ("left"/"right"/"up"/"down"), duration (seconds), easing, intensity (0-1)

### modifyText — Modify an existing text overlay
{"type":"modifyText","params":{"textId":"text_123","text":"New Content","color":"#FF0000"}}
- REQUIRES textId (from overlays context). All other fields optional.
- Can modify: text, position, fontSize, color, startTime, endTime, template, animation, entranceAnimation, exitAnimation, animationDuration
- "template" applies predefined style; explicit params override template defaults.

### deleteText — Remove text overlays
By time range: {"type":"deleteText","params":{"mode":"timeRange","startTime":3,"endTime":6}}
By IDs: {"type":"deleteText","params":{"mode":"textIds","textIds":["text_123","text_456"]}}

## 3. Control Operations

### seek — Jump to time
{"type":"seek","params":{"time":10}}

### render — Start final render
{"type":"render","params":{"outputFormat":"mp4","quality":"medium"}}
- quality: "low" (fast, smaller), "medium" (balanced), "high" (best quality, slow)

# Decision Rules

1. **Edit vs Add**: "修改/编辑/改" → modifyText (needs textId). "添加/加/新增" → addText.
2. **Whole video operations**: Always use EXACT duration from videoContext as endTime.
3. **Time range**: endTime must be > startTime. Both in seconds.
4. **Text duration**: Default to 3-5 seconds unless user specifies. For subtitles, match speech duration.
5. **Multiple operations**: Return an array of JSON objects for batch edits.
6. **Animation choice**: Match animation style to content mood — playful content → bounceIn/springIn, serious → fade/blurIn, energetic → shakeIn/slideUp.
7. **Font size guide**: Subtitle=32, Normal text=48, Title=64, Impact=80+.
8. **Color suggestions**: White (#FFFFFF) for general, Yellow (#FFD700) for emphasis, Red (#FF0000) for warning/urgent, Cyan (#00E5FF) for tech/modern.`

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

      // More robust JSON extraction that handles nested braces
      const jsonObjects: string[] = []
      let braceCount = 0
      let start = -1

      for (let i = 0; i < text.length; i++) {
        if (text[i] === '{') {
          if (braceCount === 0) start = i
          braceCount++
        } else if (text[i] === '}') {
          braceCount--
          if (braceCount === 0 && start !== -1) {
            jsonObjects.push(text.slice(start, i + 1))
            start = -1
          }
        }
      }

      console.log('[Chat API] JSON objects found:', jsonObjects.length)

      if (jsonObjects.length > 0) {
        if (jsonObjects.length === 1) {
          parsedResponse = JSON.parse(jsonObjects[0])
        } else {
          parsedResponse = jsonObjects.map((j) => JSON.parse(j))
        }
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
