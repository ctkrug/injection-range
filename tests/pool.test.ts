import { describe, expect, it } from "vitest";
import { transcriptPool } from "../src/pool";

describe("transcriptPool", () => {
  it("is non-empty", () => {
    expect(transcriptPool.length).toBeGreaterThan(0);
  });

  it("has a unique id for every transcript", () => {
    const ids = transcriptPool.map((transcript) => transcript.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
