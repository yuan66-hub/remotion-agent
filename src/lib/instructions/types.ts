export type InstructionType =
  | 'crop' | 'splitClip' | 'deleteClip' | 'changeSpeed' | 'changeVolume'  // ffmpeg
  | 'addText' | 'addHighlight' | 'addTransition'        // Remotion
  | 'modifyText'                                          // Remotion (modify existing text)
  | 'deleteText'                                         // Remotion (delete text overlays)
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

export interface FFmpegVolumeParams {
  startTime: number;
  endTime: number;
  volume: number;
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
  type: TransitionEffect;
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

// ==================== Extended Transition Types ====================

export type TransitionEffect =
  | 'fade' | 'dissolve' | 'slide'                    // 基础
  | 'fade-blur' | 'dissolve-zoom' | 'slide-rotate'  // 组合
  | 'blur' | 'zoom' | 'rotate' | 'scale';           // 增强

export type TransitionDirection = 'left' | 'right' | 'up' | 'down';
export type EasingType = 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';

export interface ExtendedTransitionParams {
  startTime: number;
  endTime: number;
  effect: TransitionEffect;
  direction?: TransitionDirection;
  duration?: number;
  easing?: EasingType;
  intensity?: number;
}

// ==================== DeleteText Types ====================

export interface DeleteTextParams {
  mode: 'timeRange' | 'textIds';
  startTime?: number;
  endTime?: number;
  textIds?: string[];
}

// ==================== Task Queue Types ====================

export type TaskStatus =
  | 'pending' | 'queued' | 'running'
  | 'paused' | 'skipped' | 'completed' | 'failed';

export interface TaskResult {
  outputPath?: string;
  overlays?: unknown[];
  metadata?: Record<string, unknown>;
}

export interface SubTask {
  id: string;
  taskId: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
}
