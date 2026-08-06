import type { ReactNode } from "react";

interface ChipProps {
  label: ReactNode;
  sub?: ReactNode;
  active: boolean;
  onClick: () => void;
  variant?: "pill" | "block";
  disabled?: boolean;
}

export function Chip({
  label,
  sub,
  active,
  onClick,
  variant = "pill",
  disabled = false,
}: ChipProps) {
  const base =
    variant === "pill"
      ? "rounded-pill px-4 py-3 text-[15px] font-semibold"
      : "flex-1 text-center rounded-input px-2 py-3.5";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`${base} border-[1.5px] transition-colors ${
        active
          ? "bg-primary border-primary text-white"
          : "bg-surface border-border text-ink-soft"
      } ${disabled ? "opacity-50" : ""}`}
    >
      <div className={variant === "block" ? "text-[15px] font-bold" : ""}>
        {label}
      </div>
      {sub != null && (
        <div className="text-xs opacity-80 mt-0.5">{sub}</div>
      )}
    </button>
  );
}
