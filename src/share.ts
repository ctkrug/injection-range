import type { Outcome } from "./engine";

export interface ShareSummaryInput {
  dateKeyValue: string;
  outcome: Outcome;
  hintUsed: boolean;
  elapsedSeconds: number;
  streak: number;
}

const OUTCOME_LABEL: Record<Outcome, string> = {
  SECURE: "SECURE",
  LEAKED: "LEAKED",
  BLOCKED_BLIND: "BLOCKED (blind)",
};

/**
 * Builds a compact, spoiler-free result summary — outcome, time, hint use,
 * and streak only. Never includes any transcript content or the injection
 * text itself, so it's always safe to paste publicly.
 */
export function buildShareSummary(input: ShareSummaryInput): string {
  const resultLabel =
    input.outcome === "SECURE"
      ? `${OUTCOME_LABEL.SECURE}${input.hintUsed ? "" : " (no hint)"}`
      : OUTCOME_LABEL[input.outcome];

  return [
    `INJECTION_RANGE ${input.dateKeyValue}`,
    `${resultLabel} · ${input.elapsedSeconds}s · streak ${input.streak}`,
  ].join("\n");
}
