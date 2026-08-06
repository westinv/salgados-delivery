import { Stepper } from "../components/Stepper";
import { PRESET_TOTALS, presetDetailLabel } from "../hooks/usePresets";
import type { EstoqueItem } from "../types";
import type { OrderDraft } from "./useOrderDraft";
import type { PresetAssignment, PresetUnavailable } from "../hooks/usePresets";

const PACKAGING_OPTIONS: { key: OrderDraft["packaging"]["tipo"]; label: string }[] = [
  { key: "nenhuma", label: "Nenhuma" },
  { key: "tupperware", label: "Tupperware" },
  { key: "isopor", label: "Isopor" },
];

export function WizardStep2({
  draft,
  patch,
  setQty,
  estoqueItems,
  onPickPreset,
}: {
  draft: OrderDraft;
  patch: (next: Partial<OrderDraft>) => void;
  setQty: (itemId: number, qty: number, max: number) => void;
  estoqueItems: EstoqueItem[];
  onPickPreset: (total: number) => PresetAssignment | PresetUnavailable;
}) {
  const showPkgDetail = draft.packaging.tipo !== "nenhuma";

  return (
    <div>
      <div className="text-sm text-muted mb-2.5">Pacotes mais usados</div>
      <div className="grid grid-cols-2 gap-2.5 mb-6">
        {PRESET_TOTALS.map((total) => {
          const active = draft.appliedPresetTotal === total;
          return (
            <button
              key={total}
              type="button"
              onClick={() => onPickPreset(total)}
              className={`text-left rounded-input px-3.5 py-4 border-[1.5px] ${
                active
                  ? "bg-primary border-primary text-white"
                  : "bg-surface border-border text-ink"
              }`}
            >
              <div className="text-base font-extrabold">{total} salgados</div>
              <div className="text-[13px] opacity-80 mt-0.5">
                {presetDetailLabel(total)}
              </div>
            </button>
          );
        })}
      </div>

      <div className="text-sm text-muted mb-2.5">Ajustar item por item</div>
      <div className="flex flex-col gap-2.5">
        {estoqueItems.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between bg-surface rounded-input px-3.5 py-3"
          >
            <div className="text-[15px] font-semibold">{item.nome}</div>
            <Stepper
              value={draft.qtys[item.id] || 0}
              onChange={(qty) => setQty(item.id, qty, item.quantidade)}
              max={item.quantidade}
            />
          </div>
        ))}
        {estoqueItems.length === 0 && (
          <div className="text-sm text-muted py-2">
            Cadastre produtos no estoque primeiro.
          </div>
        )}
      </div>

      <div className="text-sm text-muted mt-6 mb-2.5">Embalagem</div>
      <div className="grid grid-cols-3 gap-2">
        {PACKAGING_OPTIONS.map((opt) => {
          const active = draft.packaging.tipo === opt.key;
          return (
            <button
              key={opt.key}
              type="button"
              onClick={() =>
                patch({
                  packaging: {
                    ...draft.packaging,
                    tipo: opt.key,
                    detalhe: opt.key === draft.packaging.tipo ? draft.packaging.detalhe : "",
                  },
                })
              }
              className={`text-center rounded-chip py-3.5 px-1.5 text-sm font-semibold border-[1.5px] ${
                active
                  ? "bg-primary border-primary text-white"
                  : "bg-surface border-border text-ink-soft"
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
      {showPkgDetail && (
        <div className="mt-3">
          <div className="text-sm text-muted mb-2">
            {draft.packaging.tipo === "isopor" ? "Qual isopor?" : "Qual tupperware?"}
          </div>
          <input
            type="text"
            placeholder={
              draft.packaging.tipo === "isopor"
                ? "Ex: isopor grande 20L"
                : "Ex: 2 potes redondos grandes"
            }
            value={draft.packaging.detalhe}
            onChange={(e) =>
              patch({ packaging: { ...draft.packaging, detalhe: e.target.value } })
            }
            className="w-full box-border p-4 text-[17px] border-[1.5px] border-border rounded-input bg-surface text-ink"
          />
        </div>
      )}
    </div>
  );
}
