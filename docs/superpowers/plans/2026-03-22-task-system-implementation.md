# Task System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现任务系统，包括 deleteText 指令、扩展转场特效、任务队列管理（支持暂停/恢复/跳过/取消）

**Architecture:** 三层任务队列架构（Plan → Task → SubTask），新增 planStore 管理任务状态，TaskExecutor 处理执行调度，UI 层集成 TaskQueue 组件

**Tech Stack:** Next.js App Router, Zustand, TypeScript, FFmpeg, Remotion

---

## File Structure

### 新增文件
- `src/stores/planStore.ts` - 任务计划状态管理
- `src/lib/executor/TaskExecutor.ts` - 任务执行引擎
- `src/components/ChatPanel/TaskQueue.tsx` - 任务队列组件
- `src/components/ChatPanel/TaskItem.tsx` - 任务项组件
- `src/components/ChatPanel/SubTaskItem.tsx` - 子任务项组件

### 修改文件
- `src/lib/instructions/types.ts` - 添加 deleteText、扩展转场参数
- `src/lib/instructions/remotion/index.ts` - 实现组合转场效果
- `src/lib/instructions/index.ts` - 添加 deleteText 指令处理
- `src/stores/editorStore.ts` - 添加 deleteTextOverlay 方法
- `src/components/ChatPanel/index.tsx` - 集成 TaskQueue

---

## Task 1: Types 定义扩展

**Files:**
- Modify: `src/lib/instructions/types.ts`

- [ ] **Step 1: 添加 deleteText 指令类型**

```typescript
// 在 InstructionType 中添加
type InstructionType = ...
  | 'deleteText';

// 在指令参数联合类型中添加
type InstructionParams =
  | DeleteTextParams
  | FFmpegCropParams
  | RemotionTextParams
  | ExtendedTransitionParams
  // ...

// 添加 DeleteTextParams
interface DeleteTextParams {
  mode: 'timeRange' | 'textIds';
  startTime?: number;
  endTime?: number;
  textIds?: string[];
}
```

- [ ] **Step 2: 添加扩展转场参数类型**

```typescript
// 转场效果类型（包含组合效果）
type TransitionEffect =
  | 'fade' | 'dissolve' | 'slide'
  | 'fade-blur' | 'dissolve-zoom' | 'slide-rotate'
  | 'blur' | 'zoom' | 'rotate' | 'scale';

type TransitionDirection = 'left' | 'right' | 'up' | 'down';
type EasingType = 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';

// 扩展转场参数
interface ExtendedTransitionParams {
  startTime: number;
  endTime: number;
  effect: TransitionEffect;
  direction?: TransitionDirection;
  duration?: number;
  easing?: EasingType;
  intensity?: number;
}
```

- [ ] **Step 3: 添加任务状态和结果类型**

```typescript
// 任务状态
type TaskStatus =
  | 'pending' | 'queued' | 'running'
  | 'paused' | 'skipped' | 'completed' | 'failed';

// 任务结果
interface TaskResult {
  outputPath?: string;
  overlays?: Overlay[];
  metadata?: Record<string, any>;
}

// SubTask - 子任务（复杂任务的子步骤）
export interface SubTask {
  id: string;
  taskId: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
}
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/instructions/types.ts
git commit -m "types: add deleteText instruction and extended transition types"
```

---

## Task 2: editorStore 添加 deleteTextOverlay 方法

**Files:**
- Modify: `src/stores/editorStore.ts`

- [ ] **Step 1: 添加 deleteTextOverlay 方法**

```typescript
// 在 editorStore 的 actions 中添加
deleteTextOverlay: (startTime: number, endTime: number) => {
  const deletedIds: string[] = [];
  set((state) => {
    const newOverlays = state.overlays.filter((overlay) => {
      if (overlay.type !== 'text') return true;
      // 检查文字叠加层是否与时间范围重叠
      const textOverlay = overlay as TextOverlay;
      const overlaps =
        textOverlay.startTime < endTime && textOverlay.endTime > startTime;
      if (overlaps) {
        deletedIds.push(overlay.id);
        return false;
      }
      return true;
    });
    return { overlays: newOverlays };
  });
  return deletedIds;
},

// 同时添加 deleteOverlayByIds 方法
deleteOverlayByIds: (ids: string[]) => {
  set((state) => ({
    overlays: state.overlays.filter((o) => !ids.includes(o.id)),
  }));
},
```

