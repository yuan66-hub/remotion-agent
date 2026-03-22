import type {
  RemotionTextParams,
  RemotionHighlightParams,
  ExtendedTransitionParams,
  TransitionEffect,
  TransitionDirection,
  EasingType,
} from '../types';

export interface TextOverlay {
  id: string;
  type: 'text';
  startTime: number;
  endTime: number;
  text: string;
  position: { x: number; y: number };
  fontSize?: number;
  color?: string;
}

export interface HighlightOverlay {
  id: string;
  type: 'highlight';
  startTime: number;
  endTime: number;
  color: string;
}

export interface TransitionOverlay {
  id: string;
  type: 'transition';
  startTime: number;
  endTime: number;
  transitionType: TransitionEffect;
  direction?: TransitionDirection;
  duration?: number;
  easing?: EasingType;
  intensity?: number;
}

export type Overlay = TextOverlay | HighlightOverlay | TransitionOverlay;

export function createTextOverlay(params: RemotionTextParams): TextOverlay {
  return {
    id: `text_${Date.now()}`,
    type: 'text',
    startTime: params.startTime,
    endTime: params.endTime,
    text: params.text,
    position: params.position,
    fontSize: params.fontSize || 48,
    color: params.color || '#FFFFFF',
  };
}

export function createHighlightOverlay(params: RemotionHighlightParams): HighlightOverlay {
  return {
    id: `highlight_${Date.now()}`,
    type: 'highlight',
    startTime: params.startTime,
    endTime: params.endTime,
    color: params.color || '#FFFF00',
  };
}

export function createTransitionOverlay(params: ExtendedTransitionParams): TransitionOverlay {
  return {
    id: `transition_${Date.now()}`,
    type: 'transition',
    startTime: params.startTime,
    endTime: params.endTime,
    transitionType: params.effect,
    direction: params.direction || 'left',
    duration: params.duration || 1,
    easing: params.easing || 'ease-in-out',
    intensity: params.intensity ?? 1,
  };
}

export function getOverlayAtTime(overlays: Overlay[], time: number): Overlay[] {
  return overlays.filter(
    overlay => time >= overlay.startTime && time <= overlay.endTime
  );
}

export function applyTransitions(
  overlays: Overlay[],
  _options: { defaultDuration?: number } = {}
): Overlay[] {
  // Sort overlays by start time
  const sorted = [...overlays].sort((a, b) => a.startTime - b.startTime);

  // For now, just return sorted overlays
  // A full implementation would handle overlapping transitions
  return sorted;
}

export function getTransitionFilter(
  effect: TransitionEffect,
  progress: number,
  intensity: number = 1
): string {
  const p = Math.min(1, Math.max(0, progress));
  switch (effect) {
    case 'fade-blur':
      return `blur(${p * intensity * 10}px)`;
    case 'dissolve-zoom':
      return `blur(${p * intensity * 5}px) scale(${1 + p * 0.2})`;
    case 'blur':
      return `blur(${p * intensity * 20}px)`;
    case 'zoom':
      return `scale(${1 + p * intensity * 0.5})`;
    case 'rotate':
      return `rotate(${p * intensity * 15}deg)`;
    case 'scale':
      return `scale(${1 - p * intensity * 0.3 + 1})`;
    default:
      return 'none';
  }
}
