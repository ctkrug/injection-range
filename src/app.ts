import type { Transcript } from "./types";
import type { FlaggedSpan } from "./selection";
import { renderTranscript } from "./render";
import { selectionToFlaggedSpan } from "./selection";
import { isFlagCorrect, pendingMove, resolveDecision, type Outcome } from "./engine";
import { createSoundEngine } from "./audio";
import { formatDateKey } from "./daily";
import { getDailyResult, getStreak, markHintUsed, recordResult } from "./progress";

export interface AppOptions {
  storage?: Storage;
  puzzleDateKey?: string;
}

const OUTCOME_BANNER: Record<Outcome, string> = {
  SECURE:
    "┌─────────────────────────────────┐\n│  SESSION TERMINATED: SECURE      │\n└─────────────────────────────────┘",
  LEAKED:
    "┌─────────────────────────────────┐\n│  SESSION TERMINATED: LEAKED      │\n└─────────────────────────────────┘",
  BLOCKED_BLIND:
    "┌─────────────────────────────────┐\n│  SESSION TERMINATED: BLIND BLOCK │\n└─────────────────────────────────┘",
};

/**
 * Boots the flag/allow/block game loop into `root` for a single transcript.
 * Owns all mutable game state in closure; call again (or use the Retry
 * button it renders) to start a fresh round.
 */
export function initApp(root: HTMLElement, transcript: Transcript, options: AppOptions = {}): void {
  const storage = options.storage ?? window.localStorage;
  const puzzleDateKey = options.puzzleDateKey ?? formatDateKey(new Date());

  root.innerHTML = "";
  root.appendChild(buildShell(transcript));

  const transcriptPane = root.querySelector<HTMLElement>(".transcript-pane");
  const flagButton = root.querySelector<HTMLButtonElement>(".btn--flag");
  const flagFeedback = root.querySelector<HTMLElement>(".flag-feedback");
  const allowButton = root.querySelector<HTMLButtonElement>(".btn--allow");
  const blockButton = root.querySelector<HTMLButtonElement>(".btn--block");
  const overlay = root.querySelector<HTMLElement>(".outcome-overlay");
  const overlayBanner = root.querySelector<HTMLElement>(".outcome-banner");
  const overlayMessage = root.querySelector<HTMLElement>(".outcome-message");
  const retryButton = root.querySelector<HTMLButtonElement>(".btn--retry");
  const muteButton = root.querySelector<HTMLButtonElement>(".btn--mute");
  const streakCount = root.querySelector<HTMLElement>(".streak-count");
  const hintButton = root.querySelector<HTMLButtonElement>(".btn--hint");
  const hintFeedback = root.querySelector<HTMLElement>(".hint-feedback");
  const noHintBadge = root.querySelector<HTMLElement>(".no-hint-badge");

  if (
    !transcriptPane ||
    !flagButton ||
    !flagFeedback ||
    !allowButton ||
    !blockButton ||
    !overlay ||
    !overlayBanner ||
    !overlayMessage ||
    !retryButton ||
    !muteButton ||
    !streakCount ||
    !hintButton ||
    !hintFeedback ||
    !noHintBadge
  ) {
    throw new Error("app shell is missing an expected control element");
  }

  let candidateSpan: FlaggedSpan | null = null;
  let flaggedSpan: FlaggedSpan | null = null;
  let decided = false;

  const sound = createSoundEngine();
  syncMuteButton(muteButton, sound.isMuted());
  syncStreakDisplay(streakCount, storage);

  renderTranscript(transcriptPane, transcript);

  const todayResult = getDailyResult(storage, puzzleDateKey);
  let hintUsed = todayResult?.hintUsed ?? false;
  if (hintUsed) {
    applyHintReveal(transcriptPane, transcript, true);
    hintButton.disabled = true;
    hintFeedback.textContent = "Hint used — check the highlighted message.";
  }

  if (todayResult?.solved) {
    decided = true;
    flagButton.disabled = true;
    allowButton.disabled = true;
    blockButton.disabled = true;
    hintButton.disabled = true;
    overlayBanner.textContent = OUTCOME_BANNER.SECURE;
    overlayMessage.textContent = "Already solved today's puzzle. Come back tomorrow for a new one.";
    overlay.dataset.outcome = "SECURE";
    overlay.hidden = false;
    syncNoHintBadge(noHintBadge, "SECURE", hintUsed);
  }

  function onSelectionChange(): void {
    if (decided) {
      return;
    }
    candidateSpan = selectionToFlaggedSpan(transcriptPane!, document.getSelection());
    flagButton!.disabled = candidateSpan === null;
  }

  function onFlag(): void {
    if (decided || !candidateSpan) {
      return;
    }
    flaggedSpan = candidateSpan;
    const correct = isFlagCorrect(transcript, flaggedSpan);
    applyHighlight(transcriptPane!, transcript, flaggedSpan, correct, hintUsed);
    flagFeedback!.textContent = correct
      ? "Flagged. That reads like the payload."
      : "Flagged — not quite. Keep looking.";
    flagFeedback!.dataset.tone = correct ? "correct" : "wrong";
    flagButton!.disabled = true;
    if (correct) {
      sound.playFlagCorrect();
    } else {
      sound.playFlagWrong();
    }
  }

  function onDecision(decision: "allow" | "block"): void {
    if (decided) {
      return;
    }
    decided = true;
    const result = resolveDecision(transcript, decision, flaggedSpan);
    flagButton!.disabled = true;
    allowButton!.disabled = true;
    blockButton!.disabled = true;
    hintButton!.disabled = true;
    overlayBanner!.textContent = OUTCOME_BANNER[result.outcome];
    overlayMessage!.textContent = result.message;
    overlay!.dataset.outcome = result.outcome;
    overlay!.hidden = false;
    syncNoHintBadge(noHintBadge!, result.outcome, hintUsed);
    sound.playOutcome(result.outcome);

    recordResult(storage, puzzleDateKey, { solved: result.solved, hintUsed });
    syncStreakDisplay(streakCount!, storage);
  }

  function onHint(): void {
    if (decided || hintUsed) {
      return;
    }
    hintUsed = true;
    markHintUsed(storage, puzzleDateKey);
    applyHintReveal(transcriptPane!, transcript, true);
    hintButton!.disabled = true;
    hintFeedback!.textContent = "Hint used — check the highlighted message.";
  }

  function onMuteToggle(): void {
    syncMuteButton(muteButton!, sound.toggleMute());
  }

  function onRetry(): void {
    candidateSpan = null;
    flaggedSpan = null;
    decided = false;
    overlay!.hidden = true;
    flagFeedback!.textContent = "";
    delete flagFeedback!.dataset.tone;
    flagButton!.disabled = true;
    allowButton!.disabled = false;
    blockButton!.disabled = false;
    renderTranscript(transcriptPane!, transcript);
    applyHintReveal(transcriptPane!, transcript, hintUsed);
  }

  document.addEventListener("selectionchange", onSelectionChange);
  flagButton.addEventListener("click", onFlag);
  allowButton.addEventListener("click", () => onDecision("allow"));
  blockButton.addEventListener("click", () => onDecision("block"));
  retryButton.addEventListener("click", onRetry);
  muteButton.addEventListener("click", onMuteToggle);
  hintButton.addEventListener("click", onHint);
}

