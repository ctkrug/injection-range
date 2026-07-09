import { afterEach, describe, expect, it, vi } from "vitest";
import { createSoundEngine } from "../src/audio";
import { fakeStorage } from "./support/fake-storage";
import { FakeAudioContext } from "./support/fake-audio-context";

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
    expect(() => engine.playAllowClick()).not.toThrow();
    expect(() => engine.playBlockClick()).not.toThrow();
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

  it("a storage that throws on read starts unmuted instead of crashing", () => {
    const throwingStorage: Storage = {
      getItem: () => {
        throw new Error("storage disabled");
      },
      setItem: () => {},
      removeItem: () => {},
      clear: () => {},
      key: () => null,
      length: 0,
    };
    expect(() => createSoundEngine(throwingStorage)).not.toThrow();
    expect(createSoundEngine(throwingStorage).isMuted()).toBe(false);
  });

  describe("with a WebAudio-capable environment", () => {
    const originalAudioContext = window.AudioContext;

    afterEach(() => {
      window.AudioContext = originalAudioContext;
    });

    it("creates an oscillator+gain pair and starts/stops it for a play call", () => {
      const fakeCtx = new FakeAudioContext();
      window.AudioContext = vi.fn(() => fakeCtx) as unknown as typeof AudioContext;

      const engine = createSoundEngine(fakeStorage());
      engine.playAllowClick();

      expect(fakeCtx.createOscillator).toHaveBeenCalledTimes(1);
      expect(fakeCtx.createGain).toHaveBeenCalledTimes(1);
      const osc = fakeCtx.createOscillator.mock.results[0]!.value;
      expect(osc.start).toHaveBeenCalledWith(fakeCtx.currentTime);
      expect(osc.stop).toHaveBeenCalled();
    });

    it("reuses the same AudioContext across multiple play calls", () => {
      const ctorSpy = vi.fn(() => new FakeAudioContext());
      window.AudioContext = ctorSpy as unknown as typeof AudioContext;

      const engine = createSoundEngine(fakeStorage());
      engine.playAllowClick();
      engine.playBlockClick();

      expect(ctorSpy).toHaveBeenCalledTimes(1);
    });

    it("resumes a suspended AudioContext on the next play call", () => {
      const fakeCtx = new FakeAudioContext();
      window.AudioContext = vi.fn(() => fakeCtx) as unknown as typeof AudioContext;

      const engine = createSoundEngine(fakeStorage());
      engine.playAllowClick();
      fakeCtx.state = "suspended";
      engine.playBlockClick();

      expect(fakeCtx.resume).toHaveBeenCalledTimes(1);
    });

    it("falls back to webkitAudioContext when AudioContext is undefined", () => {
      window.AudioContext = undefined as unknown as typeof AudioContext;
      const fakeCtx = new FakeAudioContext();
      const withWebkit = window as typeof window & { webkitAudioContext?: unknown };
      withWebkit.webkitAudioContext = vi.fn(() => fakeCtx);

      const engine = createSoundEngine(fakeStorage());
      engine.playFlagCorrect();

      expect(fakeCtx.createOscillator).toHaveBeenCalled();
      delete withWebkit.webkitAudioContext;
    });
  });
});
