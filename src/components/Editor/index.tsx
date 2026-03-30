'use client'

import { useRef, useState } from 'react'
import { useEditorStore } from '@/stores/editorStore'
import { VideoPlayer, type VideoPlayerHandle } from '@/components/VideoPlayer'
import { ChatPanel } from '@/components/ChatPanel'
import { UploadZone } from '@/components/UploadZone'
import type { Instruction } from '@/lib/instructions/types'
import {
  createTextOverlay,
  createHighlightOverlay,
  createTransitionOverlay
} from '@/lib/instructions/remotion'
import type { TextAnimationConfig, TextAnimationType } from '@/lib/instructions/types'
import { getGlobalAudioController } from '@/lib/audio/AudioController'

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export function Editor() {
  const {
    video,
    instructions,
    isProcessing,
    renderProgress,
    setRenderJobId,
    setRenderProgress,
    updateInstruction,
    overlays,
    updateOverlay,
    addOverlay,
    setCropPreview,
    cropPreview,
    setVolumePreview,
    volumePreview,
    setSpeedPreview,
    speedPreview
  } = useEditorStore()
  const videoPlayerRef = useRef<VideoPlayerHandle>(null)
  const [showInstructions, setShowInstructions] = useState(false)
  const [selectedInstruction, setSelectedInstruction] =
    useState<Instruction | null>(null)
  const [cropLoading, setCropLoading] = useState(false)
  const [volumeLoading, setVolumeLoading] = useState(false)
  const [speedLoading, setSpeedLoading] = useState(false)

  const handleSeek = (time: number) => {
    videoPlayerRef.current?.seekTo(time)
  }

  const handleApproveInstruction = async (instruction: Instruction) => {
    console.log('[Editor] handleApproveInstruction called:', instruction)
    const inst = instruction as {
      type: string
      params: Record<string, unknown>
    }

    // Update status to approved
    updateInstruction(instruction.id, { status: 'approved' })
    setSelectedInstruction(null)

    // Execute the instruction based on type
    if (
      inst.type === 'addText' ||
      inst.type === 'addHighlight' ||
      inst.type === 'addTransition'
    ) {
      console.log('[Editor] Setting instruction to complete')
      // Add to overlays store for rendering
      if (instruction.type === 'addText') {
        // 构建动画配置
        const animationConfig: TextAnimationConfig | undefined =
          inst.params.animation as TextAnimationConfig;
        const entranceAnimation = inst.params.entranceAnimation as TextAnimationType | undefined;
        const exitAnimation = inst.params.exitAnimation as TextAnimationType | undefined;
        const animationDuration = inst.params.animationDuration as number | undefined;

        addOverlay(
          createTextOverlay({
            startTime: inst.params.startTime as number,
            endTime: inst.params.endTime as number,
            text: inst.params.text as string,
            position: inst.params.position as { x: number; y: number },
            fontSize: inst.params.fontSize as number,
            color: inst.params.color as string,
            animation: animationConfig,
            entranceAnimation,
            exitAnimation,
            animationDuration
          })
        )
      } else if (instruction.type === 'addHighlight') {
        addOverlay(
          createHighlightOverlay({
            startTime: inst.params.startTime as number,
            endTime: inst.params.endTime as number,
            color: inst.params.color as string
          })
        )
      } else if (instruction.type === 'addTransition') {
        addOverlay(
          createTransitionOverlay({
            startTime: inst.params.startTime as number,
            endTime: inst.params.endTime as number,
            effect: (inst.params.effect || inst.params.type) as
              | 'fade'
              | 'dissolve'
              | 'slide'
              | 'fade-blur'
              | 'dissolve-zoom'
              | 'slide-rotate'
          })
        )
      }
      updateInstruction(instruction.id, { status: 'complete' })
      // Seek to the start time to preview
      if (typeof inst.params.startTime === 'number') {
        console.log('[Editor] Seeking to:', inst.params.startTime)
        handleSeek(inst.params.startTime)
      }
    } else if (inst.type === 'crop') {
      // For crop, activate preview first
      const startTime = inst.params.startTime as number
      const endTime = inst.params.endTime as number
      setCropPreview({ startTime, endTime })
      updateInstruction(instruction.id, { status: 'approved' })
      // Seek to start of crop region
      handleSeek(startTime)
    } else if (inst.type === 'changeVolume') {
      // For changeVolume, activate real-time preview
      const startTime = inst.params.startTime as number
      const endTime = inst.params.endTime as number
      const volume = inst.params.volume as number
      setVolumePreview({ startTime, endTime, volume })
      updateInstruction(instruction.id, { status: 'approved' })
      // Seek to start of volume change region
      handleSeek(startTime)
    } else if (inst.type === 'changeSpeed') {
      // For changeSpeed, activate real-time preview
      const startTime = inst.params.startTime as number
      const endTime = inst.params.endTime as number
      const speed = inst.params.speed as number
      setSpeedPreview({ startTime, endTime, speed })
      updateInstruction(instruction.id, { status: 'approved' })
      // Seek to start of speed change region
      handleSeek(startTime)
    } else if (
      inst.type === 'splitClip' ||
      inst.type === 'deleteClip'
    ) {
      // For other ffmpeg operations, mark as executing
      updateInstruction(instruction.id, { status: 'executing' })
    }
  }

  const handleRejectInstruction = (instruction: Instruction) => {
    updateInstruction(instruction.id, {
      status: 'error',
      error: 'rejected by user'
    })
    setSelectedInstruction(null)
  }

  const handleExecuteInstruction = async (instruction: unknown) => {
    console.log('[Editor] handleExecuteInstruction called:', instruction)
    if (!video) {
      console.log('[Editor] No video, returning')
      return
    }

    const inst = instruction as {
      type: string
      params: Record<string, unknown>
      id: string
    }

    console.log('[Editor] Instruction type:', inst.type)

    // Auto-execute Remotion overlays (addText, addHighlight, addTransition)
    if (
      inst.type === 'addText' ||
      inst.type === 'addHighlight' ||
      inst.type === 'addTransition'
    ) {
      console.log('[Editor] Auto-executing Remotion overlay')
      // Add to overlays store for rendering
      if (inst.type === 'addText') {
        // 构建动画配置
        const animationConfig: TextAnimationConfig | undefined =
          inst.params.animation as TextAnimationConfig;
        const entranceAnimation = inst.params.entranceAnimation as TextAnimationType | undefined;
        const exitAnimation = inst.params.exitAnimation as TextAnimationType | undefined;
        const animationDuration = inst.params.animationDuration as number | undefined;

        addOverlay(
          createTextOverlay({
            startTime: inst.params.startTime as number,
            endTime: inst.params.endTime as number,
            text: inst.params.text as string,
            position: inst.params.position as { x: number; y: number },
            fontSize: inst.params.fontSize as number,
            color: inst.params.color as string,
            animation: animationConfig,
            entranceAnimation,
            exitAnimation,
            animationDuration
          })
        )
      } else if (inst.type === 'addHighlight') {
        addOverlay(
          createHighlightOverlay({
            startTime: inst.params.startTime as number,
            endTime: inst.params.endTime as number,
            color: inst.params.color as string
          })
        )
      } else if (inst.type === 'addTransition') {
        addOverlay(
          createTransitionOverlay({
            startTime: inst.params.startTime as number,
            endTime: inst.params.endTime as number,
            effect: (inst.params.effect || inst.params.type) as
              | 'fade'
              | 'dissolve'
              | 'slide'
              | 'fade-blur'
              | 'dissolve-zoom'
              | 'slide-rotate'
          })
        )
      }
      updateInstruction(inst.id, { status: 'complete' })
      if (typeof inst.params.startTime === 'number') {
        handleSeek(inst.params.startTime)
      }
      return
    }

    // modifyText: update an existing text overlay
    if (inst.type === 'modifyText') {
      const textId = inst.params.textId as string
      const overlay = overlays.find(o => o.id === textId)
      if (overlay && overlay.type === 'text') {
        console.log('[Editor] Modifying text overlay:', textId)
        updateOverlay(textId, {
          text:
            (inst.params.text as string) || (overlay as { text?: string }).text,
          position:
            (inst.params.position as { x: number; y: number }) ||
            overlay.position,
          fontSize:
            (inst.params.fontSize as number) ||
            (overlay as { fontSize?: number }).fontSize,
          color:
            (inst.params.color as string) ||
            (overlay as { color?: string }).color,
          startTime: (inst.params.startTime as number) || overlay.startTime,
          endTime: (inst.params.endTime as number) || overlay.endTime
        })
        updateInstruction(inst.id, { status: 'complete' })
      } else {
        console.log('[Editor] Text overlay not found:', textId)
        updateInstruction(inst.id, {
          status: 'error',
          error: 'Text overlay not found'
        })
      }
      return
    }

    // Auto-execute FFmpeg operations
    if (
      inst.type === 'crop' ||
      inst.type === 'splitClip' ||
      inst.type === 'deleteClip' ||
      inst.type === 'changeSpeed' ||
      inst.type === 'changeVolume'
    ) {
      // For crop, activate preview first instead of immediate execution
      if (inst.type === 'crop') {
        const startTime = inst.params.startTime as number
        const endTime = inst.params.endTime as number
        setCropPreview({ startTime, endTime })
        updateInstruction(inst.id, { status: 'approved' })
        handleSeek(startTime)
        return
      }

      // For changeVolume, activate real-time preview
      if (inst.type === 'changeVolume') {
        const startTime = inst.params.startTime as number
        const endTime = inst.params.endTime as number
        const volume = inst.params.volume as number
        setVolumePreview({ startTime, endTime, volume })
        updateInstruction(inst.id, { status: 'approved' })
        handleSeek(startTime)
        return
      }

      // For changeSpeed, activate real-time preview
      if (inst.type === 'changeSpeed') {
        const startTime = inst.params.startTime as number
        const endTime = inst.params.endTime as number
        const speed = inst.params.speed as number
        setSpeedPreview({ startTime, endTime, speed })
        updateInstruction(inst.id, { status: 'approved' })
        handleSeek(startTime)
        return
      }

      console.log('[Editor] Auto-executing FFmpeg operation:', inst.type)
      updateInstruction(inst.id, { status: 'executing' })

      try {
        const response = await fetch('/api/video/process', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            videoId: video.id,
            instruction: {
              type: inst.type,
              params: inst.params
            }
          })
        })

        const data = await response.json()

        if (data.success) {
          console.log('[Editor] FFmpeg operation completed:', data.outputPath)
          updateInstruction(inst.id, { status: 'complete' })

          // Seek to start time if applicable
          if (typeof inst.params.startTime === 'number') {
            handleSeek(inst.params.startTime)
          }
        } else {
          console.error('[Editor] FFmpeg operation failed:', data.error)
          updateInstruction(inst.id, {
            status: 'error',
            error: data.error || 'Processing failed'
          })
        }
      } catch (error) {
        console.error('[Editor] FFmpeg API call failed:', error)
        updateInstruction(inst.id, {
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
      return
    }

    // For render instruction, start the render process
    if (inst.type === 'render') {
      setIsProcessing(true)
      setRenderProgress(0)
      try {
        const response = await fetch('/api/render', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            videoId: video.id,
            overlays,
            outputFormat: inst.params.outputFormat || 'mp4',
            quality: inst.params.quality || 'medium'
          })
        })

        const data = await response.json()
        setRenderJobId(data.jobId)

        // Poll for render status and progress
        const pollInterval = setInterval(async () => {
          const statusRes = await fetch(`/api/render/${data.jobId}`)
          const statusData = await statusRes.json()

          // Update progress
          if (typeof statusData.progress === 'number') {
            setRenderProgress(statusData.progress)
          }

          if (
            statusData.status === 'complete' ||
            statusData.status === 'error'
          ) {
            clearInterval(pollInterval)
            setIsProcessing(false)
            setRenderProgress(null)
            if (statusData.status === 'complete' && statusData.outputPath) {
              // Auto-download the rendered video
              const link = document.createElement('a')
              link.href = statusData.outputPath
              link.download = statusData.outputPath.split('/').pop() || 'output.mp4'
              document.body.appendChild(link)
              link.click()
              document.body.removeChild(link)
            } else if (statusData.status === 'error') {
              alert(`Render failed: ${statusData.error}`)
            }
          }
        }, 1000)
      } catch (error) {
        console.error('Render error:', error)
        setIsProcessing(false)
        setRenderProgress(null)
      }
    }
  }

  const setIsProcessing = (processing: boolean) => {
    useEditorStore.setState({ isProcessing: processing })
  }

  return (
    <div className="flex flex-col h-screen bg-gray-900">
      {/* Header - 独占一行 */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
        <h1 className="text-xl font-semibold text-white">AI Video Editor</h1>
        {video && (
          <button
            onClick={() => setShowInstructions(!showInstructions)}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
          >
            {showInstructions ? 'Hide' : 'Show'} Instructions (
            {instructions.length})
          </button>
        )}
      </div>

      {/* Content area - 下方左右分栏 */}
      <div className="flex flex-1 overflow-hidden">
        {/* 左侧主内容区 */}
        <div className="flex-1 flex flex-col p-4 min-h-0">
          {/* Video Player */}
          <div className="flex-1 min-h-0">
            {video ? <VideoPlayer ref={videoPlayerRef} /> : <UploadZone />}
          </div>

          {/* Crop Preview Controls */}
          {cropPreview && (
            <div className="mt-4 p-4 bg-cyan-900/30 border border-cyan-500/50 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-cyan-400 font-mono text-sm">
                    📹 Crop Preview
                  </span>
                  <span className="text-gray-300 text-sm">
                    {formatTime(cropPreview.startTime)} →{' '}
                    {formatTime(cropPreview.endTime)}
                  </span>
                  <span className="text-gray-500 text-xs">
                    ({(cropPreview.endTime - cropPreview.startTime).toFixed(1)}
                    s)
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCropPreview(null)}
                    className="px-3 py-1.5 text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 rounded transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      // Find the approved crop instruction and execute it
                      const cropInst = instructions.find(
                        i => i.type === 'crop' && i.status === 'approved'
                      )
                      if (cropInst) {
                        setCropLoading(true)
                        // Execute the crop via API
                        try {
                          const response = await fetch('/api/video/process', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              videoId: video?.id,
                              instruction: {
                                type: 'crop',
                                params: cropInst.params
                              }
                            })
                          })
                          const data = await response.json()
                          if (data.success && data.outputPath) {
                            const { setVideo } = useEditorStore.getState()
                            if (video) {
                              setVideo({
                                ...video,
                                url: data.outputPath,
                                duration:
                                  cropPreview.endTime - cropPreview.startTime
                              })
                            }
                            updateInstruction(cropInst.id, {
                              status: 'complete'
                            })
                            setCropPreview(null)
                          }
                        } catch (error) {
                          console.error(
                            '[Editor] Crop execution failed:',
                            error
                          )
                        } finally {
                          setCropLoading(false)
                        }
                      }
                    }}
                    disabled={cropLoading}
                    className="px-3 py-1.5 text-xs bg-cyan-600 hover:bg-cyan-700 text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                  >
                    {cropLoading ? (
                      <>
                        <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Processing...
                      </>
                    ) : (
                      'Confirm & Apply'
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Volume Preview Controls */}
          {volumePreview && (
            <div className="mt-4 p-4 bg-purple-900/30 border border-purple-500/50 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-purple-400 font-mono text-sm">
                    🔊 Volume Preview
                  </span>
                  <span className="text-gray-300 text-sm">
                    {formatTime(volumePreview.startTime)} →{' '}
                    {formatTime(volumePreview.endTime)}
                  </span>
                  <span className="text-purple-400 font-mono text-sm">
                    {Math.round(volumePreview.volume * 100)}%
                  </span>
                  <span className="text-gray-500 text-xs">
                    (
                    {(volumePreview.endTime - volumePreview.startTime).toFixed(
                      1
                    )}
                    s)
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      // Reset volume to default when canceling
                      if (videoPlayerRef.current) {
                        const audioCtrl = getGlobalAudioController()
                        audioCtrl.setVolume(1)
                      }
                      setVolumePreview(null)
                      // Mark instruction as rejected
                      const volInst = instructions.find(
                        i =>
                          i.type === 'changeVolume' && i.status === 'approved'
                      )
                      if (volInst) {
                        updateInstruction(volInst.id, {
                          status: 'error',
                          error: 'cancelled by user'
                        })
                      }
                    }}
                    className="px-3 py-1.5 text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 rounded transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      // Find the approved changeVolume instruction and execute it
                      const volInst = instructions.find(
                        i =>
                          i.type === 'changeVolume' && i.status === 'approved'
                      )
                      if (volInst) {
                        setVolumeLoading(true)
                        // Execute the volume change via API
                        try {
                          const response = await fetch('/api/video/process', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              videoId: video?.id,
                              instruction: {
                                type: 'changeVolume',
                                params: volInst.params
                              }
                            })
                          })
                          const data = await response.json()
                          if (data.success && data.outputPath) {
                            const { setVideo } = useEditorStore.getState()
                            if (video) {
                              setVideo({
                                ...video,
                                url: data.outputPath
                              })
                            }
                            updateInstruction(volInst.id, {
                              status: 'complete'
                            })
                            // Reset volume to 100% after applying
                            const audioCtrl = getGlobalAudioController()
                            audioCtrl.setVolume(1)
                            setVolumePreview(null)
                          }
                        } catch (error) {
                          console.error(
                            '[Editor] Volume change execution failed:',
                            error
                          )
                        } finally {
                          setVolumeLoading(false)
                        }
                      }
                    }}
                    disabled={volumeLoading}
                    className="px-3 py-1.5 text-xs bg-purple-600 hover:bg-purple-700 text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                  >
                    {volumeLoading ? (
                      <>
                        <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Processing...
                      </>
                    ) : (
                      'Confirm & Apply'
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Speed Preview Controls */}
          {speedPreview && (
            <div className="mt-4 p-4 bg-orange-900/30 border border-orange-500/50 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-orange-400 font-mono text-sm">
                    ⚡ Speed Preview
                  </span>
                  <span className="text-gray-300 text-sm">
                    {formatTime(speedPreview.startTime)} →{' '}
                    {formatTime(speedPreview.endTime)}
                  </span>
                  <span className="text-orange-400 font-mono text-sm">
                    {speedPreview.speed}x
                  </span>
                  <span className="text-gray-500 text-xs">
                    ({(speedPreview.endTime - speedPreview.startTime).toFixed(1)}s)
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      if (videoPlayerRef.current) {
                        const audioCtrl = getGlobalAudioController()
                        audioCtrl.setPlaybackRate(1)
                      }
                      setSpeedPreview(null)
                      const speedInst = instructions.find(
                        i => i.type === 'changeSpeed' && i.status === 'approved'
                      )
                      if (speedInst) {
                        updateInstruction(speedInst.id, {
                          status: 'error',
                          error: 'cancelled by user'
                        })
                      }
                    }}
                    className="px-3 py-1.5 text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 rounded transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      const speedInst = instructions.find(
                        i => i.type === 'changeSpeed' && i.status === 'approved'
                      )
                      if (speedInst) {
                        setSpeedLoading(true)
                        try {
                          const response = await fetch('/api/video/process', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              videoId: video?.id,
                              instruction: { type: 'changeSpeed', params: speedInst.params }
                            })
                          })
                          const data = await response.json()
                          if (data.success && data.outputPath) {
                            const { setVideo } = useEditorStore.getState()
                            if (video) {
                              setVideo({ ...video, url: data.outputPath })
                            }
                            updateInstruction(speedInst.id, { status: 'complete' })
                            const audioCtrl = getGlobalAudioController()
                            audioCtrl.setPlaybackRate(1)
                            setSpeedPreview(null)
                          }
                        } catch (error) {
                          console.error('[Editor] Speed change execution failed:', error)
                        } finally {
                          setSpeedLoading(false)
                        }
                      }
                    }}
                    disabled={speedLoading}
                    className="px-3 py-1.5 text-xs bg-orange-600 hover:bg-orange-700 text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                  >
                    {speedLoading ? (
                      <>
                        <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Processing...
                      </>
                    ) : (
                      'Confirm & Apply'
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Instructions panel */}
          {showInstructions && instructions.length > 0 && (
            <div className="mt-4 p-4 bg-gray-800 rounded-lg max-h-[200px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-500 scrollbar-track-gray-800">
              <h2 className="text-sm font-medium text-gray-300 mb-2">
                Instructions ({instructions.length})
              </h2>
              <div className="space-y-2">
                {instructions.map(inst => (
                  <div
                    key={inst.id}
                    className={`flex items-center gap-2 p-2 bg-gray-700 rounded ${
                      selectedInstruction?.id === inst.id
                        ? 'ring-2 ring-blue-500'
                        : ''
                    }`}
                  >
                    <span
                      className={`px-2 py-1 text-xs rounded ${
                        inst.status === 'pending'
                          ? 'bg-yellow-600'
                          : inst.status === 'approved'
                          ? 'bg-green-600'
                          : inst.status === 'executing'
                          ? 'bg-blue-600'
                          : inst.status === 'complete'
                          ? 'bg-gray-600'
                          : 'bg-red-600'
                      }`}
                    >
                      {inst.status}
                    </span>
                    <span className="text-sm text-white font-medium">
                      {inst.type}
                    </span>
                    <span className="text-xs text-gray-400 flex-1 truncate">
                      {JSON.stringify(inst.params)}
                    </span>
                    {inst.status === 'pending' && (
                      <div className="flex gap-1 ml-2">
                        <button
                          onClick={() => setSelectedInstruction(inst)}
                          className="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded"
                        >
                          查看
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Instruction detail modal */}
          {selectedInstruction && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-gray-800 p-6 rounded-lg max-w-md w-full">
                <h3 className="text-lg font-medium text-white mb-4">
                  确认执行指令
                </h3>
                <div className="mb-4">
                  <p className="text-gray-300 mb-2">
                    <span className="font-medium">类型:</span>{' '}
                    {selectedInstruction.type}
                  </p>
                  <p className="text-gray-300 mb-2">
                    <span className="font-medium">参数:</span>
                  </p>
                  <pre className="bg-gray-900 p-3 rounded text-sm text-gray-400 overflow-auto">
                    {JSON.stringify(selectedInstruction.params, null, 2)}
                  </pre>
                </div>
                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => handleRejectInstruction(selectedInstruction)}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg"
                  >
                    取消
                  </button>
                  <button
                    onClick={() =>
                      handleApproveInstruction(selectedInstruction)
                    }
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg"
                  >
                    确认执行
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 右侧聊天面板 */}
        <div className="w-[400px] p-4 pl-0">
          <ChatPanel
            onSeek={handleSeek}
            onExecuteInstruction={handleExecuteInstruction}
          />
        </div>
      </div>

      {/* Processing overlay with progress */}
      {isProcessing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-lg flex flex-col items-center min-w-[300px]">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <p className="mt-4 text-white">Rendering your video...</p>
            {renderProgress !== null && (
              <div className="mt-3 w-full">
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>Progress</span>
                  <span>{Math.round(renderProgress * 100)}%</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${Math.round(renderProgress * 100)}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
