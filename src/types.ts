export type Role = "system" | "user" | "assistant" | "tool";

export interface ToolCall {
  id: string;
  name: string;
  args: Record<string, string>;
}

export interface TranscriptMessage {
  role: Role;
  /** Present on assistant messages that invoke a tool. */
  toolCall?: ToolCall;
  /** Present on tool messages: which tool call this output answers. */
  toolCallId?: string;
  content: string;
}

export type InjectionTechnique =
  | "html-comment"
  | "invisible-unicode"
  | "homoglyph"
  | "split-payload";

export interface InjectionSpan {
  /** Index into `Transcript.messages` of the message carrying the payload. */
  messageIndex: number;
  /** Character offsets into that message's `content`. */
  start: number;
  end: number;
  technique: InjectionTechnique;
}

export interface NextMove {
  id: string;
  label: string;
  /** True if allowing this move is what the injected payload wants. */
  isDangerous: boolean;
  /** Shown to the player when a dangerous move is allowed. */
  leakDescription: string;
}

export interface Transcript {
  id: string;
  title: string;
  difficulty: "easy" | "medium" | "hard";
  messages: TranscriptMessage[];
  injection: InjectionSpan;
  nextMoves: NextMove[];
  /** id of the move in `nextMoves` that is safe to allow. */
  safeMoveId: string;
}
