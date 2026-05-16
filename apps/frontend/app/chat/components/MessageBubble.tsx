'use client';

import { Message } from '@/types/chat';
import Timestamp from './Timestamp';

interface MessageBubbleProps {
  message: Message;
  isSelected?: boolean;
  isAfterSelected?: boolean;
  onSelectVersion?: () => void;
}

export default function MessageBubble({
  message,
  isSelected,
  isAfterSelected,
  onSelectVersion,
}: MessageBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <div
      className={`flex flex-col gap-0.5 transition-opacity ${isUser ? 'items-end' : 'items-start'} ${isAfterSelected ? 'opacity-40' : ''}`}
    >
      <Timestamp iso={message.createdAt} />
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed transition-shadow ${
          isUser
            ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
            : 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-100'
        } ${isSelected ? 'ring-2 ring-blue-500 ring-offset-1' : ''}`}
      >
        {message.content}
      </div>
      {!isUser && onSelectVersion && (
        <button
          onClick={onSelectVersion}
          className={`flex items-center gap-1 text-[11px] font-medium transition-colors ${
            isSelected
              ? 'text-blue-600 dark:text-blue-400'
              : 'text-zinc-400 hover:text-blue-600 dark:text-zinc-500 dark:hover:text-blue-400'
          }`}
        >
          {isSelected ? (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="size-3">
                <path d="M8 9.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" />
                <path fillRule="evenodd" d="M1.38 8a6.998 6.998 0 0 1 13.24 0 6.998 6.998 0 0 1-13.24 0ZM8 11a3 3 0 1 1 0-6 3 3 0 0 1 0 6Z" clipRule="evenodd" />
              </svg>
              Viewing this version
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="size-3">
                <path d="M8 9.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" />
                <path fillRule="evenodd" d="M1.38 8a6.998 6.998 0 0 1 13.24 0 6.998 6.998 0 0 1-13.24 0ZM8 11a3 3 0 1 1 0-6 3 3 0 0 1 0 6Z" clipRule="evenodd" />
              </svg>
              View this version
            </>
          )}
        </button>
      )}
    </div>
  );
}
