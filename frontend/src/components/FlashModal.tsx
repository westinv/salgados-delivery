export function FlashModal({
  message,
  onClose,
}: {
  message: string;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[75] flex items-center justify-center p-6"
      style={{ background: "var(--color-overlay)" }}
    >
      <div className="w-full max-w-[340px] bg-surface rounded-[20px] p-6 text-center">
        <div className="text-[17px] font-bold leading-snug text-ink">{message}</div>
        <button
          type="button"
          onClick={onClose}
          className="mt-5 w-full bg-primary text-white py-4 rounded-input text-base font-extrabold"
        >
          Ok
        </button>
      </div>
    </div>
  );
}
