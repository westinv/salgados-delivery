import { useState } from "react";
import { useData } from "../context/DataContext";
import { PrimaryButton } from "../components/PrimaryButton";
import { ConfirmModal } from "../components/ConfirmModal";
import { FlashModal } from "../components/FlashModal";
import {
  NovoLembreteSheet,
  makeDefaultDraft,
  type RemDraft,
} from "../components/NovoLembreteSheet";
import { formatShortDatePtBR } from "../utils/date";
import * as api from "../api/client";
import { ApiError } from "../api/client";
import type { Lembrete, LembreteMensal } from "../types";
import { useLocalStorageNumber } from "../hooks/useLocalStorageNumber";

type ReminderTab = "avulsos" | "mensais";

const NOTICE_LABEL: Record<string, string> = {
  "15": "15 min antes",
  "30": "30 min antes",
  "60": "1 hora antes",
  "1440": "1 dia antes",
};

export function Lembretes() {
  const {
    lembretes,
    lembretesMensais,
    reloadLembretes,
    reloadLembretesMensais,
  } = useData();
  const [tab, setTab] = useState<ReminderTab>("avulsos");
  const [draft, setDraft] = useState<RemDraft | null>(null);
  const [deleteAvulso, setDeleteAvulso] = useState<Lembrete | null>(null);
  const [deleteMensal, setDeleteMensal] = useState<LembreteMensal | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [defaultNotice] = useLocalStorageNumber("defaultReminderNotice", 30);

  const avulsos = [...lembretes]
    .filter((l) => l.status === "agendado")
    .sort((a, b) => `${a.data}${a.horario}`.localeCompare(`${b.data}${b.horario}`));

  const mensais = [...lembretesMensais].sort((a, b) => a.dia_do_mes - b.dia_do_mes);

  async function handleSave() {
    if (!draft) return;
    try {
      if (draft.kind === "once") {
        await api.criarLembrete({
          data: draft.date,
          horario: draft.time,
          descricao: draft.text.trim(),
          antecedencia_minutos: parseInt(draft.notice, 10),
        });
        await reloadLembretes();
        setTab("avulsos");
      } else {
        await api.criarLembreteMensal({
          descricao: draft.text.trim(),
          dia_do_mes: draft.diaDoMes,
          horario: draft.time,
          antecedencia_minutos: parseInt(draft.notice, 10),
        });
        await Promise.all([reloadLembretesMensais(), reloadLembretes()]);
        setTab("mensais");
      }
      setDraft(null);
    } catch (err) {
      setFlash(err instanceof ApiError ? err.message : "Erro ao salvar lembrete");
    }
  }

  async function handleJaFiz(id: number) {
    await api.concluirLembrete(id);
    await reloadLembretes();
  }

  async function handleDeleteAvulso() {
    if (!deleteAvulso) return;
    await api.removerLembrete(deleteAvulso.id);
    setDeleteAvulso(null);
    await reloadLembretes();
  }

  async function handleTogglePausar(mensal: LembreteMensal) {
    await api.pausarLembreteMensal(mensal.id);
    await Promise.all([reloadLembretesMensais(), reloadLembretes()]);
  }

  async function handleDeleteMensal() {
    if (!deleteMensal) return;
    await api.removerLembreteMensal(deleteMensal.id);
    setDeleteMensal(null);
    await Promise.all([reloadLembretesMensais(), reloadLembretes()]);
  }

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex-1 p-5">
        <div className="text-2xl font-extrabold leading-tight mb-4">Lembretes</div>

        <div className="flex gap-2 mb-5">
          <button
            type="button"
            onClick={() => setTab("avulsos")}
            className={`flex-1 text-center py-3.5 px-2 rounded-chip text-base font-bold border-[1.5px] ${
              tab === "avulsos"
                ? "bg-primary border-primary text-white"
                : "bg-surface border-border text-ink-soft"
            }`}
          >
            Avulsos
          </button>
          <button
            type="button"
            onClick={() => setTab("mensais")}
            className={`flex-1 text-center py-3.5 px-2 rounded-chip text-base font-bold border-[1.5px] ${
              tab === "mensais"
                ? "bg-primary border-primary text-white"
                : "bg-surface border-border text-ink-soft"
            }`}
          >
            Todo mês
          </button>
        </div>

        <div className="flex flex-col gap-3">
          {tab === "avulsos" &&
            (avulsos.length === 0 ? (
              <div className="bg-surface rounded-card py-7 px-5 text-center text-muted text-[15px]">
                Nenhum lembrete avulso.
              </div>
            ) : (
              avulsos.map((l) => (
                <div key={l.id} className="bg-surface rounded-card p-4 shadow-card">
                  <div className="flex gap-3.5 items-center">
                    <div className="bg-primary-tint text-primary-dark rounded-chip px-3 py-2.5 text-center min-w-[70px]">
                      <div className="text-[19px] font-extrabold">{l.horario}</div>
                      <div className="text-xs">{formatShortDatePtBR(l.data)}</div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[17px] font-bold leading-snug">
                        {l.descricao}
                      </div>
                      <div className="text-[13px] text-muted mt-0.5">
                        Aviso {NOTICE_LABEL[String(l.antecedencia_minutos)] || "30 min antes"}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button
                      type="button"
                      onClick={() => handleJaFiz(l.id)}
                      className="flex-1 text-center py-3 rounded-chip bg-success-bg text-success-text text-[15px] font-bold"
                    >
                      Já fiz
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteAvulso(l)}
                      className="px-4 py-3 rounded-chip bg-danger-bg text-danger text-[15px] font-semibold"
                    >
                      Excluir
                    </button>
                  </div>
                </div>
              ))
            ))}

          {tab === "mensais" &&
            (mensais.length === 0 ? (
              <div className="bg-surface rounded-card py-7 px-5 text-center text-muted text-[15px]">
                Nenhum lembrete mensal.
              </div>
            ) : (
              mensais.map((m) => (
                <div key={m.id} className="bg-surface rounded-card p-4 shadow-card">
                  <div className="flex gap-3.5 items-center">
                    <div className="bg-primary-tint text-primary-dark rounded-chip px-3 py-2.5 text-center min-w-[70px]">
                      <div className="text-[19px] font-extrabold">{m.horario}</div>
                      <div className="text-xs">
                        {m.dia_do_mes === 31 ? "último dia" : `dia ${m.dia_do_mes}`}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[17px] font-bold leading-snug">
                        {m.descricao}
                      </div>
                      <div className="text-[13px] text-muted mt-0.5">
                        Aviso {NOTICE_LABEL[String(m.antecedencia_minutos)] || "30 min antes"}
                        {!m.ativo && " · pausado"}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button
                      type="button"
                      onClick={() => handleTogglePausar(m)}
                      className={`flex-1 text-center py-3 rounded-chip text-[15px] font-bold ${
                        m.ativo
                          ? "bg-surface-tint text-ink-soft"
                          : "bg-success-bg text-success-text"
                      }`}
                    >
                      {m.ativo ? "Pausar" : "Ativar"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteMensal(m)}
                      className="px-4 py-3 rounded-chip bg-danger-bg text-danger text-[15px] font-semibold"
                    >
                      Excluir
                    </button>
                  </div>
                </div>
              ))
            ))}
        </div>
      </div>

      <div className="sticky bottom-0 px-5 pt-4 pb-[calc(24px+env(safe-area-inset-bottom))] bg-gradient-to-t from-bg from-60% to-transparent">
        <PrimaryButton
          onClick={() =>
            setDraft(
              makeDefaultDraft(tab === "avulsos" ? "once" : "monthly", String(defaultNotice)),
            )
          }
          cta
        >
          + Novo lembrete
        </PrimaryButton>
      </div>

      {draft && (
        <NovoLembreteSheet
          draft={draft}
          onChange={setDraft}
          onCancel={() => setDraft(null)}
          onSave={handleSave}
        />
      )}

      {deleteAvulso && (
        <ConfirmModal
          title="Excluir lembrete?"
          detail={deleteAvulso.descricao}
          confirmLabel="Sim, excluir"
          cancelLabel="Manter"
          onConfirm={handleDeleteAvulso}
          onCancel={() => setDeleteAvulso(null)}
        />
      )}

      {deleteMensal && (
        <ConfirmModal
          title="Excluir lembrete?"
          detail={deleteMensal.descricao}
          confirmLabel="Sim, excluir"
          cancelLabel="Manter"
          onConfirm={handleDeleteMensal}
          onCancel={() => setDeleteMensal(null)}
        />
      )}

      {flash && <FlashModal message={flash} onClose={() => setFlash(null)} />}
    </div>
  );
}
