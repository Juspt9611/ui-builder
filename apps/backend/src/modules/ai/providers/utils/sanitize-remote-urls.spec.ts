import { sanitizeRemoteUrls, ALLOWED_IMAGE_HOSTS, FALLBACK_PLACEHOLDER } from './sanitize-remote-urls';

const PICSUM = 'https://picsum.photos/800/600';
const PLACEHOLD = 'https://placehold.co/200x200?text=Logo';
const PEXELS = 'https://images.pexels.com/photos/123/pexels-photo-123.jpeg';
const EXTERNAL = 'https://cdn.example.com/bg.png';

function makeDoc(body: string): string {
  return `<!DOCTYPE html><html lang="en"><head><title>T</title></head><body>${body}</body></html>`;
}

describe('sanitizeRemoteUrls', () => {
  it('returns unchanged HTML and replacedCount=0 when no external URLs are present', () => {
    const html = makeDoc('<img src="/local/img.png" alt="local"><p>Hello</p>');
    const { html: out, replacedCount } = sanitizeRemoteUrls(html);
    expect(out).toBe(html);
    expect(replacedCount).toBe(0);
  });

  it('preserves picsum.photos URLs', () => {
    const html = makeDoc(`<img src="${PICSUM}" alt="photo">`);
    const { html: out, replacedCount } = sanitizeRemoteUrls(html);
    expect(out).toContain(PICSUM);
    expect(replacedCount).toBe(0);
  });

  it('preserves placehold.co URLs', () => {
    const html = makeDoc(`<img src="${PLACEHOLD}" alt="placeholder">`);
    const { html: out, replacedCount } = sanitizeRemoteUrls(html);
    expect(out).toContain(PLACEHOLD);
    expect(replacedCount).toBe(0);
  });

  it('treats www.picsum.photos as allowed', () => {
    const url = 'https://www.picsum.photos/400/300';
    const html = makeDoc(`<img src="${url}" alt="photo">`);
    const { html: out, replacedCount } = sanitizeRemoteUrls(html);
    expect(out).toContain(url);
    expect(replacedCount).toBe(0);
  });

  it('treats uppercase hostname as allowed (case-insensitive)', () => {
    const url = 'https://PICSUM.PHOTOS/400/300';
    const html = makeDoc(`<img src="${url}" alt="photo">`);
    const { replacedCount } = sanitizeRemoteUrls(html);
    expect(replacedCount).toBe(0);
  });

  it('replaces a pexels URL in an <img src> with the fallback placeholder', () => {
    const html = makeDoc(`<img src="${PEXELS}" alt="pexels photo">`);
    const { html: out, replacedCount } = sanitizeRemoteUrls(html);
    expect(out).toContain(FALLBACK_PLACEHOLDER);
    expect(out).not.toContain(PEXELS);
    expect(replacedCount).toBe(1);
  });

  it('replaces a URL inside background-image: url(...) in inline <style>', () => {
    const html = makeDoc(`<style>.hero { background-image: url(${EXTERNAL}); }</style>`);
    const { html: out, replacedCount } = sanitizeRemoteUrls(html);
    expect(out).toContain(FALLBACK_PLACEHOLDER);
    expect(out).not.toContain(EXTERNAL);
    expect(replacedCount).toBe(1);
  });

  it('replaces a URL inside a <script> inline string', () => {
    const html = makeDoc(`<script>var img = "${EXTERNAL}";</script>`);
    const { html: out, replacedCount } = sanitizeRemoteUrls(html);
    expect(out).toContain(FALLBACK_PLACEHOLDER);
    expect(out).not.toContain(EXTERNAL);
    expect(replacedCount).toBe(1);
  });

  it('counts correctly when multiple non-allowed URLs appear in the same document', () => {
    const html = makeDoc(
      `<img src="${PEXELS}" alt="a"><img src="${EXTERNAL}" alt="b"><img src="${PICSUM}" alt="c">`,
    );
    const { replacedCount } = sanitizeRemoteUrls(html);
    expect(replacedCount).toBe(2);
  });

  it('does not count allowed URLs toward replacedCount', () => {
    const html = makeDoc(`<img src="${PICSUM}" alt="a"><img src="${PLACEHOLD}" alt="b">`);
    const { replacedCount } = sanitizeRemoteUrls(html);
    expect(replacedCount).toBe(0);
  });

  it('ignores relative paths', () => {
    const html = makeDoc('<img src="/images/photo.png" alt="relative">');
    const { html: out, replacedCount } = sanitizeRemoteUrls(html);
    expect(out).toBe(html);
    expect(replacedCount).toBe(0);
  });

  it('ignores data: URIs', () => {
    const dataUri = 'data:image/png;base64,iVBORw0KGgo=';
    const html = makeDoc(`<img src="${dataUri}" alt="inline">`);
    const { html: out, replacedCount } = sanitizeRemoteUrls(html);
    expect(out).toBe(html);
    expect(replacedCount).toBe(0);
  });

  it('ignores fragment-only hrefs', () => {
    const html = makeDoc('<a href="#section">go</a>');
    const { html: out, replacedCount } = sanitizeRemoteUrls(html);
    expect(out).toBe(html);
    expect(replacedCount).toBe(0);
  });

  it('replaces malformed absolute URLs without throwing', () => {
    const html = makeDoc('<img src="https://not a valid url/photo.jpg" alt="bad">');
    expect(() => sanitizeRemoteUrls(html)).not.toThrow();
    const { replacedCount } = sanitizeRemoteUrls(html);
    expect(replacedCount).toBe(1);
  });

  it('ALLOWED_IMAGE_HOSTS contains picsum.photos and placehold.co', () => {
    expect(ALLOWED_IMAGE_HOSTS).toContain('picsum.photos');
    expect(ALLOWED_IMAGE_HOSTS).toContain('placehold.co');
  });
});
