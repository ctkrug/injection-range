import { describe, expect, it } from "vitest";
import {
  getDailyResult,
  getStreak,
  markHintUsed,
  previousDateKey,
  recordResult,
} from "../src/progress";
import { fakeStorage } from "./support/fake-storage";

describe("previousDateKey", () => {
  it("returns the prior calendar day", () => {
    expect(previousDateKey("2026-07-09")).toBe("2026-07-08");
  });

  it("crosses a month boundary", () => {
    expect(previousDateKey("2026-08-01")).toBe("2026-07-31");
  });

  it("crosses a year boundary", () => {
    expect(previousDateKey("2026-01-01")).toBe("2025-12-31");
  });
});

describe("getDailyResult", () => {
  it("returns null when nothing has been recorded for that date", () => {
    expect(getDailyResult(fakeStorage(), "2026-07-09")).toBeNull();
  });

  it("returns a previously recorded result for that exact date", () => {
    const storage = fakeStorage();
    recordResult(storage, "2026-07-09", { solved: true, hintUsed: false });
    expect(getDailyResult(storage, "2026-07-09")).toEqual({ solved: true, hintUsed: false });
  });

  it("does not leak a result recorded under a different date", () => {
    const storage = fakeStorage();
    recordResult(storage, "2026-07-09", { solved: true, hintUsed: false });
    expect(getDailyResult(storage, "2026-07-10")).toBeNull();
  });
});

describe("getStreak", () => {
  it("is 0 with no recorded history", () => {
    expect(getStreak(fakeStorage())).toBe(0);
  });

  it("does not increment on an unsolved (blocked-blind or leaked) result", () => {
    const storage = fakeStorage();
    recordResult(storage, "2026-07-09", { solved: false, hintUsed: false });
    expect(getStreak(storage)).toBe(0);
  });

  it("increments to 1 on the first solve", () => {
    const storage = fakeStorage();
    recordResult(storage, "2026-07-09", { solved: true, hintUsed: false });
    expect(getStreak(storage)).toBe(1);
  });

  it("increments on a solve consecutive with the previous day's solve", () => {
    const storage = fakeStorage();
    recordResult(storage, "2026-07-08", { solved: true, hintUsed: false });
    recordResult(storage, "2026-07-09", { solved: true, hintUsed: false });
    expect(getStreak(storage)).toBe(2);
  });

  it("resets to 1 when a day is skipped between solves", () => {
    const storage = fakeStorage();
    recordResult(storage, "2026-07-05", { solved: true, hintUsed: false });
    recordResult(storage, "2026-07-09", { solved: true, hintUsed: false });
    expect(getStreak(storage)).toBe(1);
  });

  it("re-recording a solve on the same day leaves the streak unchanged", () => {
    const storage = fakeStorage();
    recordResult(storage, "2026-07-08", { solved: true, hintUsed: false });
    recordResult(storage, "2026-07-09", { solved: true, hintUsed: false });
    recordResult(storage, "2026-07-09", { solved: true, hintUsed: true });
    expect(getStreak(storage)).toBe(2);
    expect(getDailyResult(storage, "2026-07-09")).toEqual({ solved: true, hintUsed: true });
  });

  it("markHintUsed sets the hint flag without recording a solve", () => {
    const storage = fakeStorage();
    markHintUsed(storage, "2026-07-09");
    expect(getDailyResult(storage, "2026-07-09")).toEqual({ solved: false, hintUsed: true });
    expect(getStreak(storage)).toBe(0);
  });

  it("markHintUsed preserves an already-recorded solve", () => {
    const storage = fakeStorage();
    recordResult(storage, "2026-07-09", { solved: true, hintUsed: false });
    markHintUsed(storage, "2026-07-09");
    expect(getDailyResult(storage, "2026-07-09")).toEqual({ solved: true, hintUsed: true });
    expect(getStreak(storage)).toBe(1);
  });

  it("markHintUsed is a no-op once the hint is already marked used", () => {
    const storage = fakeStorage();
    markHintUsed(storage, "2026-07-09");
    markHintUsed(storage, "2026-07-09");
    expect(getDailyResult(storage, "2026-07-09")).toEqual({ solved: false, hintUsed: true });
  });

  it("a storage that throws on write does not crash recordResult", () => {
    const throwingStorage: Storage = {
      getItem: () => null,
      setItem: () => {
        throw new Error("quota exceeded");
      },
      removeItem: () => {},
      clear: () => {},
      key: () => null,
      length: 0,
    };
    expect(() =>
      recordResult(throwingStorage, "2026-07-09", { solved: true, hintUsed: false }),
    ).not.toThrow();
  });

  it("recovers from hand-corrupted (non-JSON) localStorage instead of crashing", () => {
    const storage = fakeStorage();
    storage.setItem("injection-range:results", "{not valid json");
    storage.setItem("injection-range:streak", "also not json");

    expect(getDailyResult(storage, "2026-07-09")).toBeNull();
    expect(getStreak(storage)).toBe(0);
    expect(() =>
      recordResult(storage, "2026-07-09", { solved: true, hintUsed: false }),
    ).not.toThrow();
    expect(getStreak(storage)).toBe(1);
  });
});
