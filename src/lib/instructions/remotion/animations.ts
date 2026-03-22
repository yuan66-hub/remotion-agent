import {
  TextAnimationType,
  TextAnimationConfig,
  EasingType,
} from '../types';

/**
 * 文字动画工具函数
 * 提供进场和出场的动效计算
 */

// 默认值
const DEFAULT_DURATION = 300; // 毫秒
const DEFAULT_INTENSITY = 1;
const DEFAULT_DELAY = 0;

// Spring 动画预设参数
const SPRING_PRESETS = {
  spring: { damping: 15, stiffness: 100, mass: 1 },
  'spring-bouncy': { damping: 10, stiffness: 180, mass: 0.8 },
  'spring-snappy': { damping: 20, stiffness: 300, mass: 0.5 },
};

/**
 * 获取动画配置的实际值（合并默认值）
 */
export function getAnimationConfig(
  config: TextAnimationConfig | undefined,
  quickAnimation?: TextAnimationType,
  animationDuration?: number
): { entrance: Required<TextAnimationConfig>['entrance']; exit: Required<TextAnimationConfig>['exit'] } {
  const duration = animationDuration || DEFAULT_DURATION;

  // 从便捷参数创建完整配置
  if (quickAnimation && !config) {
    const entrance = {
      type: quickAnimation as TextAnimationType,
      duration,
      delay: DEFAULT_DELAY,
      easing: 'ease-out' as EasingType,
      intensity: DEFAULT_INTENSITY,
    };
    const exit = {
      type: quickAnimation as TextAnimationType,
      duration,
      delay: DEFAULT_DELAY,
      easing: 'ease-in' as EasingType,
      intensity: DEFAULT_INTENSITY,
    };
    return { entrance, exit };
  }

  // 使用完整配置
  const entrance = config?.entrance || { type: 'fade' as TextAnimationType, duration: DEFAULT_DURATION, delay: DEFAULT_DELAY, easing: 'ease-out' as EasingType, intensity: DEFAULT_INTENSITY };
  const exit = config?.exit || { type: 'fade' as TextAnimationType, duration: DEFAULT_DURATION, delay: DEFAULT_DELAY, easing: 'ease-in' as EasingType, intensity: DEFAULT_INTENSITY };

  return {
    entrance: {
      type: entrance.type,
      duration: entrance.duration || duration,
      delay: entrance.delay || DEFAULT_DELAY,
      easing: entrance.easing || 'ease-out',
      intensity: entrance.intensity ?? DEFAULT_INTENSITY,
    },
    exit: {
      type: exit.type,
      duration: exit.duration || duration,
      delay: exit.delay || DEFAULT_DELAY,
      easing: exit.easing || 'ease-in',
      intensity: exit.intensity ?? DEFAULT_INTENSITY,
    },
  };
}

/**
 * 获取 Remotion 动画关键帧
 * @param type 动画类型
 * @param progress 动画进度 (0-1)
 * @param intensity 动画强度
 */
