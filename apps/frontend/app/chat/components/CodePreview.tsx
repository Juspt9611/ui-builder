'use client';

interface CodePreviewProps {
  code: string;
}

export default function CodePreview({ code }: CodePreviewProps) {
  return (
    <iframe
      srcDoc={code}
      sandbox="allow-scripts"
      title="Application Preview"
      className="h-full w-full border-0"
    />
  );
}
