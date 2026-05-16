export type ChatMessageRole = 'user' | 'assistant';

export interface ChatMessageDto {
  id: string;
  role: ChatMessageRole;
  content: string;
  code?: string;
  createdAt: string;
}

export interface ChatResponseDto {
  id: string;
  messages: ChatMessageDto[];
  createdAt: string;
  updatedAt: string;
}
