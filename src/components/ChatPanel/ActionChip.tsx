'use client';

import type { InstructionType } from '@/lib/instructions/types';

interface ActionChipProps {
  type: InstructionType;
  params: Record<string, unknown>;
  onExecute?: () => void;
  onCancel?: () => void;
}

const ACTION_LABELS: Record<InstructionType, string> = {
  crop: 'Cut clip',
  splitClip: 'Split clip',
  deleteClip: 'Delete clip',
  changeSpeed: 'Change speed',
  changeVolume: 'Change volume',
  addText: 'Add text',
  addHighlight: 'Add highlight',
  addTransition: 'Add transition',
  modifyText: 'Modify text',
  deleteText: 'Delete text',
  seek: 'Jump to time',
  confirmPlan: 'Confirm plan',
  render: 'Render video',
};

export function ActionChip({ type, params, onExecute, onCancel }: ActionChipProps) {
  return (
    <div className="flex items-center gap-2 p-3 bg-gray-700 rounded-lg">
      <span className="px-2 py-1 bg-blue-600 text-white text-xs rounded">
        {ACTION_LABELS[type]}
      </span>
      <span className="text-sm text-gray-300">
        {formatParams(type, params)}
      </span>
      <div className="flex-1" />
      {onExecute && (
        <button
          onClick={onExecute}
          className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded"
        >
          Execute
        </button>
      )}
      {onCancel && (
        <button
          onClick={onCancel}
          className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded"
        >
          Cancel
        </button>
      )}
    </div>
  );
}

function formatParams(type: InstructionType, params: Record<string, unknown>): string {
  switch (type) {
    case 'crop':
    case 'splitClip':
    case 'deleteClip':
    case 'changeSpeed':
      return `${params.startTime}s - ${params.endTime}s @ ${params.speed}x`;
    case 'changeVolume':
      return `${params.startTime}s - ${params.endTime}s @ ${(params.volume as number) * 100}%`;
    case 'addText':
      return `"${params.text}" at ${params.startTime}s`;
    case 'addHighlight':
      return `${params.startTime}s - ${params.endTime}s (${params.color})`;
    case 'addTransition':
      return `${params.startTime}s - ${params.endTime}s (${params.type})`;
    case 'modifyText':
      return `ID: ${params.textId}`;
    case 'seek':
      return `Go to ${params.time}s`;
    case 'render':
      return `${params.outputFormat} (${params.quality})`;
    default:
      return '';
  }
}
