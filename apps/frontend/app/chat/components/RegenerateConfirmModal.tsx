'use client';

interface RegenerateConfirmModalProps {
  onConfirm: () => void;
  onCancel: () => void;
}

export default function RegenerateConfirmModal({
  onConfirm,
  onCancel,
}: RegenerateConfirmModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onCancel}
    >
      <div
        className="mx-4 w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl dark:bg-zinc-900"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Start over?</h3>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          {"You'll go back to the home page with your original prompt preloaded. Your current app stays available at its URL."}
        </p>
        <div className="mt-5 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            Start over
          </button>
        </div>
      </div>
    </div>
  );
}
