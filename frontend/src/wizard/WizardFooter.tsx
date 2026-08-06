export function WizardFooter({
  summaryLeft,
  summaryRight,
  label,
  disabled,
  onClick,
}: {
  summaryLeft: string;
  summaryRight: string;
  label: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <div className="sticky bottom-0 bg-surface border-t border-[#E7DCCF] px-5 pt-3.5 pb-[calc(22px+env(safe-area-inset-bottom))]">
      <div className="flex items-center justify-between mb-3 text-sm text-muted">
        <div>{summaryLeft}</div>
        <div className="font-bold text-ink">{summaryRight}</div>
      </div>
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={`w-full text-center py-4 rounded-input text-base font-extrabold text-white ${
          disabled ? "bg-disabled" : "bg-primary"
        }`}
      >
        {label}
      </button>
    </div>
  );
}
