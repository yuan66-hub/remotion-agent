'use client';

import type { SubTask } from '@/lib/instructions/types';

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
