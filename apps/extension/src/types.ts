export const EVENT_SOURCES = [
  "editor",
  "file",
  "terminal",
  "debug",
  "claude-code",
  "window",
  "extensions",
  "session",
] as const;
export type EventSource = (typeof EVENT_SOURCES)[number];

export interface AidaEvent {
  id: string;
  participantId: string;
  machineId: string;
  editorSessionId: string;
  workspaceFolder: string | null;
  capturedAt: string;
  source: EventSource;
  type: string;
  data: Record<string, unknown>;
}

export type EmitEvent = (
  source: EventSource,
  type: string,
  data: Record<string, unknown>,
  workspaceFolder: string | null,
) => void;