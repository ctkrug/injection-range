import { describe, expect, it } from "vitest";
import { spawnCelebration } from "../src/celebrate";

/** Deterministic RNG cycling through fixed values so positions are assertable. */
function sequenceRandom(values: number[]): () => number {
  let index = 0;
  return () => values[index++ % values.length];
}

describe("spawnCelebration", () => {
  it("spawns the requested number of glyphs into the container", () => {
    const container = document.createElement("div");
    const spawned = spawnCelebration(container, { count: 10, random: () => 0.5 });

    expect(spawned).toBe(10);
    expect(container.querySelectorAll(".celebration__glyph")).toHaveLength(10);
  });

  it("only ever renders 0 or 1 as the glyph text", () => {
    const container = document.createElement("div");
    spawnCelebration(container, { count: 8, random: sequenceRandom([0, 0.99]) });

    for (const glyph of container.querySelectorAll(".celebration__glyph")) {
      expect(["0", "1"]).toContain(glyph.textContent);
    }
  });

  it("does nothing and returns 0 when reduced motion is requested", () => {
    const container = document.createElement("div");
    const spawned = spawnCelebration(container, { count: 12, reducedMotion: true });

    expect(spawned).toBe(0);
    expect(container.querySelector(".celebration")).toBeNull();
  });

  it("clears an earlier burst so retries never stack", () => {
    const container = document.createElement("div");
    spawnCelebration(container, { count: 5, random: () => 0.2 });
    spawnCelebration(container, { count: 3, random: () => 0.2 });

    expect(container.querySelectorAll(".celebration")).toHaveLength(1);
    expect(container.querySelectorAll(".celebration__glyph")).toHaveLength(3);
  });

  it("removes each glyph when its fall animation ends", () => {
    const container = document.createElement("div");
    spawnCelebration(container, { count: 4, random: () => 0.1 });

    for (const glyph of [...container.querySelectorAll(".celebration__glyph")]) {
      glyph.dispatchEvent(new Event("animationend"));
    }
    expect(container.querySelectorAll(".celebration__glyph")).toHaveLength(0);
  });

  it("positions glyphs from the injected RNG", () => {
    const container = document.createElement("div");
    spawnCelebration(container, { count: 1, random: sequenceRandom([0, 0.25, 0, 0]) });

    const glyph = container.querySelector<HTMLElement>(".celebration__glyph");
    expect(glyph?.style.left).toBe("25%");
  });
});
