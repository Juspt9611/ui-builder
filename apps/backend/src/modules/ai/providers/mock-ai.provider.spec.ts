import { MockAiProvider } from './mock-ai.provider';
import { UnprocessablePromptException } from '../errors/unprocessable-prompt.exception';

describe('MockAiProvider', () => {
  let provider: MockAiProvider;

  beforeEach(() => {
    provider = new MockAiProvider();
  });

  it('returns mock HTML for a normal prompt', async () => {
    const result = await provider.generate({ prompt: 'build a landing page' });
    expect(result.code).toContain('<!DOCTYPE html>');
    expect(result.assistantMessage).toBeTruthy();
  });

  it('throws UnprocessablePromptException when prompt includes __cannot__', async () => {
    await expect(provider.generate({ prompt: '__cannot__ do this' })).rejects.toThrow(
      UnprocessablePromptException,
    );
  });

  it('thrown exception has status 422 and correct errorCode', async () => {
    try {
      await provider.generate({ prompt: 'some __cannot__ prompt' });
      fail('Expected exception was not thrown');
    } catch (err) {
      const e = err as UnprocessablePromptException;
      expect(e.getStatus()).toBe(422);
      expect((e.getResponse() as Record<string, unknown>).errorCode).toBe('UNPROCESSABLE_PROMPT');
    }
  });
});
