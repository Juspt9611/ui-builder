export type Role = 'user' | 'assistant';

export interface Message {
  id: string;
  role: Role;
  content: string;
  createdAt: string;
}

export interface Chat {
  id: string;
  messages: Message[];
  code: string;
  createdAt: string;
  updatedAt: string;
}
