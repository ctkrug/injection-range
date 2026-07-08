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
});
