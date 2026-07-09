import { describe, expect, it } from "vitest";
import { copyToClipboard } from "../src/clipboard";

describe("copyToClipboard", () => {
  it("returns true when the clipboard write succeeds", async () => {
    const writes: string[] = [];
    const ok = await copyToClipboard("hello", {
      writeText: async (text) => {
        writes.push(text);
      },
    });
    expect(ok).toBe(true);
    expect(writes).toEqual(["hello"]);
  });

  it("returns false when no clipboard is available", async () => {
    const ok = await copyToClipboard("hello", undefined);
    expect(ok).toBe(false);
  });

  it("returns false, without throwing, when the write rejects", async () => {
    const ok = await copyToClipboard("hello", {
      writeText: async () => {
        throw new Error("denied");
      },
    });
    expect(ok).toBe(false);
  });
});
