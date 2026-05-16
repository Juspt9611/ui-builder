'use client';

import { useMemo } from 'react';

// Intercepts all anchor clicks in capture phase so default navigation is blocked
// regardless of what the LLM emits. preventDefault() does not cancel the event,
// so onclick handlers on <a> elements continue to execute normally.
const LINK_NEUTRALIZER_SCRIPT = `<script>
  document.addEventListener('click', function (e) {
    var t = e.target;
    if (t && typeof t.closest === 'function' && t.closest('a')) {
      e.preventDefault();
    }
  }, true);
<\/script>`;

function injectLinkNeutralizer(html: string): string {
  return html.replace(/<head(\s[^>]*)?>/i, (match) => `${match}${LINK_NEUTRALIZER_SCRIPT}`);
}

interface CodePreviewProps {
  code: string;
}

export default function CodePreview({ code }: CodePreviewProps) {
  const srcDoc = useMemo(() => (code ? injectLinkNeutralizer(code) : ''), [code]);

  if (!code) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-neutral-500">
        Your application will appear here
      </div>
    );
  }

  return (
    <iframe
      srcDoc={srcDoc}
      sandbox="allow-scripts"
      title="Application Preview"
      className="h-full w-full border-0"
    />
  );
}
