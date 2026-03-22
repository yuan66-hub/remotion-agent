'use client'

import {
  useRef,
  useState,
  useEffect,
  useMemo,
  forwardRef,
  useImperativeHandle
} from 'react'
import { useEditorStore } from '@/stores/editorStore'
import { Timeline } from './Timeline'
import { Controls } from './Controls'
import { AudioController, getGlobalAudioController } from '@/lib/audio/AudioController'

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  const ms = Math.floor((seconds % 1) * 100)
  return `${mins.toString().padStart(2, '0')}:${secs
    .toString()
    .padStart(2, '0')}.${ms.toString().padStart(2, '0')}`
}

export interface VideoPlayerHandle {
  seekTo: (time: number) => void
  getCurrentTime: () => number
}

export const VideoPlayer = forwardRef<VideoPlayerHandle>((_, ref) => {
  const videoRef = useRef<HTMLVideoElement>(null)
  const audioControllerRef = useRef<AudioController | null>(null)
  const {
    video,
    currentTime,
    setCurrentTime,
    isPlaying,
    setIsPlaying,
    overlays,
    cropPreview,
    volumePreview,
    speedPreview,
    setIsPlaying: storeSetIsPlaying
  } = useEditorStore()
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [playbackRate, setPlaybackRate] = useState(1)

  // Compute effective playback rate for UI display (preview speed or user-set speed)
  const effectivePlaybackRate = useMemo(() => {
    if (speedPreview && currentTime >= speedPreview.startTime && currentTime <= speedPreview.endTime) {
      return speedPreview.speed
    }
    return playbackRate
  }, [currentTime, speedPreview, playbackRate])

  // Initialize AudioController
  useEffect(() => {
    audioControllerRef.current = getGlobalAudioController()

    return () => {
      // Don't dispose global controller, just detach
    }
  }, [])

  // Get active overlays at current time
  const activeOverlays = overlays.filter(
    overlay =>
      currentTime >= overlay.startTime && currentTime <= overlay.endTime
  )

  // Auto-stop when reaching crop preview end time
  useEffect(() => {
    if (cropPreview && currentTime >= cropPreview.endTime) {
      storeSetIsPlaying(false)
      if (videoRef.current) {
        videoRef.current.pause()
      }
    }
    // Clamp current time to crop range
    if (cropPreview && currentTime < cropPreview.startTime) {
      if (videoRef.current) {
        videoRef.current.currentTime = cropPreview.startTime
      }
      setCurrentTime(cropPreview.startTime)
    }
  }, [currentTime, cropPreview, storeSetIsPlaying, setCurrentTime])

  // Real-time volume preview effect
  useEffect(() => {
    if (volumePreview && currentTime >= volumePreview.startTime && currentTime <= volumePreview.endTime) {
      // Apply volume preview in real-time to audio context
      if (audioControllerRef.current) {
        audioControllerRef.current.setVolume(volumePreview.volume)
      } else if (videoRef.current) {
        videoRef.current.volume = Math.min(volumePreview.volume, 1)
      }
    }
  }, [currentTime, volumePreview])

  // Real-time speed preview effect
  useEffect(() => {
    if (speedPreview && currentTime >= speedPreview.startTime && currentTime <= speedPreview.endTime) {
      // Apply speed preview in real-time to video element
      if (audioControllerRef.current) {
        audioControllerRef.current.setPlaybackRate(speedPreview.speed)
      } else if (videoRef.current) {
        videoRef.current.playbackRate = speedPreview.speed
      }
    } else if (!speedPreview || currentTime < speedPreview.startTime || currentTime > speedPreview.endTime) {
      // Reset to normal speed when outside preview range
      if (audioControllerRef.current) {
        audioControllerRef.current.setPlaybackRate(1)
      } else if (videoRef.current) {
        videoRef.current.playbackRate = 1
      }
    }
  }, [currentTime, speedPreview])

  // Compute effective volume for display (preview volume or user-set volume)
  const effectiveVolume = volumePreview && currentTime >= volumePreview.startTime && currentTime <= volumePreview.endTime
    ? volumePreview.volume
    : volume

  useImperativeHandle(ref, () => ({
    seekTo: (time: number) => {
      if (videoRef.current) {
        videoRef.current.currentTime = time
        setCurrentTime(time)
      }
    },
    getCurrentTime: () => videoRef.current?.currentTime || 0
  }))

  useEffect(() => {
    if (videoRef.current && isPlaying) {
      videoRef.current.play().catch(() => setIsPlaying(false))
    } else if (videoRef.current && !isPlaying) {
      videoRef.current.pause()
    }
  }, [isPlaying, setIsPlaying])

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime)
    }
  }

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration)

      // Attach video element to AudioController
      if (audioControllerRef.current) {
        audioControllerRef.current.attachMediaElement(videoRef.current)
      }
    }
  }

  const handleSeek = (time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time
      setCurrentTime(time)
    }
  }

  const handleVolumeChange = (newVolume: number) => {
    if (audioControllerRef.current) {
      // Use AudioController for volume (supports > 1.0 gain)
      audioControllerRef.current.setVolume(newVolume)
    } else if (videoRef.current) {
      // Fallback to native video volume
      videoRef.current.volume = newVolume
    }
    setVolume(newVolume)
    setIsMuted(newVolume === 0)
  }

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted
      setIsMuted(!isMuted)
    }
  }

  const togglePlay = () => {
    // Resume audio context on first play (required by browsers)
    if (audioControllerRef.current) {
      audioControllerRef.current.resume()
    }
    setIsPlaying(!isPlaying)
  }

  const handlePlaybackRateChange = (rate: number) => {
    if (audioControllerRef.current) {
      audioControllerRef.current.setPlaybackRate(rate)
    } else if (videoRef.current) {
      videoRef.current.playbackRate = rate
    }
    setPlaybackRate(rate)
  }

  if (!video) {
    return (
      <div
        className="relative flex items-center justify-center h-full overflow-hidden rounded-lg"
        style={{
          background:
            'linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 50%, #0f0f1a 100%)'
        }}
      >
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `
                 linear-gradient(rgba(0, 255, 255, 0.1) 1px, transparent 1px),
                 linear-gradient(90deg, rgba(0, 255, 255, 0.1) 1px, transparent 1px)
               `,
            backgroundSize: '40px 40px'
          }}
        />
        <div className="absolute inset-0 bg-linear-to-t from-black/60 via-transparent to-transparent" />
        <div className="relative z-10 flex flex-col items-center gap-4">
          <div
            className="w-16 h-16 rounded-full border-2 border-cyan-500/30 flex items-center justify-center"
            style={{
              boxShadow:
                '0 0 20px rgba(0, 255, 255, 0.2), inset 0 0 20px rgba(0, 255, 255, 0.1)'
            }}
          >
            <svg
              className="w-8 h-8 text-cyan-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
          </div>
          <p className="text-cyan-400/60 font-mono text-sm tracking-wider">
            AWAITING INPUT
          </p>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-px bg-linear-to-r from-transparent via-cyan-500/50 to-transparent" />
        <div className="absolute top-0 left-0 right-0 h-px bg-linear-to-r from-transparent via-cyan-500/50 to-transparent" />
      </div>
    )
  }

  return (
    <div
      className="flex flex-col h-full rounded-lg overflow-hidden relative min-h-0"
      style={{
        background: 'linear-gradient(180deg, #0a0a0f 0%, #12121f 100%)',
        boxShadow:
          '0 0 40px rgba(0, 255, 255, 0.1), 0 0 80px rgba(99, 102, 241, 0.05), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
        border: '1px solid rgba(0, 255, 255, 0.15)'
      }}
    >
      <div
        className="absolute inset-0 opacity-10 pointer-events-none"
        style={{
          backgroundImage: `
               linear-gradient(rgba(0, 255, 255, 0.15) 1px, transparent 1px),
               linear-gradient(90deg, rgba(0, 255, 255, 0.15) 1px, transparent 1px)
             `,
          backgroundSize: '20px 20px'
        }}
      />

      <div className="relative flex-1 min-h-0">
        <video
          ref={videoRef}
          src={video.url}
          className="w-full h-full object-contain"
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={() => setIsPlaying(false)}
        />

        {/* Render active overlays */}
        {activeOverlays.map(overlay => {
          if (overlay.type === 'text') {
            return (
              <div
                key={overlay.id}
                className="absolute pointer-events-none"
                style={{
                  left: `${overlay.position.x * 100}%`,
                  top: `${overlay.position.y * 100}%`,
                  transform: 'translate(-50%, -50%)',
                  fontSize: overlay.fontSize || 48,
                  color: overlay.color || '#FFFFFF',
                  textShadow:
                    '2px 2px 4px rgba(0,0,0,0.8), -1px -1px 2px rgba(0,0,0,0.6)',
                  fontWeight: 'bold',
                  whiteSpace: 'nowrap'
                }}
              >
                {overlay.text}
              </div>
            )
          }
          if (overlay.type === 'highlight') {
            return (
              <div
                key={overlay.id}
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: `${overlay.color}33`,
                  border: `2px solid ${overlay.color}`
                }}
              />
            )
          }
          return null
        })}

        {/* Crop preview region overlay */}
        {cropPreview && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {/* Dark overlay for regions outside crop */}
            {/* Top darkened region */}
            <div
              className="absolute bg-black/60"
              style={{
                top: 0,
                left: 0,
                right: 0,
                height: `${(cropPreview.startTime / duration) * 100}%`
              }}
            />
            {/* Bottom darkened region */}
            <div
              className="absolute bg-black/60"
              style={{
                bottom: 0,
                left: 0,
                right: 0,
                top: `${(cropPreview.endTime / duration) * 100}%`
              }}
            />
            {/* Crop region border */}
            <div
              className="absolute border-2 border-cyan-400"
              style={{
                top: 0,
                left: 0,
                right: 0,
                height: '100%',
                boxShadow:
                  '0 0 20px rgba(0, 255, 255, 0.5), inset 0 0 20px rgba(0, 255, 255, 0.1)'
              }}
            />
            {/* Crop region labels */}
            <div
              className="absolute bg-cyan-500/90 text-black text-xs px-2 py-1 rounded font-mono"
              style={{
                top: 4,
                left: 4
              }}
            >
              IN: {formatTime(cropPreview.startTime)}
            </div>
            <div
              className="absolute bg-cyan-500/90 text-black text-xs px-2 py-1 rounded font-mono"
              style={{
                top: 4,
                right: 4
              }}
            >
              OUT: {formatTime(cropPreview.endTime)}
            </div>
          </div>
        )}

        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse at center, transparent 0%, rgba(0,0,0,0.3) 100%)'
          }}
        />
        {isPlaying && (
          <div className="absolute top-0 left-0 right-0 h-px bg-linear-to-r from-cyan-500/0 via-cyan-400/50 to-cyan-500/0 animate-pulse" />
        )}
      </div>

      <div className="relative z-10">
        <div className="absolute -top-px left-0 right-0 h-px bg-linear-to-r from-transparent via-cyan-500/60 to-transparent" />
        <Timeline
          currentTime={currentTime}
          duration={duration}
          onSeek={handleSeek}
          cropPreview={cropPreview}
        />
      </div>

      <div className="relative z-10">
        <div className="absolute -bottom-px left-0 right-0 h-px bg-linear-to-r from-transparent via-cyan-500/40 to-transparent" />
        <Controls
          isPlaying={isPlaying}
          currentTime={currentTime}
          duration={duration}
          volume={effectiveVolume}
          isMuted={isMuted}
          playbackRate={effectivePlaybackRate}
          onTogglePlay={togglePlay}
          onSeek={handleSeek}
          onVolumeChange={handleVolumeChange}
          onToggleMute={toggleMute}
          onPlaybackRateChange={handlePlaybackRateChange}
        />
      </div>
    </div>
  )
})

VideoPlayer.displayName = 'VideoPlayer'
