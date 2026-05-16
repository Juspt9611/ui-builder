export interface Message {
  id: string;
  content: string;
  code: string;
  createdAt: string;
}

export interface Chat {
  id: string;
  messages: Message[];
  createdAt: string;
  updatedAt: string;
}
