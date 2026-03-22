'use client';

import { usePlanStore, type Task } from '@/stores/planStore';
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
        return `裁剪视频 ${(task.params.startTime as number)?.toFixed(1)}s - ${(task.params.endTime as number)?.toFixed(1)}s`;
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
