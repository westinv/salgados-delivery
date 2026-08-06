import type { EstoqueItem } from "../types";

export const PRESETS_CONFIG: Record<number, [number, number, number, number]> = {
  50: [13, 13, 12, 12],
  100: [25, 25, 25, 25],
  150: [38, 38, 37, 37],
  200: [50, 50, 50, 50],
};

export const PRESET_TOTALS = Object.keys(PRESETS_CONFIG).map(Number);

export interface PresetAssignment {
  total: number;
  ok: true;
  itens: { estoqueId: number; nome: string; quantidade: number }[];
  uniform: boolean;
}

export interface PresetUnavailable {
  total: number;
  ok: false;
  qtdMinima: number;
  itensInsuficientes: { nome: string; quantidade: number }[];
}

export function computePresetAssignment(
  estoqueItems: EstoqueItem[],
  total: number,
): PresetAssignment | PresetUnavailable {
  const quantidades = PRESETS_CONFIG[total];
  const qtdMinima = Math.max(...quantidades);

  const itensComEstoque = estoqueItems.filter(
    (item) => item.quantidade >= qtdMinima,
  );

  if (itensComEstoque.length < 4) {
    const itensInsuficientes = estoqueItems
      .filter((item) => item.quantidade < qtdMinima)
      .map((item) => ({ nome: item.nome, quantidade: item.quantidade }));
    return { total, ok: false, qtdMinima, itensInsuficientes };
  }

  const selecionados = itensComEstoque.slice(0, 4);
  const uniform = quantidades.every((q) => q === quantidades[0]);

  return {
    total,
    ok: true,
    uniform,
    itens: selecionados.map((item, index) => ({
      estoqueId: item.id,
      nome: item.nome,
      quantidade: quantidades[index],
    })),
  };
}

export function presetDetailLabel(total: number): string {
  const quantidades = PRESETS_CONFIG[total];
  const uniform = quantidades.every((q) => q === quantidades[0]);
  return uniform ? `${quantidades[0]} de cada` : `${quantidades.join("/")} por item`;
}
