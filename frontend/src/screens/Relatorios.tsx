import { useEffect, useState } from "react";
import { useData } from "../context/DataContext";
import { useLocalStorageNumber } from "../hooks/useLocalStorageNumber";
import { ProportionBar } from "../components/ProportionBar";
import * as api from "../api/client";
import type { RelatorioResponse } from "../types";

type Periodo = "hoje" | "semana" | "mes" | "mes-especifico";

const PERIOD_CHIPS: { key: Periodo; label: string; custom?: boolean }[] = [
  { key: "hoje", label: "Hoje" },
  { key: "semana", label: "7 dias" },
  { key: "mes", label: "Este mês" },
  { key: "mes-especifico", label: "Escolher", custom: true },
];

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function formatCurrencyBRL(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function useSalgadosPorDia(porDia: RelatorioResponse["porDia"]) {
  const [porDiaSalgados, setPorDiaSalgados] = useState<Record<string, number>>({});
  const [total, setTotal] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      const entries = await Promise.all(
        porDia.map(async (d) => {
          const entregas = await api.entregasPorData(d.dataOriginal);
          const salgados = entregas
            .filter((e) => e.status === "concluida")
            .reduce(
              (sum, e) =>
                sum + (e.itens || []).reduce((s, it) => s + it.quantidade, 0),
              0,
            );
          return [d.dataOriginal, salgados] as const;
        }),
      );
      if (cancelled) return;
      const map: Record<string, number> = {};
      let sum = 0;
      for (const [data, salgados] of entries) {
        map[data] = salgados;
        sum += salgados;
      }
      setPorDiaSalgados(map);
      setTotal(sum);
    }
    if (porDia.length > 0) run();
    else {
      setPorDiaSalgados({});
      setTotal(0);
    }
    return () => {
      cancelled = true;
    };
  }, [porDia]);

  return { porDiaSalgados, total };
}

