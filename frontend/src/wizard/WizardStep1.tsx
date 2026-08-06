import { Chip } from "../components/Chip";
import { addDaysLocal, formatShortDatePtBR, todayLocal } from "../utils/date";
import type { OrderDraft } from "./useOrderDraft";

const TIME_CHIPS = ["12:00", "15:00", "17:00", "19:00"];
const REMINDER_CHIPS = [
  { v: "15", label: "15 min" },
  { v: "30", label: "30 min" },
  { v: "60", label: "1 hora" },
  { v: "1440", label: "1 dia" },
];

export function WizardStep1({
  draft,
  patch,
  minDate,
}: {
  draft: OrderDraft;
  patch: (next: Partial<OrderDraft>) => void;
  minDate: string;
}) {
  const amanha = addDaysLocal(new Date(), 1);

  return (
    <div>
      <input
        type="text"
        placeholder="Nome do cliente"
        value={draft.clientName}
        onChange={(e) => patch({ clientName: e.target.value })}
        className="w-full box-border p-4.5 text-lg border-[1.5px] border-border rounded-input bg-surface text-ink mb-6.5"
      />

      <div className="text-sm text-muted mb-2.5">Dia da entrega</div>
      <div className="flex gap-2 mb-6">
        <Chip
          variant="block"
          label="Hoje"
          sub={formatShortDatePtBR(todayLocal())}
          active={draft.dayOffset === 0}
          onClick={() => patch({ dayOffset: 0 })}
        />
        <Chip
          variant="block"
          label="Amanhã"
          sub={formatShortDatePtBR(amanha)}
          active={draft.dayOffset === 1}
          onClick={() => patch({ dayOffset: 1 })}
        />
        <Chip
          variant="block"
          label="Outra data"
          sub={draft.customDate ? formatShortDatePtBR(draft.customDate) : "escolher"}
          active={draft.dayOffset === "custom"}
          onClick={() => patch({ dayOffset: "custom" })}
        />
      </div>

      {draft.dayOffset === "custom" && (
        <div className="-mt-3 mb-6">
          <input
            type="date"
            min={minDate}
            value={draft.customDate}
            onChange={(e) => patch({ customDate: e.target.value })}
            className="w-full box-border p-4 text-[17px] border-[1.5px] border-border rounded-input bg-surface text-ink"
          />
        </div>
      )}

      <div className="text-sm text-muted mb-2.5">Horário</div>
      <div className="flex flex-wrap gap-2 mb-3">
        {TIME_CHIPS.map((t) => (
          <Chip
            key={t}
            label={t}
            active={draft.deliveryTime === t}
            onClick={() => patch({ deliveryTime: t })}
          />
        ))}
      </div>
      <input
        type="time"
        value={draft.deliveryTime}
        onChange={(e) => patch({ deliveryTime: e.target.value })}
        className="w-full box-border p-4 text-[17px] border-[1.5px] border-border rounded-input bg-surface text-ink mb-6"
      />

      <div className="text-sm text-muted mb-2.5">Me avisar</div>
      <div className="flex flex-wrap gap-2">
        {REMINDER_CHIPS.map((r) => (
          <Chip
            key={r.v}
            label={r.label}
            active={draft.reminder === r.v}
            onClick={() => patch({ reminder: r.v })}
          />
        ))}
      </div>
    </div>
  );
}
