'use client';

interface TruncationConfirmModalProps {
  discardCount: number;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function TruncationConfirmModal({
  discardCount,
  onConfirm,
  onCancel,
}: TruncationConfirmModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onCancel}
    >
      <div
        className="mx-4 w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl dark:bg-zinc-900"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
          Edit older version
        </h3>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          This will permanently discard{' '}
          <span className="font-medium text-zinc-900 dark:text-zinc-100">
            {discardCount} {discardCount === 1 ? 'later version' : 'later versions'}
          </span>
          . This action cannot be undone.
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
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
