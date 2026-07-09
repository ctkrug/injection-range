/**
 * Locates a claimed injection payload inside its message content and throws
 * if it isn't literally present — a cheap, always-on content-lint so an
 * authored transcript can never silently drift out of sync with its own
 * injection span. Story 4's real lint script runs this across the whole
 * pool at build time; today each transcript module calls it at load time.
 */
export function findInjectionOffset(
  content: string,
  injectedText: string,
  transcriptId: string,
): number {
  const offset = content.indexOf(injectedText);
  if (offset === -1) {
    throw new Error(`transcript "${transcriptId}" injection marker not found in source content`);
  }
  return offset;
}
