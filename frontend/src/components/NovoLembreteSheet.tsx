import { useState } from "react";
import { BottomSheet } from "./BottomSheet";
import { Chip } from "./Chip";
import { MonthDayGrid } from "./MonthDayGrid";
import { todayLocal } from "../utils/date";

export interface RemDraft {
  kind: "once" | "monthly";
  text: string;
  date: string;
  diaDoMes: number;
  time: string;
  notice: string;
}

const TIME_CHIPS_ONCE = ["08:00", "12:00", "15:00", "18:00"];
const NOTICE_CHIPS = [
  { v: "5", label: "5 min" },
  { v: "15", label: "15 min" },
  { v: "30", label: "30 min" },
  { v: "60", label: "1 hora" },
];

export function makeDefaultDraft(kind: "once" | "monthly", defaultNotice: string): RemDraft {
  return {
    kind,
    text: "",
    date: todayLocal(),
    diaDoMes: 10,
    time: "",
    notice: defaultNotice,
  };
}

export function NovoLembreteSheet({
  draft,
  onChange,
  onCancel,
  onSave,
  saving = false,
}: {
  draft: RemDraft;
  onChange: (next: RemDraft) => void;
  onCancel: () => void;
  onSave: () => void;
  saving?: boolean;
}) {
  const [minDate] = useState(todayLocal());
  const valid =
    draft.text.trim() && draft.time && (draft.kind === "monthly" || draft.date);

  return (
    <BottomSheet
      title="Novo lembrete"
      onClose={onCancel}
      footer={
        <>
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 text-center py-4 rounded-input bg-surface-tint text-ink-soft text-base font-bold"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={!valid || saving}
            className={`flex-[2] text-center py-4 rounded-input text-base font-extrabold text-white ${
              valid && !saving ? "bg-primary" : "bg-disabled"
            }`}
          >
            {saving ? "Salvando..." : "Salvar lembrete"}
          </button>
        </>
      }
    >
      <div className="text-sm text-muted mb-2">Lembrar do que?</div>
      <input
        type="text"
        placeholder="Ex: comprar embalagens"
        value={draft.text}
        onChange={(e) => onChange({ ...draft, text: e.target.value })}
        className="w-full box-border p-4 text-[17px] border-[1.5px] border-border rounded-input bg-surface text-ink mb-5.5"
      />

      <div className="text-sm text-muted mb-2.5">Repetir</div>
      <div className="flex gap-2 mb-5.5">
        <Chip
          variant="block"
          label="Uma vez"
          active={draft.kind === "once"}
          onClick={() => onChange({ ...draft, kind: "once" })}
        />
        <Chip
          variant="block"
          label="Todo mês"
          active={draft.kind === "monthly"}
          onClick={() => onChange({ ...draft, kind: "monthly" })}
        />
      </div>

      {draft.kind === "once" ? (
        <div>
          <div className="text-sm text-muted mb-2.5">Data</div>
          <input
            type="date"
            min={minDate}
            value={draft.date}
            onChange={(e) => onChange({ ...draft, date: e.target.value })}
            className="w-full box-border p-4 text-[17px] border-[1.5px] border-border rounded-input bg-surface text-ink mb-5.5"
          />
        </div>
      ) : (
        <div>
          <div className="flex items-baseline justify-between mb-2.5">
            <div className="text-sm text-muted">Dia do mês</div>
            <div className="text-[13px] text-primary-dark font-bold">
              {draft.diaDoMes === 31
                ? "Todo último dia do mês"
                : `Todo dia ${draft.diaDoMes} do mês`}
            </div>
          </div>
          <MonthDayGrid
            value={draft.diaDoMes}
            onChange={(day) => onChange({ ...draft, diaDoMes: day })}
          />
          <div className="h-5.5" />
        </div>
      )}

      <div className="text-sm text-muted mb-2.5">Horário</div>
      <div className="flex flex-wrap gap-2 mb-2.5">
        {TIME_CHIPS_ONCE.map((t) => (
          <Chip
            key={t}
            label={t}
            active={draft.time === t}
            onClick={() => onChange({ ...draft, time: t })}
          />
        ))}
      </div>
      <input
        type="time"
        value={draft.time}
        onChange={(e) => onChange({ ...draft, time: e.target.value })}
        className="w-full box-border p-4 text-[17px] border-[1.5px] border-border rounded-input bg-surface text-ink mb-5.5"
      />

      <div className="text-sm text-muted mb-2.5">Me avisar</div>
      <div className="flex flex-wrap gap-2">
        {NOTICE_CHIPS.map((n) => (
          <Chip
            key={n.v}
            label={n.label}
            active={draft.notice === n.v}
            onClick={() => onChange({ ...draft, notice: n.v })}
          />
        ))}
      </div>
    </BottomSheet>
  );
}
