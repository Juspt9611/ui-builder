'use client';

import { useState, KeyboardEvent } from 'react';

interface ChatComposerProps {
  onSend: (content: string) => Promise<void>;
  isLoading: boolean;
}

export default function ChatComposer({ onSend, isLoading }: ChatComposerProps) {
  const [content, setContent] = useState('');

  const handleSend = async () => {
    const trimmed = content.trim();
    if (!trimmed || isLoading) return;
    setContent('');
    await onSend(trimmed);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="border-t border-zinc-200 px-4 py-3 dark:border-zinc-700">
      <div className="flex items-end gap-2">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Describe changes… (Enter to send, Shift+Enter for newline)"
          rows={3}
          disabled={isLoading}
          className="flex-1 resize-none rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 outline-none transition focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder-zinc-500"
        />
        <button
          onClick={handleSend}
          disabled={!content.trim() || isLoading}
          className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          {isLoading ? (
            <span className="flex items-center gap-1.5">
              <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
              Sending…
            </span>
          ) : (
            'Send'
          )}
        </button>
      </div>
    </div>
  );
}
