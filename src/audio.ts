import type { Outcome } from "./engine";

const MUTE_STORAGE_KEY = "injection-range:muted";

export interface SoundEngine {
  playFlagCorrect(): void;
  playFlagWrong(): void;
  playOutcome(outcome: Outcome): void;
  isMuted(): boolean;
  toggleMute(): boolean;
}

type AudioContextCtor = typeof AudioContext;

function resolveAudioContextCtor(): AudioContextCtor | null {
  if (typeof window === "undefined") {
    return null;
  }
  const withWebkit = window as typeof window & { webkitAudioContext?: AudioContextCtor };
  return withWebkit.AudioContext ?? withWebkit.webkitAudioContext ?? null;
}

function readMuted(storage: Pick<Storage, "getItem">): boolean {
  try {
    return storage.getItem(MUTE_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function writeMuted(storage: Pick<Storage, "setItem">, muted: boolean): void {
  try {
    storage.setItem(MUTE_STORAGE_KEY, muted ? "1" : "0");
  } catch {
    // localStorage may be unavailable (private mode, quota) — muting is
    // best-effort, never worth crashing the game over.
  }
}

/**
 * Creates a WebAudio-synthesized sound engine: no audio files, oscillators
 * only. The AudioContext is created lazily on the first play call (browser
 * autoplay policies require a user gesture) and every call is a no-op when
 * AudioContext isn't available at all, so this is safe to construct and use
 * in a jsdom test environment.
 */
export function createSoundEngine(storage: Storage = window.localStorage): SoundEngine {
  let ctx: AudioContext | null = null;
  let muted = readMuted(storage);

  function ensureContext(): AudioContext | null {
    if (ctx) {
      if (ctx.state === "suspended") {
        void ctx.resume();
      }
      return ctx;
    }
    const Ctor = resolveAudioContextCtor();
    if (!Ctor) {
      return null;
    }
    ctx = new Ctor();
    return ctx;
  }

  function tone(freq: number, durationMs: number, type: OscillatorType, gainValue: number): void {
    if (muted) {
      return;
    }
    const audioCtx = ensureContext();
    if (!audioCtx) {
      return;
    }
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.value = gainValue;
    osc.connect(gain).connect(audioCtx.destination);
    const now = audioCtx.currentTime;
    const end = now + durationMs / 1000;
    gain.gain.exponentialRampToValueAtTime(0.0001, end);
    osc.start(now);
    osc.stop(end);
  }

  return {
    playFlagCorrect() {
      tone(720, 90, "sine", 0.05);
      tone(1080, 110, "sine", 0.04);
    },
    playFlagWrong() {
      tone(180, 140, "sawtooth", 0.05);
    },
    playOutcome(outcome: Outcome) {
      if (outcome === "LEAKED") {
        tone(220, 90, "sawtooth", 0.07);
        tone(140, 320, "sawtooth", 0.07);
        return;
      }
      if (outcome === "SECURE") {
        tone(520, 100, "square", 0.05);
        tone(780, 220, "square", 0.05);
        return;
      }
      tone(320, 160, "triangle", 0.05);
    },
    isMuted() {
      return muted;
    },
    toggleMute() {
      muted = !muted;
      writeMuted(storage, muted);
      return muted;
    },
  };
}
