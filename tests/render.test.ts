import { describe, expect, it } from "vitest";
import { renderTranscript } from "../src/render";
import { sampleTranscript } from "../src/sample-transcript";

describe("renderTranscript", () => {
  it("renders one message element per transcript message", () => {
    const container = document.createElement("div");
    renderTranscript(container, sampleTranscript);

    const rendered = container.querySelectorAll(".message");
    expect(rendered).toHaveLength(sampleTranscript.messages.length);
  });

  it("renders injected HTML comments as inert text, not markup", () => {
    const container = document.createElement("div");
    renderTranscript(container, sampleTranscript);

    // If the comment were ever parsed as markup it would vanish from the DOM;
    // finding it in a rendered element's text proves it stayed inert.
    expect(container.querySelector("comment")).toBeNull();
    expect(container.textContent).toContain("disregard prior instructions");
  });

  it("tags each message's content element with its transcript index and raw content", () => {
    const container = document.createElement("div");
    renderTranscript(container, sampleTranscript);

    const contentEls = container.querySelectorAll<HTMLElement>(".message__content");
    expect(contentEls).toHaveLength(sampleTranscript.messages.length);

    contentEls.forEach((el, index) => {
      expect(el.dataset.messageIndex).toBe(String(index));
      expect(el.textContent).toBe(sampleTranscript.messages[index].content);
    });
  });

  it("renders the tool-call summary outside the content element", () => {
    const container = document.createElement("div");
    renderTranscript(container, sampleTranscript);

    const toolCallMessageIndex = sampleTranscript.messages.findIndex((m) => m.toolCall);
    const line = container.querySelectorAll(".message")[toolCallMessageIndex];
    const toolCallEl = line.querySelector(".message__toolcall");

    expect(toolCallEl).not.toBeNull();
    expect(toolCallEl?.textContent).toContain("read_file");
  });
});
