const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

export function MonthDayGrid({
  value,
  onChange,
}: {
  value: number;
  onChange: (day: number) => void;
}) {
  return (
    <div>
      <div className="grid grid-cols-7 gap-1.5">
        {DAYS.map((day) => (
          <button
            key={day}
            type="button"
            onClick={() => onChange(day)}
            className={`h-[46px] flex items-center justify-center rounded-chip text-base font-bold border-[1.5px] ${
              value === day
                ? "bg-primary border-primary text-white"
                : "bg-surface border-border text-ink-soft"
            }`}
          >
            {day}
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={() => onChange(31)}
        className={`mt-2 w-full text-center py-3.5 rounded-chip text-[15px] font-bold border-[1.5px] ${
          value === 31
            ? "bg-primary border-primary text-white"
            : "bg-surface border-border text-ink-soft"
        }`}
      >
        Último dia do mês
      </button>
    </div>
  );
}
