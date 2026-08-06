import { describe, expect, it } from "vitest";
import { encodeEmbalagem, decodeEmbalagem, embalagemDisplayLabel } from "./embalagem";

describe("encodeEmbalagem", () => {
  it("returns empty string for 'nenhuma'", () => {
    expect(encodeEmbalagem({ tipo: "nenhuma", quantidade: 1, detalhe: "" })).toBe("");
  });

  it("encodes with detail", () => {
    expect(encodeEmbalagem({ tipo: "tupperware", quantidade: 2, detalhe: "Azul grande" })).toBe(
      "[2x Tupperware: Azul grande]",
    );
  });

  it("encodes without detail", () => {
    expect(encodeEmbalagem({ tipo: "isopor", quantidade: 1, detalhe: "" })).toBe("[1x Isopor]");
  });
});

describe("decodeEmbalagem", () => {
  it("round-trips encodeEmbalagem's output with detail", () => {
    const encoded = encodeEmbalagem({ tipo: "tupperware", quantidade: 3, detalhe: "Potes redondos" });
    expect(decodeEmbalagem(encoded)).toEqual({
      tipo: "tupperware",
      quantidade: 3,
      detalhe: "Potes redondos",
    });
  });

  it("round-trips encodeEmbalagem's output without detail", () => {
    const encoded = encodeEmbalagem({ tipo: "isopor", quantidade: 1, detalhe: "" });
    expect(decodeEmbalagem(encoded)).toEqual({ tipo: "isopor", quantidade: 1, detalhe: "" });
  });

  it("falls back to 'nenhuma' for empty or unrecognized text", () => {
    expect(decodeEmbalagem("")).toEqual({ tipo: "nenhuma", quantidade: 1, detalhe: "" });
    expect(decodeEmbalagem("texto livre antigo")).toEqual({
      tipo: "nenhuma",
      quantidade: 1,
      detalhe: "",
    });
  });
});

describe("embalagemDisplayLabel", () => {
  it("shows 'Sem embalagem' when there is none", () => {
    expect(embalagemDisplayLabel("")).toBe("Sem embalagem");
  });

  it("shows type + detail when present", () => {
    expect(embalagemDisplayLabel("[2x Tupperware: Azul grande]")).toBe(
      "Tupperware — Azul grande",
    );
  });

  it("shows just the type when there is no detail", () => {
    expect(embalagemDisplayLabel("[1x Isopor]")).toBe("Isopor");
  });
});
