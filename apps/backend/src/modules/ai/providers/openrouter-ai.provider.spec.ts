import { ConfigService } from '@nestjs/config';
import { OpenRouterAiProvider } from './openrouter-ai.provider';
import { CANNOT_INTERPRET_SENTINEL, UnprocessablePromptException } from '../errors/unprocessable-prompt.exception';
import { InternalServerErrorException } from '@nestjs/common';

const VALID_HTML = '<!DOCTYPE html><html lang="en"><head><title>T</title></head><body>Hi</body></html>';

function makeConfigService(overrides: Record<string, string> = {}): ConfigService {
  return {
    getOrThrow: (key: string) => overrides[key] ?? 'test-key',
    get: (key: string, def?: string) => overrides[key] ?? def,
  } as unknown as ConfigService;
}

function makeFetchResponse(body: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
    json: () => Promise.resolve(body),
  } as unknown as Response;
}

describe('OpenRouterAiProvider', () => {
  let provider: OpenRouterAiProvider;
  let fetchSpy: jest.SpyInstance;

  beforeEach(() => {
    provider = new OpenRouterAiProvider(makeConfigService());
    fetchSpy = jest.spyOn(global, 'fetch');
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it('returns code for a valid HTML response', async () => {
    fetchSpy.mockResolvedValue(
      makeFetchResponse({ choices: [{ message: { role: 'assistant', content: VALID_HTML } }] }),
    );

    const result = await provider.generate({ prompt: 'build a page' });
    expect(result.code).toContain('<!DOCTYPE html>');
  });

  it('throws UnprocessablePromptException when model returns CANNOT_INTERPRET sentinel', async () => {
    fetchSpy.mockResolvedValue(
      makeFetchResponse({
        choices: [{ message: { role: 'assistant', content: `${CANNOT_INTERPRET_SENTINEL}: prompt is nonsense` } }],
      }),
    );

    await expect(provider.generate({ prompt: 'asdfjkl;' })).rejects.toThrow(
      UnprocessablePromptException,
    );
  });

  it('sentinel exception carries the model reason in message', async () => {
    fetchSpy.mockResolvedValue(
      makeFetchResponse({
        choices: [{ message: { role: 'assistant', content: `${CANNOT_INTERPRET_SENTINEL}: not a UI request` } }],
      }),
    );

    try {
      await provider.generate({ prompt: 'asdfjkl;' });
      fail('Expected exception was not thrown');
    } catch (err) {
      const e = err as UnprocessablePromptException;
      expect(e.getStatus()).toBe(422);
      const res = e.getResponse() as Record<string, unknown>;
      expect(res.errorCode).toBe('UNPROCESSABLE_PROMPT');
      expect(res.message).toBe('not a UI request');
    }
  });

  it('uses fallback reason when sentinel has no text after colon', async () => {
    fetchSpy.mockResolvedValue(
      makeFetchResponse({
        choices: [{ message: { role: 'assistant', content: `${CANNOT_INTERPRET_SENTINEL}:` } }],
      }),
    );

    try {
      await provider.generate({ prompt: 'test' });
      fail('Expected exception was not thrown');
    } catch (err) {
      const e = err as UnprocessablePromptException;
      const res = e.getResponse() as Record<string, unknown>;
      expect(typeof res.message).toBe('string');
      expect((res.message as string).length).toBeGreaterThan(0);
    }
  });

  it('throws InternalServerErrorException when model returns invalid HTML (not sentinel)', async () => {
    fetchSpy.mockResolvedValue(
      makeFetchResponse({
        choices: [{ message: { role: 'assistant', content: 'This is just plain text, not HTML.' } }],
      }),
    );

    await expect(provider.generate({ prompt: 'build a page' })).rejects.toThrow(
      InternalServerErrorException,
    );
  });
});
