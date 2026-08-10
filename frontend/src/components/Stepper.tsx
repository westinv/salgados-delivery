import { useEffect, useState } from "react";

interface StepperProps {
  value: number;
  onChange: (next: number) => void;
  step?: number;
  min?: number;
  max?: number;
}

export function Stepper({ value, onChange, step = 5, min = 0, max }: StepperProps) {
  const [text, setText] = useState(String(value));

  useEffect(() => {
    setText(String(value));
  }, [value]);

  const dec = () => onChange(Math.max(min, value - step));
  const inc = () => onChange(max != null ? Math.min(max, value + step) : value + step);

  function commit(raw: string) {
    const parsed = Math.max(min, parseInt(raw, 10) || 0);
    onChange(max != null ? Math.min(max, parsed) : parsed);
  }

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={dec}
        className="w-11 h-11 rounded-chip bg-surface-tint text-primary-dark text-[22px] font-bold flex items-center justify-center"
      >
        −
      </button>
      <input
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          if (e.target.value.trim() !== "") commit(e.target.value);
        }}
        onBlur={(e) => commit(e.target.value)}
        onFocus={(e) => e.target.select()}
        className="w-[52px] text-center text-[19px] font-extrabold bg-transparent border-none p-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      />
      <button
        type="button"
        onClick={inc}
        className="w-11 h-11 rounded-chip bg-primary text-white text-[22px] font-bold flex items-center justify-center"
      >
        +
      </button>
    </div>
  );
}
