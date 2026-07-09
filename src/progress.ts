const RESULTS_KEY = "injection-range:results";
const STREAK_KEY = "injection-range:streak";

export interface DailyResult {
  solved: boolean;
  hintUsed: boolean;
}

interface StreakRecord {
  count: number;
  lastSolvedDate: string | null;
}

type ResultsMap = Record<string, DailyResult>;

function readJson<T>(storage: Pick<Storage, "getItem">, key: string, fallback: T): T {
  try {
    const raw = storage.getItem(key);
    if (raw === null) {
      return fallback;
    }
    const parsed: unknown = JSON.parse(raw);
    // Both persisted values are keyed objects. A valid-JSON scalar or array
    // (e.g. a stray `42` or `null` written by another tab or a corrupted
    // entry) parses fine but would crash the property access below, so treat
    // anything that isn't a plain object as absent.
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
      return fallback;
    }
    return parsed as T;
  } catch {
    return fallback;
  }
}

function writeJson(storage: Pick<Storage, "setItem">, key: string, value: unknown): void {
  try {
    storage.setItem(key, JSON.stringify(value));
  } catch {
    // localStorage may be unavailable (private mode, quota) — persistence is
    // best-effort, never worth crashing the game over.
  }
}

/** The previous calendar day's date key, given a `YYYY-MM-DD` key. */
export function previousDateKey(dateKeyValue: string): string {
  const [year, month, day] = dateKeyValue.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() - 1);
  const prevYear = date.getUTCFullYear();
  const prevMonth = String(date.getUTCMonth() + 1).padStart(2, "0");
  const prevDay = String(date.getUTCDate()).padStart(2, "0");
  return `${prevYear}-${prevMonth}-${prevDay}`;
}

/** Today's persisted result, or null if nothing has been recorded yet for this date. */
export function getDailyResult(storage: Storage, dateKeyValue: string): DailyResult | null {
  const results = readJson<ResultsMap>(storage, RESULTS_KEY, {});
  return results[dateKeyValue] ?? null;
}

/** The current consecutive-solve streak. */
export function getStreak(storage: Storage): number {
  return readJson<StreakRecord>(storage, STREAK_KEY, { count: 0, lastSolvedDate: null }).count;
}

/**
 * Persists today's attempt and, on a solve, updates the streak: consecutive
 * with yesterday's solve increments it, a gap resets it to 1, and re-solving
 * the same day it was already solved leaves the streak unchanged.
 */
export function recordResult(storage: Storage, dateKeyValue: string, result: DailyResult): void {
  const results = readJson<ResultsMap>(storage, RESULTS_KEY, {});
  results[dateKeyValue] = result;
  writeJson(storage, RESULTS_KEY, results);

  if (!result.solved) {
    return;
  }

  const streak = readJson<StreakRecord>(storage, STREAK_KEY, { count: 0, lastSolvedDate: null });
  if (streak.lastSolvedDate === dateKeyValue) {
    return;
  }
  const isConsecutive = streak.lastSolvedDate === previousDateKey(dateKeyValue);
  writeJson(storage, STREAK_KEY, {
    count: isConsecutive ? streak.count + 1 : 1,
    lastSolvedDate: dateKeyValue,
  });
}

/**
 * Marks today's hint as used without disturbing the solved flag or streak —
 * safe to call as soon as the player requests a hint, before the round is
 * decided.
 */
export function markHintUsed(storage: Storage, dateKeyValue: string): void {
  const existing = getDailyResult(storage, dateKeyValue) ?? { solved: false, hintUsed: false };
  if (existing.hintUsed) {
    return;
  }
  recordResult(storage, dateKeyValue, { ...existing, hintUsed: true });
}
