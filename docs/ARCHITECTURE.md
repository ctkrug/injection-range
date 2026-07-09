# Architecture

A static, client-side TypeScript app bundled with Vite. No backend, no build-time server code.

## Modules (`src/`)

| Module                 | Responsibility                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `types.ts`             | Shared data shapes: `Transcript`, `TranscriptMessage`, `InjectionSpan`, `NextMove`.                                                                                                                                                                                                                                                                                                                                                                        |
| `sample-transcript.ts` | The one hand-authored transcript that ships today (the wow-moment puzzle). Asserts at module load that its claimed injection text is actually present in the message content it references — a cheap, always-on content-lint for this one transcript until Story 4's real lint script lands.                                                                                                                                                               |
| `render.ts`            | Pure DOM rendering: `renderTranscript(container, transcript)` turns a `Transcript` into role-tagged `<article>` elements. Message content is written via `textContent` only (never `innerHTML`), so an HTML-comment injection payload stays inert text instead of being parsed as markup. Each `.message__content` carries `data-message-index` so a DOM selection inside it can be mapped back to a character offset in `transcript.messages[i].content`. |
| `selection.ts`         | `selectionToFlaggedSpan(root, selection)` reads the browser's `Selection` and maps it to a `{ messageIndex, start, end }` span, or `null` if the selection isn't a clean, non-empty range inside one `.message__content` element within `root`.                                                                                                                                                                                                            |
| `engine.ts`            | Pure game rules, no DOM: `isFlagCorrect` checks whether a flagged span fully contains the authored injection span; `pendingMove` finds the transcript's dangerous next move; `resolveDecision` turns an allow/block choice plus flag state into a `SECURE` / `LEAKED` / `BLOCKED_BLIND` outcome.                                                                                                                                                           |
| `audio.ts`             | `createSoundEngine(storage?)` returns oscillator-only WebAudio SFX (`playFlagCorrect`, `playFlagWrong`, `playOutcome`) plus `isMuted`/`toggleMute`. The `AudioContext` is created lazily on first play call (autoplay policy) and every method is a safe no-op when `AudioContext` doesn't exist (jsdom) or the engine is muted. Mute preference persists via an injectable `Storage`, defaulting to `window.localStorage`.                                |
| `app.ts`               | The DOM controller. `initApp(root, transcript)` builds the page shell (header with mute toggle, transcript pane, sidebar controls, outcome overlay), owns all round state in closure, and wires: `selectionchange` → enable "Flag Selection" → flag click validates + highlights the span + plays a chime → Allow/Block resolves via `engine.ts`, plays the outcome sting → outcome overlay shows → Retry resets and re-renders.                           |
| `transcript-lint.ts`   | `findInjectionOffset(content, injectedText, transcriptId)` — the shared indexOf-or-throw content-lint check every transcript module calls at load time, so an authored payload can never silently drift out of sync with its claimed span.                                                                                                                                                                                                              |
| `transcript-invisible-unicode.ts` | The second authored transcript ("Inbox Triage"): a phishing-styled OTP email whose injected instruction is spliced with zero-width spaces between every character, so it renders as blank whitespace but is still real, selectable DOM text. Second pool entry, second injection technique (Story 4 in progress).                                                                                                                            |
| `pool.ts`              | `transcriptPool` — every authored transcript in one array. Add a transcript by adding it here.                                                                                                                                                                                                                                                                                                                                                            |
| `daily.ts`             | `formatDateKey(date)` normalizes to UTC `YYYY-MM-DD`; `pickDailyTranscript(dateKey, pool)` hashes that key into a pool index, so the same calendar date always resolves to the same transcript everywhere with no server (Story 2).                                                                                                                                                                                                                     |
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
- `tests/sample-transcript.test.ts` — guards the one authored transcript's data shape.

Run everything: `npm test`. Typecheck: `npm run typecheck`. Lint/format: `npm run lint` /
`npm run format:check`.

## Build & deploy

`npm run build` runs `vite build` with `base: "./"` (see `vite.config.ts`) so every emitted
asset path is relative — required because the site is served from a subpath
(`apps.charliekrug.com/injection-range/`), not a domain root. Output goes to `dist/`.

## Not yet built

Everything here is Epic 1's wow moment (Story 1) plus Story 8's span-picking interaction, Story 2's
transcript pool + deterministic daily picker, and a first pass at Story 7's SFX (flag
correct/wrong, allow/block outcome, mute toggle). Not yet implemented: `localStorage` persistence
for streak/result (Story 3), the remaining injection techniques — homoglyph and split-payload —
plus the content-lint build script (Story 4), difficulty rotation (Story 5), hints (Story 6), the
rest of Story 7's juice plan (char-by-char typing animation on new lines, the matrix-lite
falling-glyph win celebration, and splitting the outcome sting into distinct
allow-click/block-click/leak/win sounds per `docs/DESIGN.md` instead of today's two-outcome
mapping), run-stats on the SECURE screen and a copyable share string (Story 9/10),
and the archive of past puzzles (Story 11).
