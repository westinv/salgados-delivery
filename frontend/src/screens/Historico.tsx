import { useState } from "react";
import { useData } from "../context/DataContext";
import { DeliveryCard } from "../components/DeliveryCard";
import * as api from "../api/client";
import type { StatusEntrega } from "../types";

type Filtro = "todos" | "atencao" | "entregue" | "agendada";

const FILTERS: { key: Filtro; label: string }[] = [
  { key: "todos", label: "Todos" },
  { key: "atencao", label: "Atenção" },
  { key: "entregue", label: "Entregues" },
  { key: "agendada", label: "Agendadas" },
];

const STATUS_FOR_FILTER: Record<Exclude<Filtro, "todos">, StatusEntrega> = {
  atencao: "atencao",
  entregue: "concluida",
  agendada: "agendada",
};

export function Historico() {
  const { entregas, reloadEntregas, reloadEstoque } = useData();
  const [filtro, setFiltro] = useState<Filtro>("todos");

  const counts = {
    todos: entregas.length,
    atencao: entregas.filter((e) => e.status === "atencao").length,
    entregue: entregas.filter((e) => e.status === "concluida").length,
    agendada: entregas.filter((e) => e.status === "agendada").length,
  };

  const rows = entregas
    .filter((e) => filtro === "todos" || e.status === STATUS_FOR_FILTER[filtro])
    .sort((a, b) => `${b.data}${b.horario}`.localeCompare(`${a.data}${a.horario}`));

  async function handleUndo(id: number) {
    await api.reverterEntrega(id);
    await reloadEntregas();
  }

  async function handleGiveBaixa(id: number) {
    await api.concluirEntrega(id);
    await Promise.all([reloadEntregas(), reloadEstoque()]);
  }

  return (
    <div className="flex-1 p-5">
      <div className="text-2xl font-extrabold leading-tight mb-1">Histórico</div>
      <div className="text-[15px] text-muted mb-4.5">
        {counts.atencao > 0
          ? `${counts.atencao} ${
              counts.atencao === 1
                ? "entrega passou do horário e não teve baixa"
                : "entregas passaram do horário e não tiveram baixa"
            }`
          : "Nenhuma entrega atrasada"}
      </div>

      <div className="grid grid-cols-2 gap-2 mb-5">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFiltro(f.key)}
            className={`text-center py-3 px-2 rounded-chip text-sm font-bold border-[1.5px] ${
              filtro === f.key
                ? "bg-primary border-primary text-white"
                : "bg-surface border-border text-ink-soft"
            }`}
          >
            {f.label} ({counts[f.key]})
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        {rows.map((entrega) => (
          <DeliveryCard
            key={entrega.id}
            entrega={entrega}
            variant="history"
            onUndo={() => handleUndo(entrega.id)}
            onGiveBaixa={() => handleGiveBaixa(entrega.id)}
          />
        ))}
        {rows.length === 0 && (
          <div className="bg-surface rounded-card py-7 px-5 text-center text-muted text-[15px]">
            Nada aqui.
          </div>
        )}
      </div>
    </div>
  );
}