export function getAnimationKeyframes(
  type: TextAnimationType,
  progress: number,
  intensity: number = 1
): {
  opacity: number;
  transform: string;
  filter?: string;
} {
  const p = Math.min(1, Math.max(0, progress));

  switch (type) {
    case 'none':
      return { opacity: 1, transform: 'none' };

    case 'fade':
      return { opacity: p, transform: 'none' };

    case 'slideUp':
      return {
        opacity: p,
        transform: `translateY(${(1 - p) * 50 * intensity}px)`,
      };

    case 'slideDown':
      return {
        opacity: p,
        transform: `translateY(${(1 - p) * -50 * intensity}px)`,
      };

    case 'slideLeft':
      return {
        opacity: p,
        transform: `translateX(${(1 - p) * 100 * intensity}px)`,
      };

    case 'slideRight':
      return {
        opacity: p,
        transform: `translateX(${(1 - p) * -100 * intensity}px)`,
      };

    case 'scaleIn':
      return {
        opacity: p,
        transform: `scale(${0.5 + p * 0.5 * intensity})`,
      };

    case 'scaleOut':
      return {
        opacity: 2 - p,
        transform: `scale(${2 - p})`,
      };

    case 'scaleInBounce': {
      const scale = p < 0.6
        ? p / 0.6 * 1.2 * intensity
        : 1 + (1 - (p - 0.6) / 0.4) * 0.2 * intensity;
      return { opacity: p, transform: `scale(${Math.min(1.2, scale)})` };
    }

    case 'scaleOutBounce': {
      const scale = p < 0.4
        ? 1 + p / 0.4 * 0.3 * intensity
        : 1.3 - ((p - 0.4) / 0.6) * 0.3 * intensity;
      return { opacity: 1 - p, transform: `scale(${Math.max(0.7, scale)})` };
    }

    case 'bounceIn': {
      const bounce = Math.sin(p * Math.PI) * 0.2 * intensity;
      const scale = p + bounce;
      return { opacity: p, transform: `scale(${Math.min(1.1, scale)})` };
    }

    case 'bounceOut': {
      const bounce = Math.sin((1 - p) * Math.PI) * 0.15 * intensity;
      const scale = p - bounce;
      return { opacity: 1 - p, transform: `scale(${Math.max(0.9, scale)})` };
    }

    case 'rotateIn': {
      const angle = (1 - p) * -180 * intensity;
      const scale = 0.8 + p * 0.2;
      return { opacity: p, transform: `rotate(${angle}deg) scale(${scale})` };
    }

    case 'rotateOut': {
      const angle = p * 180 * intensity;
      const scale = 1 - p * 0.2;
      return { opacity: 1 - p, transform: `rotate(${angle}deg) scale(${scale})` };
    }

    case 'rotateInCCW': {
      const angle = (1 - p) * 360 * intensity;
      const scale = 0.5 + p * 0.5;
      return { opacity: p, transform: `rotate(${angle}deg) scale(${scale})` };
    }

    case 'rotateOutCCW': {
      const angle = p * -360 * intensity;
      const scale = 1 - p * 0.5;
      return { opacity: 1 - p, transform: `rotate(${angle}deg) scale(${scale})` };
    }

    case 'typewriter':
      // 打字机效果：opacity 配合 clip-path
      return {
        opacity: p,
        transform: 'none',
        filter: `blur(${(1 - p) * 3}px)`,
      };

    case 'blurIn':
      return {
        opacity: p,
        transform: 'none',
        filter: `blur(${(1 - p) * 10 * intensity}px)`,
      };

    case 'blurOut':
      return {
        opacity: 1 - p,
        transform: 'none',
        filter: `blur(${p * 10 * intensity}px)`,
      };

    case 'shakeIn': {
      const shake = p < 0.3
        ? Math.sin(p * Math.PI * 8) * 10 * intensity
        : Math.sin(p * Math.PI * 4) * 5 * intensity * (1 - p);
      return { opacity: p, transform: `translateX(${shake}px)` };
    }

    case 'shakeOut': {
      const shake = Math.sin(p * Math.PI * 6) * 8 * intensity * (1 - p);
      return { opacity: 1 - p, transform: `translateX(${shake}px)` };
    }

    case 'springIn': {
      // 模拟 spring 效果
      const damping = 0.6;
      const frequency = 3;
      const decay = Math.exp(-damping * p * 5);
      const oscillation = Math.cos(frequency * Math.PI * p) * decay;
      const overshoot = 1 + oscillation * 0.3 * intensity;
      const finalScale = p < 0.8
        ? overshoot
        : overshoot + (1 - overshoot) * ((p - 0.8) / 0.2);
      return { opacity: p, transform: `scale(${Math.min(1.15, finalScale)})` };
    }

    case 'springOut': {
      const damping = 0.5;
      const frequency = 2.5;
      const decay = Math.exp(-damping * (1 - p) * 5);
      const oscillation = Math.cos(frequency * Math.PI * (1 - p)) * decay;
      const overshoot = p + Math.abs(oscillation) * 0.2 * intensity * (1 - p);
      return { opacity: 1 - p, transform: `scale(${Math.max(0.8, overshoot)})` };
    }

    default:
      return { opacity: 1, transform: 'none' };
  }
}