- [ ] **Step 2: Commit**

```bash
git add src/stores/editorStore.ts
git commit -m "store: add deleteTextOverlay method to editorStore"
```

---

## Task 3: Remotion 转场效果扩展

**Files:**
- Modify: `src/lib/instructions/remotion/index.ts`

- [ ] **Step 1: 更新 TransitionOverlay 类型**

```typescript
// 修改 src/lib/instructions/remotion/index.ts 中的 TransitionOverlay
export interface TransitionOverlay {
  id: string;
  type: 'transition';
  startTime: number;
  endTime: number;
  transitionType: TransitionEffect;  // 使用扩展的类型
  direction?: TransitionDirection;
  duration?: number;
  easing?: EasingType;
  intensity?: number;
}
```

- [ ] **Step 2: 更新 createTransitionOverlay 支持扩展参数**

```typescript
// 修改函数签名
export function createTransitionOverlay(
  params: ExtendedTransitionParams
): TransitionOverlay {
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
```

- [ ] **Step 3: 添加组合转场滤镜函数**

```typescript
// 获取转场 CSS 滤镜
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
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/instructions/remotion/index.ts
git commit -m "remotion: extend transition effects with combined filters"
```

---

## Task 4: 指令解析添加 deleteText 处理

**Files:**
- Modify: `src/lib/instructions/index.ts`

- [ ] **Step 1: 在 parseInstruction 中添加 deleteText 分支**

```typescript
// 在 switch (parsed.type) 中添加
case 'deleteText':
  const deleteParams = parsed.params as DeleteTextParams;
  if (deleteParams.mode === 'timeRange') {
    if (
      typeof deleteParams.startTime !== 'number' ||
      typeof deleteParams.endTime !== 'number'
    ) {
      return null;
    }
  } else if (deleteParams.mode === 'textIds') {
    if (!Array.isArray(deleteParams.textIds)) {
      return null;
    }
  } else {
    return null;
  }
  break;
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/instructions/index.ts
git commit -m "instructions: add deleteText parse handling"
```

---

## Task 5: 创建 planStore

**Files:**
- Create: `src/stores/planStore.ts`

- [ ] **Step 1: 创建 planStore**

