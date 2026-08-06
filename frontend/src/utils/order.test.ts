import { describe, expect, it } from "vitest";
import { buildDescricao, parseItemLines, sumItemLines } from "./order";

describe("buildDescricao", () => {
  it("combines items and client name in the legacy format", () => {
    expect(
      buildDescricao([{ nome: "Coxinha", quantidade: 25 }, { nome: "Kibe", quantidade: 25 }], "Julia Melo"),
    ).toBe("25x Coxinha, 25x Kibe - Julia Melo");
  });

  it("falls back to just the client name when there are no items", () => {
    expect(buildDescricao([], "Julia Melo")).toBe("Julia Melo");
  });
});

describe("parseItemLines / sumItemLines round-trip with buildDescricao", () => {
  it("recovers the original item lines and total", () => {
    const items = [{ nome: "Coxinha", quantidade: 25 }, { nome: "Kibe", quantidade: 25 }];
    const descricao = buildDescricao(items, "Julia Melo");
    const lines = parseItemLines(descricao, "Julia Melo");
    expect(lines).toEqual(["25x Coxinha", "25x Kibe"]);
    expect(sumItemLines(lines)).toBe(50);
  });

  it("returns no lines when descricao is just the client name", () => {
    expect(parseItemLines("Julia Melo", "Julia Melo")).toEqual([]);
  });
});
