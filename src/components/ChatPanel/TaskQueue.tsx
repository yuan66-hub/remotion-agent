'use client';

import { usePlanStore } from '@/stores/planStore';
import { taskExecutor } from '@/lib/executor/TaskExecutor';
import TaskItem from './TaskItem';

interface TaskQueueProps {
  onClose?: () => void;
}

export default function TaskQueue({ onClose }: TaskQueueProps) {
  const { currentPlan } = usePlanStore();

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
