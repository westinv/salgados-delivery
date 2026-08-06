import type { ReactNode } from "react";

export type PillTone = "success" | "danger" | "warning";

const TONE_CLASSES: Record<PillTone, string> = {
  success: "text-success-text bg-success-bg",
  danger: "text-danger bg-danger-bg",
  warning: "text-warning-text bg-warning-bg",
};

export function StatusPill({
  tone,
  children,
  size = "md",
}: {
  tone: PillTone;
  children: ReactNode;
  size?: "sm" | "md";
}) {
  const sizeClasses =
    size === "sm" ? "text-xs px-2.5 py-1.5" : "text-[13px] px-3.5 py-2";
  return (
    <span
      className={`inline-block rounded-pill font-bold ${sizeClasses} ${TONE_CLASSES[tone]}`}
    >
      {children}
    </span>
  );
}
