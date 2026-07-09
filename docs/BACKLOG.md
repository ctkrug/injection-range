# Backlog

Epics and stories for v1. Every story ships with concrete, checkable acceptance criteria — no
"works well" vibes. Story 1 is the wow moment and must land before anything else.

## Epic 1 — Core puzzle loop

### [x] Story 1 (wow moment): Read, flag, decide, see the consequence

Render a realistic agent transcript with a hidden prompt-injection payload in a tool output; let
the player flag the suspicious span and choose to allow or block the agent's next move; show the
consequence, then let them retry.

- Loading the puzzle renders at least one tool-call/tool-output message pair, with the injection
  hidden inside an HTML comment in the tool output.
- Clicking "Allow" on the injected next move shows a LEAKED outcome naming what got exposed.
- Flagging the correct span, then clicking "Block", shows a SECURE outcome and marks the puzzle
  solved.

### [x] Story 2: Deterministic daily puzzle

A date-based seed selects today's transcript from the pool so the puzzle changes once per day and
is identical for every player.

- The same calendar date always yields the same transcript id.
- A spread of different calendar dates (checked in a unit test) yields more than one distinct
  transcript id across the pool.

### [ ] Story 3: Streak and daily result persistence

Track today's attempt (solved/failed, hints used) in `localStorage`, keyed by puzzle date.

- Reloading the page on the same day preserves whether today's puzzle was already solved.
- A visible streak counter increments only when the current day's solve is consecutive with the
  previous day's.

## Epic 2 — Injection variety engine

### [ ] Story 4: Four distinct injection techniques

Expand the content pool to cover invisible/zero-width unicode, homoglyph substitution, a nested
"ignore previous instructions"-style instruction inside fetched content, and a payload split across
two separate tool outputs.

- Each technique has at least one authored transcript in the data pool.
- A content-lint script fails the build if any transcript's claimed injection span is not
  literally present in its message content (guards against silent authoring drift).

### [ ] Story 5: Difficulty rotation across the week

Tag each transcript with a difficulty; the daily picker favors easier transcripts earlier in the
week.

- The transcript schema has a required `difficulty` field, validated by the content-lint script.
- A documented Sun–Sat difficulty mapping is covered by a unit test.

### [ ] Story 6: Optional hint

A single hint per puzzle highlights the message containing the injection (not the exact span) and
costs the player their "no-hint" badge.

- Requesting a hint sets a visible "hint used" flag, persisted for that day.
- A puzzle solved after using a hint does not show the no-hint badge on the result screen.

## Epic 3 — Presentation and feel

### [ ] Story 7: Design polish — implement docs/DESIGN.md

Build out the terminal-mono direction end-to-end: tokens, type pairing, CRT scanline texture,
blinking caret, synthesized SFX for keypress/allow/block/leak/win.

- The page matches `docs/DESIGN.md`'s tokens (colors, fonts), verified visually at 390px, 768px,
  and 1440px widths.
- Allow, Block, and Win each trigger a distinct WebAudio-synthesized sound, and a mute toggle
  persists across reloads via `localStorage`.

### [x] Story 8: Span-picking interaction

Let the player select text in the rendered transcript to flag the exact injected span, with a
visible selection highlight validated against the authored span.

- A selection that fully contains the authored payload is accepted even if it's slightly larger
  or smaller than the exact offsets.
- An incorrect selection shows an inline "not quite" state without ending the round.

### [ ] Story 9: Win and leak screens

A LEAKED screen explaining what was exposed and why, and a SECURE screen with run stats (time,
hints used, streak), each with one clear next-action call to action.

- The LEAKED screen names the specific value or data that was exposed in that transcript.
- The SECURE screen shows a shareable text summary, copyable via a button.

## Epic 4 — Sharing and archive

### [ ] Story 10: Shareable result string

Generate a compact, spoiler-free summary of the day's attempt (found the injection? blocked in
time? hint used?) that's copyable to the clipboard.

- The summary string never contains the transcript's actual injection text or tool content.
- The copy button falls back to a manual-select text field when the Clipboard API is unavailable.

### [ ] Story 11: Archive of past puzzles

A list of previous days' transcripts, excluding today, playable on demand without affecting the
daily streak.

- Archive entries older than today are playable and marked "practice"; playing them does not
  change the streak.
- Today's transcript is not listed in the archive until the next day's puzzle rotates in.
