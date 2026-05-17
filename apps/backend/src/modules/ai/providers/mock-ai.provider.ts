import { Injectable } from '@nestjs/common';
import { AiProvider } from '../ai.provider';
import { AiGenerateInput, AiGenerateOutput } from '../types/ai.types';
import { UnprocessablePromptException } from '../errors/unprocessable-prompt.exception';

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
export class MockAiProvider implements AiProvider {
  async generate(input: AiGenerateInput): Promise<AiGenerateOutput> {
    if (input.prompt.includes('__cannot__')) {
      throw new UnprocessablePromptException('Mock: prompt contained __cannot__ trigger.');
    }
    return {
      code: MOCK_HTML,
      assistantMessage: 'Here is your application! You can continue refining it by sending more instructions.',
    };
  }
}