export function Relatorios() {
  const { estoqueItems } = useData();
  const [threshold, setThreshold] = useLocalStorageNumber("limiteEstoque", 10);
  const [periodo, setPeriodo] = useState<Periodo>("hoje");
  const [showCustom, setShowCustom] = useState(false);
  const now = new Date();
  const [mes, setMes] = useState(now.getMonth() + 1);
  const [ano, setAno] = useState(now.getFullYear());
  const [relatorio, setRelatorio] = useState<RelatorioResponse | null>(null);

  useEffect(() => {
    api
      .relatorios({ periodo, mes: periodo === "mes-especifico" ? mes : undefined, ano: periodo === "mes-especifico" ? ano : undefined })
      .then(setRelatorio)
      .catch(() => setRelatorio(null));
  }, [periodo, mes, ano]);

  const { porDiaSalgados, total: salgadosTotal } = useSalgadosPorDia(
    relatorio?.porDia || [],
  );

  const estoqueBaixo = estoqueItems.filter((i) => i.quantidade <= threshold);
  const maxRanked = relatorio?.maisVendidos[0]?.quantidade || 1;

  return (
    <div className="flex-1 p-5">
      <div className="text-2xl font-extrabold leading-tight mb-4">Relatórios</div>

      <div className="grid grid-cols-2 gap-2">
        {PERIOD_CHIPS.map((p) => (
          <button
            key={p.key}
            type="button"
            onClick={() => {
              setPeriodo(p.key);
              setShowCustom(!!p.custom);
            }}
            className={`text-center py-3 rounded-chip text-sm font-bold border-[1.5px] ${
              periodo === p.key
                ? "bg-primary border-primary text-white"
                : "bg-surface border-border text-ink-soft"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {showCustom && (
        <div className="mt-3 bg-surface rounded-card p-3.5">
          <div className="grid grid-cols-3 gap-1.5">
            {MESES.map((label, i) => (
              <button
                key={label}
                type="button"
                onClick={() => setMes(i + 1)}
                className={`text-center py-2.5 rounded-chip text-[13px] font-semibold border-[1.5px] ${
                  mes === i + 1
                    ? "bg-primary border-primary text-white"
                    : "bg-surface border-border text-ink-soft"
                }`}
              >
                {label.slice(0, 3)}
              </button>
            ))}
          </div>
          <div className="flex gap-2 mt-2.5">
            {[now.getFullYear() - 1, now.getFullYear()].map((y) => (
              <button
                key={y}
                type="button"
                onClick={() => setAno(y)}
                className={`flex-1 text-center py-2.5 rounded-chip text-sm font-semibold border-[1.5px] ${
                  ano === y
                    ? "bg-primary border-primary text-white"
                    : "bg-surface border-border text-ink-soft"
                }`}
              >
                {y}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="bg-success-text rounded-card-lg p-5 mt-5 text-white">
        <div className="text-sm opacity-85">Total em vendas</div>
        <div className="text-[34px] font-extrabold leading-tight mt-1">
          {formatCurrencyBRL(relatorio?.totalVendas || 0)}
        </div>
        <div className="flex gap-6 mt-4">
          <div>
            <div className="text-[13px] opacity-85">Entregas concluídas</div>
            <div className="text-[22px] font-extrabold">
              {relatorio?.totalEntregas ?? 0}
            </div>
          </div>
          <div>
            <div className="text-[13px] opacity-85">Salgados entregues</div>
            <div className="text-[22px] font-extrabold">{salgadosTotal}</div>
          </div>
        </div>
        <div className="text-xs opacity-80 mt-3.5">
          Calculado pelo preço de cada item no estoque
        </div>
      </div>

      <div className="bg-surface rounded-card-lg p-4.5 mt-4 shadow-card">
        <div className="text-[17px] font-extrabold mb-3.5">Mais vendidos</div>
        <div className="flex flex-col gap-3.5">
          {(relatorio?.maisVendidos.length ?? 0) === 0 && (
            <div className="text-muted text-[15px]">
              Nenhuma entrega concluída nesse período.
            </div>
          )}
          {relatorio?.maisVendidos.map((item, i) => (
            <div key={item.nome}>
              <div className="flex items-center gap-2.5">
                <div className="w-[26px] h-[26px] rounded-full bg-primary-tint-2 text-primary-dark flex items-center justify-center text-[13px] font-extrabold">
                  {i + 1}
                </div>
                <div className="flex-1 text-base font-semibold capitalize">
                  {item.nome}
                </div>
                <div className="text-[17px] font-extrabold text-primary-dark">
                  {item.quantidade}
                </div>
              </div>
              <div className="mt-2">
                <ProportionBar value={item.quantidade} max={maxRanked} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-surface rounded-card-lg p-4.5 mt-4 shadow-card">
        <div className="text-[17px] font-extrabold mb-1.5">Entregas por dia</div>
        {relatorio?.porDia.map((d) => (
          <div
            key={d.dataOriginal}
            className="flex items-center justify-between gap-3 py-3.5 border-b border-divider-2 last:border-b-0"
          >
            <div className="text-base font-semibold">{d.data}</div>
            <div className="text-sm text-primary-dark font-bold">
              {d.quantidade} {d.quantidade === 1 ? "entrega" : "entregas"} ·{" "}
              {porDiaSalgados[d.dataOriginal] ?? 0} salgados
            </div>
          </div>
        ))}
      </div>

      <div className="bg-surface rounded-card-lg p-4.5 mt-4 shadow-card">
        <div className="text-[17px] font-extrabold mb-2.5">Estoque baixo</div>
        {estoqueBaixo.length === 0 ? (
          <div className="text-base font-bold text-success-text leading-snug">
            Todos os itens com estoque bom
          </div>
        ) : (
          <div className="text-base font-bold text-danger leading-snug">
            {estoqueBaixo.map((i) => `${i.nome}: ${i.quantidade}`).join(" · ")}
          </div>
        )}
        <div className="flex items-center justify-between gap-3 mt-4 pt-4 border-t border-divider-2">
          <div className="text-[15px] text-ink-soft">Avisar quando ficar abaixo de</div>
          <input
            type="number"
            min={0}
            step={50}
            value={threshold}
            onChange={(e) => setThreshold(Math.max(0, parseInt(e.target.value) || 0))}
            className="w-24 box-border p-3 text-[17px] font-bold text-center border-[1.5px] border-border rounded-chip bg-surface text-ink"
          />
        </div>
      </div>
    </div>
  );
}
