import { Injectable, InternalServerErrorException, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiProvider } from '../ai.provider';
import { AiGenerateInput, AiGenerateOutput } from '../types/ai.types';
import { extractHtmlDocument } from './utils/extract-html-document';
import { sanitizeRemoteUrls } from './utils/sanitize-remote-urls';
import { SYSTEM_PROMPT } from '../prompts/system-prompt';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatCompletionResponse {
  choices: { message: { role: string; content: string } }[];
  error?: { message: string; code?: number };
}

@Injectable()
export class OpenRouterAiProvider implements AiProvider, OnModuleInit {
  private readonly logger = new Logger(OpenRouterAiProvider.name);
  private readonly apiKey: string;
  private readonly model: string;
  private readonly headers: Record<string, string>;

  constructor(private readonly config: ConfigService) {
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

  async generate(input: AiGenerateInput): Promise<AiGenerateOutput> {
    const messages: ChatMessage[] = [{ role: 'system', content: SYSTEM_PROMPT }];

    if (input.currentCode) {
      messages.push({
        role: 'user',
        content:
          'This is the current version of the application. Use it as the base for the requested change and return the full updated document.\n\n' +
          '<current_app>\n' +
          input.currentCode +
          '\n</current_app>',
      });
    }

    messages.push({ role: 'user', content: input.prompt });

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

    let code: string;
    try {
      code = extractHtmlDocument(raw);
    } catch (err) {
      this.logger.error('Could not extract HTML from model output', raw.slice(0, 300));
      throw new InternalServerErrorException('AI provider did not return a valid HTML document');
    }

    const sanitized = sanitizeRemoteUrls(code);
    if (sanitized.replacedCount > 0) {
      this.logger.warn(`Sanitizer replaced ${sanitized.replacedCount} non-allowed URL(s) with placeholders`);
    }
    code = sanitized.html;

    const isFirstTurn = !input.currentCode;
    const assistantMessage = isFirstTurn
      ? "Here's your application. Send another instruction to refine it."
      : 'Updated your application with the latest changes.';

    return { code, assistantMessage };
  }
}
