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

// 统一的 EasingType（包含过渡动画和文字动画的缓动）
export type EasingType =
  | 'linear'
  | 'ease-in'
  | 'ease-out'
  | 'ease-in-out'
  // Spring 缓动
  | 'spring'
  | 'spring-bouncy'
  | 'spring-snappy';

export interface ExtendedTransitionParams {
  startTime: number;
  endTime: number;
  effect: TransitionEffect;
  direction?: TransitionDirection;
  duration?: number;
  easing?: EasingType;
  intensity?: number;
}

// ==================== Text Animation Types ====================

export type TextAnimationType =
  // 基础动画
  | 'none'
  | 'fade'
  | 'slideUp'
  | 'slideDown'
  | 'slideLeft'
  | 'slideRight'
  // 缩放动画
  | 'scaleIn'
  | 'scaleOut'
  | 'scaleInBounce'
  | 'scaleOutBounce'
  // 弹跳动画
  | 'bounceIn'
  | 'bounceOut'
  // 旋转动画
  | 'rotateIn'
  | 'rotateOut'
  | 'rotateInCCW'
  | 'rotateOutCCW'
  // 特殊动画
  | 'typewriter'
  | 'blurIn'
  | 'blurOut'
  // 抖动动画
  | 'shakeIn'
  | 'shakeOut'
  // 弹入弹出（Spring）
  | 'springIn'
  | 'springOut';

export interface TextAnimationConfig {
  entrance?: {
    type: TextAnimationType;
    duration?: number;    // 动画持续时间（毫秒），默认 300
    delay?: number;      // 延迟时间（毫秒），默认 0
    easing?: EasingType;
    intensity?: number;  // 动画强度/幅度，默认 1
  };
  exit?: {
    type: TextAnimationType;
    duration?: number;
    delay?: number;
    easing?: EasingType;
    intensity?: number;
  };
}

// 扩展 RemotionTextParams 以支持动画
export interface RemotionTextParams {
  startTime: number;
  endTime: number;
  text: string;
  position: { x: number; y: number };
  fontSize?: number;
  color?: string;
  // 效果模板名称（可选，显式参数覆盖模板默认值）
  template?: string;
  // 动画配置
  animation?: TextAnimationConfig;
  // 便捷动画选项（简化用法）
  entranceAnimation?: TextAnimationType;
  exitAnimation?: TextAnimationType;
  animationDuration?: number;  // 统一动画时长（毫秒）
}

export interface RemotionModifyTextParams {
  textId: string;
  text?: string;
  position?: { x: number; y: number };
  fontSize?: number;
  color?: string;
  startTime?: number;
  endTime?: number;
  // 效果模板名称（可选，显式参数覆盖模板默认值）
  template?: string;
  animation?: TextAnimationConfig;
  entranceAnimation?: TextAnimationType;
  exitAnimation?: TextAnimationType;
  animationDuration?: number;
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
