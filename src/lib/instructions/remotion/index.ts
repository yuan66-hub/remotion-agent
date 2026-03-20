import type { RemotionTextParams, RemotionHighlightParams, RemotionTransitionParams } from '../types';

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
  transitionType: 'fade' | 'dissolve' | 'slide';
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

export function createTransitionOverlay(params: RemotionTransitionParams): TransitionOverlay {
  return {
    id: `transition_${Date.now()}`,
    type: 'transition',
    startTime: params.startTime,
    endTime: params.endTime,
    transitionType: params.type,
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
