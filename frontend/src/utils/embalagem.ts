import type { Embalagem } from "../types";

export interface EmbalagemState {
  tipo: Embalagem;
  quantidade: number;
  detalhe: string;
}

export const EMBALAGEM_VAZIA: EmbalagemState = {
  tipo: "nenhuma",
  quantidade: 1,
  detalhe: "",
};

const TIPO_LABEL: Record<Exclude<Embalagem, "nenhuma">, string> = {
  tupperware: "Tupperware",
  isopor: "Isopor",
};

export function encodeEmbalagem(state: EmbalagemState): string {
  if (state.tipo === "nenhuma") return "";
  const label = TIPO_LABEL[state.tipo];
  if (state.detalhe.trim()) {
    return `[${state.quantidade}x ${label}: ${state.detalhe.trim()}]`;
  }
  return `[${state.quantidade}x ${label}]`;
}

const DECODE_RE = /^\[(\d+)x (Tupperware|Isopor)(?::\s*(.*))?\]$/;

export function decodeEmbalagem(texto: string): EmbalagemState {
  const match = texto.trim().match(DECODE_RE);
  if (!match) return { ...EMBALAGEM_VAZIA };
  const [, qtd, tipoLabel, detalhe] = match;
  const tipo: Embalagem = tipoLabel === "Tupperware" ? "tupperware" : "isopor";
  return { tipo, quantidade: parseInt(qtd, 10), detalhe: detalhe || "" };
}

export function embalagemDisplayLabel(texto: string): string {
  const state = decodeEmbalagem(texto);
  if (state.tipo === "nenhuma") return "Sem embalagem";
  const label = TIPO_LABEL[state.tipo];
  return state.detalhe ? `${label} — ${state.detalhe}` : label;
}
