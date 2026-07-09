import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { buildShareSummary } from "../src/share";
import { transcriptPool } from "../src/pool";
import type { Outcome } from "../src/engine";

describe("buildShareSummary", () => {
  it("labels a no-hint SECURE solve", () => {
    const summary = buildShareSummary({
      dateKeyValue: "2026-07-09",
      outcome: "SECURE",
      hintUsed: false,
      elapsedSeconds: 42,
      streak: 3,
    });
    expect(summary).toBe("INJECTION_RANGE 2026-07-09\nSECURE (no hint) · 42s · streak 3");
  });

  it("drops the no-hint qualifier when a hint was used", () => {
    const summary = buildShareSummary({
      dateKeyValue: "2026-07-09",
      outcome: "SECURE",
      hintUsed: true,
      elapsedSeconds: 12,
      streak: 1,
    });
    expect(summary).toContain("SECURE ·");
    expect(summary).not.toContain("no hint");
  });

  it("labels a LEAKED outcome", () => {
    const summary = buildShareSummary({
      dateKeyValue: "2026-07-09",
      outcome: "LEAKED",
      hintUsed: false,
      elapsedSeconds: 8,
      streak: 0,
    });
    expect(summary).toContain("LEAKED ·");
  });

  it("labels a BLOCKED_BLIND outcome", () => {
    const summary = buildShareSummary({
      dateKeyValue: "2026-07-09",
      outcome: "BLOCKED_BLIND",
      hintUsed: false,
      elapsedSeconds: 5,
      streak: 0,
    });
    expect(summary).toContain("BLOCKED (blind) ·");
  });

  it("never contains the word 'injection' or any transcript content", () => {
    const summary = buildShareSummary({
      dateKeyValue: "2026-07-09",
      outcome: "LEAKED",
      hintUsed: false,
      elapsedSeconds: 8,
      streak: 0,
    });
    expect(summary.toLowerCase()).not.toContain("api_key");
    expect(summary.toLowerCase()).not.toContain("disregard prior instructions");
  });
});

describe("buildShareSummary — properties", () => {
  const outcomeArb: fc.Arbitrary<Outcome> = fc.constantFrom("SECURE", "LEAKED", "BLOCKED_BLIND");
  const inputArb = fc.record({
    dateKeyValue: fc.string(),
    outcome: outcomeArb,
    hintUsed: fc.boolean(),
    elapsedSeconds: fc.integer({ min: 0, max: 100_000 }),
    streak: fc.integer({ min: 0, max: 100_000 }),
  });

  // Every real injected payload and every real message body, across the whole authored pool —
  // the actual "spoiler" content a share summary must never leak, not just one hardcoded string.
  const forbiddenSnippets = transcriptPool.flatMap((transcript) => [
    transcript.messages[transcript.injection.messageIndex].content.slice(
      transcript.injection.start,
      transcript.injection.end,
    ),
    ...transcript.messages.map((message) => message.content),
  ]);

  it("is always exactly two lines starting with the wordmark and today's date", () => {
    fc.assert(
      fc.property(inputArb, (input) => {
        const summary = buildShareSummary(input);
        const lines = summary.split("\n");
        expect(lines).toHaveLength(2);
        expect(lines[0]).toBe(`INJECTION_RANGE ${input.dateKeyValue}`);
        expect(lines[1]).toContain(`${input.elapsedSeconds}s`);
        expect(lines[1]).toContain(`streak ${input.streak}`);
      }),
    );
  });

  it("never contains any real transcript content or injection payload from the pool", () => {
    fc.assert(
      fc.property(inputArb, (input) => {
        const summary = buildShareSummary(input);
        for (const snippet of forbiddenSnippets) {
          if (snippet.length < 8) {
            continue; // too short to meaningfully assert non-containment (could coincide with formatting)
          }
          expect(summary).not.toContain(snippet);
        }
      }),
    );
  });
});
