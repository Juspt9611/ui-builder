import { InternalServerErrorException } from '@nestjs/common';
import { AiProvider, ChatMessage } from './ai.provider';
import { UnprocessablePromptException, CANNOT_INTERPRET_SENTINEL } from './errors/unprocessable-prompt.exception';
import { SYSTEM_PROMPT } from './prompts/system-prompt';

const VALID_HTML = '<!DOCTYPE html><html lang="en"><head><title>T</title></head><body>Hi</body></html>';

class FakeProvider extends AiProvider {
  constructor(private readonly rawFn: () => string) {
    super();
  }

  protected async callModel(messages: ChatMessage[]): Promise<string> {
    this.lastMessages = messages;
    return this.rawFn();
  }

  lastMessages: ChatMessage[] = [];
}

describe('AiProvider (abstract orchestration)', () => {
  it('returns valid code for a clean HTML response', async () => {
    const provider = new FakeProvider(() => VALID_HTML);
    const result = await provider.generate({ prompt: 'build a page' });
    expect(result.code).toContain('<!DOCTYPE html>');
  });

  it('throws UnprocessablePromptException on sentinel — before extracting HTML', async () => {
    const provider = new FakeProvider(() => `${CANNOT_INTERPRET_SENTINEL}: not a UI`);
    await expect(provider.generate({ prompt: 'gibberish' })).rejects.toThrow(UnprocessablePromptException);
  });

  it('sentinel exception carries status 422 and UNPROCESSABLE_PROMPT errorCode', async () => {
    const provider = new FakeProvider(() => `${CANNOT_INTERPRET_SENTINEL}: not a UI`);
    try {
      await provider.generate({ prompt: 'gibberish' });
      fail('Expected exception was not thrown');
    } catch (err) {
      const e = err as UnprocessablePromptException;
      expect(e.getStatus()).toBe(422);
      const res = e.getResponse() as Record<string, unknown>;
      expect(res.errorCode).toBe('UNPROCESSABLE_PROMPT');
      expect(res.message).toBe('not a UI');
    }
  });

  it('throws InternalServerErrorException when raw output is not valid HTML (and not a sentinel)', async () => {
    const provider = new FakeProvider(() => 'just plain text, not HTML');
    await expect(provider.generate({ prompt: 'build' })).rejects.toThrow(InternalServerErrorException);
  });

  it('sanitizes non-allowed URLs in the HTML output', async () => {
    const htmlWithBadUrl =
      '<!DOCTYPE html><html lang="en"><head><title>T</title></head>' +
      '<body><img src="https://forbidden.example.com/img.jpg"></body></html>';
    const provider = new FakeProvider(() => htmlWithBadUrl);
    const result = await provider.generate({ prompt: 'build' });
    expect(result.code).not.toContain('forbidden.example.com');
    expect(result.code).toContain('placehold.co');
  });

  it('allows picsum.photos and placehold.co URLs through sanitization', async () => {
    const htmlWithAllowedUrls =
      '<!DOCTYPE html><html lang="en"><head><title>T</title></head>' +
      '<body><img src="https://picsum.photos/400/300"><img src="https://placehold.co/400x300?text=Hi"></body></html>';
    const provider = new FakeProvider(() => htmlWithAllowedUrls);
    const result = await provider.generate({ prompt: 'build' });
    expect(result.code).toContain('picsum.photos');
    expect(result.code).toContain('placehold.co');
  });

  it('includes SYSTEM_PROMPT as the first message sent to the model', async () => {
    const provider = new FakeProvider(() => VALID_HTML);
    await provider.generate({ prompt: 'build a page' });
    expect(provider.lastMessages[0].role).toBe('system');
    expect(provider.lastMessages[0].content).toBe(SYSTEM_PROMPT);
  });

  it('appends the user prompt as the last message', async () => {
    const provider = new FakeProvider(() => VALID_HTML);
    await provider.generate({ prompt: 'build a navbar' });
    const last = provider.lastMessages.at(-1)!;
    expect(last.role).toBe('user');
    expect(last.content).toBe('build a navbar');
  });

  it('inserts a <current_app> user message when currentCode is provided', async () => {
    const provider = new FakeProvider(() => VALID_HTML);
    await provider.generate({ prompt: 'add a footer', currentCode: '<html>old</html>' });
    const currentAppMsg = provider.lastMessages.find(
      (m) => m.role === 'user' && m.content.includes('<current_app>'),
    );
    expect(currentAppMsg).toBeDefined();
    expect(currentAppMsg!.content).toContain('<html>old</html>');
  });

  it('does NOT insert a <current_app> message on first turn', async () => {
    const provider = new FakeProvider(() => VALID_HTML);
    await provider.generate({ prompt: 'build a page' });
    const currentAppMsg = provider.lastMessages.find((m) => m.content.includes('<current_app>'));
    expect(currentAppMsg).toBeUndefined();
  });

  it('returns first-turn assistantMessage when no currentCode', async () => {
    const provider = new FakeProvider(() => VALID_HTML);
    const result = await provider.generate({ prompt: 'build' });
    expect(result.assistantMessage).toContain("Here's your application");
  });

  it('returns follow-up assistantMessage when currentCode is present', async () => {
    const provider = new FakeProvider(() => VALID_HTML);
    const result = await provider.generate({ prompt: 'add a footer', currentCode: VALID_HTML });
    expect(result.assistantMessage).toContain('Updated');
  });
});
