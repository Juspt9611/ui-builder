export const ALLOWED_IMAGE_HOSTS = ['picsum.photos', 'placehold.co'] as const;
export const FALLBACK_PLACEHOLDER = 'https://placehold.co/600x400?text=Image';

const ABSOLUTE_URL_RE = /https?:\/\/[^\s"'<>)]+/gi;

function isAllowedHost(url: string): boolean {
  try {
    const { hostname } = new URL(url);
    const normalized = hostname.toLowerCase().replace(/^www\./, '');
    return (ALLOWED_IMAGE_HOSTS as readonly string[]).includes(normalized);
  } catch {
    return false;
  }
}

export function sanitizeRemoteUrls(html: string): {
  html: string;
  replacedCount: number;
} {
  let replacedCount = 0;

  const result = html.replace(ABSOLUTE_URL_RE, (match) => {
    if (isAllowedHost(match)) return match;
    replacedCount++;
    return FALLBACK_PLACEHOLDER;
  });

  return { html: result, replacedCount };
}
