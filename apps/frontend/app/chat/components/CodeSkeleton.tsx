const LINE_WIDTHS = [
  'w-1/3', 'w-2/3', 'w-1/2', 'w-5/6', 'w-2/5',
  'w-3/4', 'w-1/4', 'w-2/3', 'w-3/5', 'w-1/2',
  'w-4/5', 'w-1/3',
];

const INDENT_LEVELS = [0, 1, 2, 2, 1, 2, 2, 1, 2, 2, 1, 0];

export default function CodeSkeleton() {
  return (
    <div className="absolute inset-0 flex flex-col bg-zinc-900">
      <div className="flex shrink-0 items-center justify-end border-b border-zinc-700 px-3 py-2">
        <button
          disabled
          className="rounded bg-zinc-700 px-2.5 py-1 text-xs font-medium text-zinc-500 cursor-not-allowed"
        >
          Copy
        </button>
      </div>
      <div className="flex flex-col gap-3 p-4 overflow-hidden">
        {LINE_WIDTHS.map((width, i) => (
          <div
            key={i}
            className={`h-3 rounded bg-zinc-700 animate-pulse ${width}`}
            style={{ marginLeft: `${INDENT_LEVELS[i] * 16}px` }}
          />
        ))}
      </div>
    </div>
  );
}
