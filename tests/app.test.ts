import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { initApp } from "../src/app";
import { sampleTranscript } from "../src/sample-transcript";

const { injection } = sampleTranscript;

let root: HTMLElement;

beforeEach(() => {
  root = document.createElement("div");
  document.body.appendChild(root);
});

afterEach(() => {
  document.getSelection()?.removeAllRanges();
  root.remove();
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
});
