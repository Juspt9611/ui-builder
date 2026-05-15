import { extractHtmlDocument } from './extract-html-document';

const VALID_HTML = '<!DOCTYPE html><html lang="en"><head><title>Test</title></head><body><p>Hello</p></body></html>';

describe('extractHtmlDocument', () => {
  it('returns the document as-is when model returns pure HTML', () => {
    expect(extractHtmlDocument(VALID_HTML)).toBe(VALID_HTML);
  });

  it('handles leading/trailing whitespace', () => {
    expect(extractHtmlDocument(`  \n${VALID_HTML}\n  `)).toBe(VALID_HTML);
  });

  it('extracts from a markdown ```html fence', () => {
    const raw = 'Sure, here it is:\n```html\n' + VALID_HTML + '\n```\nLet me know!';
    expect(extractHtmlDocument(raw)).toBe(VALID_HTML);
  });

  it('extracts from a markdown ``` fence without language tag', () => {
    const raw = '```\n' + VALID_HTML + '\n```';
    expect(extractHtmlDocument(raw)).toBe(VALID_HTML);
  });

  it('extracts when model adds preamble before the doctype', () => {
    const raw = 'Here is your application:\n\n' + VALID_HTML;
    expect(extractHtmlDocument(raw)).toBe(VALID_HTML);
  });

  it('is case-insensitive for DOCTYPE', () => {
    const lower = '<!doctype html><html><body></body></html>';
    expect(extractHtmlDocument(lower)).toBe(lower);
  });

  it('throws when response contains no HTML document', () => {
    expect(() => extractHtmlDocument('Sorry, I cannot help with that.')).toThrow(
      'LLM response did not contain a valid HTML document',
    );
  });

  it('throws for empty string', () => {
    expect(() => extractHtmlDocument('')).toThrow();
  });
});
