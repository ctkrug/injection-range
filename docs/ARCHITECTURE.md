# Architecture

A static, client-side TypeScript app bundled with Vite. No backend, no build-time server code.

## Modules (`src/`)

| Module                 | Responsibility                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `types.ts`             | Shared data shapes: `Transcript`, `TranscriptMessage`, `InjectionSpan`, `NextMove`.                                                                                                                                                                                                                                                                                                                                                                        |
| `sample-transcript.ts` | The wow-moment puzzle (html-comment technique): an agent reads a "helpful" setup doc with a payload hidden in an HTML comment.                                                                                                                                                                                                                                                                                                                            |
| `render.ts`            | Pure DOM rendering: `renderTranscript(container, transcript)` turns a `Transcript` into role-tagged `<article>` elements. Message content is written via `textContent` only (never `innerHTML`), so an HTML-comment injection payload stays inert text instead of being parsed as markup. Each `.message__content` carries `data-message-index` so a DOM selection inside it can be mapped back to a character offset in `transcript.messages[i].content`. |
| `selection.ts`         | `selectionToFlaggedSpan(root, selection)` reads the browser's `Selection` and maps it to a `{ messageIndex, start, end }` span, or `null` if the selection isn't a clean, non-empty range inside one `.message__content` element within `root`.                                                                                                                                                                                                            |
| `engine.ts`            | Pure game rules, no DOM: `isFlagCorrect` checks whether a flagged span fully contains the authored injection span; `pendingMove` finds the transcript's dangerous next move; `resolveDecision` turns an allow/block choice plus flag state into a `SECURE` / `LEAKED` / `BLOCKED_BLIND` outcome.                                                                                                                                                           |
| `audio.ts`             | `createSoundEngine(storage?)` returns oscillator-only WebAudio SFX (`playFlagCorrect`, `playFlagWrong`, `playAllowClick`, `playBlockClick`, `playOutcome`) plus `isMuted`/`toggleMute`. The `AudioContext` is created lazily on first play call (autoplay policy) and every method is a safe no-op when `AudioContext` doesn't exist (jsdom) or the engine is muted. Mute preference persists via an injectable `Storage`, defaulting to `window.localStorage`.                                |
| `app.ts`               | The DOM controller. `initApp(root, transcript, { storage?, puzzleDateKey?, now? })` builds the page shell (header with mute toggle, transcript pane, sidebar controls, outcome overlay), owns all round state in closure, and wires: `selectionchange` → enable "Flag Selection" → flag click validates + highlights the span + plays a chime → Allow/Block resolves via `engine.ts`, plays the outcome sting, records the result via `progress.ts`, refreshes the streak, and builds a `share.ts` summary (elapsed time from the injectable `now()` clock) behind a Copy Result button wired to `clipboard.ts` → outcome overlay shows → Retry resets and re-renders. If today's puzzle was already solved (per `progress.ts`), it opens straight into the SECURE overlay with controls locked. |
| `transcript-lint.ts`   | `findInjectionOffset(content, injectedText, transcriptId)` — the shared indexOf-or-throw content-lint check every transcript module calls at load time, so an authored payload can never silently drift out of sync with its claimed span.                                                                                                                                                                                                              |
| `transcript-invisible-unicode.ts` | The second authored transcript ("Inbox Triage", invisible-unicode technique): a phishing-styled OTP email whose injected instruction is spliced with zero-width spaces between every character, so it renders as blank whitespace but is still real, selectable DOM text.                                                                                                                                                                    |
| `transcript-homoglyph.ts` | The third authored transcript ("Bug Report Triage", homoglyph technique): a bug report whose injected instruction swaps common Latin letters for visually-identical Cyrillic lookalikes via a `homoglyphize()` substitution map, evading naive keyword filters while reading as ordinary prose.                                                                                                                                                 |
| `pool.ts`              | `transcriptPool` — every authored transcript in one array (currently 3 of the 4 techniques from Story 4 — html-comment, invisible-unicode, homoglyph; split-payload not yet authored). Add a transcript by adding it here.                                                                                                                                                                                                                              |
| `daily.ts`             | `formatDateKey(date)` normalizes to UTC `YYYY-MM-DD`; `pickDailyTranscript(dateKey, pool)` hashes that key into a pool index, so the same calendar date always resolves to the same transcript everywhere with no server (Story 2).                                                                                                                                                                                                                     |
| `progress.ts`          | `recordResult(storage, dateKey, { solved, hintUsed })` persists today's attempt and updates the streak (consecutive-day solves increment it, a gap resets to 1); `getDailyResult`/`getStreak` read it back. `markHintUsed` upserts just the hint flag without touching `solved` or the streak, so a hint taken mid-round survives a reload before the round is even decided (Story 6). `storage` is always injected (defaults to `window.localStorage` at the `app.ts` call site) so this stays testable without real browser storage (Story 3).                                                                                 |
| `share.ts`             | `buildShareSummary({ dateKeyValue, outcome, hintUsed, elapsedSeconds, streak })` — a compact, spoiler-free result string (outcome label, time, streak) with no transcript content or injection text (Story 10).                                                                                                                                                                                                                                          |
| `clipboard.ts`         | `copyToClipboard(text, clipboard?)` writes to the Clipboard API and resolves `false` (never throws) when it's unavailable or the write is denied, so `app.ts` can fall back to a manual-select textarea.                                                                                                                                                                                                                                                |
| `main.ts`              | Entrypoint: mounts `initApp` on `#app` with `pickDailyTranscript(formatDateKey(new Date()), transcriptPool)`.                                                                                                                                                                                                                                                                                                                                             |
| `style.css`            | Terminal-mono design tokens and all styling — see `docs/DESIGN.md` for the direction these implement.                                                                                                                                                                                                                                                                                                                                                      |

