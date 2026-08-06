import type { Entrega } from "../types";
import { dayBadgeLabel, formatShortDatePtBR } from "../utils/date";
import { embalagemDisplayLabel } from "../utils/embalagem";
import { parseItemLines, sumItemLines } from "../utils/order";
import { formatOverdue } from "../utils/overdue";
import { StatusPill } from "./StatusPill";

const REMINDER_LABEL: Record<string, string> = {
  "15": "15 min antes",
  "30": "30 min antes",
  "60": "1 hora antes",
  "1440": "1 dia antes",
};

interface DeliveryCardProps {
  entrega: Entrega;
  variant: "today" | "agenda" | "history";
  expanded?: boolean;
  onToggleExpand?: () => void;
  onMarkDelivered?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onUndo?: () => void;
  onGiveBaixa?: () => void;
}

export function DeliveryCard({
  entrega,
  variant,
  expanded = false,
  onToggleExpand,
  onMarkDelivered,
  onEdit,
  onDelete,
  onUndo,
  onGiveBaixa,
}: DeliveryCardProps) {
  const cliente = entrega.cliente || "";
  const lines = parseItemLines(entrega.descricao, cliente);
  const total = sumItemLines(lines);
  const pkgLabel = embalagemDisplayLabel(entrega.embalagem);
  const reminderLabel =
    REMINDER_LABEL[String(entrega.antecedencia_minutos)] || "30 min antes";

  if (variant === "history") {
    const isEntregue = entrega.status === "concluida";
    const isAtencao = entrega.status === "atencao";
    const tone = isEntregue ? "success" : isAtencao ? "danger" : "warning";
    const label = isEntregue ? "Entregue" : isAtencao ? "Atenção" : "Agendada";
    const summary = lines.length > 0 ? `${lines.join(", ")} - ${cliente}` : cliente;

    return (
      <div
        className={`rounded-card p-4 shadow-card ${
          isAtencao
            ? "bg-danger-card border-[1.5px] border-danger-border"
            : "bg-surface"
        }`}
      >
        <div className="flex items-center gap-2.5 mb-2.5">
          <StatusPill tone={tone}>{label}</StatusPill>
          {isAtencao && (
            <span className="text-[13px] font-bold text-danger animate-pulse-attention">
              {formatOverdue(entrega.data, entrega.horario)}
            </span>
          )}
        </div>
        <div
          className={`text-base font-bold ${
            isEntregue ? "line-through text-muted" : "text-ink"
          }`}
        >
          {summary}
        </div>
        <div className="text-[13px] text-muted mt-2">
          {formatShortDatePtBR(entrega.data, true)} às {entrega.horario}
        </div>
        <div className="flex justify-end mt-3">
          {isEntregue ? (
            <button
              type="button"
              onClick={onUndo}
              className="px-4 py-3 rounded-chip text-[15px] font-bold text-muted bg-surface-tint"
            >
              Desfazer
            </button>
          ) : (
            <button
              type="button"
              onClick={onGiveBaixa}
              className="px-4 py-3 rounded-chip text-[15px] font-bold text-white bg-success"
            >
              Dar baixa
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface rounded-card p-4 shadow-card">
      <div className="flex gap-3.5 items-center">
        <div className="bg-primary-tint text-primary-dark rounded-chip px-3 py-2.5 text-center min-w-[66px]">
          <div className="text-[19px] font-extrabold">{entrega.horario}</div>
          {variant === "today" && (
            <div className="text-[11px] tracking-wide">
              {dayBadgeLabel(entrega.data)}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[17px] font-bold truncate">{cliente}</div>
          <div className="text-sm text-muted mt-0.5">
            {total} salgados · {pkgLabel}
          </div>
        </div>
      </div>

      {variant === "today" && lines.length > 0 && (
        <div className="flex flex-col gap-1.5 mt-3.5 pt-3.5 border-t border-divider">
          {lines.map((line, i) => (
            <div key={i} className="text-[15px] text-ink-soft">
              {line}
            </div>
          ))}
        </div>
      )}

      {expanded && (
        <div className="mt-3.5 bg-surface-tint rounded-chip p-3.5 flex flex-col gap-2">
          {variant === "agenda" &&
            lines.map((line, i) => (
              <div key={i} className="text-[15px] text-ink-soft">
                {line}
              </div>
            ))}
          <div className="text-sm text-ink-soft">Aviso: {reminderLabel}</div>
          {variant === "today" && (
            <div className="text-sm text-ink-soft">Embalagem: {pkgLabel}</div>
          )}
          <button
            type="button"
            onClick={onMarkDelivered}
            className="mt-1 bg-success text-white text-center py-3.5 rounded-chip text-base font-bold"
          >
            Marcar como entregue
          </button>
        </div>
      )}

      <div className="flex gap-2 mt-3">
        <button
          type="button"
          onClick={onToggleExpand}
          className="flex-1 text-center py-3 rounded-chip bg-surface-tint text-primary-dark text-[15px] font-semibold"
        >
          {expanded ? "Esconder detalhes" : "Ver detalhes"}
        </button>
        <button
          type="button"
          onClick={onEdit}
          className="px-4 py-3 rounded-chip bg-surface-tint text-ink-soft text-[15px] font-semibold"
        >
          Editar
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="px-4 py-3 rounded-chip bg-danger-bg text-danger text-[15px] font-semibold"
        >
          Excluir
        </button>
      </div>
    </div>
  );
}
