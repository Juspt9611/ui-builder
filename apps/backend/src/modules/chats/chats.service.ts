import { Injectable, NotFoundException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { AiProvider } from '../ai/ai.provider';
import { Chat, Message } from './entities/chat.entity';
import { ChatsRepository } from './chats.repository';
import { ChatMessageDto, ChatResponseDto } from './dto/chat-response.dto';

const FIRST_TURN_MESSAGE = "Here's your application. Send another instruction to refine it.";
const FOLLOW_UP_MESSAGE = 'Updated your application with the latest changes.';

@Injectable()
export class ChatsService {
  constructor(
    private readonly chatsRepository: ChatsRepository,
    private readonly aiProvider: AiProvider,
  ) {}

  async createChat(prompt: string): Promise<ChatResponseDto> {
    const { code } = await this.aiProvider.generate({ prompt });

    const now = new Date().toISOString();
    const userMessage: Message = {
      id: uuidv4(),
      content: prompt,
      code,
      createdAt: now,
    };

    const chat: Chat = {
      id: uuidv4(),
      messages: [userMessage],
      createdAt: now,
      updatedAt: now,
    };

    const stored = this.chatsRepository.create(chat);
    return this.toChatResponseDto(stored);
  }

  getChat(id: string): ChatResponseDto {
    return this.toChatResponseDto(this.getChatEntity(id));
  }

  async addMessage(id: string, content: string, fromMessageId?: string): Promise<ChatResponseDto> {
    const chat = this.getChatEntity(id);

    let currentCode: string;

    if (fromMessageId) {
      const anchorIndex = chat.messages.findIndex((m) => m.id === fromMessageId);
      if (anchorIndex === -1) throw new NotFoundException(`Message ${fromMessageId} not found`);
      currentCode = chat.messages[anchorIndex].code;
      if (anchorIndex < chat.messages.length - 1) {
        this.chatsRepository.truncateAfter(id, fromMessageId);
      }
    } else {
      currentCode = chat.messages.at(-1)?.code ?? '';
    }

    const { code } = await this.aiProvider.generate({ prompt: content, currentCode });

    const userMessage: Message = {
      id: uuidv4(),
      content,
      code,
      createdAt: new Date().toISOString(),
    };

    const updated = this.chatsRepository.appendMessage(id, userMessage);
    return this.toChatResponseDto(updated);
  }

  private getChatEntity(id: string): Chat {
    const chat = this.chatsRepository.findById(id);
    if (!chat) throw new NotFoundException(`Chat ${id} not found`);
    return chat;
  }

  private toChatResponseDto(chat: Chat): ChatResponseDto {
    const messages: ChatMessageDto[] = [];

    chat.messages.forEach((msg, index) => {
      messages.push({ id: msg.id, role: 'user', content: msg.content, code: msg.code, createdAt: msg.createdAt });

      const assistantContent = index === 0 ? FIRST_TURN_MESSAGE : FOLLOW_UP_MESSAGE;
      messages.push({
        id: uuidv4(),
        role: 'assistant',
        content: assistantContent,
        createdAt: new Date(new Date(msg.createdAt).getTime() + 1).toISOString(),
      });
    });

    return { id: chat.id, messages, createdAt: chat.createdAt, updatedAt: chat.updatedAt };
  }
}
