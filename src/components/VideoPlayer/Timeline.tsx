'use client'

import { useCallback } from 'react'

interface CropPreview {
  startTime: number
  endTime: number
}

interface TimelineProps {
  currentTime: number
  duration: number
  onSeek: (time: number) => void
  cropPreview?: CropPreview | null
}

export function Timeline({ currentTime, duration, onSeek, cropPreview }: TimelineProps) {
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0
  const cropStartPercent = cropPreview ? (cropPreview.startTime / duration) * 100 : 0
  const cropEndPercent = cropPreview ? (cropPreview.endTime / duration) * 100 : 100

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect()
      const x = e.clientX - rect.left
      const percentage = x / rect.width
      let newTime = percentage * duration

      // If crop preview is active, clamp to crop range
      if (cropPreview) {
        newTime = Math.max(cropPreview.startTime, Math.min(cropPreview.endTime, newTime))
      } else {
        newTime = Math.max(0, Math.min(duration, newTime))
      }
      onSeek(newTime)
    },
    [duration, onSeek, cropPreview]
  )

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div
      className="px-4 py-3"
      style={{
        background:
          'linear-gradient(180deg, rgba(20, 20, 35, 0.95) 0%, rgba(10, 10, 20, 0.98) 100%)'
      }}
    >
      <div
        className="relative h-1.5 rounded-full cursor-pointer group"
        style={{
          background: 'rgba(255, 255, 255, 0.1)',
          boxShadow: 'inset 0 0 10px rgba(0, 0, 0, 0.5)'
        }}
        onClick={handleClick}
      >
        {/* Crop preview region highlight */}
        {cropPreview && (
          <div
            className="absolute h-full"
            style={{
              left: `${cropStartPercent}%`,
              width: `${cropEndPercent - cropStartPercent}%`,
              background: 'rgba(0, 255, 255, 0.2)',
              border: '1px solid rgba(0, 255, 255, 0.5)',
              borderLeft: 'none',
              borderRight: 'none'
            }}
          />
        )}

        <div
          className="absolute h-full rounded-full"
          style={{
            width: `${progress}%`,
            background:
              'linear-gradient(90deg, #00d4ff 0%, #7c3aed 50%, #00d4ff 100%)',
            boxShadow:
              '0 0 10px rgba(0, 212, 255, 0.5), 0 0 20px rgba(124, 58, 237, 0.3)'
          }}
        />

        {/* Crop region markers */}
        {cropPreview && (
          <>
            <div
              className="absolute w-0.5 h-3 bg-cyan-400"
              style={{
                left: `calc(${cropStartPercent}% - 1px)`,
                top: '50%',
                transform: 'translateY(-50%)',
                boxShadow: '0 0 8px rgba(0, 255, 255, 0.8)'
              }}
            />
            <div
              className="absolute w-0.5 h-3 bg-cyan-400"
              style={{
                left: `calc(${cropEndPercent}% - 1px)`,
                top: '50%',
                transform: 'translateY(-50%)',
                boxShadow: '0 0 8px rgba(0, 255, 255, 0.8)'
              }}
            />
          </>
        )}

        <div
          className="absolute w-3 h-3 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-150"
          style={{
            left: `calc(${progress}% - 6px)`,
            top: '50%',
            transform: 'translateY(-50%)',
            background: '#00d4ff',
            boxShadow:
              '0 0 10px rgba(0, 212, 255, 0.8), 0 0 20px rgba(0, 212, 255, 0.4)'
          }}
        />
        <div
          className="absolute w-5 h-5 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-150"
          style={{
            left: `calc(${progress}% - 10px)`,
            top: '50%',
            transform: 'translateY(-50%)',
            background:
              'radial-gradient(circle, rgba(0, 212, 255, 0.3) 0%, transparent 70%)'
          }}
        />
      </div>
      <div className="flex justify-between mt-2 text-xs font-mono tracking-wider">
        <span style={{ color: '#00d4ff' }}>{formatTime(currentTime)}</span>
        {cropPreview && (
          <span className="text-cyan-400">
            CUT: {formatTime(cropPreview.startTime)} - {formatTime(cropPreview.endTime)}
          </span>
        )}
        <span style={{ color: 'rgba(255, 255, 255, 0.4)' }}>
          {formatTime(duration)}
        </span>
      </div>
    </div>
  )
}
