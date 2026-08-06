import { MENU, type Tab } from "../nav";

export function Drawer({
  activeTab,
  onPick,
  onClose,
}: {
  activeTab: Tab;
  onPick: (tab: Tab) => void;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[70] flex"
      style={{ background: "var(--color-overlay)" }}
    >
      <div className="w-[78%] max-w-[300px] bg-surface h-full flex flex-col p-[18px_14px]">
        <div className="flex items-center justify-between px-1 pb-3.5">
          <div className="text-[17px] font-extrabold">Menu</div>
          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 rounded-chip bg-surface-tint flex items-center justify-center text-lg text-ink-soft"
          >
            ✕
          </button>
        </div>
        <div className="flex flex-col gap-1">
          {MENU.map((item) => {
            const active = item.key === activeTab;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => onPick(item.key)}
                className={`text-left px-[18px] py-4 rounded-input text-[17px] ${
                  active
                    ? "font-bold text-primary-dark bg-primary-tint-2"
                    : "font-semibold text-ink bg-transparent"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>
      <div className="flex-1" onClick={onClose} />
    </div>
  );
}
