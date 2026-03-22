import { generateText, generateId } from 'ai';
import { openai } from '@ai-sdk/openai';
import type { Instruction, InstructionType } from './types';

const SYSTEM_PROMPT = `You are an AI video editing assistant. Your role is to help users edit videos through natural conversation.

You have access to the following video editing operations:

**FFmpeg Operations (for actual video manipulation):**
- crop: Cut a video clip to a specific time range (startTime, endTime)
- splitClip: Split video into separate clips (startTime, endTime)
- deleteClip: Delete a portion of the video (startTime, endTime)
- changeSpeed: Change playback speed of a clip (startTime, endTime, speed)
- changeVolume: Adjust audio volume (startTime, endTime, volume)

**Remotion Operations (for overlays and effects):**
- addText: Add text overlay to video (startTime, endTime, text, position, fontSize, color, animation)
  - Animation parameters (all optional):
    - entranceAnimation: Text animation type for entrance ('fade', 'slideUp', 'slideDown', 'scaleIn', 'scaleInBounce', 'bounceIn', 'rotateIn', 'blurIn', 'typewriter', 'springIn', 'shakeIn', etc.)
    - exitAnimation: Text animation type for exit ('fade', 'slideDown', 'scaleOut', 'bounceOut', 'rotateOut', 'blurOut', 'springOut', 'shakeOut', etc.)
    - animationDuration: Unified animation duration in milliseconds (default: 300ms)
    - animation: Full animation config object with entrance/exit options
- addHighlight: Add a highlight effect to a portion (startTime, endTime, color)
- addTransition: Add transition effect (startTime, endTime, type, effect, direction, duration, easing, intensity)
- modifyText: Modify an existing text overlay (textId, text, position, fontSize, color, startTime, endTime, animation options)
- deleteText: Delete text overlays by time range or IDs (mode, startTime, endTime, textIds)

**Text Animation Types Available:**
- Basic: 'none', 'fade'
- Slide: 'slideUp', 'slideDown', 'slideLeft', 'slideRight'
- Scale: 'scaleIn', 'scaleOut', 'scaleInBounce', 'scaleOutBounce'
- Bounce: 'bounceIn', 'bounceOut'
- Rotate: 'rotateIn', 'rotateOut', 'rotateInCCW', 'rotateOutCCW'
- Special: 'typewriter', 'blurIn', 'blurOut'
- Shake: 'shakeIn', 'shakeOut'
- Spring: 'springIn', 'springOut'

**Easing Types:**
- 'linear', 'ease-in', 'ease-out', 'ease-in-out'
- 'spring' (natural spring motion)
- 'spring-bouncy' (more bounce)
- 'spring-snappy' (quick snap)

**Control Operations:**
- seek: Jump to a specific time in the video (time)
- confirmPlan: Confirm the editing plan before execution (confirmed)
- render: Start the final render with the editing plan (outputFormat, quality)

When the user asks to make an edit, respond with the appropriate operation in JSON format.

Example conversation:
User: "Cut the video from 5 seconds to 15 seconds"
Assistant: {"type": "crop", "params": {"startTime": 5, "endTime": 15}}

User: "Add 'Hello World' text at 3 seconds with a bounce animation"
Assistant: {"type": "addText", "params": {"startTime": 3, "endTime": 5, "text": "Hello World", "position": {"x": 0.5, "y": 0.5}, "entranceAnimation": "bounceIn", "exitAnimation": "fade", "animationDuration": 400}}

User: "Add 'Welcome' text with spring animation"
Assistant: {"type": "addText", "params": {"startTime": 2, "endTime": 6, "text": "Welcome", "position": {"x": 0.5, "y": 0.5}, "entranceAnimation": "springIn", "exitAnimation": "springOut", "animationDuration": 500}}

User: "Add title text with typewriter effect"
Assistant: {"type": "addText", "params": {"startTime": 0, "endTime": 3, "text": "My Video Title", "position": {"x": 0.5, "y": 0.4}, "entranceAnimation": "typewriter", "animationDuration": 1500}}

User: "Jump to 10 seconds"
Assistant: {"type": "seek", "params": {"time": 10}}

User: "Change the text at 3 seconds to 'Goodbye'"
Assistant: {"type": "modifyText", "params": {"textId": "text_123", "text": "Goodbye"}}

Always respond with valid JSON that includes a "type" field and "params" object.`;

export async function parseInstruction(
  userMessage: string,
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>
): Promise<Instruction | null> {
  const result = await generateText({
    model: openai('gpt-4o'),
    system: SYSTEM_PROMPT,
    messages: [
      ...conversationHistory.map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: userMessage }
    ],
  });

  try {
    const text = result.text.trim();
    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]);
    if (!parsed.type || !parsed.params) return null;

    const instructionType = parsed.type as InstructionType;
    const validTypes: InstructionType[] = [
      'crop', 'splitClip', 'deleteClip', 'changeSpeed', 'changeVolume',
      'addText', 'addHighlight', 'addTransition',
      'modifyText', 'deleteText',
      'seek', 'confirmPlan', 'render'
    ];

    if (!validTypes.includes(instructionType)) return null;

    return {
      id: generateId(),
      type: instructionType,
      params: parsed.params,
      status: 'pending',
      createdAt: new Date(),
    };
  } catch {
    return null;
  }
}

export function validateInstruction(instruction: Instruction): boolean {
  const { type, params } = instruction;

  switch (type) {
    case 'crop':
    case 'splitClip':
    case 'deleteClip':
      return (
        typeof params.startTime === 'number' &&
        typeof params.endTime === 'number' &&
        params.startTime >= 0 &&
        params.endTime > params.startTime
      );
    case 'changeSpeed':
      return (
        typeof params.startTime === 'number' &&
        typeof params.endTime === 'number' &&
        typeof params.speed === 'number' &&
        params.speed > 0
      );
    case 'changeVolume':
      return (
        typeof params.startTime === 'number' &&
        typeof params.endTime === 'number' &&
        typeof params.volume === 'number' &&
        params.volume >= 0
      );
    case 'addText':
      return (
        typeof params.startTime === 'number' &&
        typeof params.endTime === 'number' &&
        typeof params.text === 'string' &&
        typeof params.position === 'object' &&
        params.position !== null &&
        typeof (params.position as { x?: unknown }).x === 'number' &&
        typeof (params.position as { y?: unknown }).y === 'number'
      );
    case 'addHighlight':
    case 'addTransition':
      return (
        typeof params.startTime === 'number' &&
        typeof params.endTime === 'number'
      );
    case 'modifyText':
      return (
        typeof params.textId === 'string' &&
        params.textId.length > 0
      );
    case 'deleteText':
      if (params.mode === 'timeRange') {
        return (
          typeof params.startTime === 'number' &&
          typeof params.endTime === 'number' &&
          params.startTime >= 0 &&
          params.endTime > params.startTime
        );
      } else if (params.mode === 'textIds') {
        return Array.isArray(params.textIds) && params.textIds.length > 0;
      }
      return false;
    case 'seek':
      return typeof params.time === 'number';
    case 'confirmPlan':
      return typeof params.confirmed === 'boolean';
    case 'render':
      return ['mp4', 'webm'].includes(params.outputFormat as string);
    default:
      return false;
  }
}

export function isSimpleEdit(instructions: Instruction[]): boolean {
  const SIMPLE_OPS: InstructionType[] = ['addText', 'addHighlight', 'addTransition'];
  return instructions.every(i => SIMPLE_OPS.includes(i.type));
}
