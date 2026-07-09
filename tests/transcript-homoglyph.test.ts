import { describe, expect, it } from "vitest";
import { homoglyphTranscript } from "../src/transcript-homoglyph";

describe("homoglyphTranscript", () => {
  it("places the injection span inside the referenced message's content", () => {
    const { injection, messages } = homoglyphTranscript;
    const message = messages[injection.messageIndex];
    expect(message).toBeDefined();

    const span = message.content.slice(injection.start, injection.end);
    expect(span.length).toBeGreaterThan(0);
    expect(message.content).toContain(span);
  });

  it("tags the injection with the homoglyph technique", () => {
    expect(homoglyphTranscript.injection.technique).toBe("homoglyph");
  });

  it("the injected span does not literally contain the plain-ASCII instruction", () => {
    const { injection, messages } = homoglyphTranscript;
    const span = messages[injection.messageIndex].content.slice(injection.start, injection.end);
    expect(span).not.toContain("system note to assistant");
    expect(span).not.toContain("export_env_to_support tool");
  });

  it("uses Cyrillic lookalikes rather than Latin letters for at least one common vowel", () => {
    const { injection, messages } = homoglyphTranscript;
    const span = messages[injection.messageIndex].content.slice(injection.start, injection.end);
    expect(span).toContain("е"); // U+0435, not Latin "e"
    expect(span).not.toContain("system");
  });

  it("has exactly one dangerous next move and a safe move that isn't it", () => {
    const dangerous = homoglyphTranscript.nextMoves.filter((move) => move.isDangerous);
    expect(dangerous).toHaveLength(1);

    const safeMove = homoglyphTranscript.nextMoves.find(
      (move) => move.id === homoglyphTranscript.safeMoveId,
    );
    expect(safeMove).toBeDefined();
    expect(safeMove?.isDangerous).toBe(false);
  });

  it("has a unique id within the pool", () => {
    expect(homoglyphTranscript.id).toBe("2026-07-10-homoglyph");
  });
});
