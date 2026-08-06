import { useEffect, useState } from "react";
import { BottomSheet } from "./BottomSheet";
import { Chip } from "./Chip";
import { Stepper } from "./Stepper";
import { FlashModal } from "./FlashModal";
import { useData } from "../context/DataContext";
import { addDaysLocal, formatShortDatePtBR, todayLocal } from "../utils/date";
import { decodeEmbalagem, encodeEmbalagem, type EmbalagemState } from "../utils/embalagem";
import { buildDescricao } from "../utils/order";
import * as api from "../api/client";
import { ApiError } from "../api/client";
import type { DayOffset } from "../wizard/useOrderDraft";

const TIME_CHIPS = ["12:00", "15:00", "17:00", "19:00"];
const REMINDER_CHIPS = [
  { v: "15", label: "15 min" },
  { v: "30", label: "30 min" },
  { v: "60", label: "1 hora" },
  { v: "1440", label: "1 dia" },
];
const PACKAGING_OPTIONS: { key: EmbalagemState["tipo"]; label: string }[] = [
  { key: "nenhuma", label: "Nenhuma" },
  { key: "tupperware", label: "Tupperware" },
  { key: "isopor", label: "Isopor" },
];

interface EditForm {
  cliente: string;
  dayOffset: DayOffset;
  customDate: string;
  horario: string;
  reminder: string;
  qtys: Record<number, number>;
  originalQtys: Record<number, number>;
  packaging: EmbalagemState;
}

function deriveDayOffset(data: string): { dayOffset: DayOffset; customDate: string } {
  const hoje = todayLocal();
  const amanha = addDaysLocal(new Date(), 1);
  if (data === hoje) return { dayOffset: 0, customDate: "" };
  if (data === amanha) return { dayOffset: 1, customDate: "" };
  return { dayOffset: "custom", customDate: data };
}

