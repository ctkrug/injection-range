import { describe, expect, it } from "vitest";
import { createSoundEngine } from "../src/audio";

function fakeStorage(): Storage {
  const store = new Map<string, string>();
  return {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => {
      store.set(key, value);
    },
    removeItem: (key) => {
      store.delete(key);
    },
    clear: () => store.clear(),
    key: (index) => Array.from(store.keys())[index] ?? null,
    get length() {
      return store.size;
    },
  } satisfies Storage;
}

describe("createSoundEngine", () => {
  it("starts unmuted when storage has no prior preference", () => {
    const engine = createSoundEngine(fakeStorage());
    expect(engine.isMuted()).toBe(false);
  });

  it("restores a previously persisted mute preference", () => {
    const storage = fakeStorage();
    storage.setItem("injection-range:muted", "1");
    const engine = createSoundEngine(storage);
    expect(engine.isMuted()).toBe(true);
  });

  it("toggleMute flips state and persists it", () => {
    const storage = fakeStorage();
    const engine = createSoundEngine(storage);

    expect(engine.toggleMute()).toBe(true);
    expect(engine.isMuted()).toBe(true);
    expect(storage.getItem("injection-range:muted")).toBe("1");

    expect(engine.toggleMute()).toBe(false);
    expect(storage.getItem("injection-range:muted")).toBe("0");
  });

  it("play calls never throw when AudioContext is unavailable (jsdom has none)", () => {
    const engine = createSoundEngine(fakeStorage());
    expect(() => engine.playFlagCorrect()).not.toThrow();
    expect(() => engine.playFlagWrong()).not.toThrow();
    expect(() => engine.playOutcome("SECURE")).not.toThrow();
    expect(() => engine.playOutcome("LEAKED")).not.toThrow();
    expect(() => engine.playOutcome("BLOCKED_BLIND")).not.toThrow();
  });

  it("play calls are no-ops once muted, without throwing", () => {
    const engine = createSoundEngine(fakeStorage());
    engine.toggleMute();
    expect(engine.isMuted()).toBe(true);
    expect(() => engine.playOutcome("SECURE")).not.toThrow();
  });

  it("a storage that throws on write does not crash toggleMute", () => {
    const throwingStorage: Storage = {
      getItem: () => null,
      setItem: () => {
        throw new Error("quota exceeded");
      },
      removeItem: () => {},
      clear: () => {},
      key: () => null,
      length: 0,
    };
    const engine = createSoundEngine(throwingStorage);
    expect(() => engine.toggleMute()).not.toThrow();
  });
});
