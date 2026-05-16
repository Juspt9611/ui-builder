export type Role = 'user' | 'assistant';

export interface Message {
  id: string;
  role: Role;
  content: string;
  code?: string;
  createdAt: string;
}

export interface Chat {
  id: string;
  messages: Message[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateChatRequest {
  prompt: string;
}

export interface AddMessageRequest {
  content: string;
}
