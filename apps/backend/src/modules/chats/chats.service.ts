import { Injectable, NotFoundException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { AiProvider } from '../ai/ai.provider';
import { Chat, Message } from './entities/chat.entity';
import { ChatsRepository } from './chats.repository';

@Injectable()
export class ChatsService {
  constructor(
    private readonly chatsRepository: ChatsRepository,
    private readonly aiProvider: AiProvider,
  ) {}

  async createChat(prompt: string): Promise<Chat> {
    const { code, assistantMessage } = await this.aiProvider.generate({ prompt });

    const now = new Date().toISOString();
    const userMessage: Message = {
      id: uuidv4(),
      role: 'user',
      content: prompt,
      createdAt: now,
    };
    const assistantMsg: Message = {
      id: uuidv4(),
      role: 'assistant',
      content: assistantMessage,
      createdAt: now,
    };

    const chat: Chat = {
      id: uuidv4(),
      messages: [userMessage, assistantMsg],
      code,
      createdAt: now,
      updatedAt: now,
    };

    return this.chatsRepository.create(chat);
  }

  getChat(id: string): Chat {
    const chat = this.chatsRepository.findById(id);
    if (!chat) throw new NotFoundException(`Chat ${id} not found`);
    return chat;
  }

  async addMessage(id: string, content: string): Promise<Chat> {
    const chat = this.getChat(id);

    const userMessage: Message = {
      id: uuidv4(),
      role: 'user',
      content,
      createdAt: new Date().toISOString(),
    };
    this.chatsRepository.appendMessage(id, userMessage);

    const history = chat.messages.map((m) => ({ role: m.role, content: m.content }));
    const { code, assistantMessage } = await this.aiProvider.generate({ prompt: content, history });

    const assistantMsg: Message = {
      id: uuidv4(),
      role: 'assistant',
      content: assistantMessage,
      createdAt: new Date().toISOString(),
    };
    this.chatsRepository.appendMessage(id, assistantMsg);
    this.chatsRepository.updateCode(id, code);

    return this.chatsRepository.findById(id)!;
  }
}
