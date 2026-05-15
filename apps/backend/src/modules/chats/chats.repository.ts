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

  updateCode(id: string, code: string): Chat {
    const chat = this.store.get(id)!;
    chat.code = code;
    chat.updatedAt = new Date().toISOString();
    return chat;
  }
}
