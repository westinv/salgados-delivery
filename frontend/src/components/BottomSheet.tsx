import type { ReactNode } from "react";

interface BottomSheetProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer: ReactNode;
}

export function BottomSheet({ title, onClose, children, footer }: BottomSheetProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ background: "var(--color-overlay)" }}
    >
      <div className="w-full max-w-[430px] bg-bg rounded-t-sheet max-h-[90dvh] flex flex-col">
        <div className="px-5 pt-5 pb-3.5 flex items-center justify-between border-b border-[#E7DCCF]">
          <div className="text-xl font-extrabold">{title}</div>
          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 rounded-chip bg-surface flex items-center justify-center text-lg text-ink-soft"
          >
            ✕
          </button>
        </div>
        <div className="flex-1 overflow-y-auto sheet-scroll p-5">{children}</div>
        <div className="bg-surface border-t border-[#E7DCCF] px-5 pt-3.5 pb-[calc(22px+env(safe-area-inset-bottom))] flex gap-2.5">
          {footer}
        </div>
      </div>
    </div>
  );
}
