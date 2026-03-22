/**
 * AudioController - Web Audio API based audio controller
 * Provides advanced audio control with GainNode for volume (supports > 1.0 gain)
 * and playbackRate control for video elements
 */
export class AudioController {
  private audioContext: AudioContext | null = null
  private sourceNode: MediaElementAudioSourceNode | null = null
  private gainNode: GainNode | null = null
  private mediaElement: HTMLVideoElement | null = null
  private isInitialized = false

  constructor() {
    // AudioContext will be created on first user interaction
  }

  /**
   * Initialize AudioContext - must be called after user interaction
   * due to browser autoplay policies
   */
  private ensureContext(): AudioContext {
    if (!this.audioContext) {
      this.audioContext = new AudioContext()
      this.gainNode = this.audioContext.createGain()
      this.gainNode.connect(this.audioContext.destination)
    }

    // Resume context if suspended (browser autoplay policy)
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume()
    }

    return this.audioContext
  }

  /**
   * Attach a video element to this controller
   * This must be called when the video element is ready
   */
  attachMediaElement(video: HTMLVideoElement): void {
    this.mediaElement = video

    // Create or recreate source node
    this.rebuildSourceNode()
  }

  /**
   * Rebuild the source node connection
   * Called when attaching a new media element
   */
  private rebuildSourceNode(): void {
    if (!this.mediaElement || !this.audioContext || !this.gainNode) {
      return
    }

    // Disconnect existing source if any
    if (this.sourceNode) {
      try {
        this.sourceNode.disconnect()
      } catch {
        // Ignore disconnect errors
      }
    }

    // Create new source from the media element
    try {
      this.sourceNode = this.audioContext.createMediaElementSource(this.mediaElement)
      this.sourceNode.connect(this.gainNode)
    } catch (error) {
      // Source might already be created for this element
      console.warn('[AudioController] Could not create media element source:', error)
    }
  }

  /**
   * Set volume with optional gain boost
   * Volume can exceed 1.0 for gain boost (be careful with audio levels)
   */
  setVolume(volume: number): void {
    const context = this.ensureContext()
    if (this.gainNode) {
      // Clamp to minimum of 0
      this.gainNode.gain.value = Math.max(0, volume)
    }

    // Also update the media element volume for video element display
    if (this.mediaElement) {
      // Video volume should be capped at 1.0 for display purposes
      this.mediaElement.volume = Math.min(volume, 1)
    }
  }

  /**
   * Get current volume setting
   */
  getVolume(): number {
    return this.gainNode?.gain.value ?? 1
  }

  /**
   * Set playback rate (speed) for video
   * Range typically 0.25 to 2.0, but can vary by browser
   */
  setPlaybackRate(rate: number): void {
    if (this.mediaElement) {
      this.mediaElement.playbackRate = rate
    }
  }

  /**
   * Get current playback rate
   */
  getPlaybackRate(): number {
    return this.mediaElement?.playbackRate ?? 1
  }

  /**
   * Resume audio context if suspended
   * Call this on user interaction to enable audio
   */
  async resume(): Promise<void> {
    const context = this.ensureContext()
    if (context.state === 'suspended') {
      await context.resume()
    }
  }

  /**
   * Get current audio context state
   */
  getState(): AudioContextState | null {
    return this.audioContext?.state ?? null
  }

  /**
   * Check if this controller has an attached media element
   */
  hasMediaElement(): boolean {
    return this.mediaElement !== null
  }

  /**
   * Dispose of all audio resources
   * Call this when unmounting or cleaning up
   */
  dispose(): void {
    if (this.sourceNode) {
      try {
        this.sourceNode.disconnect()
      } catch {
        // Ignore
      }
      this.sourceNode = null
    }

    if (this.audioContext) {
      try {
        this.audioContext.close()
      } catch {
        // Ignore
      }
      this.audioContext = null
    }

    this.gainNode = null
    this.mediaElement = null
    this.isInitialized = false
  }
}

// Singleton-like factory for consistent audio control across the app
let globalAudioController: AudioController | null = null

export function getGlobalAudioController(): AudioController {
  if (!globalAudioController) {
    globalAudioController = new AudioController()
  }
  return globalAudioController
}

export function disposeGlobalAudioController(): void {
  if (globalAudioController) {
    globalAudioController.dispose()
    globalAudioController = null
  }
}
