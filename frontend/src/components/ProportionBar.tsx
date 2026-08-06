export function ProportionBar({
  value,
  max,
  danger = false,
}: {
  value: number;
  max: number;
  danger?: boolean;
}) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="bg-divider-2 rounded-bar h-2">
      <div
        className={`h-2 rounded-bar ${danger ? "bg-danger" : "bg-primary"}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
