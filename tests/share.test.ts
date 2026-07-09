import { describe, expect, it } from "vitest";
import { buildShareSummary } from "../src/share";

describe("buildShareSummary", () => {
  it("labels a no-hint SECURE solve", () => {
    const summary = buildShareSummary({
      dateKeyValue: "2026-07-09",
      outcome: "SECURE",
      hintUsed: false,
      elapsedSeconds: 42,
      streak: 3,
    });
    expect(summary).toBe("INJECTION_RANGE 2026-07-09\nSECURE (no hint) · 42s · streak 3");
  });

  it("drops the no-hint qualifier when a hint was used", () => {
    const summary = buildShareSummary({
      dateKeyValue: "2026-07-09",
      outcome: "SECURE",
      hintUsed: true,
      elapsedSeconds: 12,
      streak: 1,
    });
    expect(summary).toContain("SECURE ·");
    expect(summary).not.toContain("no hint");
  });

  it("labels a LEAKED outcome", () => {
    const summary = buildShareSummary({
      dateKeyValue: "2026-07-09",
      outcome: "LEAKED",
      hintUsed: false,
      elapsedSeconds: 8,
      streak: 0,
    });
    expect(summary).toContain("LEAKED ·");
  });

  it("labels a BLOCKED_BLIND outcome", () => {
    const summary = buildShareSummary({
      dateKeyValue: "2026-07-09",
      outcome: "BLOCKED_BLIND",
      hintUsed: false,
      elapsedSeconds: 5,
      streak: 0,
    });
    expect(summary).toContain("BLOCKED (blind) ·");
  });

  it("never contains the word 'injection' or any transcript content", () => {
    const summary = buildShareSummary({
      dateKeyValue: "2026-07-09",
      outcome: "LEAKED",
      hintUsed: false,
      elapsedSeconds: 8,
      streak: 0,
    });
    expect(summary.toLowerCase()).not.toContain("api_key");
    expect(summary.toLowerCase()).not.toContain("disregard prior instructions");
  });
});
