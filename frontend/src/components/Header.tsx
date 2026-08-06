export function Header({
  showMenuButton,
  onMenuOpen,
  hint,
}: {
  showMenuButton: boolean;
  onMenuOpen: () => void;
  hint: string;
}) {
  return (
    <div className="bg-header text-white px-4 pb-3.5 pt-[calc(14px+env(safe-area-inset-top))] flex items-center gap-3 sticky top-0 z-20">
      {showMenuButton && (
        <button
          type="button"
          onClick={onMenuOpen}
          className="w-11 h-11 rounded-chip bg-white/10 flex flex-col items-center justify-center gap-1 shrink-0"
          aria-label="Abrir menu"
        >
          <span className="w-[18px] h-0.5 bg-white" />
          <span className="w-[18px] h-0.5 bg-white" />
          <span className="w-[18px] h-0.5 bg-white" />
        </button>
      )}
      <div className="text-lg font-bold flex-1">Simone Salgados</div>
      <div className="text-[13px] text-[#C9B8A6]">{hint}</div>
    </div>
  );
}
