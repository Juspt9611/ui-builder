import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiProvider } from './ai.provider';
import { MockAiProvider } from './providers/mock-ai.provider';
import { OpenRouterAiProvider } from './providers/openrouter-ai.provider';

@Module({
  providers: [
    MockAiProvider,
    OpenRouterAiProvider,
    {
      provide: AiProvider,
      inject: [ConfigService, MockAiProvider, OpenRouterAiProvider],
      useFactory: (cfg: ConfigService, mock: MockAiProvider, openrouter: OpenRouterAiProvider) =>
        cfg.get('AI_PROVIDER') === 'openrouter' ? openrouter : mock,
    },
  ],
  exports: [AiProvider],
})
export class AiModule {}
