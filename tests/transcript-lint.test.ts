import { describe, expect, it } from "vitest";
import { findInjectionOffset } from "../src/transcript-lint";

describe("findInjectionOffset", () => {
  it("returns the index of a payload that is present in the content", () => {
    expect(findInjectionOffset("hello world", "world", "t1")).toBe(6);
  });

  it("throws with the transcript id when the payload is absent", () => {
    expect(() => findInjectionOffset("hello world", "goodbye", "t1")).toThrow(/t1/);
  });
});
