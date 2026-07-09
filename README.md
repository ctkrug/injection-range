# Injection Range

A daily puzzle built from a realistic AI-agent transcript — tool calls included. Read the
transcript the way you'd review any agent run, find the hidden prompt-injection payload before
the agent acts on it, and decide whether to **allow** or **block** its next move.

## Why

Every other prompt-injection game puts you in the attacker's seat: write the cleverest jailbreak,
see if it works. That's fun once. But the job most people actually have today — reviewing an
agent's tool calls before approving them — is the opposite job: you're the defender, watching a
transcript that's already mid-task, and the payload is already hidden in there somewhere. Injection
Range is built around _that_ seat.

Each puzzle is a full agent loop — system prompt, user ask, assistant reasoning, tool calls, tool
outputs — not a chat bubble. Somewhere in a tool's returned content (a fetched doc, a file read, an
API response) sits an injected instruction the agent wasn't supposed to receive: hidden in an HTML
comment, spelled with invisible unicode, or swapped in via homoglyphs.

**The wow moment:** you watch the agent read a "helpful" file, miss the injected instruction
buried in an HTML comment, click Allow, and immediately watch it leak the secret. You retry — and
this time you actually spot it before it acts.

## How it works

- Everyone gets the same puzzle each day: a date-seeded picker deterministically selects one
  transcript from the pool, so today's payload is identical for every player.
- Read the transcript in the terminal pane: system prompt, user request, the assistant's tool
  call, and the tool's returned content.
- Select the text you think is the injected payload and click **Flag Selection**. A correct flag
  highlights green; a wrong one flashes amber — either way, the round keeps going.
- Stuck? **Use Hint** highlights the message containing the injection (not the exact span) — it
  costs you the "no-hint" badge on the result screen, not your streak.
- Decide the agent's pending next move: **Allow** it or **Block** it.
  - Allow always plays out the payload's intent — the run ends **LEAKED**, naming exactly what
    got exposed.
  - Block after a correct flag ends the run **SECURE** and extends your streak. Block without ever
    finding the payload still stays safe, but doesn't count as a full solve.
- The result screen shows your run stats and a spoiler-free, copyable share summary — falls back
  to a manual-select field if the Clipboard API is unavailable.
- **Retry** resets the round so you can read the same transcript again; today's solved state and
  your streak persist in `localStorage` across reloads.
- Mute the synthesized WebAudio sound effects any time — the preference persists too.

Today's transcript is picked from a small but growing pool covering distinct injection
techniques: hidden in an HTML comment, spelled with invisible unicode, and swapped in via
homoglyphs.

## Planned features

- More injection techniques in the pool: a nested "ignore previous instructions"-style payload,
  and one split across two separate tool outputs.
- Difficulty rotation across the week (easier transcripts favored earlier).
- An archive of past puzzles, playable on demand without affecting the daily streak.

## Stack

TypeScript, built and bundled with [Vite](https://vitejs.dev/), tested with
[Vitest](https://vitest.dev/). Fully static output — no backend, no build-time secrets — so it can
be hosted from any static file host or subpath.

## Developing

```sh
npm install
npm run dev       # local dev server
npm run typecheck # tsc --noEmit
npm test          # vitest
npm run build     # production build to dist/
```

See [`docs/VISION.md`](docs/VISION.md) for the design rationale, [`docs/BACKLOG.md`](docs/BACKLOG.md)
for the build plan, and [`docs/DESIGN.md`](docs/DESIGN.md) for the visual direction.

## License

MIT — see [`LICENSE`](LICENSE).
