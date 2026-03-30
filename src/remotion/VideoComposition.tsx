import React from 'react';
import { AbsoluteFill, OffthreadVideo, useCurrentFrame } from 'remotion';
import type {
  TextOverlay,
  HighlightOverlay,
  TransitionOverlay,
} from '../lib/instructions/remotion';
import {
  getAnimationConfig,
  getAnimationKeyframes,
  getTypewriterProgress,
  getTypewriterClipPath,
} from '../lib/instructions/remotion/animations';

/**
 * Serialized overlay type — same shape as Overlay but guaranteed JSON-safe.
 * We use the union of the three overlay types from the existing codebase.
 */
export type SerializedOverlay =
  | (TextOverlay & { type: 'text' })
  | (HighlightOverlay & { type: 'highlight' })
  | (TransitionOverlay & { type: 'transition' });

export interface CompositionInputProps {
  videoSrc: string;
  overlays: SerializedOverlay[];
  fps: number;
  width: number;
  height: number;
  durationInFrames: number;
}

export const VideoComposition: React.FC<CompositionInputProps> = ({
  videoSrc,
  overlays,
  fps,
}) => {
  const frame = useCurrentFrame();
  const currentTime = frame / fps;

  // Filter overlays active at current time
  const activeOverlays = overlays.filter(
    (o) => currentTime >= o.startTime && currentTime <= o.endTime
  );

  return (
    <AbsoluteFill>
      {/* Source video layer */}
      {videoSrc && (
        <AbsoluteFill>
          <OffthreadVideo src={videoSrc} />
        </AbsoluteFill>
      )}

      {/* Overlay layer */}
      {activeOverlays.map((overlay) => {
        if (overlay.type === 'text') {
          return (
            <TextOverlayRenderer
              key={overlay.id}
              overlay={overlay}
              currentTime={currentTime}
            />
          );
        }
        if (overlay.type === 'highlight') {
          return (
            <HighlightOverlayRenderer key={overlay.id} overlay={overlay} />
          );
        }
        if (overlay.type === 'transition') {
          return (
            <TransitionOverlayRenderer
              key={overlay.id}
              overlay={overlay}
              currentTime={currentTime}
            />
          );
        }
        return null;
      })}
    </AbsoluteFill>
  );
};

/**
 * Text overlay renderer — mirrors VideoPlayer/index.tsx L296-392 logic
 * but uses frame-based time instead of video.currentTime
 */
const TextOverlayRenderer: React.FC<{
  overlay: TextOverlay;
  currentTime: number;
}> = ({ overlay, currentTime }) => {
  const { entrance, exit } = getAnimationConfig(
    overlay.animation,
    overlay.entranceAnimation,
    overlay.animationDuration
  );

  const entranceDuration = entrance.duration || 300;
  const exitDuration = exit.duration || 300;
  const entranceEnd = overlay.startTime + entranceDuration / 1000;
  const exitStart = overlay.endTime - exitDuration / 1000;

  // Calculate animation progress
  let animationProgress = 0;
  let exitProgress = 0;

  if (currentTime < overlay.startTime) {
    return null;
  } else if (currentTime < entranceEnd) {
    animationProgress =
      (currentTime - overlay.startTime) / (entranceDuration / 1000);
    animationProgress = Math.min(1, animationProgress);
  } else if (currentTime >= exitStart && currentTime < overlay.endTime) {
    animationProgress = 1;
    exitProgress = (currentTime - exitStart) / (exitDuration / 1000);
    exitProgress = Math.min(1, exitProgress);
  } else if (currentTime >= overlay.endTime) {
    return null;
  } else {
    animationProgress = 1;
  }

  // Get entrance animation keyframes
  const entranceKeyframes = getAnimationKeyframes(
    animationProgress < 1 ? entrance.type : 'none',
    animationProgress,
    entrance.intensity
  );

  // Get exit animation keyframes
  const exitKeyframes = getAnimationKeyframes(
    exitProgress > 0 ? exit.type : 'none',
    exitProgress,
    exit.intensity
  );

  // Combine animation effects
  const combinedOpacity =
    entranceKeyframes.opacity * (1 - exitProgress);
  const combinedTransform =
    `${entranceKeyframes.transform} ${exitKeyframes.transform !== 'none' ? exitKeyframes.transform : ''}`.trim() ||
    'none';
  const combinedFilter =
    entranceKeyframes.filter || exitKeyframes.filter;

  // Typewriter effect
  const isTypewriter = entrance.type === 'typewriter';
  const typewriterProgress = isTypewriter
    ? getTypewriterProgress(animationProgress, overlay.text.length)
    : overlay.text.length;

  const textStyle: React.CSSProperties = {
    position: 'absolute',
    left: `${overlay.position.x * 100}%`,
    top: `${overlay.position.y * 100}%`,
    transform: `translate(-50%, -50%) ${combinedTransform}`,
    opacity: combinedOpacity,
    fontSize: overlay.fontSize || 48,
    color: overlay.color || '#FFFFFF',
    textShadow:
      '2px 2px 4px rgba(0,0,0,0.8), -1px -1px 2px rgba(0,0,0,0.6)',
    fontWeight: 'bold',
    whiteSpace: 'nowrap',
    filter: combinedFilter || undefined,
  };

  if (isTypewriter && animationProgress < 1) {
    textStyle.clipPath = getTypewriterClipPath(animationProgress);
  }

  return (
    <div style={textStyle}>
      {isTypewriter
        ? overlay.text.substring(0, typewriterProgress)
        : overlay.text}
    </div>
  );
};

/**
 * Highlight overlay renderer
 */
const HighlightOverlayRenderer: React.FC<{
  overlay: HighlightOverlay;
}> = ({ overlay }) => {
  return (
    <AbsoluteFill
      style={{
        background: `${overlay.color}33`,
        border: `2px solid ${overlay.color}`,
      }}
    />
  );
};

/**
 * Transition overlay renderer
 */
const TransitionOverlayRenderer: React.FC<{
  overlay: TransitionOverlay;
  currentTime: number;
}> = ({ overlay, currentTime }) => {
  const progress =
    ((currentTime - overlay.startTime) /
      (overlay.endTime - overlay.startTime)) *
    100;

  const transitionColors: Record<string, string> = {
    fade: 'rgba(139, 92, 246, 0.3)',
    dissolve: 'rgba(236, 72, 153, 0.3)',
    slide: 'rgba(34, 211, 238, 0.3)',
    'fade-blur': 'rgba(168, 85, 247, 0.3)',
    'dissolve-zoom': 'rgba(251, 146, 60, 0.3)',
    'slide-rotate': 'rgba(20, 184, 166, 0.3)',
  };

  const bg =
    transitionColors[overlay.transitionType] || 'rgba(99, 102, 241, 0.3)';

  return (
    <AbsoluteFill
      style={{
        background: bg,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          opacity: 0.5,
          background: `linear-gradient(90deg,
            transparent 0%,
            rgba(255,255,255,0.4) ${progress}%,
            rgba(255,255,255,0.6) ${Math.min(progress + 10, 100)}%,
            transparent 100%)`,
        }}
      />
    </AbsoluteFill>
  );
};
