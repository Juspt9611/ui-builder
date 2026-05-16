'use client';

import { useState } from 'react';
import { Chat } from '@/types/chat';
import { addMessage } from '@/services/chats';
import ChatMessages from './ChatMessages';
import ChatComposer from './ChatComposer';
import CodePreview from './CodePreview';
import CodeViewer from './CodeViewer';
import TruncationConfirmModal from './TruncationConfirmModal';

type PreviewTab = 'preview' | 'code';

interface PendingTruncation {
  content: string;
  fromMessageId: string;
  discardCount: number;
}

interface ChatWorkspaceProps {
  initialChat: Chat;
}

export default function ChatWorkspace({ initialChat }: ChatWorkspaceProps) {
  const [chat, setChat] = useState<Chat>(initialChat);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<PreviewTab>('preview');
  const [selectedUserMessageId, setSelectedUserMessageId] = useState<string | null>(null);
  const [pendingTruncation, setPendingTruncation] = useState<PendingTruncation | null>(null);

  const userMessages = chat.messages.filter((m) => m.role === 'user');
  const lastUserMessageId = userMessages.at(-1)?.id ?? null;

  const previewCode = selectedUserMessageId
    ? (chat.messages.find((m) => m.id === selectedUserMessageId)?.code ?? '')
    : ([...chat.messages].reverse().find((m) => m.role === 'user' && m.code)?.code ?? '');

  const sendMessage = async (content: string, fromMessageId?: string) => {
    setIsLoading(true);
    try {
      const updated = await addMessage(chat.id, content, fromMessageId);
      setChat(updated);
      setSelectedUserMessageId(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = async (content: string) => {
    const isEditingOlderVersion =
      selectedUserMessageId !== null && selectedUserMessageId !== lastUserMessageId;

    if (isEditingOlderVersion) {
      const discardCount =
        userMessages.length - 1 - userMessages.findIndex((m) => m.id === selectedUserMessageId);
      setPendingTruncation({ content, fromMessageId: selectedUserMessageId, discardCount });
      return;
    }

    await sendMessage(content);
  };

  const handleConfirmTruncation = async () => {
    if (!pendingTruncation) return;
    const { content, fromMessageId } = pendingTruncation;
    setPendingTruncation(null);
    await sendMessage(content, fromMessageId);
  };

  const handleSelectVersion = (userMessageId: string) => {
    setSelectedUserMessageId((prev) => (prev === userMessageId ? null : userMessageId));
  };

  return (
    <>
      {pendingTruncation && (
        <TruncationConfirmModal
          discardCount={pendingTruncation.discardCount}
          onConfirm={handleConfirmTruncation}
          onCancel={() => setPendingTruncation(null)}
        />
      )}
      <div className="flex h-full w-full">
        {/* Left panel: chat */}
        <div className="flex w-[380px] shrink-0 flex-col border-r border-zinc-200 dark:border-zinc-700">
          <div className="border-b border-zinc-200 px-4 py-3 dark:border-zinc-700">
            <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Conversation</h2>
          </div>
          <ChatMessages
            messages={chat.messages}
            isLoading={isLoading}
            selectedUserMessageId={selectedUserMessageId}
            onSelectVersion={handleSelectVersion}
          />
          <ChatComposer onSend={handleSend} isLoading={isLoading} />
        </div>

        {/* Right panel: output */}
        <div className="flex flex-1 flex-col">
          <div className="flex items-center justify-start border-b border-zinc-200 px-4 py-3 dark:border-zinc-700">
            <div className="inline-flex rounded-md bg-zinc-100 p-0.5 dark:bg-zinc-800">
              {(['preview', 'code'] as PreviewTab[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={[
                    'rounded px-3 py-1 text-xs font-medium capitalize transition-colors',
                    activeTab === tab
                      ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-zinc-100'
                      : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200',
                  ].join(' ')}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>
          <div className="relative flex-1 overflow-hidden">
            {activeTab === 'preview' ? (
              <CodePreview code={previewCode} />
            ) : (
              <CodeViewer code={previewCode} />
            )}
          </div>
        </div>
      </div>
    </>
  );
}
