import { useState } from "react";
import type { EstoqueItem } from "../types";
import { EMBALAGEM_VAZIA, type EmbalagemState } from "../utils/embalagem";
import { addDaysLocal, todayLocal } from "../utils/date";
import { computePresetAssignment } from "../hooks/usePresets";

export type DayOffset = 0 | 1 | "custom";

export interface OrderDraft {
  clientName: string;
  dayOffset: DayOffset;
  customDate: string;
  deliveryTime: string;
  reminder: string;
  qtys: Record<number, number>;
  appliedPresetTotal: number | null;
  packaging: EmbalagemState;
}

export function makeEmptyDraft(defaultReminder: string): OrderDraft {
  return {
    clientName: "",
    dayOffset: 0,
    customDate: "",
    deliveryTime: "",
    reminder: defaultReminder,
    qtys: {},
    appliedPresetTotal: null,
    packaging: { ...EMBALAGEM_VAZIA },
  };
}

export function effectiveDate(draft: OrderDraft): string {
  if (draft.dayOffset === "custom") return draft.customDate;
  return addDaysLocal(new Date(), draft.dayOffset);
}

export function draftTotal(draft: OrderDraft): number {
  return Object.values(draft.qtys).reduce((sum, q) => sum + q, 0);
}

export function useOrderDraft(defaultReminder: string) {
  const [draft, setDraft] = useState<OrderDraft>(() => makeEmptyDraft(defaultReminder));

  function patch(next: Partial<OrderDraft>) {
    setDraft((d) => ({ ...d, ...next }));
  }

  function setQty(itemId: number, qty: number, max: number) {
    const clamped = Math.max(0, Math.min(max, qty));
    setDraft((d) => ({
      ...d,
      qtys: { ...d.qtys, [itemId]: clamped },
      appliedPresetTotal: null,
    }));
  }

  function applyPreset(estoqueItems: EstoqueItem[], total: number) {
    const result = computePresetAssignment(estoqueItems, total);
    if (!result.ok) return result;
    setDraft((d) => {
      const qtys: Record<number, number> = {};
      for (const item of result.itens) qtys[item.estoqueId] = item.quantidade;
      return { ...d, qtys, appliedPresetTotal: total };
    });
    return result;
  }

  function reset(defaultReminderNext: string) {
    setDraft(makeEmptyDraft(defaultReminderNext));
  }

  const isStep1Valid =
    draft.clientName.trim().length > 0 &&
    !!draft.deliveryTime &&
    (draft.dayOffset !== "custom" || !!draft.customDate);

  const total = draftTotal(draft);
  const isStep2Valid = total > 0;

  return {
    draft,
    patch,
    setQty,
    applyPreset,
    reset,
    isStep1Valid,
    isStep2Valid,
    total,
    minDate: todayLocal(),
  };
}
