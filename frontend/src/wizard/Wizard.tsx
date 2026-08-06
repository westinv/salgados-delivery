import { useState } from "react";
import { useData } from "../context/DataContext";
import { useLocalStorageNumber } from "../hooks/useLocalStorageNumber";
import { WizardStep1 } from "./WizardStep1";
import { WizardStep2 } from "./WizardStep2";
import { WizardFooter } from "./WizardFooter";
import { FlashModal } from "../components/FlashModal";
import { useOrderDraft, effectiveDate, draftTotal } from "./useOrderDraft";
import { buildDescricao } from "../utils/order";
import { encodeEmbalagem } from "../utils/embalagem";
import { todayLocal, addDaysLocal, formatShortDatePtBR } from "../utils/date";
import * as api from "../api/client";
import { ApiError } from "../api/client";

export function Wizard({
  onDone,
  onExit,
}: {
  onDone: (message: string) => void;
  onExit: () => void;
}) {
  const { estoqueItems, reloadEntregas, reloadEstoque } = useData();
  const [defaultReminder] = useLocalStorageNumber("defaultReminderNotice", 30);
  const [step, setStep] = useState<1 | 2>(1);
  const [flash, setFlash] = useState<string | null>(null);
  const {
    draft,
    patch,
    setQty,
    applyPreset,
    isStep1Valid,
    isStep2Valid,
    total,
  } = useOrderDraft(String(defaultReminder));

  function back() {
    if (step === 1) onExit();
    else setStep(1);
  }

  function handlePickPreset(presetTotal: number) {
    const result = applyPreset(estoqueItems, presetTotal);
    if (!result.ok) {
      const detail = result.itensInsuficientes
        .map((i) => `${i.nome}: ${i.quantidade} un`)
        .join(", ");
      setFlash(
        `Estoque insuficiente! Precisa de pelo menos ${result.qtdMinima} de cada tipo.${
          detail ? ` Falta estoque: ${detail}` : ""
        }`,
      );
    }
    return result;
  }

  async function handleNext() {
    if (step === 1) {
      if (!isStep1Valid) return;
      setStep(2);
      return;
    }
    if (!isStep2Valid) return;

    const items = estoqueItems
      .filter((item) => (draft.qtys[item.id] || 0) > 0)
      .map((item) => ({ nome: item.nome, quantidade: draft.qtys[item.id] }));
    const data = effectiveDate(draft);
    const descricao = buildDescricao(items, draft.clientName.trim());
    const embalagem = encodeEmbalagem(draft.packaging);

    try {
      await api.criarEntrega({
        data,
        horario: draft.deliveryTime,
        descricao,
        cliente: draft.clientName.trim(),
        embalagem,
        antecedencia_minutos: parseInt(draft.reminder, 10),
        itens: estoqueItems
          .filter((item) => (draft.qtys[item.id] || 0) > 0)
          .map((item) => ({ estoque_id: item.id, quantidade: draft.qtys[item.id] })),
      });
      await Promise.all([reloadEntregas(), reloadEstoque()]);

      const hoje = todayLocal();
      const amanha = addDaysLocal(new Date(), 1);
      const quando =
        data === hoje ? "hoje" : data === amanha ? "amanhã" : formatShortDatePtBR(data);
      onDone(
        `${draftTotal(draft)} salgados para ${draft.clientName.trim()}, ${quando} às ${draft.deliveryTime}.`,
      );
    } catch (err) {
      setFlash(err instanceof ApiError ? err.message : "Erro ao agendar pedido");
    }
  }

  const stepTitle = step === 1 ? "Para quem e quando?" : "O que vai no pedido?";

  return (
    <div className="flex-1 flex flex-col">
      <div className="px-5 pt-4 flex items-center gap-3">
        <button
          type="button"
          onClick={back}
          className="w-11 h-11 rounded-chip bg-surface flex items-center justify-center text-xl text-ink-soft"
        >
          ‹
        </button>
        <div className="flex-1 flex gap-1.5">
          {[1, 2].map((n) => (
            <div
              key={n}
              className={`flex-1 h-1.5 rounded-bar ${
                n <= step ? "bg-primary" : "bg-border"
              }`}
            />
          ))}
        </div>
        <div className="text-[13px] text-muted min-w-[56px] text-right">
          Passo {step} de 2
        </div>
      </div>

      <div className="flex-1 px-5 pt-6">
        <div className="text-2xl font-extrabold leading-snug mb-5">{stepTitle}</div>
        {step === 1 ? (
          <WizardStep1 draft={draft} patch={patch} minDate={todayLocal()} />
        ) : (
          <WizardStep2
            draft={draft}
            patch={patch}
            setQty={setQty}
            estoqueItems={estoqueItems}
            onPickPreset={handlePickPreset}
          />
        )}
      </div>

      <WizardFooter
        summaryLeft={draft.clientName.trim() || "Sem cliente"}
        summaryRight={total > 0 ? `${total} salgados` : "—"}
        label={step === 1 ? "Continuar" : "Confirmar agendamento"}
        disabled={step === 1 ? !isStep1Valid : !isStep2Valid}
        onClick={handleNext}
      />

      {flash && <FlashModal message={flash} onClose={() => setFlash(null)} />}
    </div>
  );
}
