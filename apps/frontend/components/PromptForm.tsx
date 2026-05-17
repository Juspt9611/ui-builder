'use client';

import { useState, KeyboardEvent } from 'react';
import { useRouter } from 'next/navigation';
import { createChat } from '@/services/chats';
import { ApiErrorCode } from '@/services/errors';

export default function PromptForm() {
  const router = useRouter();
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<{ message: string; tone: 'warning' | 'error' } | null>(null);

  const handleSubmit = async () => {
    const trimmed = prompt.trim();
    if (!trimmed || isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      const chat = await createChat(trimmed);
      router.push(`/chat/${chat.id}`);
    } catch (err) {
      const e = err as Error & { errorCode?: string };
      const message = e.message || 'Something went wrong. Please try again.';
      const tone = e.errorCode === ApiErrorCode.UNPROCESSABLE_PROMPT ? 'warning' : 'error';
      setError({ message, tone });
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="w-full max-w-2xl flex flex-col gap-4">
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="What would you like to build today?"
        rows={5}
        disabled={isLoading}
        className="w-full resize-none rounded-xl border border-zinc-200 bg-white px-4 py-3 text-base text-zinc-900 placeholder-zinc-400 shadow-sm outline-none transition focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:border-zinc-500"
      />

      {error && (
        <p className={`text-sm ${error.tone === 'warning' ? 'text-amber-600' : 'text-red-500'}`}>
          {error.message}
        </p>
      )}

      <button
        onClick={handleSubmit}
        disabled={!prompt.trim() || isLoading}
        className="self-end rounded-full bg-zinc-900 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
      >
        {isLoading ? 'Generating…' : 'Generate'}
      </button>
    </div>
  );
}
