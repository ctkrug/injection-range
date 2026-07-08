import type { Transcript } from "./types";

/**
 * Renders a transcript into `container` as a sequence of role-tagged lines.
 *
 * Message content is set via `textContent`, never `innerHTML` — an
 * HTML-comment injection technique must stay inert as text on the page,
 * exactly as it would in a real terminal transcript, never parsed as markup.
 */
export function renderTranscript(container: HTMLElement, transcript: Transcript): void {
  container.innerHTML = "";
  container.dataset.transcriptId = transcript.id;

  const heading = document.createElement("h1");
  heading.textContent = transcript.title;
  container.appendChild(heading);

  const log = document.createElement("div");
  log.className = "transcript-log";

  for (const message of transcript.messages) {
    const line = document.createElement("article");
    line.className = `message message--${message.role}`;
    line.dataset.role = message.role;

    const roleLabel = document.createElement("span");
    roleLabel.className = "message__role";
    roleLabel.textContent = message.role;
    line.appendChild(roleLabel);

    const body = document.createElement("pre");
    body.className = "message__content";
    body.textContent = message.toolCall
      ? `${message.content}\n→ ${message.toolCall.name}(${JSON.stringify(message.toolCall.args)})`
      : message.content;
    line.appendChild(body);

    log.appendChild(line);
  }

  container.appendChild(log);
}
