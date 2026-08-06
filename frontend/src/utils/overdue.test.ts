import { describe, expect, it } from "vitest";
import { formatOverdue } from "./overdue";

describe("formatOverdue", () => {
  it("reports minutes under 1 hour", () => {
    const now = new Date(2026, 7, 4, 17, 30);
    expect(formatOverdue("2026-08-04", "17:00", now)).toBe("Passou 30min!");
  });

  it("reports hours under 24h", () => {
    const now = new Date(2026, 7, 4, 22, 0);
    expect(formatOverdue("2026-08-04", "17:00", now)).toBe("Passou 5h!");
  });

  it("reports days at 24h and beyond", () => {
    const now = new Date(2026, 7, 6, 17, 0);
    expect(formatOverdue("2026-08-04", "17:00", now)).toBe("Passou 2d!");
  });

  it("boundary: 59 minutes stays in the minutes bucket, 60 rolls to hours", () => {
    expect(formatOverdue("2026-08-04", "17:00", new Date(2026, 7, 4, 17, 59))).toBe(
      "Passou 59min!",
    );
    expect(formatOverdue("2026-08-04", "17:00", new Date(2026, 7, 4, 18, 0))).toBe(
      "Passou 1h!",
    );
  });

  it("boundary: 23h59 stays in the hours bucket, 24h rolls to days", () => {
    expect(formatOverdue("2026-08-04", "17:00", new Date(2026, 7, 5, 16, 59))).toBe(
      "Passou 23h!",
    );
    expect(formatOverdue("2026-08-04", "17:00", new Date(2026, 7, 5, 17, 0))).toBe(
      "Passou 1d!",
    );
  });
});
