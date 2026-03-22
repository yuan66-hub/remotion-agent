import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

export type PlanStatus = 'draft' | 'executing' | 'paused' | 'completed' | 'failed';
export type TaskStatus = 'pending' | 'queued' | 'running' | 'paused' | 'skipped' | 'completed' | 'failed';
export type TaskType = 'ffmpeg' | 'remotion' | 'render';

export interface Task {
  id: string;
  planId: string;
  type: TaskType;
  instructionType: string;
  params: Record<string, unknown>;
  status: TaskStatus;
  progress: number;
  result?: unknown;
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
  currentPlan: Plan | null;
  taskMap: Map<string, Task>;

  createPlan: (title: string, tasks: Omit<Task, 'id' | 'planId' | 'status' | 'createdAt'>[]) => Plan;
  updatePlanStatus: (status: PlanStatus) => void;
  clearPlan: () => void;

  updateTaskStatus: (taskId: string, status: TaskStatus, progress?: number) => void;
  updateTaskResult: (taskId: string, result: unknown) => void;
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
