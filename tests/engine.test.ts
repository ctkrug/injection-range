import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { isFlagCorrect, pendingMove, resolveDecision } from "../src/engine";
import { sampleTranscript } from "../src/sample-transcript";
import type { FlaggedSpan } from "../src/selection";
import type { Transcript } from "../src/types";

const { injection } = sampleTranscript;

function stubTranscriptWithInjection(messageIndex: number, start: number, end: number): Transcript {
  return {
    id: "prop-test",
    title: "prop-test",
    difficulty: "easy",
    messages: [{ role: "user", content: "x".repeat(Math.max(end, 1)) }],
    injection: { messageIndex, start, end, technique: "html-comment" },
    nextMoves: [{ id: "a", label: "a", isDangerous: true, leakDescription: "x" }],
    safeMoveId: "a",
  };
}

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

describe("isFlagCorrect — properties", () => {
  // An arbitrary injection span, expressed as a base offset plus a positive width so start < end always holds.
  const injectionArb = fc
    .record({
      messageIndex: fc.integer({ min: 0, max: 4 }),
      base: fc.integer({ min: 0, max: 200 }),
      width: fc.integer({ min: 1, max: 50 }),
    })
    .map(({ messageIndex, base, width }) => ({ messageIndex, start: base, end: base + width }));

  it("accepts any same-message span padded outward on either side (a superset always contains the payload)", () => {
    fc.assert(
      fc.property(
        injectionArb,
        fc.nat(30),
        fc.nat(30),
        ({ messageIndex, start, end }, leftPad, rightPad) => {
          const transcript = stubTranscriptWithInjection(messageIndex, start, end);
          const flagged: FlaggedSpan = {
            messageIndex,
            start: start - leftPad,
            end: end + rightPad,
          };
          expect(isFlagCorrect(transcript, flagged)).toBe(true);
        },
      ),
    );
  });

  it("rejects any span that omits part of the payload from either edge", () => {
    fc.assert(
      fc.property(
        injectionArb.filter((span) => span.end - span.start >= 2),
        fc.integer({ min: 1, max: 1000 }),
        fc.boolean(),
        ({ messageIndex, start, end }, shrinkBy, fromStart) => {
          const shrink = Math.min(shrinkBy, end - start - 1);
          const flagged: FlaggedSpan = fromStart
            ? { messageIndex, start: start + shrink, end }
            : { messageIndex, start, end: end - shrink };
          const transcript = stubTranscriptWithInjection(messageIndex, start, end);
          expect(isFlagCorrect(transcript, flagged)).toBe(false);
        },
      ),
    );
  });

  it("rejects an otherwise-correct span flagged in the wrong message", () => {
    fc.assert(
      fc.property(
        injectionArb,
        fc.integer({ min: 0, max: 4 }),
        ({ messageIndex, start, end }, otherMessageIndex) => {
          fc.pre(otherMessageIndex !== messageIndex);
          const transcript = stubTranscriptWithInjection(messageIndex, start, end);
          const flagged: FlaggedSpan = { messageIndex: otherMessageIndex, start, end };
          expect(isFlagCorrect(transcript, flagged)).toBe(false);
        },
      ),
    );
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
