'use client';

interface CodePreviewProps {
  code: string;
}

export default function CodePreview({ code }: CodePreviewProps) {
  if (!code) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-neutral-500">
        Your application will appear here
      </div>
    );
  }

  return (
    <iframe
      srcDoc={code}
      sandbox="allow-scripts"
      title="Application Preview"
      className="h-full w-full border-0"
    />
  );
}