```typescript
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

// 类型定义
export type PlanStatus = 'draft' | 'executing' | 'paused' | 'completed' | 'failed';
export type TaskStatus = 'pending' | 'queued' | 'running' | 'paused' | 'skipped' | 'completed' | 'failed';
export type TaskType = 'ffmpeg' | 'remotion' | 'render';

export interface Task {
  id: string;
  planId: string;
  type: TaskType;
  instructionType: string;
  params: Record<string, any>;
  status: TaskStatus;
  progress: number;
  result?: any;
  dependencies: string[];
  error?: string;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

export interface Plan {
  id: string;
  title: string;
  status: PlanStatus;
  tasks: Task[];
  createdAt: Date;
  updatedAt: Date;
}

interface PlanStore {
  // 状态
  currentPlan: Plan | null;
  taskMap: Map<string, Task>;
  
  // Plan 操作
  createPlan: (title: string, tasks: Omit<Task, 'id' | 'planId' | 'status' | 'createdAt'>[]) => Plan;
  updatePlanStatus: (status: PlanStatus) => void;
  clearPlan: () => void;
  
  // Task 操作
  updateTaskStatus: (taskId: string, status: TaskStatus, progress?: number) => void;
  updateTaskResult: (taskId: string, result: any) => void;
  updateTaskError: (taskId: string, error: string) => void;
  getNextRunnableTask: () => Task | null;
  getTasksByStatus: (status: TaskStatus) => Task[];
  getTask: (taskId: string) => Task | undefined;
}

export const usePlanStore = create<PlanStore>()(
  subscribeWithSelector((set, get) => ({
    currentPlan: null,
    taskMap: new Map(),
    
    createPlan: (title, tasks) => {
      const planId = `plan_${Date.now()}`;
      const planTasks: Task[] = tasks.map((t, index) => ({
        ...t,
        id: `task_${Date.now()}_${index}`,
        planId,
        status: 'pending' as TaskStatus,
        createdAt: new Date(),
      }));
      
      const plan: Plan = {
        id: planId,
        title,
        status: 'draft',
        tasks: planTasks,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      const newTaskMap = new Map(get().taskMap);
      planTasks.forEach((t) => newTaskMap.set(t.id, t));
      
      set({ currentPlan: plan, taskMap: newTaskMap });
      return plan;
    },
    
    updatePlanStatus: (status) => {
      set((state) => ({
        currentPlan: state.currentPlan
          ? { ...state.currentPlan, status, updatedAt: new Date() }
          : null,
      }));
    },
    
    clearPlan: () => {
      set({ currentPlan: null, taskMap: new Map() });
    },
    
    updateTaskStatus: (taskId, status, progress) => {
      set((state) => {
        const task = state.taskMap.get(taskId);
        if (!task) return state;
        
        const updatedTask = {
          ...task,
          status,
          progress: progress ?? task.progress,
          startedAt: status === 'running' && !task.startedAt ? new Date() : task.startedAt,
          completedAt: ['completed', 'failed', 'skipped'].includes(status) ? new Date() : task.completedAt,
        };
        
        const newTaskMap = new Map(state.taskMap);
        newTaskMap.set(taskId, updatedTask);
        
        const updatedTasks = state.currentPlan?.tasks.map((t) =>
          t.id === taskId ? updatedTask : t
        );
        
        return {
          taskMap: newTaskMap,
          currentPlan: state.currentPlan
            ? { ...state.currentPlan, tasks: updatedTasks || [], updatedAt: new Date() }
            : null,
        };
      });
    },
    
    updateTaskResult: (taskId, result) => {
      set((state) => {
        const task = state.taskMap.get(taskId);
        if (!task) return state;
        
        const updatedTask = { ...task, result };
        const newTaskMap = new Map(state.taskMap);
        newTaskMap.set(taskId, updatedTask);
        
        const updatedTasks = state.currentPlan?.tasks.map((t) =>
          t.id === taskId ? updatedTask : t
        );
        
        return {
          taskMap: newTaskMap,
          currentPlan: state.currentPlan
            ? { ...state.currentPlan, tasks: updatedTasks || [] }
            : null,
        };
      });
    },
    
    updateTaskError: (taskId, error) => {
      set((state) => {
        const task = state.taskMap.get(taskId);
        if (!task) return state;
        
        const updatedTask = { ...task, error, status: 'failed' as TaskStatus };
        const newTaskMap = new Map(state.taskMap);
        newTaskMap.set(taskId, updatedTask);
        
        const updatedTasks = state.currentPlan?.tasks.map((t) =>
          t.id === taskId ? updatedTask : t
        );
        
        return {
          taskMap: newTaskMap,
          currentPlan: state.currentPlan
            ? { ...state.currentPlan, tasks: updatedTasks || [] }
            : null,
        };
      });
    },
    
    getNextRunnableTask: () => {
      const { currentPlan, taskMap } = get();
      if (!currentPlan) return null;
      
      return currentPlan.tasks.find((task) => {
        if (task.status !== 'pending') return false;
        // 检查依赖是否都完成
        return task.dependencies.every((depId) => {
          const dep = taskMap.get(depId);
          return dep?.status === 'completed';
        });
      }) || null;
    },
    
    getTasksByStatus: (status) => {
      const { currentPlan } = get();
      return currentPlan?.tasks.filter((t) => t.status === status) || [];
    },
    
    getTask: (taskId) => {
      return get().taskMap.get(taskId);
    },
  }))
);
```

- [ ] **Step 2: Commit**

```bash
git add src/stores/planStore.ts
git commit -m "store: create planStore for task management"
```

---

## Task 6: 创建 TaskExecutor

**Files:**
- Create: `src/lib/executor/TaskExecutor.ts`
- Note: 需要先创建 `src/lib/executor/` 目录

- [ ] **Step 0: 验证 API 端点**

首先检查 `/api/video/process` 端点是否存在：
```bash
ls -la src/app/api/video/process/
```

如果目录不存在，创建它：
```bash
mkdir -p src/app/api/video/process
```

然后添加处理 deleteText 指令的逻辑到 `route.ts`（参考 Task 4 的指令解析）。

- [ ] **Step 1: 创建 TaskExecutor 类**

