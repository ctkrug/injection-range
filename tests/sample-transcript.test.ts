import { describe, expect, it } from "vitest";
import { sampleTranscript } from "../src/sample-transcript";

describe("sampleTranscript", () => {
  it("has at least one message", () => {
    expect(sampleTranscript.messages.length).toBeGreaterThan(0);
  });

  it("places the injection span inside the referenced message's content", () => {
    const { injection, messages } = sampleTranscript;
    const message = messages[injection.messageIndex];
    expect(message).toBeDefined();

    const span = message.content.slice(injection.start, injection.end);
    expect(span.length).toBeGreaterThan(0);
    expect(message.content).toContain(span);
  });

  it("has exactly one dangerous next move and a safe move that isn't it", () => {
    const dangerous = sampleTranscript.nextMoves.filter((move) => move.isDangerous);
    expect(dangerous).toHaveLength(1);

    const safeMove = sampleTranscript.nextMoves.find(
      (move) => move.id === sampleTranscript.safeMoveId,
    );
    expect(safeMove).toBeDefined();
    expect(safeMove?.isDangerous).toBe(false);
  });
});