function syncMuteButton(button: HTMLButtonElement, muted: boolean): void {
  button.textContent = muted ? "Sound: Off" : "Sound: On";
  button.setAttribute("aria-pressed", String(muted));
}

function syncStreakDisplay(streakCount: HTMLElement, storage: Storage): void {
  streakCount.textContent = String(getStreak(storage));
}

/** Highlights the whole message containing the injection, without revealing the exact span. */
function applyHintReveal(pane: HTMLElement, transcript: Transcript, hinted: boolean): void {
  if (!hinted) {
    return;
  }
  const target = pane.querySelector<HTMLElement>(
    `.message__content[data-message-index="${transcript.injection.messageIndex}"]`,
  );
  target?.closest<HTMLElement>(".message")?.classList.add("message--hinted");
}

function syncNoHintBadge(badge: HTMLElement, outcome: Outcome, hintUsed: boolean): void {
  badge.hidden = !(outcome === "SECURE" && !hintUsed);
}

function buildShell(transcript: Transcript): DocumentFragment {
  const move = pendingMove(transcript);
  const template = document.createElement("template");
  template.innerHTML = `
    <header class="app-header">
      <button type="button" class="btn btn--mute" aria-pressed="false">Sound: On</button>
      <h1 class="wordmark">INJECTION_RANGE<span class="wordmark__caret" aria-hidden="true">█</span></h1>
      <p class="tagline">spot the injected instruction before the agent acts on it</p>
    </header>
    <main class="app-main">
      <section class="transcript-pane" aria-label="Agent transcript"></section>
      <aside class="control-panel">
        <div class="mission-brief">
          <h2>Mission brief</h2>
          <p>Select the text hiding the injected instruction, flag it, then decide: should
          the agent's next move be allowed or blocked?</p>
          <p class="streak-line">Streak: <strong class="streak-count">0</strong> day(s)</p>
        </div>
        <div class="flag-controls">
          <button type="button" class="btn btn--flag" disabled>Flag Selection</button>
          <p class="flag-feedback" role="status" aria-live="polite"></p>
        </div>
        <div class="hint-controls">
          <button type="button" class="btn btn--hint">Use Hint</button>
          <p class="hint-feedback" role="status" aria-live="polite"></p>
        </div>
        <div class="decision-controls">
          <p class="pending-move-label">Pending move</p>
          <p class="pending-move">${escapeHtml(move.label)}</p>
          <div class="decision-buttons">
            <button type="button" class="btn btn--allow">Allow</button>
            <button type="button" class="btn btn--block">Block</button>
          </div>
        </div>
      </aside>
    </main>
    <div class="outcome-overlay" hidden>
      <div class="outcome-card">
        <pre class="outcome-banner"></pre>
        <p class="outcome-message"></p>
        <p class="no-hint-badge" hidden>NO-HINT SOLVE</p>
        <button type="button" class="btn btn--retry">Retry</button>
      </div>
    </div>
  `;
  return template.content;
}

function applyHighlight(
  pane: HTMLElement,
  transcript: Transcript,
  flagged: FlaggedSpan,
  correct: boolean,
  hinted: boolean,
): void {
  renderTranscript(pane, transcript);
  applyHintReveal(pane, transcript, hinted);
  const target = pane.querySelector<HTMLElement>(
    `.message__content[data-message-index="${flagged.messageIndex}"]`,
  );
  if (!target) {
    return;
  }
  const original = target.textContent ?? "";
  const before = original.slice(0, flagged.start);
  const marked = original.slice(flagged.start, flagged.end);
  const after = original.slice(flagged.end);

  const mark = document.createElement("mark");
  mark.className = `flag-mark ${correct ? "flag-mark--correct" : "flag-mark--wrong"}`;
  mark.textContent = marked;

  target.textContent = "";
  target.append(before, mark, after);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
