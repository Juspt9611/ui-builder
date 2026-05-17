'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Chat } from '@/types/chat';
import { addMessage } from '@/services/chats';
import { REGENERATE_PROMPT_STORAGE_KEY } from '@/shared/storage-keys';
import ChatMessages from './ChatMessages';
import ChatComposer from './ChatComposer';
import CodePreview from './CodePreview';
import CodeViewer from './CodeViewer';
import PreviewSkeleton from './PreviewSkeleton';
import CodeSkeleton from './CodeSkeleton';
import TruncationConfirmModal from './TruncationConfirmModal';
import RegenerateConfirmModal from './RegenerateConfirmModal';
import ErrorBanner from './ErrorBanner';
import { ApiErrorCode, UNPROCESSABLE_PROMPT_MESSAGE } from '@/services/errors';

type PreviewTab = 'preview' | 'code';

interface PendingTruncation {
  content: string;
  fromMessageId: string;
  discardCount: number;
}

interface ChatWorkspaceProps {
  initialChat: Chat;
}

type BannerState = { message: string; tone: 'warning' | 'error' };

export default function ChatWorkspace({ initialChat }: ChatWorkspaceProps) {
  const router = useRouter();
  const [chat, setChat] = useState<Chat>(initialChat);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<PreviewTab>('preview');
  const [selectedUserMessageId, setSelectedUserMessageId] = useState<string | null>(null);
  const [pendingTruncation, setPendingTruncation] = useState<PendingTruncation | null>(null);
  const [banner, setBanner] = useState<BannerState | null>(null);
  const [showRegenerateModal, setShowRegenerateModal] = useState(false);

  const originalPrompt = chat.messages.find((m) => m.role === 'user')?.content ?? '';

  const handleConfirmRegenerate = () => {
    sessionStorage.setItem(REGENERATE_PROMPT_STORAGE_KEY, originalPrompt);
    router.push('/');
  };

  const userMessages = chat.messages.filter((m) => m.role === 'user');
  const lastUserMessageId = userMessages.at(-1)?.id ?? null;

  const previewCode = selectedUserMessageId
    ? (chat.messages.find((m) => m.id === selectedUserMessageId)?.code ?? '')
    : ([...chat.messages].reverse().find((m) => m.role === 'user' && m.code)?.code ?? '');

  const sendMessage = async (content: string, fromMessageId?: string) => {
    setIsLoading(true);
    setBanner(null);
    try {
      const updated = await addMessage(chat.id, content, fromMessageId);
      setChat(updated);
      setSelectedUserMessageId(null);
    } catch (err) {
      const e = err as Error & { errorCode?: string };
      if (e.errorCode === ApiErrorCode.UNPROCESSABLE_PROMPT) {
        setBanner({ message: UNPROCESSABLE_PROMPT_MESSAGE, tone: 'warning' });
      } else {
        setBanner({ message: 'Something went wrong. Please try again.', tone: 'error' });
      }
      throw err;
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
      {showRegenerateModal && (
        <RegenerateConfirmModal
          onConfirm={handleConfirmRegenerate}
          onCancel={() => setShowRegenerateModal(false)}
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
          {banner && (
            <ErrorBanner
              message={banner.message}
              tone={banner.tone}
              onDismiss={() => setBanner(null)}
            />
          )}
          <ChatComposer onSend={handleSend} isLoading={isLoading} />
        </div>

        {/* Right panel: output */}
        <div className="flex flex-1 flex-col">
          <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-700">
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
            <button
              onClick={() => setShowRegenerateModal(true)}
              disabled={isLoading || !originalPrompt}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-40 dark:text-zinc-400 dark:hover:bg-zinc-800"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
              </svg>
              Regenerate
            </button>
          </div>
          <div className="relative flex-1 overflow-hidden">
            {isLoading ? (
              activeTab === 'preview' ? <PreviewSkeleton /> : <CodeSkeleton />
            ) : activeTab === 'preview' ? (
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
