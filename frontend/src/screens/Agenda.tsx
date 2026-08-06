import { useState } from "react";
import { useData } from "../context/DataContext";
import { DeliveryCard } from "../components/DeliveryCard";
import { ConfirmModal } from "../components/ConfirmModal";
import { EditEntregaSheet } from "../components/EditEntregaSheet";
import { PrimaryButton } from "../components/PrimaryButton";
import { agendaGroupLabel } from "../utils/date";
import * as api from "../api/client";
import type { Entrega } from "../types";

export function Agenda({ onNovoPedido }: { onNovoPedido: () => void }) {
  const { entregas, reloadEntregas, reloadEstoque } = useData();
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Entrega | null>(null);
  const [editId, setEditId] = useState<number | null>(null);

  const agendadas = entregas
    .filter((e) => e.status === "agendada")
    .sort((a, b) => `${a.data}${a.horario}`.localeCompare(`${b.data}${b.horario}`));

  const groups: { key: string; label: string; items: Entrega[] }[] = [];
  for (const entrega of agendadas) {
    let group = groups.find((g) => g.key === entrega.data);
    if (!group) {
      group = { key: entrega.data, label: agendaGroupLabel(entrega.data), items: [] };
      groups.push(group);
    }
    group.items.push(entrega);
  }

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
        <div className="text-2xl font-extrabold leading-tight mb-1">Agenda</div>
        <div className="text-[15px] text-muted mb-5.5">
          {agendadas.length} {agendadas.length === 1 ? "pedido agendado" : "pedidos agendados"}
        </div>

        <div className="flex flex-col gap-6.5">
          {groups.map((group) => (
            <div key={group.key}>
              <div className="flex items-baseline justify-between mb-3">
                <div className="text-[17px] font-extrabold">{group.label}</div>
                <div className="text-[13px] text-faint">
                  {group.items.length} {group.items.length === 1 ? "entrega" : "entregas"}
                </div>
              </div>
              <div className="flex flex-col gap-3">
                {group.items.map((entrega) => (
                  <DeliveryCard
                    key={entrega.id}
                    entrega={entrega}
                    variant="agenda"
                    expanded={expandedId === entrega.id}
                    onToggleExpand={() =>
                      setExpandedId(expandedId === entrega.id ? null : entrega.id)
                    }
                    onMarkDelivered={() => handleMarkDelivered(entrega.id)}
                    onEdit={() => setEditId(entrega.id)}
                    onDelete={() => setDeleteTarget(entrega)}
                  />
                ))}
              </div>
            </div>
          ))}
          {groups.length === 0 && (
            <div className="bg-surface rounded-card py-7 px-5 text-center text-muted text-[15px]">
              Nenhum pedido agendado.
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