/**
 * 获取 CSS 缓动函数字符串
 */
export function getEasingCSS(easing: EasingType): string {
  switch (easing) {
    case 'linear':
      return 'linear';
    case 'ease-in':
      return 'cubic-bezier(0.4, 0, 1, 1)';
    case 'ease-out':
      return 'cubic-bezier(0, 0, 0.2, 1)';
    case 'ease-in-out':
      return 'cubic-bezier(0.4, 0, 0.2, 1)';
    case 'spring':
      return 'cubic-bezier(0.175, 0.885, 0.32, 1.275)';
    case 'spring-bouncy':
      return 'cubic-bezier(0.34, 1.56, 0.64, 1)';
    case 'spring-snappy':
      return 'cubic-bezier(0.9, 0.03, 0.6, 0.24)';
    default:
      return 'ease-out';
  }
}

/**
 * 计算打字机效果的可见字符数
 */
export function getTypewriterProgress(progress: number, textLength: number): number {
  return Math.floor(progress * textLength);
}

/**
 * 获取 clip-path 用于打字机效果
 */
export function getTypewriterClipPath(progress: number): string {
  const p = Math.min(1, Math.max(0, progress));
  return `inset(0 ${100 - p * 100}% 0 0)`;
}

/**
 * 动画预设快捷配置
 */
export const ANIMATION_PRESETS = {
  // 淡入淡出
  fade: { entrance: { type: 'fade' as TextAnimationType }, exit: { type: 'fade' as TextAnimationType } },

  // 滑入滑出
  slideUp: {
    entrance: { type: 'slideUp' as TextAnimationType },
    exit: { type: 'slideDown' as TextAnimationType },
  },
  slideDown: {
    entrance: { type: 'slideDown' as TextAnimationType },
    exit: { type: 'slideUp' as TextAnimationType },
  },

  // 缩放弹入
  scaleBounce: {
    entrance: { type: 'scaleInBounce' as TextAnimationType, duration: 400 },
    exit: { type: 'scaleOutBounce' as TextAnimationType, duration: 300 },
  },

  // Spring 弹入弹出
  spring: {
    entrance: { type: 'springIn' as TextAnimationType, duration: 500, easing: 'spring' as EasingType },
    exit: { type: 'springOut' as TextAnimationType, duration: 400, easing: 'spring' as EasingType },
  },

  // 旋转进入
  rotateIn: {
    entrance: { type: 'rotateIn' as TextAnimationType, duration: 400 },
    exit: { type: 'rotateOut' as TextAnimationType, duration: 350 },
  },

  // 模糊进入
  blur: {
    entrance: { type: 'blurIn' as TextAnimationType, duration: 350 },
    exit: { type: 'blurOut' as TextAnimationType, duration: 300 },
  },

  // 抖动进入
  shake: {
    entrance: { type: 'shakeIn' as TextAnimationType, duration: 450 },
    exit: { type: 'fade' as TextAnimationType, duration: 200 },
  },

  // 打字机效果
  typewriter: {
    entrance: { type: 'typewriter' as TextAnimationType, duration: 1000 },
    exit: { type: 'fade' as TextAnimationType, duration: 200 },
  },
} as const;

export type AnimationPresetName = keyof typeof ANIMATION_PRESETS;

/**
 * 根据预设名称获取动画配置
 */
export function getPresetAnimation(presetName: AnimationPresetName): TextAnimationConfig {
  return ANIMATION_PRESETS[presetName] as TextAnimationConfig;
}
