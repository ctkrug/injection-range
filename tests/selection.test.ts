import { describe, expect, it } from "vitest";
import { selectionToFlaggedSpan } from "../src/selection";

function buildMessageContent(root: HTMLElement, messageIndex: number, text: string): Text {
  const pre = document.createElement("pre");
  pre.className = "message__content";
  pre.dataset.messageIndex = String(messageIndex);
  const textNode = document.createTextNode(text);
  pre.appendChild(textNode);
  root.appendChild(pre);
  return textNode;
}

// jsdom's Selection only accepts ranges over nodes attached to the live
// document, so every root built by a test must be mounted before selecting.
function mount(root: HTMLElement): void {
  document.body.appendChild(root);
}

function selectRange(textNode: Text, start: number, end: number): void {
  const range = document.createRange();
  range.setStart(textNode, start);
  range.setEnd(textNode, end);
  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
}

describe("selectionToFlaggedSpan", () => {
  it("maps a selection inside message content to its span", () => {
    const root = document.createElement("div");
    const textNode = buildMessageContent(root, 2, "hello dangerous world");
    mount(root);
    selectRange(textNode, 6, 15);

    expect(selectionToFlaggedSpan(root, window.getSelection())).toEqual({
      messageIndex: 2,
      start: 6,
      end: 15,
    });
  });

  it("normalizes a backwards (end-to-start) drag", () => {
    const root = document.createElement("div");
    const textNode = buildMessageContent(root, 0, "abcdefgh");
    mount(root);
    const range = document.createRange();
    range.setStart(textNode, 2);
    range.setEnd(textNode, 5);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);

    expect(selectionToFlaggedSpan(root, selection)).toEqual({ messageIndex: 0, start: 2, end: 5 });
  });

  it("returns null for a collapsed (empty) selection", () => {
    const root = document.createElement("div");
    const textNode = buildMessageContent(root, 0, "abcdefgh");
    mount(root);
    selectRange(textNode, 3, 3);

    expect(selectionToFlaggedSpan(root, window.getSelection())).toBeNull();
  });

  it("returns null when nothing is selected", () => {
    window.getSelection()?.removeAllRanges();
    expect(selectionToFlaggedSpan(document.createElement("div"), window.getSelection())).toBeNull();
  });

  it("returns null for a selection outside message__content", () => {
    const root = document.createElement("div");
    const other = document.createElement("p");
    const textNode = document.createTextNode("not a message");
    other.appendChild(textNode);
    root.appendChild(other);
    mount(root);
    selectRange(textNode, 0, 3);

    expect(selectionToFlaggedSpan(root, window.getSelection())).toBeNull();
  });

  it("returns null for a selection outside the given root", () => {
    const outsideRoot = document.createElement("div");
    const textNode = buildMessageContent(outsideRoot, 0, "abcdefgh");
    mount(outsideRoot);
    selectRange(textNode, 0, 3);

    const unrelatedRoot = document.createElement("div");
    expect(selectionToFlaggedSpan(unrelatedRoot, window.getSelection())).toBeNull();
  });
});
