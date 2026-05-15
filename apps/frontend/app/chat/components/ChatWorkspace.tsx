'use client';

import { useState } from 'react';
import { Chat } from '@/types/chat';
import { addMessage } from '@/services/chats';
import ChatMessages from './ChatMessages';
import ChatComposer from './ChatComposer';
import CodePreview from './CodePreview';

interface ChatWorkspaceProps {
  initialChat: Chat;
}

export default function ChatWorkspace({ initialChat }: ChatWorkspaceProps) {
  const [chat, setChat] = useState<Chat>(initialChat);
  const [isLoading, setIsLoading] = useState(false);

  const handleSend = async (content: string) => {
    setIsLoading(true);
    try {
      const updated = await addMessage(chat.id, content);
      setChat(updated);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-full w-full">
      {/* Left panel: chat */}
      <div className="flex w-[380px] shrink-0 flex-col border-r border-zinc-200 dark:border-zinc-700">
        <div className="border-b border-zinc-200 px-4 py-3 dark:border-zinc-700">
          <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Conversation</h2>
        </div>
        <ChatMessages messages={chat.messages} />
        <ChatComposer onSend={handleSend} isLoading={isLoading} />
      </div>

      {/* Right panel: preview */}
      <div className="flex flex-1 flex-col">
        <div className="border-b border-zinc-200 px-4 py-3 dark:border-zinc-700">
          <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Preview</h2>
        </div>
        <div className="flex-1">
          <CodePreview code={chat.code} />
        </div>
      </div>
    </div>
  );
}
