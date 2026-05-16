import { Injectable } from '@nestjs/common';
import { Chat, Message } from './entities/chat.entity';

@Injectable()
export class ChatsRepository {
  private readonly store = new Map<string, Chat>();

  create(chat: Chat): Chat {
    this.store.set(chat.id, chat);
    return chat;
  }

  findById(id: string): Chat | undefined {
    return this.store.get(id);
  }

  appendMessage(id: string, message: Message): Chat {
    const chat = this.store.get(id)!;
    chat.messages.push(message);
    chat.updatedAt = new Date().toISOString();
    return chat;
  }

  truncateAfter(id: string, anchorMessageId: string): Chat {
    const chat = this.store.get(id)!;
    const anchorIndex = chat.messages.findIndex((m) => m.id === anchorMessageId);
    chat.messages = chat.messages.slice(0, anchorIndex + 1);
    chat.updatedAt = new Date().toISOString();
    return chat;
  }
}
