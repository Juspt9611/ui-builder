import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ChatsService } from './chats.service';
import { CreateChatDto } from './dto/create-chat.dto';
import { AddMessageDto } from './dto/add-message.dto';

@Controller('chats')
export class ChatsController {
  constructor(private readonly chatsService: ChatsService) {}

  @Post()
  createChat(@Body() dto: CreateChatDto) {
    return this.chatsService.createChat(dto.prompt);
  }

  @Get(':id')
  getChat(@Param('id') id: string) {
    return this.chatsService.getChat(id);
  }

  @Post(':id/messages')
  addMessage(@Param('id') id: string, @Body() dto: AddMessageDto) {
    return this.chatsService.addMessage(id, dto.content, dto.fromMessageId);
  }
}
