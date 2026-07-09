import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { initApp } from "../src/app";
import { sampleTranscript } from "../src/sample-transcript";
import { fakeStorage } from "./support/fake-storage";
import { getDailyResult } from "../src/progress";

const { injection } = sampleTranscript;

let root: HTMLElement;

beforeEach(() => {
  window.localStorage.clear();
  root = document.createElement("div");
  document.body.appendChild(root);
});

afterEach(() => {
  document.getSelection()?.removeAllRanges();
  root.remove();
  Reflect.deleteProperty(navigator, "clipboard");
});

function pane(): HTMLElement {
  const el = root.querySelector<HTMLElement>(".transcript-pane");
  if (!el) throw new Error("transcript pane not rendered");
  return el;
}

function selectSpanInMessage(messageIndex: number, start: number, end: number): void {
  const el = pane().querySelector<HTMLElement>(
    `.message__content[data-message-index="${messageIndex}"]`,
  );
  const textNode = el?.firstChild;
  if (!el || !textNode) throw new Error(`message ${messageIndex} content not found`);

  const range = document.createRange();
  range.setStart(textNode, start);
  range.setEnd(textNode, end);
  const selection = document.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
  document.dispatchEvent(new Event("selectionchange"));
}

function flagButton(): HTMLButtonElement {
  return root.querySelector<HTMLButtonElement>(".btn--flag")!;
}

function allowButton(): HTMLButtonElement {
  return root.querySelector<HTMLButtonElement>(".btn--allow")!;
}

function blockButton(): HTMLButtonElement {
  return root.querySelector<HTMLButtonElement>(".btn--block")!;
}

function overlay(): HTMLElement {
  return root.querySelector<HTMLElement>(".outcome-overlay")!;
}

function muteButton(): HTMLButtonElement {
  return root.querySelector<HTMLButtonElement>(".btn--mute")!;
}

function hintButton(): HTMLButtonElement {
  return root.querySelector<HTMLButtonElement>(".btn--hint")!;
}

function noHintBadge(): HTMLElement {
  return root.querySelector<HTMLElement>(".no-hint-badge")!;
}

function statsLine(): HTMLElement {
  return root.querySelector<HTMLElement>(".stats-line")!;
}

function shareButton(): HTMLButtonElement {
  return root.querySelector<HTMLButtonElement>(".btn--share")!;
}

function shareFeedback(): HTMLElement {
  return root.querySelector<HTMLElement>(".share-feedback")!;
}

function shareFallback(): HTMLTextAreaElement {
  return root.querySelector<HTMLTextAreaElement>(".share-fallback")!;
}

