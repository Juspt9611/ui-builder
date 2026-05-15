export function extractHtmlDocument(raw: string): string {
  const trimmed = raw.trim();

  // happy path: model obeyed and returned pure HTML
  if (/^<!doctype html/i.test(trimmed)) return trimmed;

  // defense: model added a markdown fence anyway
  const fenced = trimmed.match(/```(?:html)?\s*([\s\S]*?)```/i);
  if (fenced && /<!doctype html/i.test(fenced[1])) return fenced[1].trim();

  // defense: model added preamble before the doctype
  const docMatch = trimmed.match(/<!doctype html[\s\S]*<\/html>/i);
  if (docMatch) return docMatch[0];

  throw new Error('LLM response did not contain a valid HTML document');
}
