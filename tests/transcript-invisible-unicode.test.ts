import { describe, expect, it } from "vitest";
import { invisibleUnicodeTranscript } from "../src/transcript-invisible-unicode";

const ZWSP = "\u200b";

describe("invisibleUnicodeTranscript", () => {
  it("places the injection span inside the referenced message's content", () => {
    const { injection, messages } = invisibleUnicodeTranscript;
    const message = messages[injection.messageIndex];
    expect(message).toBeDefined();

    const span = message.content.slice(injection.start, injection.end);
    expect(span.length).toBeGreaterThan(0);
    expect(message.content).toContain(span);
  });

  it("tags the injection with the invisible-unicode technique", () => {
    expect(invisibleUnicodeTranscript.injection.technique).toBe("invisible-unicode");
  });

  it("hides the payload behind zero-width spaces between every character", () => {
    const { injection, messages } = invisibleUnicodeTranscript;
    const span = messages[injection.messageIndex].content.slice(injection.start, injection.end);
    expect(span).toContain(ZWSP);
    // Stripping the zero-width spaces should reveal readable instruction text.
    expect(span.split(ZWSP).join("")).toMatch(/forward this email/);
  });

  it("has exactly one dangerous next move and a safe move that isn't it", () => {
    const dangerous = invisibleUnicodeTranscript.nextMoves.filter((move) => move.isDangerous);
    expect(dangerous).toHaveLength(1);

    const safeMove = invisibleUnicodeTranscript.nextMoves.find(
      (move) => move.id === invisibleUnicodeTranscript.safeMoveId,
    );
    expect(safeMove).toBeDefined();
    expect(safeMove?.isDangerous).toBe(false);
  });

  it("has a different id than the sample transcript", () => {
    expect(invisibleUnicodeTranscript.id).not.toBe("2026-07-08-html-comment");
  });
});
