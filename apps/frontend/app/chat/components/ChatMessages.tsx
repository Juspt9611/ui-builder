'use client';

import { useEffect, useRef } from 'react';
import { Message } from '@/types/chat';
import MessageBubble from './MessageBubble';

interface ChatMessagesProps {
  messages: Message[];
  isLoading?: boolean;
  selectedUserMessageId: string | null;
  onSelectVersion: (userMessageId: string) => void;
}

export default function ChatMessages({
  messages,
  isLoading,
  selectedUserMessageId,
  onSelectVersion,
}: ChatMessagesProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // User messages sit at even indices (0, 2, 4…). Find the version index of the selected one.
  const selectedVersionIndex =
    selectedUserMessageId !== null
      ? Math.floor(messages.findIndex((m) => m.id === selectedUserMessageId) / 2)
      : -1;

  return (
    <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-4">
      {messages.map((message, i) => {
        const versionIndex = Math.floor(i / 2);
        // An assistant bubble is "selected" when its preceding user message is the selected one.
        const isSelected =
          message.role === 'assistant' && messages[i - 1]?.id === selectedUserMessageId;
        const isAfterSelected = selectedVersionIndex >= 0 && versionIndex > selectedVersionIndex;
        // The stable user message id associated with this assistant bubble.
        const pairedUserMessageId =
          message.role === 'assistant' ? messages[i - 1]?.id : undefined;

        return (
          <MessageBubble
            key={message.id}
            message={message}
            isSelected={isSelected}
            isAfterSelected={isAfterSelected}
            onSelectVersion={
              pairedUserMessageId ? () => onSelectVersion(pairedUserMessageId) : undefined
            }
          />
        );
      })}
      {isLoading && (
        <div className="flex justify-start">
          <div className="rounded-2xl bg-zinc-100 px-4 py-2 text-sm text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
            Generating
            <span className="inline-flex gap-0.5 ml-1">
              <span className="animate-bounce [animation-delay:0ms]">.</span>
              <span className="animate-bounce [animation-delay:150ms]">.</span>
              <span className="animate-bounce [animation-delay:300ms]">.</span>
            </span>
          </div>
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  );
}
