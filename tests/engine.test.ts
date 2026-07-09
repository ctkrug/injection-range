import { describe, expect, it } from "vitest";
import { isFlagCorrect, pendingMove, resolveDecision } from "../src/engine";
import { sampleTranscript } from "../src/sample-transcript";
import type { FlaggedSpan } from "../src/selection";

const { injection } = sampleTranscript;

describe("isFlagCorrect", () => {
  it("accepts the exact authored span", () => {
    const flagged: FlaggedSpan = {
      messageIndex: injection.messageIndex,
      start: injection.start,
      end: injection.end,
    };
    expect(isFlagCorrect(sampleTranscript, flagged)).toBe(true);
  });

  it("accepts a looser selection that fully contains the payload", () => {
    const flagged: FlaggedSpan = {
      messageIndex: injection.messageIndex,
      start: Math.max(0, injection.start - 5),
      end: injection.end + 5,
    };
    expect(isFlagCorrect(sampleTranscript, flagged)).toBe(true);
  });

  it("rejects a selection that only partially covers the payload", () => {
    const flagged: FlaggedSpan = {
      messageIndex: injection.messageIndex,
      start: injection.start,
      end: injection.end - 1,
    };
    expect(isFlagCorrect(sampleTranscript, flagged)).toBe(false);
  });

  it("rejects a correctly-offset span in the wrong message", () => {
    const flagged: FlaggedSpan = {
      messageIndex: injection.messageIndex + 1,
      start: injection.start,
      end: injection.end,
    };
    expect(isFlagCorrect(sampleTranscript, flagged)).toBe(false);
  });

  it("rejects null (nothing flagged yet)", () => {
    expect(isFlagCorrect(sampleTranscript, null)).toBe(false);
  });
});

describe("pendingMove", () => {
  it("returns the transcript's dangerous next move", () => {
    expect(pendingMove(sampleTranscript).isDangerous).toBe(true);
  });

  it("throws when a transcript has no dangerous move", () => {
    const broken = {
      ...sampleTranscript,
      nextMoves: sampleTranscript.nextMoves.map((move) => ({ ...move, isDangerous: false })),
    };
    expect(() => pendingMove(broken)).toThrow();
  });
});

describe("resolveDecision", () => {
  const correctFlag: FlaggedSpan = {
    messageIndex: injection.messageIndex,
    start: injection.start,
    end: injection.end,
  };

  it("allowing the pending move always leaks, flagged or not", () => {
    expect(resolveDecision(sampleTranscript, "allow", correctFlag).outcome).toBe("LEAKED");
    expect(resolveDecision(sampleTranscript, "allow", null).outcome).toBe("LEAKED");
  });

  it("the leak message names what the dangerous move exposed", () => {
    const result = resolveDecision(sampleTranscript, "allow", null);
    expect(result.message).toBe(pendingMove(sampleTranscript).leakDescription);
    expect(result.solved).toBe(false);
  });

  it("blocking after correctly flagging the injection is a solved SECURE round", () => {
    const result = resolveDecision(sampleTranscript, "block", correctFlag);
    expect(result.outcome).toBe("SECURE");
    expect(result.solved).toBe(true);
  });

  it("blocking without ever flagging the injection is safe but unsolved", () => {
    const result = resolveDecision(sampleTranscript, "block", null);
    expect(result.outcome).toBe("BLOCKED_BLIND");
    expect(result.solved).toBe(false);
  });
});
