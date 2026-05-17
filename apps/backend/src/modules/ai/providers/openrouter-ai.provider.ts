import { Injectable, InternalServerErrorException, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiProvider, ChatMessage } from '../ai.provider';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

interface ChatCompletionResponse {
  choices: { message: { role: string; content: string } }[];
  error?: { message: string; code?: number };
}

@Injectable()
export class OpenRouterAiProvider extends AiProvider implements OnModuleInit {
  protected readonly logger = new Logger(OpenRouterAiProvider.name);
  private readonly apiKey: string;
  private readonly model: string;
  private readonly headers: Record<string, string>;

  constructor(private readonly config: ConfigService) {
    super();
    this.apiKey = this.config.getOrThrow<string>('OPENROUTER_API_KEY');
    this.model = this.config.get<string>('OPENROUTER_MODEL', 'nvidia/nemotron-3-super-120b-a12b:free');

    this.headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.apiKey}`,
    };

    const siteUrl = this.config.get<string>('OPENROUTER_SITE_URL');
    const appName = this.config.get<string>('OPENROUTER_APP_NAME');
    if (siteUrl) this.headers['HTTP-Referer'] = siteUrl;
    if (appName) this.headers['X-Title'] = appName;
  }

  onModuleInit() {
    this.logger.log(`OpenRouter provider ready — model: ${this.model}`);
  }

  protected async callModel(messages: ChatMessage[]): Promise<string> {
    let response: Response;
    try {
      response = await fetch(OPENROUTER_URL, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({ model: this.model, messages }),
      });
    } catch (err) {
      this.logger.error('Network error calling OpenRouter', err);
      throw new InternalServerErrorException('Failed to reach the AI provider');
    }

    let body: ChatCompletionResponse;
    try {
      body = (await response.json()) as ChatCompletionResponse;
    } catch {
      throw new InternalServerErrorException('Invalid JSON response from AI provider');
    }

    if (!response.ok) {
      const detail = body.error?.message ?? `HTTP ${response.status}`;
      this.logger.error(`OpenRouter error: ${detail}`);
      throw new InternalServerErrorException(`AI provider error: ${detail}`);
    }

    const raw = body.choices?.[0]?.message?.content;
    if (!raw) {
      throw new InternalServerErrorException('AI provider returned an empty response');
    }

    return raw;
  }
}
