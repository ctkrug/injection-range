# Design

## Aesthetic direction

**Injection Range is terminal-mono:** a black-glass CRT terminal replaying a real agent session —
faint scanlines, a blinking block caret, phosphor-green success states and a red-alarm klaxon for
a leak. It should feel like watching `tail -f` on someone else's agent right before it does
something it shouldn't.

This is a deliberately different flavor of dark theme from generic "dark gray cards + one accent":
it commits to a CRT bezel, a monospace-only type system, and diegetic terminal chrome (prompts,
banners, ASCII box-drawing) rather than card-and-icon UI.

## Tokens

| Token | Value | Use |
| --- | --- | --- |
| `--color-bg` | `#0b0f0d` | Page background — near-black with a faint green tint |
| `--color-surface-1` | `#101613` | Message/panel background |
| `--color-surface-2` | `#172019` | Borders, raised panel edges |
| `--color-text` | `#d8f5df` | Primary text |
| `--color-text-muted` | `#7fa88c` | Role labels, secondary text |
| `--color-accent` | `#39ff88` | Phosphor green — success, focus, primary actions |
| `--color-support` | `#ffb454` | Amber — warnings, hints, wrong-selection flash |
| `--color-danger` | `#ff5470` | Red-pink — leak/alarm states |

- **Type pairing:** `JetBrains Mono` (display — wordmark, headings, banners) + `IBM Plex Mono` (UI
  — body text, transcript content), both with a `ui-monospace, monospace` system fallback stack.
- **Spacing:** 8px unit scale — 8 / 16 / 24 / 32 / 48 / 64.
- **Corner radius:** 2px. Sharp, terminal-like — never soft/rounded.
- **Shadow/glow:** a soft green glow (`0 0 12px rgba(57, 255, 136, 0.25)`) on focused/active
  elements; a subtle inset shadow suggesting a terminal bezel around the transcript pane.
- **Motion:** UI transitions 160ms ease-out; game-feedback motion (flag/allow/block) 90ms
  ease-out; the caret blinks on a 1s step interval.

## Layout intent

The **hero is the transcript pane itself** — a scrolling terminal window rendering the
system/user/assistant/tool message sequence. On desktop (1440×900) it takes roughly 65% of the
width, with a right-hand sidebar (~35%) holding the mission brief, the allow/block controls, hint
button, and mute toggle. On phone (390×844) the terminal stacks full-width on top and the controls
collapse into a sticky action bar at the bottom so the primary interaction never scrolls out of
reach. The page background carries the CRT scanline + vignette texture edge-to-edge — no dead flat
color fills the chrome around the terminal.

## Signature detail

An animated blinking block-caret wordmark in the header — `INJECTION_RANGE█` — where the caret
blinks like a live terminal prompt. The SECURE win screen renders a fake
`session terminated: SECURE` banner in ASCII box-drawing characters; the LEAKED screen mirrors it
with a red `session terminated: LEAKED` banner.

## Juice plan (games/toys requirement)

- **Movement/tween:** newly-revealed tool-call and tool-output lines type on with a fast
  char-by-char terminal-typing animation (~12ms/char), skippable on click.
- **Impact feedback:** selecting the wrong span flashes that line amber, then shakes it ~2px
  twice.
- **Goal feedback:** selecting the correct span highlights it green with a brief pulse.
- **Win celebration:** a green flood transition into the `SECURE` ASCII banner, with falling green
  `0`/`1` glyphs (matrix-lite, respects `prefers-reduced-motion` by dropping the fall and keeping
  the banner).
- **Synth SFX (WebAudio, generated in code — no audio files):**
  - typing tick — short square-wave blip, per character batch (rate-throttled, not per char)
  - span-select confirm — rising two-tone blip
  - wrong-selection buzz — short low sawtooth buzz
  - allow-click — soft click
  - block-click — sharper, higher click
  - leak/fail — descending three-note alarm
  - win — ascending three-note major arpeggio chime
  - a mute toggle persists its state in `localStorage` and the `AudioContext` is created lazily on
    first user gesture, guarded for environments where WebAudio is unavailable (tests, some
    embedded webviews).

Every later build and QA pass follows this file. Changes to it happen deliberately, in their own
commit, with the reason stated in the commit body.
