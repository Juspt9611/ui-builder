export default function PreviewSkeleton() {
  return (
    <div className="absolute inset-0 flex flex-col gap-5 p-6 bg-white dark:bg-zinc-950">
      {/* nav bar */}
      <div className="flex items-center justify-between">
        <div className="h-5 w-28 rounded bg-zinc-200 dark:bg-zinc-700 animate-pulse" />
        <div className="flex gap-2">
          <div className="h-5 w-10 rounded bg-zinc-200 dark:bg-zinc-700 animate-pulse" />
          <div className="h-5 w-10 rounded bg-zinc-200 dark:bg-zinc-700 animate-pulse" />
          <div className="h-5 w-10 rounded bg-zinc-200 dark:bg-zinc-700 animate-pulse" />
        </div>
      </div>

      {/* hero text */}
      <div className="flex flex-col gap-2 pt-2">
        <div className="h-6 w-2/3 rounded bg-zinc-200 dark:bg-zinc-700 animate-pulse" />
        <div className="h-4 w-1/2 rounded bg-zinc-200 dark:bg-zinc-700 animate-pulse" />
      </div>

      {/* cards grid */}
      <div className="grid grid-cols-3 gap-4 flex-1">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex flex-col gap-3 rounded-xl border border-zinc-100 dark:border-zinc-800 p-4">
            <div className="h-24 rounded-lg bg-zinc-200 dark:bg-zinc-700 animate-pulse" />
            <div className="h-4 w-3/4 rounded bg-zinc-200 dark:bg-zinc-700 animate-pulse" />
            <div className="h-3 w-full rounded bg-zinc-200 dark:bg-zinc-700 animate-pulse" />
            <div className="h-3 w-2/3 rounded bg-zinc-200 dark:bg-zinc-700 animate-pulse" />
          </div>
        ))}
      </div>

      {/* footer bar */}
      <div className="h-4 w-1/3 rounded bg-zinc-200 dark:bg-zinc-700 animate-pulse" />
    </div>
  );
}
