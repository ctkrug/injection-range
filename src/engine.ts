import type { Transcript, NextMove } from "./types";
import type { FlaggedSpan } from "./selection";

export type Decision = "allow" | "block";
export type Outcome = "SECURE" | "LEAKED" | "BLOCKED_BLIND";

export interface RoundResult {
  outcome: Outcome;
  /** True only when the round counts as a full solve for streak/badge purposes. */
  solved: boolean;
  message: string;
}

/**
 * True when the flagged span fully contains the authored injection span in
 * the same message — a selection may be looser than the exact offsets (per
 * BACKLOG Story 8) but must not miss any of the payload.
 */
export function isFlagCorrect(transcript: Transcript, flagged: FlaggedSpan | null): boolean {
  if (!flagged) {
    return false;
  }
  const { injection } = transcript;
  return (
    flagged.messageIndex === injection.messageIndex &&
    flagged.start <= injection.start &&
    flagged.end >= injection.end
  );
}

/** The next move the transcript is asking the player to approve or block. */
export function pendingMove(transcript: Transcript): NextMove {
  const move = transcript.nextMoves.find((candidate) => candidate.isDangerous);
  if (!move) {
    throw new Error(`transcript "${transcript.id}" has no dangerous next move to resolve`);
  }
  return move;
}

/**
 * Resolves the player's decision on the pending move into a round outcome.
 *
 * - Allowing the pending move always leaks, regardless of whether the
 *   injection was ever flagged.
 * - Blocking it only counts as a full SECURE solve if the injection was
 *   correctly flagged first; blocking blind is safe but unsolved.
 */
export function resolveDecision(
  transcript: Transcript,
  decision: Decision,
  flagged: FlaggedSpan | null,
): RoundResult {
  const move = pendingMove(transcript);

  if (decision === "allow") {
    return { outcome: "LEAKED", solved: false, message: move.leakDescription };
  }

  if (isFlagCorrect(transcript, flagged)) {
    return {
      outcome: "SECURE",
      solved: true,
      message: "Blocked. The injected instruction never reached execution.",
    };
  }

  return {
    outcome: "BLOCKED_BLIND",
    solved: false,
    message:
      "Blocked the move, but the injection was never flagged. Find it before you block next time.",
  };
}
