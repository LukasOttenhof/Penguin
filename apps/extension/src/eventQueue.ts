import * as vscode from "vscode";
import { randomUUID } from "node:crypto";
import { getApiKey, getParticipantId, getServerUrl } from "./config.js";
import { uploadEvents } from "./uploader.js";
import type { AidaEvent, EventSource } from "./types.js";

const FLUSH_INTERVAL_MS = 10_000;
const FLUSH_BATCH_SIZE = 50;
const MAX_QUEUE_SIZE = 5000;

export class EventQueue implements vscode.Disposable {
  private readonly pending: AidaEvent[] = [];
  private inFlight: Promise<void> | undefined;
  private readonly timer: ReturnType<typeof setInterval>;
  private readonly machineId = vscode.env.machineId;
  private readonly editorSessionId = vscode.env.sessionId;
  private readonly context: vscode.ExtensionContext;
  private readonly output: vscode.OutputChannel;
  private readonly onStateChange: () => void;

  constructor(context: vscode.ExtensionContext, output: vscode.OutputChannel, onStateChange: () => void) {
    this.context = context;
    this.output = output;
    this.onStateChange = onStateChange;
    this.timer = setInterval(() => void this.flush(), FLUSH_INTERVAL_MS);
  }

  get size(): number {
    return this.pending.length;
  }

  enqueue = (
    source: EventSource,
    type: string,
    data: Record<string, unknown>,
    workspaceFolder: string | null,
  ): void => {
    const event: AidaEvent = {
      id: randomUUID(),
      participantId: getParticipantId() ?? "unassigned",
      machineId: this.machineId,
      editorSessionId: this.editorSessionId,
      workspaceFolder,
      capturedAt: new Date().toISOString(),
      source,
      type,
      data,
    };

    this.pending.push(event);
    if (this.pending.length > MAX_QUEUE_SIZE) {
      const dropped = this.pending.splice(0, this.pending.length - MAX_QUEUE_SIZE);
      this.output.appendLine(`Dropped ${dropped.length} events, queue exceeded ${MAX_QUEUE_SIZE}`);
    }
    this.onStateChange();

    if (this.pending.length >= FLUSH_BATCH_SIZE) {
      void this.flush();
    }
  };

  async flush(): Promise<void> {
    // Wait out a round trip already in progress rather than returning as if the
    // queue had been flushed — on shutdown that difference decides whether the
    // last events make it to the server.
    if (this.inFlight) {
      await this.inFlight;
      return;
    }
    if (this.pending.length === 0) return;

    const serverUrl = getServerUrl();
    if (!serverUrl) return;

    this.inFlight = this.uploadBatch(serverUrl);
    try {
      await this.inFlight;
    } finally {
      this.inFlight = undefined;
    }
  }

  /**
   * Drains everything, one batch per round trip. `flush()` only ever sends the
   * first `FLUSH_BATCH_SIZE` events, so anything queued behind a backlog — a
   * shutdown transcript, say — needs this to actually leave the machine. Stops
   * early if an upload fails or stops making progress, so a dead server can't
   * hold up VS Code's shutdown indefinitely.
   */
  async flushAll(maxBatches = 20): Promise<void> {
    for (let batch = 0; batch < maxBatches && this.pending.length > 0; batch++) {
      const before = this.pending.length;
      await this.flush();
      if (this.pending.length >= before) return;
    }
  }

  private async uploadBatch(serverUrl: string): Promise<void> {
    const batch = this.pending.slice(0, FLUSH_BATCH_SIZE);
    const apiKey = await getApiKey(this.context);
    const result = await uploadEvents(serverUrl, apiKey, batch);
    if (result.ok) {
      this.pending.splice(0, batch.length);
      this.onStateChange();
    } else {
      this.output.appendLine(`Upload failed (${result.status ?? "network"}): ${result.error ?? "unknown error"}`);
    }
  }

  dispose(): void {
    clearInterval(this.timer);
  }
}
