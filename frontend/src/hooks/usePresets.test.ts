import { describe, expect, it } from "vitest";
import { computePresetAssignment, presetDetailLabel, PRESETS_CONFIG } from "./usePresets";
import type { EstoqueItem } from "../types";

function item(id: number, nome: string, quantidade: number): EstoqueItem {
  return { id, nome, quantidade, preco_unitario: 1, updated_at: "" };
}

describe("computePresetAssignment", () => {
  it("assigns the exact PRESETS_CONFIG split to the first 4 qualifying items", () => {
    const items = [item(1, "Coxinha", 100), item(2, "Kibe", 100), item(3, "Queijo", 100), item(4, "Rissole", 100)];
    const result = computePresetAssignment(items, 100);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.itens.map((i) => i.quantidade)).toEqual(PRESETS_CONFIG[100]);
      expect(result.uniform).toBe(true);
    }
  });

  it("flags uneven presets (50) as non-uniform", () => {
    const items = [item(1, "A", 50), item(2, "B", 50), item(3, "C", 50), item(4, "D", 50)];
    const result = computePresetAssignment(items, 50);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.uniform).toBe(false);
  });

  it("rejects when fewer than 4 items have enough stock, listing the insufficient ones", () => {
    const items = [item(1, "A", 50), item(2, "B", 50), item(3, "C", 50), item(4, "D", 10)];
    const result = computePresetAssignment(items, 200);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.qtdMinima).toBe(50);
      expect(result.itensInsuficientes).toEqual([{ nome: "D", quantidade: 10 }]);
    }
  });

  it("picks the first 4 qualifying items in stock order when more than 4 qualify", () => {
    const items = [item(1, "A", 100), item(2, "B", 100), item(3, "C", 100), item(4, "D", 100), item(5, "E", 100)];
    const result = computePresetAssignment(items, 100);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.itens.map((i) => i.estoqueId)).toEqual([1, 2, 3, 4]);
    }
  });
});

describe("presetDetailLabel", () => {
  it("describes uniform presets as 'N de cada'", () => {
    expect(presetDetailLabel(100)).toBe("25 de cada");
    expect(presetDetailLabel(200)).toBe("50 de cada");
  });

  it("describes uneven presets as a slash-separated split", () => {
    expect(presetDetailLabel(50)).toBe("13/13/12/12 por item");
    expect(presetDetailLabel(150)).toBe("38/38/37/37 por item");
  });
});
