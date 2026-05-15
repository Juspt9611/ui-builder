import { DynamicModule, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiProvider } from './ai.provider';
import { MockAiProvider } from './providers/mock-ai.provider';
import { OpenRouterAiProvider } from './providers/openrouter-ai.provider';

@Module({})
export class AiModule {
  static forRoot(): DynamicModule {
    return {
      module: AiModule,
      providers: [
        {
          provide: AiProvider,
          inject: [ConfigService],
          useFactory: (cfg: ConfigService): AiProvider =>
            cfg.get('AI_PROVIDER') === 'openrouter'
              ? new OpenRouterAiProvider(cfg)
              : new MockAiProvider(),
        },
      ],
      exports: [AiProvider],
    };
  }
}
