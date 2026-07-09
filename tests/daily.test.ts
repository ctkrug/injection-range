import { describe, expect, it } from "vitest";
import { formatDateKey, pickDailyTranscript } from "../src/daily";
import { transcriptPool } from "../src/pool";
import type { Transcript } from "../src/types";

function stubTranscript(id: string): Transcript {
  return {
    id,
    title: id,
    difficulty: "easy",
    messages: [{ role: "user", content: "hi" }],
    injection: { messageIndex: 0, start: 0, end: 1, technique: "html-comment" },
    nextMoves: [{ id: "a", label: "a", isDangerous: true, leakDescription: "x" }],
    safeMoveId: "a",
  };
}

describe("formatDateKey", () => {
  it("formats a UTC date as YYYY-MM-DD", () => {
    expect(formatDateKey(new Date(Date.UTC(2026, 6, 9)))).toBe("2026-07-09");
  });

  it("zero-pads single-digit months and days", () => {
    expect(formatDateKey(new Date(Date.UTC(2026, 0, 5)))).toBe("2026-01-05");
  });
});

describe("pickDailyTranscript", () => {
  const pool = [stubTranscript("a"), stubTranscript("b"), stubTranscript("c")];

  it("is deterministic: the same date key always yields the same transcript id", () => {
    const first = pickDailyTranscript("2026-07-09", pool);
    const second = pickDailyTranscript("2026-07-09", pool);
    expect(first.id).toBe(second.id);
  });

  it("yields more than one distinct id across a spread of calendar dates", () => {
    const ids = new Set<string>();
    for (let day = 1; day <= 28; day += 1) {
      const key = formatDateKey(new Date(Date.UTC(2026, 0, day)));
      ids.add(pickDailyTranscript(key, pool).id);
    }
    expect(ids.size).toBeGreaterThan(1);
  });

  it("throws on an empty pool", () => {
    expect(() => pickDailyTranscript("2026-07-09", [])).toThrow(/empty pool/);
  });

  it("always returns an entry that is actually in the pool", () => {
    for (let day = 1; day <= 10; day += 1) {
      const key = formatDateKey(new Date(Date.UTC(2026, 2, day)));
      const picked = pickDailyTranscript(key, pool);
      expect(pool).toContain(picked);
    }
  });

  it("spreads the real transcript pool across dates too", () => {
    const ids = new Set<string>();
    for (let day = 1; day <= 28; day += 1) {
      const key = formatDateKey(new Date(Date.UTC(2026, 6, day)));
      ids.add(pickDailyTranscript(key, transcriptPool).id);
    }
    expect(ids.size).toBeGreaterThan(1);
  });
});