describe("initApp", () => {
  it("renders the transcript and starts with decisions available but flagging disabled", () => {
    initApp(root, sampleTranscript);

    expect(pane().querySelectorAll(".message")).toHaveLength(sampleTranscript.messages.length);
    expect(flagButton().disabled).toBe(true);
    expect(allowButton().disabled).toBe(false);
    expect(blockButton().disabled).toBe(false);
    expect(overlay().hidden).toBe(true);
  });

  it("enables Flag Selection once a valid span is selected", () => {
    initApp(root, sampleTranscript);
    selectSpanInMessage(injection.messageIndex, injection.start, injection.end);

    expect(flagButton().disabled).toBe(false);
  });

  it("flagging the correct span highlights it and does not end the round", () => {
    initApp(root, sampleTranscript);
    selectSpanInMessage(injection.messageIndex, injection.start, injection.end);
    flagButton().click();

    const mark = pane().querySelector(".flag-mark--correct");
    expect(mark).not.toBeNull();
    expect(mark?.textContent?.length).toBeGreaterThan(0);
    expect(overlay().hidden).toBe(true);
    expect(allowButton().disabled).toBe(false);
    expect(blockButton().disabled).toBe(false);
  });

  it("flagging the wrong span shows a 'not quite' state without ending the round", () => {
    initApp(root, sampleTranscript);
    selectSpanInMessage(1, 0, 5);
    flagButton().click();

    const wrongMark = pane().querySelector(".flag-mark--wrong");
    expect(wrongMark).not.toBeNull();
    expect(root.querySelector(".flag-feedback")?.textContent).toMatch(/not quite/i);
    expect(overlay().hidden).toBe(true);
  });

  it("allowing the pending move leaks even if the injection was correctly flagged", () => {
    initApp(root, sampleTranscript);
    selectSpanInMessage(injection.messageIndex, injection.start, injection.end);
    flagButton().click();
    allowButton().click();

    expect(overlay().hidden).toBe(false);
    expect(overlay().dataset.outcome).toBe("LEAKED");
    expect(root.querySelector(".outcome-message")?.textContent).toContain("API_KEY");
    expect(allowButton().disabled).toBe(true);
    expect(blockButton().disabled).toBe(true);
  });

  it("blocking after correctly flagging the injection shows SECURE", () => {
    initApp(root, sampleTranscript);
    selectSpanInMessage(injection.messageIndex, injection.start, injection.end);
    flagButton().click();
    blockButton().click();

    expect(overlay().dataset.outcome).toBe("SECURE");
  });

  it("blocking without ever flagging shows BLOCKED_BLIND", () => {
    initApp(root, sampleTranscript);
    blockButton().click();

    expect(overlay().dataset.outcome).toBe("BLOCKED_BLIND");
  });

  it("Retry resets the round: overlay hides, controls re-enable, marks clear", () => {
    initApp(root, sampleTranscript);
    selectSpanInMessage(injection.messageIndex, injection.start, injection.end);
    flagButton().click();
    allowButton().click();

    root.querySelector<HTMLButtonElement>(".btn--retry")!.click();

    expect(overlay().hidden).toBe(true);
    expect(allowButton().disabled).toBe(false);
    expect(blockButton().disabled).toBe(false);
    expect(flagButton().disabled).toBe(true);
    expect(pane().querySelector(".flag-mark--correct")).toBeNull();
    expect(root.querySelector(".flag-feedback")?.textContent).toBe("");
  });

  it("starts unmuted and toggles the mute button label + aria-pressed on click", () => {
    initApp(root, sampleTranscript);

    expect(muteButton().textContent).toBe("Sound: On");
    expect(muteButton().getAttribute("aria-pressed")).toBe("false");

    muteButton().click();

    expect(muteButton().textContent).toBe("Sound: Off");
    expect(muteButton().getAttribute("aria-pressed")).toBe("true");
  });

  it("persists the mute preference across a fresh initApp call", () => {
    initApp(root, sampleTranscript);
    muteButton().click();

    initApp(root, sampleTranscript);

    expect(muteButton().textContent).toBe("Sound: Off");
  });
});

function streakCount(): string | null | undefined {
  return root.querySelector(".streak-count")?.textContent;
}