```typescript
import { usePlanStore } from '@/stores/planStore';
import { useEditorStore } from '@/stores/editorStore';
import { VideoProcessor } from '@/lib/video/processor';

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
        // 检查是否暂停
        while (this.isPaused && !this.shouldStop) {
          await this.sleep(100);
        }
        
        if (this.shouldStop) break;
        
        // 获取下一个可执行任务
        const task = planStore.getNextRunnableTask();
        if (!task) break;
        
        await this.executeTask(task.id);
      }
      
      // 检查是否全部完成
      const remaining = planStore.getTasksByStatus('pending');
      if (remaining.length === 0) {
        const failed = planStore.getTasksByStatus('failed');
        planStore.updatePlanStatus(failed.length > 0 ? 'failed' : 'completed');
      }
    } catch (error) {
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
          // Remotion 叠加层 - 同步执行
          await this.executeRemotionTask(task);
          break;
        case 'crop':
        case 'splitClip':
        case 'deleteClip':
        case 'changeSpeed':
        case 'changeVolume':
          // FFmpeg 操作 - 调用 API
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
  
  private async executeRemotionTask(task: any): Promise<void> {
    const editorStore = useEditorStore.getState();
    const { instructionType, params } = task;
    
    let overlay;
    switch (instructionType) {
      case 'addText':
        overlay = {
          id: `text_${Date.now()}`,
          type: 'text',
          startTime: params.startTime,
          endTime: params.endTime,
          text: params.text,
          position: params.position || { x: 0.5, y: 0.5 },
          fontSize: params.fontSize || 48,
          color: params.color || '#FFFFFF',
        };
        break;
      case 'addHighlight':
        overlay = {
          id: `highlight_${Date.now()}`,
          type: 'highlight',
          startTime: params.startTime,
          endTime: params.endTime,
          color: params.color || '#FFFF00',
        };
        break;
      case 'addTransition':
        overlay = {
          id: `transition_${Date.now()}`,
          type: 'transition',
          startTime: params.startTime,
          endTime: params.endTime,
          transitionType: params.effect || params.type,
          direction: params.direction || 'left',
          duration: params.duration || 1,
          easing: params.easing || 'ease-in-out',
          intensity: params.intensity ?? 1,
        };
        break;
      default:
        throw new Error(`Unknown remotion type: ${instructionType}`);
    }
    
    // 添加到 editorStore
    editorStore.addOverlay(overlay);
    usePlanStore.getState().updateTaskResult(task.id, { overlayId: overlay.id });
  }
  
  private async executeFFmpegTask(task: any): Promise<void> {
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
  
  private async executeDeleteTextTask(task: any): Promise<void> {
    const editorStore = useEditorStore.getState();
    const { mode, startTime, endTime, textIds } = task.params;
    
    if (mode === 'timeRange') {
      editorStore.deleteTextOverlay(startTime, endTime);
    } else if (mode === 'textIds') {
      editorStore.deleteOverlayByIds(textIds);
    }
    
    usePlanStore.getState().updateTaskResult(task.id, { deleted: true });
  }
  
  private async executeRenderTask(task: any): Promise<void> {
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
  
  // 控制方法
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

// 单例
export const taskExecutor = new TaskExecutor();
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/executor/TaskExecutor.ts
git commit -m "executor: create TaskExecutor for task queue execution"
```

---

## Task 7: 创建 TaskQueue UI 组件

**Files:**
- Create: `src/components/ChatPanel/TaskQueue.tsx`

- [ ] **Step 1: 创建 TaskQueue 组件**

```tsx
'use client';

import { usePlanStore } from '@/stores/planStore';
import { taskExecutor } from '@/lib/executor/TaskExecutor';
import TaskItem from './TaskItem';

interface TaskQueueProps {
  onClose?: () => void;
}

export default function TaskQueue({ onClose }: TaskQueueProps) {
  const { currentPlan, updatePlanStatus } = usePlanStore();
  
  if (!currentPlan) return null;
  
  const isExecuting = currentPlan.status === 'executing';
  const isPaused = currentPlan.status === 'paused';
  
  const handlePauseAll = () => {
    if (isExecuting) {
      taskExecutor.pause();
    } else if (isPaused) {
      taskExecutor.resume();
    }
  };
  
  const handleStopAll = () => {
    taskExecutor.stop();
  };
  
  return (
    <div className="border-t border-gray-700 mt-4 pt-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">📋</span>
          <span className="font-medium text-white">
            执行计划: {currentPlan.title}
          </span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handlePauseAll}
            className="px-3 py-1 text-sm bg-yellow-600 hover:bg-yellow-700 rounded"
          >
            {isExecuting ? '⏸ 暂停' : isPaused ? '▶ 继续' : '⏸'}
          </button>
          <button
            onClick={handleStopAll}
            className="px-3 py-1 text-sm bg-red-600 hover:bg-red-700 rounded"
          >
            ⏹ 停止
          </button>
        </div>
      </div>
      
      <div className="space-y-2">
        {currentPlan.tasks.map((task, index) => (
          <TaskItem key={task.id} task={task} index={index + 1} />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ChatPanel/TaskQueue.tsx
git commit -m "ui: create TaskQueue component"
```

