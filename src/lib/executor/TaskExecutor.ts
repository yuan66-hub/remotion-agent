import { usePlanStore } from '@/stores/planStore';
import { useEditorStore } from '@/stores/editorStore';
import { createTextOverlay, createHighlightOverlay, createTransitionOverlay } from '@/lib/instructions/remotion';
import type { RemotionTextParams, RemotionHighlightParams, ExtendedTransitionParams } from '@/lib/instructions/types';

type ExecuteStrategy = 'queue' | 'parallel' | 'dependency';

class TaskExecutor {
  private isRunning: boolean = false;
  private isPaused: boolean = false;
  private shouldStop: boolean = false;
  private strategy: ExecuteStrategy = 'queue';

  async executePlan(planId: string): Promise<void> {
    const planStore = usePlanStore.getState();
    const plan = planStore.currentPlan;

    if (!plan || plan.id !== planId) {
      throw new Error('Plan not found');
    }

    this.isRunning = true;
    this.shouldStop = false;
    planStore.updatePlanStatus('executing');

    try {
      while (!this.shouldStop) {
        while (this.isPaused && !this.shouldStop) {
          await this.sleep(100);
        }

        if (this.shouldStop) break;

        const task = planStore.getNextRunnableTask();
        if (!task) break;

        await this.executeTask(task.id);
      }

      const remaining = planStore.getTasksByStatus('pending');
      if (remaining.length === 0) {
        const failed = planStore.getTasksByStatus('failed');
        planStore.updatePlanStatus(failed.length > 0 ? 'failed' : 'completed');
      }
    } catch {
      planStore.updatePlanStatus('failed');
    } finally {
      this.isRunning = false;
    }
  }

  private async executeTask(taskId: string): Promise<void> {
    const planStore = usePlanStore.getState();
    const editorStore = useEditorStore.getState();

    const task = planStore.getTask(taskId);
    if (!task) return;

    planStore.updateTaskStatus(taskId, 'running', 0);

    try {
      switch (task.instructionType) {
        case 'addText':
        case 'addHighlight':
        case 'addTransition':
          await this.executeRemotionTask(task);
          break;
        case 'crop':
        case 'splitClip':
        case 'deleteClip':
        case 'changeSpeed':
        case 'changeVolume':
          await this.executeFFmpegTask(task);
          break;
        case 'deleteText':
          await this.executeDeleteTextTask(task);
          break;
        case 'render':
          await this.executeRenderTask(task);
          break;
        default:
          throw new Error(`Unknown instruction type: ${task.instructionType}`);
      }

      planStore.updateTaskStatus(taskId, 'completed', 100);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      planStore.updateTaskError(taskId, message);
    }
  }

  private async executeRemotionTask(task: { id: string; instructionType: string; params: Record<string, unknown> }): Promise<void> {
    const editorStore = useEditorStore.getState();
    const { instructionType, params } = task;

    let overlay;
    switch (instructionType) {
      case 'addText':
        overlay = createTextOverlay(params as unknown as RemotionTextParams);
        break;
      case 'addHighlight':
        overlay = createHighlightOverlay(params as unknown as RemotionHighlightParams);
        break;
      case 'addTransition':
        overlay = createTransitionOverlay(params as unknown as ExtendedTransitionParams);
        break;
      default:
        throw new Error(`Unknown remotion type: ${instructionType}`);
    }

    editorStore.addOverlay(overlay);
    usePlanStore.getState().updateTaskResult(task.id, { overlayId: overlay.id });
  }

  private async executeFFmpegTask(task: { id: string; instructionType: string; params: Record<string, unknown> }): Promise<void> {
    const response = await fetch('/api/video/process', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        videoId: useEditorStore.getState().video?.id,
        instruction: {
          type: task.instructionType,
          params: task.params,
        },
      }),
    });

    if (!response.ok) {
      throw new Error('FFmpeg processing failed');
    }

    const result = await response.json();
    usePlanStore.getState().updateTaskResult(task.id, result);
  }

  private async executeDeleteTextTask(task: { id: string; params: Record<string, unknown> }): Promise<void> {
    const editorStore = useEditorStore.getState();
    const { mode, startTime, endTime, textIds } = task.params as { mode: string; startTime?: number; endTime?: number; textIds?: string[] };

    if (mode === 'timeRange' && typeof startTime === 'number' && typeof endTime === 'number') {
      editorStore.deleteTextOverlay(startTime, endTime);
    } else if (mode === 'textIds' && Array.isArray(textIds)) {
      editorStore.deleteOverlayByIds(textIds);
    }

    usePlanStore.getState().updateTaskResult(task.id, { deleted: true });
  }

  private async executeRenderTask(task: { id: string; planId: string }): Promise<void> {
    const response = await fetch('/api/render', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        videoId: useEditorStore.getState().video?.id,
        planId: task.planId,
      }),
    });

    if (!response.ok) {
      throw new Error('Render failed');
    }

    const result = await response.json();
    usePlanStore.getState().updateTaskResult(task.id, result);
  }

  pause(): void {
    this.isPaused = true;
    usePlanStore.getState().updatePlanStatus('paused');
  }

  resume(): void {
    this.isPaused = false;
    usePlanStore.getState().updatePlanStatus('executing');
  }

  stop(): void {
    this.shouldStop = true;
    this.isPaused = false;
    this.isRunning = false;
    usePlanStore.getState().updatePlanStatus('failed');
  }

  skipTask(taskId: string): void {
    usePlanStore.getState().updateTaskStatus(taskId, 'skipped', 0);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

let instance: TaskExecutor | null = null;

export function getTaskExecutor(): TaskExecutor {
  if (!instance) {
    instance = new TaskExecutor();
  }
  return instance;
}

export const taskExecutor = getTaskExecutor();
