import { useEffect, useState } from "react";
import { useData } from "../context/DataContext";
import { useLocalStorageNumber } from "../hooks/useLocalStorageNumber";
import { StatusPill } from "../components/StatusPill";
import { ProportionBar } from "../components/ProportionBar";
import { BottomSheet } from "../components/BottomSheet";
import { PrimaryButton } from "../components/PrimaryButton";
import { FlashModal } from "../components/FlashModal";
import * as api from "../api/client";
import { ApiError } from "../api/client";
import type { EstoqueItem, EstoqueLogEntry } from "../types";

const QUANTITY_CHIPS = [25, 50, 100, 200];

function formatLogWhen(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = d.toDateString() === yesterday.toDateString();
  const hhmm = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  if (sameDay) return `Hoje ${hhmm}`;
  if (isYesterday) return `Ontem ${hhmm}`;
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm} ${hhmm}`;
}

interface MoveState {
  item: EstoqueItem;
  mode: "add" | "remove";
  amount: number;
}

interface NewItemDraft {
  nome: string;
  quantidade: string;
  preco: string;
}

export function Estoque() {
  const { estoqueItems, reloadEstoque } = useData();
  const [threshold] = useLocalStorageNumber("limiteEstoque", 10);
  const [move, setMove] = useState<MoveState | null>(null);
  const [log, setLog] = useState<EstoqueLogEntry[]>([]);
  const [novoItem, setNovoItem] = useState<NewItemDraft | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  useEffect(() => {
    api.estoqueLog().then(setLog).catch(() => {});
  }, []);

  const total = estoqueItems.reduce((sum, i) => sum + i.quantidade, 0);
  const maxQty = Math.max(1, ...estoqueItems.map((i) => i.quantidade));

  async function applyMove() {
    if (!move || !move.amount) return;
    try {
      if (move.mode === "add") {
        await api.adicionarEstoque(move.item.id, move.amount);
      } else {
        await api.removerEstoque(move.item.id, move.amount);
      }
      setMove(null);
      await reloadEstoque();
      api.estoqueLog().then(setLog).catch(() => {});
    } catch {
      alert("Erro ao atualizar estoque");
    }
  }

  async function handleCriarItem() {
    if (!novoItem || !novoItem.nome.trim()) return;
    try {
      await api.criarItemEstoque({
        nome: novoItem.nome.trim(),
        quantidade: parseInt(novoItem.quantidade, 10) || 0,
        preco_unitario: parseFloat(novoItem.preco.replace(",", ".")) || 0,
      });
      setNovoItem(null);
      await reloadEstoque();
      api.estoqueLog().then(setLog).catch(() => {});
    } catch (err) {
      setFlash(err instanceof ApiError ? err.message : "Erro ao cadastrar item");
    }
  }

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex-1 p-5">
        <div className="text-2xl font-extrabold leading-tight mb-1">Estoque</div>
        <div className="text-[15px] text-muted mb-5">{total} salgados prontos</div>

        <div className="flex flex-col gap-3">
          {estoqueItems.map((item) => {
            const low = item.quantidade < threshold;
            return (
              <div key={item.id} className="bg-surface rounded-card p-4 shadow-card">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-[17px] font-bold">{item.nome}</div>
                  <StatusPill tone={low ? "danger" : "success"}>
                    {low ? "Pouco" : "Ok"}
                  </StatusPill>
                </div>
                <div className="flex items-baseline gap-2.5 mt-2.5">
                  <div className="text-[30px] font-extrabold text-primary-dark leading-none">
                    {item.quantidade}
                  </div>
                </div>
                <div className="mt-3">
                  <ProportionBar value={item.quantidade} max={maxQty} danger={low} />
                </div>
                <div className="flex gap-2 mt-3.5">
                  <button
                    type="button"
                    onClick={() => setMove({ item, mode: "add", amount: 0 })}
                    className="flex-1 text-center py-3.5 rounded-chip bg-primary text-white text-base font-bold"
                  >
                    + Adicionar
                  </button>
                  <button
                    type="button"
                    onClick={() => setMove({ item, mode: "remove", amount: 0 })}
                    className="flex-1 text-center py-3.5 rounded-chip bg-surface-tint text-ink-soft text-base font-bold"
                  >
                    − Retirar
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="text-[19px] font-extrabold my-7 mb-3">Histórico de mudanças</div>
        <div className="bg-surface rounded-card px-4 shadow-card">
          {log.length === 0 && (
            <div className="py-4.5 text-center text-faint text-[15px]">
              Nenhuma mudança ainda.
            </div>
          )}
          {log.map((entry, i) => {
            const positive = entry.tipo === "entrada" || entry.tipo === "criacao";
            return (
              <div
                key={entry.id}
                className={`flex items-center justify-between gap-3 py-3.5 ${
                  i < log.length - 1 ? "border-b border-divider-2" : ""
                }`}
              >
                <div
                  className={`text-base font-bold ${
                    positive ? "text-success-text" : "text-danger"
                  }`}
                >
                  {positive ? "+" : "-"}
                  {entry.quantidade} {entry.nome_produto}
                </div>
                <div className="text-[13px] text-faint">
                  {formatLogWhen(entry.created_at)}
                </div>
              </div>
            );
          })}
        </div>

        {move && (
          <BottomSheet
            title={`${move.mode === "add" ? "Adicionar" : "Retirar"} — ${move.item.nome}`}
            onClose={() => setMove(null)}
            footer={
              <>
                <button
                  type="button"
                  onClick={() => setMove(null)}
                  className="flex-1 text-center py-4 rounded-input bg-surface text-ink-soft text-base font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={applyMove}
                  disabled={!move.amount}
                  className={`flex-1 text-center py-4 rounded-input text-base font-extrabold text-white ${
                    move.amount
                      ? move.mode === "add"
                        ? "bg-primary"
                        : "bg-danger"
                      : "bg-disabled"
                  }`}
                >
                  {move.mode === "add" ? "Adicionar ao estoque" : "Retirar do estoque"}
                </button>
              </>
            }
          >
            <div className="text-sm text-muted mb-4.5">
              Estoque agora: {move.item.quantidade}
            </div>
            <div className="text-sm text-muted mb-2.5">Quantidade</div>
            <div className="flex flex-wrap gap-2 mb-3">
              {QUANTITY_CHIPS.map((qty) => (
                <button
                  key={qty}
                  type="button"
                  onClick={() => setMove({ ...move, amount: qty })}
                  className={`rounded-pill px-4 py-3 text-[15px] font-semibold border-[1.5px] ${
                    move.amount === qty
                      ? "bg-primary border-primary text-white"
                      : "bg-surface border-border text-ink-soft"
                  }`}
                >
                  {qty}
                </button>
              ))}
            </div>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              step={5}
              placeholder="Outra quantidade"
              value={move.amount || ""}
              onChange={(e) =>
                setMove({ ...move, amount: Math.max(0, parseInt(e.target.value) || 0) })
              }
              className="w-full box-border p-4 text-lg border-[1.5px] border-border rounded-input bg-surface text-ink"
            />
          </BottomSheet>
        )}
      </div>

      <div className="sticky bottom-0 px-5 pt-4 pb-[calc(24px+env(safe-area-inset-bottom))] bg-gradient-to-t from-bg from-60% to-transparent">
        <PrimaryButton onClick={() => setNovoItem({ nome: "", quantidade: "", preco: "" })} cta>
          + Cadastrar item
        </PrimaryButton>
      </div>

      {novoItem && (
        <BottomSheet
          title="Cadastrar item"
          onClose={() => setNovoItem(null)}
          footer={
            <>
              <button
                type="button"
                onClick={() => setNovoItem(null)}
                className="flex-1 text-center py-4 rounded-input bg-surface text-ink-soft text-base font-bold"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleCriarItem}
                disabled={!novoItem.nome.trim()}
                className={`flex-1 text-center py-4 rounded-input text-base font-extrabold text-white ${
                  novoItem.nome.trim() ? "bg-primary" : "bg-disabled"
                }`}
              >
                Cadastrar
              </button>
            </>
          }
        >
          <div className="text-sm text-muted mb-2">Nome do salgado</div>
          <input
            type="text"
            placeholder="Ex: Coxinha"
            value={novoItem.nome}
            onChange={(e) => setNovoItem({ ...novoItem, nome: e.target.value })}
            className="w-full box-border p-4 text-[17px] border-[1.5px] border-border rounded-input bg-surface text-ink mb-5.5"
          />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-sm text-muted mb-2">Quantidade inicial</div>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                placeholder="0"
                value={novoItem.quantidade}
                onChange={(e) => setNovoItem({ ...novoItem, quantidade: e.target.value })}
                className="w-full box-border p-4 text-[17px] border-[1.5px] border-border rounded-input bg-surface text-ink"
              />
            </div>
            <div>
              <div className="text-sm text-muted mb-2">Preço unit. (R$)</div>
              <input
                type="number"
                inputMode="decimal"
                min={0}
                step="0.01"
                placeholder="0,00"
                value={novoItem.preco}
                onChange={(e) => setNovoItem({ ...novoItem, preco: e.target.value })}
                className="w-full box-border p-4 text-[17px] border-[1.5px] border-border rounded-input bg-surface text-ink"
              />
            </div>
          </div>
        </BottomSheet>
      )}

      {flash && <FlashModal message={flash} onClose={() => setFlash(null)} />}
    </div>
  );
}