export function EditEntregaSheet({
  entregaId,
  onClose,
  onSaved,
}: {
  entregaId: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { estoqueItems, reloadEntregas, reloadEstoque } = useData();
  const [form, setForm] = useState<EditForm | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  useEffect(() => {
    api.buscarEntrega(entregaId).then((entrega) => {
      const { dayOffset, customDate } = deriveDayOffset(entrega.data);
      const qtys: Record<number, number> = {};
      for (const item of entrega.itens || []) {
        qtys[item.estoque_id] = item.quantidade;
      }
      setForm({
        cliente: entrega.cliente || "",
        dayOffset,
        customDate,
        horario: entrega.horario,
        reminder: String(entrega.antecedencia_minutos),
        qtys,
        originalQtys: { ...qtys },
        packaging: decodeEmbalagem(entrega.embalagem),
      });
    });
  }, [entregaId]);

  if (!form) return null;

  function patch(next: Partial<EditForm>) {
    setForm((f) => (f ? { ...f, ...next } : f));
  }

  function setQty(itemId: number, qty: number, max: number) {
    setForm((f) => (f ? { ...f, qtys: { ...f.qtys, [itemId]: Math.max(0, Math.min(max, qty)) } } : f));
  }

  const total = Object.values(form.qtys).reduce((s, q) => s + q, 0);
  const effectiveDate =
    form.dayOffset === "custom" ? form.customDate : addDaysLocal(new Date(), form.dayOffset);
  const valid =
    form.cliente.trim() &&
    form.horario &&
    (form.dayOffset !== "custom" || form.customDate) &&
    total > 0;

  async function handleSave() {
    if (!form || !valid) return;
    const items = estoqueItems
      .filter((item) => (form.qtys[item.id] || 0) > 0)
      .map((item) => ({ nome: item.nome, quantidade: form.qtys[item.id] }));
    try {
      await api.atualizarEntrega(entregaId, {
        data: effectiveDate,
        horario: form.horario,
        descricao: buildDescricao(items, form.cliente.trim()),
        cliente: form.cliente.trim(),
        embalagem: encodeEmbalagem(form.packaging),
        antecedencia_minutos: parseInt(form.reminder, 10),
        itens: estoqueItems
          .filter((item) => (form.qtys[item.id] || 0) > 0)
          .map((item) => ({ estoque_id: item.id, quantidade: form.qtys[item.id] })),
      });
      await Promise.all([reloadEntregas(), reloadEstoque()]);
      onSaved();
    } catch (err) {
      setFlash(err instanceof ApiError ? err.message : "Erro ao salvar entrega");
    }
  }

  return (
    <>
      <BottomSheet
        title="Editar entrega"
        onClose={onClose}
        footer={
          <>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 text-center py-4 rounded-input bg-surface-tint text-ink-soft text-base font-bold"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!valid}
              className={`flex-1 text-center py-4 rounded-input text-base font-extrabold text-white ${
                valid ? "bg-primary" : "bg-disabled"
              }`}
            >
              Salvar
            </button>
          </>
        }
      >
        <div className="text-sm text-muted mb-2">Cliente</div>
        <input
          type="text"
          value={form.cliente}
          onChange={(e) => patch({ cliente: e.target.value })}
          className="w-full box-border p-4 text-[17px] border-[1.5px] border-border rounded-input bg-surface text-ink mb-5.5"
        />

        <div className="text-sm text-muted mb-2.5">Dia da entrega</div>
        <div className="flex gap-2 mb-4">
          <Chip
            variant="block"
            label="Hoje"
            sub={formatShortDatePtBR(todayLocal())}
            active={form.dayOffset === 0}
            onClick={() => patch({ dayOffset: 0 })}
          />
          <Chip
            variant="block"
            label="Amanhã"
            sub={formatShortDatePtBR(addDaysLocal(new Date(), 1))}
            active={form.dayOffset === 1}
            onClick={() => patch({ dayOffset: 1 })}
          />
          <Chip
            variant="block"
            label="Outra data"
            sub={form.customDate ? formatShortDatePtBR(form.customDate) : "escolher"}
            active={form.dayOffset === "custom"}
            onClick={() => patch({ dayOffset: "custom" })}
          />
        </div>
        {form.dayOffset === "custom" && (
          <input
            type="date"
            value={form.customDate}
            onChange={(e) => patch({ customDate: e.target.value })}
            className="w-full box-border p-4 text-[17px] border-[1.5px] border-border rounded-input bg-surface text-ink mb-4"
          />
        )}

        <div className="text-sm text-muted mb-2.5">Horário</div>
        <div className="flex flex-wrap gap-2 mb-2.5">
          {TIME_CHIPS.map((t) => (
            <Chip
              key={t}
              label={t}
              active={form.horario === t}
              onClick={() => patch({ horario: t })}
            />
          ))}
        </div>
        <input
          type="time"
          value={form.horario}
          onChange={(e) => patch({ horario: e.target.value })}
          className="w-full box-border p-4 text-[17px] border-[1.5px] border-border rounded-input bg-surface text-ink mb-5.5"
        />

        <div className="text-sm text-muted mb-2.5">Itens</div>
        <div className="flex flex-col gap-2.5 mb-5.5">
          {estoqueItems.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between bg-surface rounded-input px-3.5 py-3"
            >
              <div className="text-[15px] font-semibold">{item.nome}</div>
              <Stepper
                value={form.qtys[item.id] || 0}
                onChange={(qty) =>
                  setQty(item.id, qty, item.quantidade + (form.originalQtys[item.id] || 0))
                }
                max={item.quantidade + (form.originalQtys[item.id] || 0)}
              />
            </div>
          ))}
        </div>

        <div className="text-sm text-muted mb-2.5">Embalagem</div>
        <div className="grid grid-cols-3 gap-2">
          {PACKAGING_OPTIONS.map((opt) => {
            const active = form.packaging.tipo === opt.key;
            return (
              <button
                key={opt.key}
                type="button"
                onClick={() =>
                  patch({
                    packaging: {
                      ...form.packaging,
                      tipo: opt.key,
                      detalhe: opt.key === form.packaging.tipo ? form.packaging.detalhe : "",
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
        {form.packaging.tipo !== "nenhuma" && (
          <input
            type="text"
            value={form.packaging.detalhe}
            onChange={(e) =>
              patch({ packaging: { ...form.packaging, detalhe: e.target.value } })
            }
            className="w-full box-border p-4 text-[17px] border-[1.5px] border-border rounded-input bg-surface text-ink mt-3"
          />
        )}

        <div className="text-sm text-muted mt-5.5 mb-2.5">Me avisar</div>
        <div className="flex flex-wrap gap-2">
          {REMINDER_CHIPS.map((r) => (
            <Chip
              key={r.v}
              label={r.label}
              active={form.reminder === r.v}
              onClick={() => patch({ reminder: r.v })}
            />
          ))}
        </div>
      </BottomSheet>
      {flash && <FlashModal message={flash} onClose={() => setFlash(null)} />}
    </>
  );
}
