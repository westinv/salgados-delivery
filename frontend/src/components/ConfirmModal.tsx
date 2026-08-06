import type { ReactNode } from "react";

interface ConfirmModalProps {
  title: string;
  detail?: ReactNode;
  note?: ReactNode;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  title,
  detail,
  note,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-6"
      style={{ background: "var(--color-overlay)" }}
    >
      <div className="w-full max-w-[360px] bg-surface rounded-[20px] p-6 text-center">
        <div className="text-xl font-extrabold mb-2">{title}</div>
        {detail && (
          <div className="text-base text-ink-soft font-semibold">{detail}</div>
        )}
        {note && (
          <div className="text-sm text-muted mt-3.5 leading-snug">{note}</div>
        )}
        <div className="flex flex-col gap-2.5 mt-5.5">
          <button
            type="button"
            onClick={onConfirm}
            className="bg-danger text-white py-4 rounded-input text-base font-extrabold"
          >
            {confirmLabel}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="bg-surface-tint text-ink-soft py-4 rounded-input text-base font-bold"
          >
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
