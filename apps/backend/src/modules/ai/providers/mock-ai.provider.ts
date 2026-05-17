import { Injectable } from '@nestjs/common';
import { AiProvider, ChatMessage } from '../ai.provider';
import { CANNOT_INTERPRET_SENTINEL } from '../errors/unprocessable-prompt.exception';

const MOCK_HTML = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Generated App</title>
    <style>
      body {
        margin: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 100vh;
        font-family: sans-serif;
        background: #f0f4ff;
      }
      h1 { color: #3b52f5; }
    </style>
  </head>
  <body>
    <h1>Hello World</h1>
  </body>
</html>`;

@Injectable()
export class MockAiProvider extends AiProvider {
  protected async callModel(messages: ChatMessage[]): Promise<string> {
    const hasCannotTrigger = messages
      .filter((m) => m.role === 'user')
      .some((m) => m.content.includes('__cannot__'));

    if (hasCannotTrigger) {
      return `${CANNOT_INTERPRET_SENTINEL}: Mock: prompt contained __cannot__ trigger.`;
    }

    return MOCK_HTML;
  }
}