describe("initApp — daily persistence", () => {
  it("shows a streak of 0 with no prior history", () => {
    initApp(root, sampleTranscript, { storage: fakeStorage(), puzzleDateKey: "2026-07-09" });
    expect(streakCount()).toBe("0");
  });

  it("increments the visible streak after a SECURE solve", () => {
    const storage = fakeStorage();
    initApp(root, sampleTranscript, { storage, puzzleDateKey: "2026-07-09" });
    selectSpanInMessage(injection.messageIndex, injection.start, injection.end);
    flagButton().click();
    blockButton().click();

    expect(streakCount()).toBe("1");
  });

  it("does not increment the streak on a LEAKED or BLOCKED_BLIND outcome", () => {
    const storage = fakeStorage();
    initApp(root, sampleTranscript, { storage, puzzleDateKey: "2026-07-09" });
    blockButton().click();

    expect(streakCount()).toBe("0");
  });

  it("reloading the same day after a solve shows the already-solved overlay and the prior streak", () => {
    const storage = fakeStorage();
    initApp(root, sampleTranscript, { storage, puzzleDateKey: "2026-07-09" });
    selectSpanInMessage(injection.messageIndex, injection.start, injection.end);
    flagButton().click();
    blockButton().click();

    initApp(root, sampleTranscript, { storage, puzzleDateKey: "2026-07-09" });

    expect(overlay().hidden).toBe(false);
    expect(overlay().dataset.outcome).toBe("SECURE");
    expect(allowButton().disabled).toBe(true);
    expect(blockButton().disabled).toBe(true);
    expect(streakCount()).toBe("1");
  });

  it("requesting a hint highlights the injected message and disables the hint button", () => {
    const storage = fakeStorage();
    initApp(root, sampleTranscript, { storage, puzzleDateKey: "2026-07-09" });
    hintButton().click();

    const hinted = pane().querySelector(
      `.message--hinted .message__content[data-message-index="${injection.messageIndex}"]`,
    );
    expect(hinted).not.toBeNull();
    expect(hintButton().disabled).toBe(true);
    expect(getDailyResult(storage, "2026-07-09")).toEqual({ solved: false, hintUsed: true });
  });

  it("a SECURE solve without using the hint shows the no-hint badge", () => {
    initApp(root, sampleTranscript, { storage: fakeStorage(), puzzleDateKey: "2026-07-09" });
    selectSpanInMessage(injection.messageIndex, injection.start, injection.end);
    flagButton().click();
    blockButton().click();

    expect(noHintBadge().hidden).toBe(false);
  });

  it("a SECURE solve after using the hint hides the no-hint badge", () => {
    initApp(root, sampleTranscript, { storage: fakeStorage(), puzzleDateKey: "2026-07-09" });
    hintButton().click();
    selectSpanInMessage(injection.messageIndex, injection.start, injection.end);
    flagButton().click();
    blockButton().click();

    expect(noHintBadge().hidden).toBe(true);
  });

  it("a LEAKED outcome never shows the no-hint badge", () => {
    initApp(root, sampleTranscript, { storage: fakeStorage(), puzzleDateKey: "2026-07-09" });
    allowButton().click();

    expect(noHintBadge().hidden).toBe(true);
  });

  it("reloading after a hint keeps the hint revealed and the button disabled", () => {
    const storage = fakeStorage();
    initApp(root, sampleTranscript, { storage, puzzleDateKey: "2026-07-09" });
    hintButton().click();

    initApp(root, sampleTranscript, { storage, puzzleDateKey: "2026-07-09" });

    expect(hintButton().disabled).toBe(true);
    const hinted = pane().querySelector(
      `.message--hinted .message__content[data-message-index="${injection.messageIndex}"]`,
    );
    expect(hinted).not.toBeNull();
  });

  it("a SECURE decision shows the run stats and reveals the share button", () => {
    let clock = 1_000_000;
    initApp(root, sampleTranscript, {
      storage: fakeStorage(),
      puzzleDateKey: "2026-07-09",
      now: () => clock,
    });
    selectSpanInMessage(injection.messageIndex, injection.start, injection.end);
    flagButton().click();
    clock += 7_000;
    blockButton().click();

    expect(statsLine().textContent).toBe("Time: 7s · Hints: 0 · Streak: 1");
    expect(shareButton().hidden).toBe(false);
  });

  it("Copy Result copies the share summary via the Clipboard API when available", async () => {
    const writes: string[] = [];
    Object.assign(navigator, { clipboard: { writeText: async (t: string) => void writes.push(t) } });
    initApp(root, sampleTranscript, { storage: fakeStorage(), puzzleDateKey: "2026-07-09" });
    blockButton().click();

    shareButton().click();
    await Promise.resolve();
    await Promise.resolve();

    expect(writes).toHaveLength(1);
    expect(writes[0]).toContain("INJECTION_RANGE 2026-07-09");
    expect(shareFeedback().textContent).toMatch(/copied/i);
    expect(shareFallback().hidden).toBe(true);
  });

  it("Copy Result falls back to a manual-select text field without Clipboard API", async () => {
    Object.assign(navigator, { clipboard: undefined });
    initApp(root, sampleTranscript, { storage: fakeStorage(), puzzleDateKey: "2026-07-09" });
    blockButton().click();

    shareButton().click();
    await Promise.resolve();
    await Promise.resolve();

    expect(shareFallback().hidden).toBe(false);
    expect(shareFallback().value).toContain("INJECTION_RANGE 2026-07-09");
    expect(shareFeedback().textContent).toMatch(/manually/i);
  });

  it("the share summary never contains the injection payload text", () => {
    initApp(root, sampleTranscript, { storage: fakeStorage(), puzzleDateKey: "2026-07-09" });
    allowButton().click();

    expect(statsLine().textContent).not.toContain("API_KEY");
  });

  it("Retry hides the share button and clears the stats line", () => {
    initApp(root, sampleTranscript, { storage: fakeStorage(), puzzleDateKey: "2026-07-09" });
    blockButton().click();
    expect(shareButton().hidden).toBe(false);

    root.querySelector<HTMLButtonElement>(".btn--retry")!.click();

    expect(shareButton().hidden).toBe(true);
  });

  it("a new calendar day starts fresh even after yesterday's solve", () => {
    const storage = fakeStorage();
    initApp(root, sampleTranscript, { storage, puzzleDateKey: "2026-07-09" });
    selectSpanInMessage(injection.messageIndex, injection.start, injection.end);
    flagButton().click();
    blockButton().click();

    initApp(root, sampleTranscript, { storage, puzzleDateKey: "2026-07-10" });

    expect(overlay().hidden).toBe(true);
    expect(allowButton().disabled).toBe(false);
    expect(blockButton().disabled).toBe(false);
  });
});
