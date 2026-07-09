import { vi } from "vitest";

/** Minimal stand-in for the WebAudio nodes `audio.ts` touches. */
class FakeGainNode {
  gain = { value: 0, exponentialRampToValueAtTime: vi.fn() };
  connect = vi.fn(() => this);
}

class FakeOscillatorNode {
  type = "sine";
  frequency = { value: 0 };
  connect = vi.fn(() => this);
  start = vi.fn();
  stop = vi.fn();
}

/** Minimal stand-in for `AudioContext`, enough to exercise `audio.ts`'s tone() path. */
export class FakeAudioContext {
  state: "running" | "suspended" = "running";
  currentTime = 0;
  destination = {};
  resume = vi.fn(() => Promise.resolve());
  createOscillator = vi.fn(() => new FakeOscillatorNode());
  createGain = vi.fn(() => new FakeGainNode());
}
