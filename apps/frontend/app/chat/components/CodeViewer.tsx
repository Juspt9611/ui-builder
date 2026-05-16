'use client';

import { useMemo, useState, useEffect } from 'react';
import hljs from 'highlight.js/lib/core';
import xml from 'highlight.js/lib/languages/xml';

hljs.registerLanguage('html', xml);

interface CodeViewerProps {
  code: string;
}

export default function CodeViewer({ code }: CodeViewerProps) {
  const [copyState, setCopyState] = useState<'idle' | 'copied'>('idle');

  useEffect(() => {
    if (copyState !== 'copied') return;
    const timer = setTimeout(() => setCopyState('idle'), 1500);
    return () => clearTimeout(timer);
  }, [copyState]);

  const highlighted = useMemo(
    () => (code ? hljs.highlight(code, { language: 'html' }).value : ''),
    [code],
  );

  const handleCopy = () => {
    navigator.clipboard.writeText(code).then(() => setCopyState('copied'));
  };

  if (!code) {
    return (
      <div className="absolute inset-0 flex items-center justify-center">
        <p className="text-sm text-neutral-500">Your application will appear here</p>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 flex flex-col bg-zinc-900">
      <div className="flex shrink-0 items-center justify-end border-b border-zinc-700 px-3 py-2">
        <button
          onClick={handleCopy}
          className="rounded bg-zinc-700 px-2.5 py-1 text-xs font-medium text-zinc-200 transition-colors hover:bg-zinc-600"
        >
          {copyState === 'copied' ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <pre className="min-h-0 flex-1 overflow-auto p-4 text-sm font-mono leading-relaxed">
        <code
          className="hljs language-html"
          dangerouslySetInnerHTML={{ __html: highlighted }}
        />
      </pre>
    </div>
  );
}
