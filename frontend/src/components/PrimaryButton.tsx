import type { ReactNode } from "react";

export function PrimaryButton({
  children,
  onClick,
  disabled = false,
  cta = false,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  cta?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`press-feedback w-full text-center rounded-card py-5 text-[19px] font-extrabold text-white ${
        disabled ? "bg-disabled" : "bg-primary"
      } ${cta && !disabled ? "shadow-cta" : ""}`}
    >
      {children}
    </button>
  );
}
