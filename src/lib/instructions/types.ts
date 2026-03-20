export type InstructionType =
  | 'crop' | 'splitClip' | 'deleteClip' | 'changeSpeed'  // ffmpeg
  | 'addText' | 'addHighlight' | 'addTransition'        // Remotion
  | 'modifyText'                                          // Remotion (modify existing text)
  | 'seek' | 'confirmPlan' | 'render';                   // control

export interface Instruction {
  id: string;
  type: InstructionType;
  params: Record<string, unknown>;
  status: 'pending' | 'approved' | 'executing' | 'complete' | 'error';
  createdAt: Date;
  error?: string;
}

export interface FFmpegCropParams {
  startTime: number;
  endTime: number;
}

export interface FFmpegSplitParams {
  startTime: number;
  endTime: number;
}

export interface FFmpegDeleteParams {
  startTime: number;
  endTime: number;
}

export interface FFmpegSpeedParams {
  startTime: number;
  endTime: number;
  speed: number;
}

export interface RemotionTextParams {
  startTime: number;
  endTime: number;
  text: string;
  position: { x: number; y: number };
  fontSize?: number;
  color?: string;
}

export interface RemotionHighlightParams {
  startTime: number;
  endTime: number;
  color: string;
}

export interface RemotionTransitionParams {
  startTime: number;
  endTime: number;
  type: 'fade' | 'dissolve' | 'slide';
}

export interface RemotionModifyTextParams {
  textId: string;
  text?: string;
  position?: { x: number; y: number };
  fontSize?: number;
  color?: string;
  startTime?: number;
  endTime?: number;
}

export interface SeekParams {
  time: number;
}

export interface ConfirmPlanParams {
  confirmed: boolean;
}

export interface RenderParams {
  outputFormat: 'mp4' | 'webm';
  quality: 'low' | 'medium' | 'high';
}
