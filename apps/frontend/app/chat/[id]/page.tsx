import { notFound } from 'next/navigation';
import { getChat } from '@/services/chats';
import ChatWorkspace from '../components/ChatWorkspace';

interface ChatPageProps {
  params: Promise<{ id: string }>;
}

export default async function ChatPage({ params }: ChatPageProps) {
  const { id } = await params;

  let chat;
  try {
    chat = await getChat(id);
  } catch {
    notFound();
  }

  return (
    <div className="flex flex-1 overflow-hidden">
      <ChatWorkspace initialChat={chat} />
    </div>
  );
}
