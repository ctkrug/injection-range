import type { Transcript } from "./types";

/** Formats a date as `YYYY-MM-DD` in UTC, so the picker is stable regardless of the reader's timezone. */
export function formatDateKey(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Deterministic 32-bit FNV-1a-style string hash — same input always yields the same output. */
function hashString(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (Math.imul(hash, 31) + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

/**
 * Picks today's transcript deterministically from `pool`: the same
 * `dateKeyValue` always yields the same transcript, and different date keys
 * spread across the pool rather than collapsing onto one entry.
 */
export function pickDailyTranscript(dateKeyValue: string, pool: readonly Transcript[]): Transcript {
  if (pool.length === 0) {
    throw new Error("cannot pick a daily transcript from an empty pool");
  }
  const index = hashString(dateKeyValue) % pool.length;
  return pool[index];
}
