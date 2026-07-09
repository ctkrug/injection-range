import { describe, expect, it } from "vitest";
import { transcriptPool } from "../src/pool";

describe("content lint: every pool transcript's injection span is real", () => {
  for (const transcript of transcriptPool) {
    it(`${transcript.id} claims a span that is literally present in its message`, () => {
      const { injection, messages } = transcript;
      const message = messages[injection.messageIndex];
      expect(
        message,
        `transcript "${transcript.id}" has no message at index ${injection.messageIndex}`,
      ).toBeDefined();

      const span = message.content.slice(injection.start, injection.end);
      expect(
        span.length,
        `transcript "${transcript.id}" has an empty injection span`,
      ).toBeGreaterThan(0);
      expect(
        message.content,
        `transcript "${transcript.id}" injection span does not round-trip`,
      ).toContain(span);
    });

    it(`${transcript.id} has exactly one dangerous next move and a valid safe move`, () => {
      const dangerous = transcript.nextMoves.filter((move) => move.isDangerous);
      expect(
        dangerous,
        `transcript "${transcript.id}" must have exactly one dangerous move`,
      ).toHaveLength(1);

      const safeMove = transcript.nextMoves.find((move) => move.id === transcript.safeMoveId);
      expect(
        safeMove,
        `transcript "${transcript.id}" safeMoveId does not match any move`,
      ).toBeDefined();
      expect(safeMove?.isDangerous).toBe(false);
    });
  }
});
