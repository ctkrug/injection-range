/** Minimal shape of the Clipboard API this module depends on. */
export interface ClipboardWriter {
  writeText(text: string): Promise<void>;
}

/**
 * Writes `text` to the clipboard, returning whether it succeeded. Never
 * throws: an unavailable Clipboard API (older browsers, insecure contexts)
 * or a write failure both resolve to `false` so the caller can fall back to
 * a manual-select text field.
 */
export async function copyToClipboard(
  text: string,
  clipboard: ClipboardWriter | undefined = typeof navigator !== "undefined"
    ? navigator.clipboard
    : undefined,
): Promise<boolean> {
  if (!clipboard) {
    return false;
  }
  try {
    await clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