## Data flow

```
sampleTranscript (data)
        │
        ▼
   renderTranscript ──► DOM (.message__content[data-message-index] holds raw text)
        │
        ▼
  user selects text ──► selectionToFlaggedSpan ──► FlaggedSpan | null
        │
        ▼
   Flag click ──► isFlagCorrect ──► highlight (correct/wrong) via re-render + <mark> wrap
        │
        ▼
 Allow/Block click ──► resolveDecision ──► RoundResult { outcome, solved, message }
        │
        ▼
   outcome overlay (SECURE / LEAKED / BLOCKED_BLIND) ──► Retry ──► reset state, re-render
```

`app.ts` re-renders the whole transcript pane from `transcript` data on every flag and on
retry, rather than patching the DOM in place — simplest way to guarantee stale `<mark>` wrappers
never linger, at the cost of losing the browser's native selection (already captured into
`flaggedSpan` before the re-render happens).

## Round outcomes (`engine.ts`)

The transcript's `nextMoves` array holds the dangerous move (what the injection wants) and the
safe alternative. Only the dangerous move is treated as "pending" — that's the action the player
is being asked to approve or block:

- **Allow** the pending move → always `LEAKED`, regardless of whether the injection was ever
  flagged. The outcome message is the move's own `leakDescription`.
- **Block** the pending move after correctly flagging the injection → `SECURE`, `solved: true`.
- **Block** without ever flagging it → `BLOCKED_BLIND` — safe, but not a counted solve.

## Testing

- `tests/engine.test.ts`, `tests/selection.test.ts` — pure-logic unit tests, no DOM assumptions
  beyond jsdom's `Range`/`Selection` (selection tests must mount their DOM under
  `document.body` — jsdom refuses `Selection.addRange` on detached nodes).
- `tests/render.test.ts` — content isolation, message-index tagging, HTML-comment inertness.
- `tests/app.test.ts` — drives the full flag/allow/block loop through real `Range`/`Selection`
  objects and button clicks, asserting on rendered DOM state (button `disabled`, overlay
  `hidden`/`dataset.outcome`, `<mark>` classes).
- `tests/sample-transcript.test.ts`, `tests/transcript-invisible-unicode.test.ts`,
  `tests/transcript-homoglyph.test.ts` — guard each authored transcript's data shape.
- `tests/pool-content-lint.test.ts` — iterates the whole `transcriptPool` and fails if any
  transcript's claimed injection span doesn't round-trip through its message content, or its
  `nextMoves`/`safeMoveId` are inconsistent (Story 4's content-lint requirement). Also runnable
  directly via `npm run lint:content`.
- `tests/daily.test.ts`, `tests/pool.test.ts` — the daily picker's determinism/spread and the
  pool's non-empty/unique-id invariants.
- `tests/progress.test.ts` — `progress.ts`'s date math, persistence, and streak transitions,
  against an in-memory `fakeStorage()` (see `tests/support/fake-storage.ts`).
- `tests/share.test.ts`, `tests/clipboard.test.ts` — the share summary's outcome labels and
  no-spoiler guarantee, and the clipboard write's success/unavailable/rejected paths.

Run everything: `npm test`. Typecheck: `npm run typecheck`. Lint/format: `npm run lint` /
`npm run format:check`.

## Build & deploy

`npm run build` runs `vite build` with `base: "./"` (see `vite.config.ts`) so every emitted
asset path is relative — required because the site is served from a subpath
(`apps.charliekrug.com/injection-range/`), not a domain root. Output goes to `dist/`.

## Not yet built

Epic 1 (wow moment, span-picking, daily picker, streak/persistence, hint) is complete. Also done:
run stats + copyable share summary (Story 9/10), Story 7's stated design ACs (terminal-mono
tokens/layout, and Allow/Block/Win each with a distinct SFX plus a persisted mute toggle), and 3
of Story 4's 4 injection techniques (html-comment, invisible-unicode, homoglyph) with a
pool-wide content-lint test.

Not yet implemented: the split-payload technique (Story 4) — it needs an `InjectionSpan` that can
cover two separate tool-output messages, which is a data-model change deferred to keep this run's
additions low-risk; difficulty rotation (Story 5); the rest of Story 7's juice plan beyond its
stated ACs (char-by-char typing animation on new transcript lines, the matrix-lite falling-glyph
win celebration); and the archive of past puzzles (Story 11).