---

## Task 8: 创建 TaskItem UI 组件

**Files:**
- Create: `src/components/ChatPanel/TaskItem.tsx`

- [ ] **Step 1: 创建 TaskItem 组件**

```tsx
'use client';

import { Task, usePlanStore } from '@/stores/planStore';
import { taskExecutor } from '@/lib/executor/TaskExecutor';

interface TaskItemProps {
  task: Task;
  index: number;
}

const STATUS_ICONS: Record<string, string> = {
  pending: '⏳',
  queued: '⏳',
  running: '🔄',
  paused: '⏸',
  skipped: '⏭',
  completed: '✅',
  failed: '❌',
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'text-gray-400',
  queued: 'text-gray-400',
  running: 'text-blue-400',
  paused: 'text-yellow-400',
  skipped: 'text-orange-400',
  completed: 'text-green-400',
  failed: 'text-red-400',
};

export default function TaskItem({ task, index }: TaskItemProps) {
  const { updateTaskStatus } = usePlanStore();
  
  const isPending = task.status === 'pending';
  const isRunning = task.status === 'running';
  const isCompleted = task.status === 'completed';
  const isFailed = task.status === 'failed';
  
  const handlePause = () => {
    if (isRunning) {
      taskExecutor.pause();
    }
  };
  
  const handleSkip = () => {
    taskExecutor.skipTask(task.id);
  };
  
  const handleCancel = () => {
    updateTaskStatus(task.id, 'failed');
  };
  
  const getTaskLabel = () => {
    switch (task.instructionType) {
      case 'crop':
        return `裁剪视频 ${task.params.startTime?.toFixed(1)}s - ${task.params.endTime?.toFixed(1)}s`;
      case 'addText':
        return `添加文字 "${task.params.text}"`;
      case 'addTransition':
        return `添加转场 ${task.params.effect || task.params.type}`;
      case 'deleteText':
        return `删除文字 (${task.params.mode})`;
      case 'render':
        return '渲染最终视频';
      default:
        return task.instructionType;
    }
  };
  
  return (
    <div className={`p-3 rounded-lg bg-gray-800 ${isRunning ? 'ring-1 ring-blue-500' : ''}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-2">
          <span className={`text-lg ${isRunning ? 'animate-spin' : ''}`}>
            {STATUS_ICONS[task.status]}
          </span>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-gray-400 text-sm">{index}.</span>
              <span className={STATUS_COLORS[task.status]}>{getTaskLabel()}</span>
            </div>
            
            {/* 进度条 */}
            {isRunning && (
              <div className="mt-2">
                <div className="w-48 h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 transition-all duration-200"
                    style={{ width: `${task.progress}%` }}
                  />
                </div>
                <span className="text-xs text-gray-400 mt-1">{task.progress}%</span>
              </div>
            )}
            
            {/* 结果/错误信息 */}
            {isCompleted && task.result && (
              <div className="text-xs text-green-400 mt-1">
                ✓ 完成
              </div>
            )}
            {isFailed && task.error && (
              <div className="text-xs text-red-400 mt-1">
                ✗ {task.error}
              </div>
            )}
          </div>
        </div>
        
        {/* 控制按钮 */}
        {(isPending || isRunning) && (
          <div className="flex gap-1">
            {isRunning && (
              <button
                onClick={handlePause}
                className="p-1 hover:bg-gray-700 rounded"
                title="暂停"
              >
                ⏸
              </button>
            )}
            <button
              onClick={handleSkip}
              className="p-1 hover:bg-gray-700 rounded"
              title="跳过"
            >
              ⏭
            </button>
            <button
              onClick={handleCancel}
              className="p-1 hover:bg-gray-700 rounded"
              title="取消"
            >
              ✕
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ChatPanel/TaskItem.tsx
git commit -m "ui: create TaskItem component"
```

---

## Task 8b: 创建 SubTaskItem UI 组件

**Files:**
- Create: `src/components/ChatPanel/SubTaskItem.tsx`

- [ ] **Step 1: 创建 SubTaskItem 组件**

```tsx
'use client';

import { SubTask } from '@/lib/instructions/types';

interface SubTaskItemProps {
  subTask: SubTask;
}

const STATUS_ICONS: Record<string, string> = {
  pending: '○',
  running: '◐',
  completed: '●',
  failed: '✕',
};

export default function SubTaskItem({ subTask }: SubTaskItemProps) {
  return (
    <div className="flex items-center gap-2 pl-6 text-sm">
      <span className={subTask.status === 'running' ? 'animate-pulse' : ''}>
        {STATUS_ICONS[subTask.status]}
      </span>
      <span className="text-gray-300">{subTask.name}</span>
      {subTask.status === 'running' && (
        <span className="text-xs text-blue-400">{subTask.progress}%</span>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ChatPanel/SubTaskItem.tsx
git commit -m "ui: create SubTaskItem component"
```

---

## Task 9: 集成 TaskQueue 到 ChatPanel

**Files:**
- Modify: `src/components/ChatPanel/index.tsx`

- [ ] **Step 1: 添加 TaskQueue 导入和集成**

首先检查 ChatPanel 的导出方式：
```bash
head -20 src/components/ChatPanel/index.tsx
```

如果 ChatPanel 是命名导出 (`export function ChatPanel`)，修改导入为：
```tsx
import { ChatPanel } from './ChatPanel';
import TaskQueue from './TaskQueue';
import { usePlanStore } from '@/stores/planStore';
```

如果 ChatPanel 是默认导出 (`export default function ChatPanel`)，保持现有导入方式。

然后在组件中添加：
```tsx
const { currentPlan } = usePlanStore();
const hasPlan = !!currentPlan;

// 在 return 的 JSX 中，找到消息列表下方添加
return (
  <div className="flex flex-col h-full">
    {/* 现有消息列表 */}
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.map((msg) => (
        <Message key={msg.id} message={msg} />
      ))}
    </div>

    {/* 新增: TaskQueue */}
    {hasPlan && <TaskQueue />}

    {/* 输入框 */}
    <div className="p-4 border-t border-gray-700">
      {/* ... */}
    </div>
  </div>
);
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ChatPanel/index.tsx
git commit -m "ui: integrate TaskQueue into ChatPanel"
```

---

## Task 10: 更新 AI System Prompt 支持新指令

**Files:**
- Modify: `src/app/api/chat/route.ts`

- [ ] **Step 1: 更新 System Prompt**

```typescript
// 在 SYSTEM_PROMPT 中添加 deleteText 说明
const SYSTEM_PROMPT = `
// ... 现有内容

## deleteText 指令
当用户要求删除文字叠加层时使用此指令。

参数:
- mode: "timeRange" | "textIds"
- startTime: 起始时间（秒，mode为timeRange时必需）
- endTime: 结束时间（秒，mode为timeRange时必需）
- textIds: 文字叠加层ID数组（mode为textIds时必需）

示例:
用户: "删除第5秒到第10秒的文字"
{{"type": "deleteText", "params": {{"mode": "timeRange", "startTime": 5, "endTime": 10}}}}

用户: "删除刚才添加的文字"
{{"type": "deleteText", "params": {{"mode": "textIds", "textIds": ["text_123"]}}}}

## 扩展转场效果
支持的转场效果:
- 基础: fade, dissolve, slide
- 组合: fade-blur, dissolve-zoom, slide-rotate
- 增强: blur, zoom, rotate, scale

参数:
- effect: 转场效果类型
- direction: 方向 (left, right, up, down) - slide类效果使用
- duration: 持续时间（秒）
- easing: 缓动函数 (linear, ease-in, ease-out, ease-in-out)
- intensity: 效果强度 (0-1)

// ... 其他内容
`;
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/chat/route.ts
git commit -m "ai: update system prompt for deleteText and extended transitions"
```

---

## 总结

完成所有任务后，你将拥有：

1. **deleteText 指令** - 按时间范围或 ID 删除文字叠加层
2. **扩展转场特效** - fade-blur、dissolve-zoom、slide-rotate 等组合效果
3. **任务队列系统** - Plan → Task → SubTask 三层结构
4. **实时进度显示** - TaskQueue UI 组件显示在 ChatPanel
5. **完整控制功能** - 暂停/恢复/跳过/取消

---

**Plan saved to:** `docs/superpowers/plans/2026-03-22-task-system-implementation.md`
