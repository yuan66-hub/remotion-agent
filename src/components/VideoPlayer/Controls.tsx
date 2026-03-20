'use client';

import { useCallback } from 'react';

interface ControlsProps {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  onTogglePlay: () => void;
  onSeek: (time: number) => void;
  onVolumeChange: (volume: number) => void;
  onToggleMute: () => void;
}

export function Controls({
  isPlaying,
  currentTime,
  duration,
  volume,
  isMuted,
  onTogglePlay,
  onSeek,
  onVolumeChange,
  onToggleMute,
}: ControlsProps) {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const skipBackward = useCallback(() => {
    onSeek(Math.max(0, currentTime - 5));
  }, [currentTime, onSeek]);

  const skipForward = useCallback(() => {
    onSeek(Math.min(duration, currentTime + 5));
  }, [currentTime, duration, onSeek]);

  return (
    <div className="px-4 py-3" style={{ background: 'linear-gradient(180deg, rgba(10, 10, 20, 0.98) 0%, rgba(20, 20, 35, 0.95) 100%)' }}>
      <div className="flex items-center gap-3">
        <button
          onClick={skipBackward}
          className="p-2 rounded-lg transition-all duration-200 cursor-pointer"
          style={{
            color: 'rgba(0, 212, 255, 0.7)',
            background: 'rgba(0, 212, 255, 0.05)',
            border: '1px solid rgba(0, 212, 255, 0.2)',
          }}
          title="Skip back 5 seconds"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0019 16V8a1 1 0 00-1.6-.8l-5.333 4zM4.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0011 16V8a1 1 0 00-1.6-.8l-5.334 4z" />
          </svg>
        </button>

        <button
          onClick={onTogglePlay}
          className="p-3 rounded-full transition-all duration-200 cursor-pointer"
          style={{
            background: isPlaying
              ? 'linear-gradient(135deg, #7c3aed 0%, #00d4ff 100%)'
              : 'linear-gradient(135deg, #00d4ff 0%, #7c3aed 100%)',
            boxShadow: isPlaying
              ? '0 0 20px rgba(124, 58, 237, 0.5), 0 0 40px rgba(0, 212, 255, 0.3)'
              : '0 0 20px rgba(0, 212, 255, 0.5), 0 0 40px rgba(124, 58, 237, 0.3)',
          }}
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? (
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6" />
            </svg>
          ) : (
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
        </button>

        <button
          onClick={skipForward}
          className="p-2 rounded-lg transition-all duration-200 cursor-pointer"
          style={{
            color: 'rgba(0, 212, 255, 0.7)',
            background: 'rgba(0, 212, 255, 0.05)',
            border: '1px solid rgba(0, 212, 255, 0.2)',
          }}
          title="Skip forward 5 seconds"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.933 12.8a1 1 0 000-1.6L6.6 7.2A1 1 0 005 8v8a1 1 0 001.6.8l5.333-4zM19.933 12.8a1 1 0 000-1.6l-5.333-4A1 1 0 0013 8v8a1 1 0 001.6.8l5.333-4z" />
          </svg>
        </button>

        <span className="text-sm font-mono tracking-wider min-w-[120px]" style={{ color: '#00d4ff' }}>
          {formatTime(currentTime)} <span style={{ color: 'rgba(255, 255, 255, 0.3)' }}>/</span>{' '}
          <span style={{ color: 'rgba(255, 255, 255, 0.5)' }}>{formatTime(duration)}</span>
        </span>

        <div className="flex-1" />

        <div className="flex items-center gap-2">
          <button
            onClick={onToggleMute}
            className="p-2 rounded-lg transition-all duration-200 cursor-pointer"
            style={{
              color: isMuted || volume === 0 ? 'rgba(239, 68, 68, 0.8)' : 'rgba(0, 212, 255, 0.7)',
              background: 'rgba(0, 212, 255, 0.05)',
              border: `1px solid ${isMuted || volume === 0 ? 'rgba(239, 68, 68, 0.3)' : 'rgba(0, 212, 255, 0.2)'}`,
            }}
          >
            {isMuted || volume === 0 ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              </svg>
            )}
          </button>
          <div className="relative w-20 h-6 flex items-center">
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={isMuted ? 0 : volume}
              onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
              className="w-full h-1 rounded-full appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, #00d4ff ${(isMuted ? 0 : volume) * 100}%, rgba(255, 255, 255, 0.2) ${(isMuted ? 0 : volume) * 100}%)`,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
