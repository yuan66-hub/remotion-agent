'use client';

interface MessageProps {
  message: {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
  };
}

export function Message({ message }: MessageProps) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} min-w-0`}>
      <div
        className={`max-w-[80%] min-w-0 rounded-lg px-4 py-2 ${
          isUser
            ? 'bg-blue-600 text-white'
            : 'bg-gray-700 text-gray-100'
        }`}
      >
        <p className="whitespace-pre-wrap break-words">{message.content}</p>
        <p className={`text-xs mt-1 ${isUser ? 'text-blue-200' : 'text-gray-400'}`}>
          {message.timestamp.toLocaleTimeString()}
        </p>
      </div>
    </div>
  );
}
