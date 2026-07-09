/** A player-flagged span of text within one transcript message. */
export interface FlaggedSpan {
  messageIndex: number;
  start: number;
  end: number;
}

/**
 * Maps the browser's current text `Selection` to a `FlaggedSpan`, using the
 * `data-message-index` attribute on the `.message__content` element that
 * owns the selected text node.
 *
 * Returns null for anything that isn't a clean, non-empty selection inside a
 * single message's content (collapsed selection, cross-message selection,
 * selection outside `root`, or selection landing outside message content).
 */
export function selectionToFlaggedSpan(
  root: ParentNode,
  selection: Selection | null,
): FlaggedSpan | null {
  if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
    return null;
  }

  const range = selection.getRangeAt(0);
  const { startContainer, endContainer } = range;

  if (startContainer !== endContainer || startContainer.nodeType !== Node.TEXT_NODE) {
    return null;
  }

  const parent = startContainer.parentElement;
  if (!parent || !parent.classList.contains("message__content") || !root.contains(parent)) {
    return null;
  }

  const messageIndexAttr = parent.getAttribute("data-message-index");
  if (messageIndexAttr === null) {
    return null;
  }

  const start = Math.min(range.startOffset, range.endOffset);
  const end = Math.max(range.startOffset, range.endOffset);
  if (start === end) {
    return null;
  }

  return { messageIndex: Number(messageIndexAttr), start, end };
}
