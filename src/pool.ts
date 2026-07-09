import type { Transcript } from "./types";
import { sampleTranscript } from "./sample-transcript";
import { invisibleUnicodeTranscript } from "./transcript-invisible-unicode";
import { homoglyphTranscript } from "./transcript-homoglyph";

/** Every authored transcript, in authoring order. The daily picker (`daily.ts`) selects from this. */
export const transcriptPool: readonly Transcript[] = [
  sampleTranscript,
  invisibleUnicodeTranscript,
  homoglyphTranscript,
];
