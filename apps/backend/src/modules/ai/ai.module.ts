import { Module } from '@nestjs/common';
import { AiProvider } from './ai.provider';
import { MockAiProvider } from './providers/mock-ai.provider';

@Module({
  providers: [{ provide: AiProvider, useClass: MockAiProvider }],
  exports: [AiProvider],
})
export class AiModule {}
