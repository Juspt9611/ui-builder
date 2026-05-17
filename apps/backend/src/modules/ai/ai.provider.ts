import { InternalServerErrorException, Logger } from '@nestjs/common';
import { AiGenerateInput, AiGenerateOutput } from './types/ai.types';
import { CANNOT_INTERPRET_SENTINEL, UnprocessablePromptException } from './errors/unprocessable-prompt.exception';
import { SYSTEM_PROMPT } from './prompts/system-prompt';
import { extractHtmlDocument } from './providers/utils/extract-html-document';
import { sanitizeRemoteUrls } from './providers/utils/sanitize-remote-urls';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

const FIRST_TURN_ASSISTANT_MESSAGE = "Here's your application. Send another instruction to refine it.";
const FOLLOW_UP_ASSISTANT_MESSAGE = 'Updated your application with the latest changes.';

export abstract class AiProvider {
  protected readonly logger = new Logger(AiProvider.name);

  async generate(input: AiGenerateInput): Promise<AiGenerateOutput> {
    const messages = this.buildMessages(input);
    const raw = await this.callModel(messages);

    this.assertNotUnprocessable(raw);
    const extracted = this.extractHtml(raw);
    const code = this.sanitize(extracted);
    const assistantMessage = input.currentCode ? FOLLOW_UP_ASSISTANT_MESSAGE : FIRST_TURN_ASSISTANT_MESSAGE;

    return { code, assistantMessage };
  }

  protected abstract callModel(messages: ChatMessage[]): Promise<string>;

  private buildMessages(input: AiGenerateInput): ChatMessage[] {
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
    return messages;
  }

  private assertNotUnprocessable(raw: string): void {
    const match = raw.trim().match(new RegExp(`^${CANNOT_INTERPRET_SENTINEL}:\\s*(.*)$`));
    if (match) {
      const reason = match[1].trim() || 'The model could not interpret the prompt.';
      this.logger.warn(`Model returned CANNOT_INTERPRET sentinel: ${reason}`);
      throw new UnprocessablePromptException(reason);
    }
  }

  private extractHtml(raw: string): string {
    try {
      return extractHtmlDocument(raw);
    } catch {
      this.logger.error('Could not extract HTML from model output', raw.slice(0, 300));
      throw new InternalServerErrorException('AI provider did not return a valid HTML document');
    }
  }

  private sanitize(html: string): string {
    const { html: sanitized, replacedCount } = sanitizeRemoteUrls(html);
    if (replacedCount > 0) {
      this.logger.warn(`Sanitizer replaced ${replacedCount} non-allowed URL(s) with placeholders`);
    }
    return sanitized;
  }
}
