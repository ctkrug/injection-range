# Vision

## The problem

Prompt-injection games put you in the attacker's seat: write the cleverest jailbreak text, see if
it slips past a model. That's a fine warm-up, but it's not the job most people actually have
today. Anyone building or supervising an AI agent spends their time in the _opposite_ seat —
reading a transcript that's already mid-task, where a tool has already returned some content, and
deciding whether it's safe to let the agent act on it. That reviewing skill — spotting an injected
instruction buried in a "helpful" file, a fetched webpage, or an API response — has no casual place
to practice it.

## Who it's for

- Developers and engineers who build or operate AI agents and want a fast, low-stakes way to
  sharpen the "is this tool output safe to act on?" instinct.
- Security-curious people who enjoy daily puzzle games (Wordle, Connections) and want one with
  real technical teeth instead of trivia.

## The core idea

Each day, one realistic agent transcript — system prompt, user request, assistant reasoning, tool
calls, tool outputs, exactly the shape a real agent session takes — is presented in full. Hidden
somewhere in a tool's returned content sits an injected instruction the agent was never supposed to
receive. The player must:

1. Read the transcript like a reviewer would.
2. Flag the exact span of text that is the injected payload.
3. Choose the agent's next move: allow it, or block it.

Get both right and the run ends "SECURE." Miss the payload, or make the wrong call on the next
move, and the run ends "LEAKED" — with a plain accounting of exactly what got exposed and why.

## Key design decisions

- **Data-driven, hand-authored transcripts**, not runtime-generated ones. Injection puzzles must be
  fair and verifiably solvable; generating them fresh from an LLM at play-time risks a payload that
  doesn't parse the way the puzzle claims. A small content-lint check (see backlog) enforces that
  every authored transcript's claimed injection span is actually present in its raw text.
- **One deterministic puzzle per calendar day**, Wordle-style: the same transcript for everyone,
  derived from the date so there's no server and no accounts. An archive lets people play past days
  for practice without touching the daily streak.
- **Injection techniques rotate** — HTML-comment payloads, invisible/zero-width unicode, homoglyph
  substitution, and payloads split across two tool outputs so neither half looks suspicious alone.
  A pool that only ever reworded "ignore previous instructions" would get stale in a week.
- **Fully static and client-side.** TypeScript, bundled with Vite, zero backend. All player state
  (streak, today's result, hint usage, mute preference) lives in `localStorage`. This keeps the
  project deployable to any static host or subpath with no server to run or secure.
- **The tool-call loop is the UI**, not a chat-bubble thread. That structural choice is what
  actually differs from existing prompt-injection games, and it's what matches how real agent
  reviewers spend their time — reading `tool_call` / `tool_output` pairs, not conversational turns.

## What "v1 done" looks like

- The full wow-moment loop is playable start to finish: read the transcript, flag a span, allow or
  block the next move, see the SECURE or LEAKED outcome, retry.
- A deterministic daily puzzle picker draws from a pool of at least four hand-authored transcripts,
  one per injection technique (HTML comment, invisible unicode, homoglyph, split payload).
- Streak and today's solved state persist across reloads; a spoiler-free result string is
  copyable for sharing.
- A small archive of past days is playable without affecting the streak.
- The visual direction in `docs/DESIGN.md` (terminal-mono) is fully implemented: synthesized SFX
  with a persistent mute toggle, responsive layout at phone/tablet/desktop widths, a real favicon
  and wordmark.
- CI is green (typecheck, unit tests, build) on every push.
