import { describe, expect, it } from "vitest";
import { formatLocalDate, formatShortDatePtBR, formatLongDatePtBR, dayBadgeLabel, agendaGroupLabel, addDaysLocal, todayLocal } from "./date";

describe("formatLocalDate", () => {
  it("formats using local calendar fields, not UTC", () => {
    const d = new Date(2026, 0, 5, 23, 30);
    expect(formatLocalDate(d)).toBe("2026-01-05");
  });

  it("pads single-digit month and day", () => {
    const d = new Date(2026, 2, 4);
    expect(formatLocalDate(d)).toBe("2026-03-04");
  });
});

describe("formatShortDatePtBR", () => {
  it("formats dd/mm", () => {
    expect(formatShortDatePtBR("2026-08-04")).toBe("04/08");
  });
  it("formats dd/mm/yyyy when withYear is true", () => {
    expect(formatShortDatePtBR("2026-08-04", true)).toBe("04/08/2026");
  });
});

describe("formatLongDatePtBR", () => {
  it("formats weekday + day + month in pt-BR", () => {
    expect(formatLongDatePtBR("2026-08-04")).toBe("terça-feira, 4 de agosto");
  });
});

describe("dayBadgeLabel / agendaGroupLabel", () => {
  it("labels today and tomorrow specially", () => {
    const hoje = todayLocal();
    const amanha = addDaysLocal(new Date(), 1);
    expect(dayBadgeLabel(hoje)).toBe("HOJE");
    expect(dayBadgeLabel(amanha)).toBe("AMANHÃ");
    expect(agendaGroupLabel(hoje)).toBe(`Hoje, ${formatShortDatePtBR(hoje)}`);
    expect(agendaGroupLabel(amanha)).toBe(`Amanhã, ${formatShortDatePtBR(amanha)}`);
  });

  it("falls back to a plain date badge and a spelled-out weekday group label further out", () => {
    const future = addDaysLocal(new Date(), 30);
    const expectedWeekday = new Date(future + "T12:00:00").toLocaleDateString("pt-BR", {
      weekday: "long",
    });
    const capitalized = expectedWeekday.charAt(0).toUpperCase() + expectedWeekday.slice(1);
    expect(dayBadgeLabel(future)).toBe(formatShortDatePtBR(future));
    expect(agendaGroupLabel(future)).toBe(`${capitalized}, ${formatShortDatePtBR(future)}`);
  });
});
