import { useState } from "react";
import { useData } from "../context/DataContext";
import { DeliveryCard } from "../components/DeliveryCard";
import { ConfirmModal } from "../components/ConfirmModal";
import { EditEntregaSheet } from "../components/EditEntregaSheet";
import { PrimaryButton } from "../components/PrimaryButton";
import { addDaysLocal, formatShortDatePtBR, todayLocal } from "../utils/date";
import * as api from "../api/client";
import type { Entrega } from "../types";

export function Inicio({ onNovoPedido }: { onNovoPedido: () => void }) {
  const { entregas, estoqueItems, reloadEntregas, reloadEstoque } = useData();
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Entrega | null>(null);
  const [editId, setEditId] = useState<number | null>(null);

  const stockTotal = estoqueItems.reduce((sum, i) => sum + i.quantidade, 0);
  const hoje = todayLocal();
  const fimSemana = addDaysLocal(new Date(), 6);
  const agendadas = entregas
    .filter((e) => e.status === "agendada" && e.data >= hoje && e.data <= fimSemana)
    .sort((a, b) => `${a.data}${a.horario}`.localeCompare(`${b.data}${b.horario}`));

  async function handleMarkDelivered(id: number) {
    await api.concluirEntrega(id);
    await Promise.all([reloadEntregas(), reloadEstoque()]);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    await api.removerEntrega(deleteTarget.id);
    setDeleteTarget(null);
    await Promise.all([reloadEntregas(), reloadEstoque()]);
  }

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex-1 p-5">
        <div className="bg-surface rounded-card p-4 mb-7 shadow-card">
          <div className="flex items-baseline justify-between mb-3">
            <div className="text-[15px] font-bold">Estoque disponível</div>
            <div className="text-[13px] text-faint">{stockTotal} no total</div>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            {estoqueItems.map((item) => (
              <div
                key={item.id}
                className="flex items-baseline justify-between gap-2 bg-surface-tint rounded-chip px-3.5 py-3"
              >
                <div className="text-sm text-ink-soft leading-tight">{item.nome}</div>
                <div className="text-[19px] font-extrabold text-primary-dark">
                  {item.quantidade}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="text-2xl font-extrabold leading-tight mb-1">
          Entregas da semana
        </div>
        <div className="text-[15px] text-muted mb-4">
          {formatShortDatePtBR(hoje)} a {formatShortDatePtBR(fimSemana)}
        </div>

        <div className="flex flex-col gap-3">
          {agendadas.map((entrega) => (
            <DeliveryCard
              key={entrega.id}
              entrega={entrega}
              variant="today"
              expanded={expandedId === entrega.id}
              onToggleExpand={() =>
                setExpandedId(expandedId === entrega.id ? null : entrega.id)
              }
              onMarkDelivered={() => handleMarkDelivered(entrega.id)}
              onEdit={() => setEditId(entrega.id)}
              onDelete={() => setDeleteTarget(entrega)}
            />
          ))}
          {agendadas.length === 0 && (
            <div className="bg-surface rounded-card py-7 px-5 text-center text-muted text-[15px]">
              Nenhuma entrega marcada.
            </div>
          )}
        </div>
      </div>

      <div className="sticky bottom-0 px-5 pt-4 pb-[calc(24px+env(safe-area-inset-bottom))] bg-gradient-to-t from-bg from-60% to-transparent">
        <PrimaryButton onClick={onNovoPedido} cta>
          + Novo pedido
        </PrimaryButton>
      </div>

      {deleteTarget && (
        <ConfirmModal
          title="Excluir esta entrega?"
          detail={deleteTarget.cliente}
          note="Isso não pode ser desfeito."
          confirmLabel="Sim, excluir"
          cancelLabel="Manter entrega"
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {editId != null && (
        <EditEntregaSheet
          entregaId={editId}
          onClose={() => setEditId(null)}
          onSaved={() => setEditId(null)}
        />
      )}
    </div>
  );
}
