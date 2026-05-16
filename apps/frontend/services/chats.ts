import { Chat } from '@/types/chat';
import { request } from './http';

export function createChat(prompt: string): Promise<Chat> {
  return request<Chat>('/chats', {
    method: 'POST',
    body: JSON.stringify({ prompt }),
  });
}

export function getChat(id: string): Promise<Chat> {
  return request<Chat>(`/chats/${id}`, { cache: 'no-store' } as RequestInit);
}

export function addMessage(chatId: string, content: string, fromMessageId?: string): Promise<Chat> {
  return request<Chat>(`/chats/${chatId}/messages`, {
    method: 'POST',
    body: JSON.stringify(fromMessageId ? { content, fromMessageId } : { content }),
  });
}
