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
comment, spelled with invisible unicode, swapped in via homoglyphs, or split across two outputs so
neither half looks suspicious alone.

**The wow moment:** you watch the agent read a "helpful" file, miss the injected instruction
buried in an HTML comment, click Allow, and immediately watch it leak the secret. You retry — and
this time you actually spot it before it acts.

## How it works

- Read the transcript in the terminal pane: system prompt, user request, the assistant's tool
  call, and the tool's returned content.
- Select the text you think is the injected payload and click **Flag Selection**. A correct flag
  highlights green; a wrong one flashes amber — either way, the round keeps going.
- Decide the agent's pending next move: **Allow** it or **Block** it.
  - Allow always plays out the payload's intent — the run ends **LEAKED**, naming exactly what
    got exposed.
  - Block after a correct flag ends the run **SECURE**. Block without ever finding the payload
    still stays safe, but doesn't count as a full solve.
- **Retry** resets the round so you can read the same transcript again.

## Planned features

- Daily deterministic puzzle (date-seeded, same transcript for everyone) + streak tracking in
  `localStorage` — currently every session plays the same one hand-authored transcript.
- A pool of hand-authored transcripts spanning multiple injection techniques (invisible unicode,
  homoglyphs, nested "ignore previous instructions" text, split/obfuscated payloads)
- Optional single hint per puzzle (costs your no-hint badge, not your streak)
- Synthesized WebAudio sound effects with a persistent mute toggle
- Spoiler-free shareable result string
- Archive of past puzzles for untimed practice

## Stack

TypeScript, built and bundled with [Vite](https://vitejs.dev/), tested with
[Vitest](https://vitest.dev/). Fully static output — no backend, no build-time secrets — so it can
be hosted from any static file host or subpath.

## Developing

```sh
npm install
npm run dev        # local dev server
npm run typecheck   # tsc --noEmit
npm test            # vitest
npm run build        # production build to dist/
```

See [`docs/VISION.md`](docs/VISION.md) for the design rationale, [`docs/BACKLOG.md`](docs/BACKLOG.md)
for the build plan, and [`docs/DESIGN.md`](docs/DESIGN.md) for the visual direction.

## License

MIT — see [`LICENSE`](LICENSE).
