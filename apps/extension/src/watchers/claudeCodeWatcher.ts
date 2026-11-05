import * as vscode from "vscode";
import { promises as fs } from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import type { EmitEvent } from "../types.js";
import { encodeClaudeProjectDir } from "../utils.js";

const POLL_INTERVAL_MS = 3000;
const OFFSETS_STATE_KEY = "aida.claudeCode.fileOffsets";

interface TrackedFile {
  offset: number;
  remainder: string;
}

interface ProjectDir {
  workspaceFolder: string;
  dir: string;
}

/**
 * Tails Claude Code's per-project JSONL transcripts
 * (`~/.claude/projects/<encoded-workspace-path>/<session-id>.jsonl`) and emits
 * each new line as an event, tagged with the current participant/workspace.
 * Read offsets persist in globalState so a reload resumes instead of
 * re-emitting history already captured.
 *
 * The walk is recursive: subagent transcripts live one level down, at
 * `<session-id>/subagents/<agent-id>.jsonl`, and carry their own `usage` on
 * every assistant entry. A non-recursive listing silently drops all of them,
 * which understates a session's real token spend by however much work was
 * delegated. Those arrive with `sessionFile` flattened to
 * `<session-id>_subagents_<agent-id>.jsonl`; entries also carry `isSidechain`.
 */
export class ClaudeCodeWatcher implements vscode.Disposable {
  private readonly timer: ReturnType<typeof setInterval>;
  private readonly tracked = new Map<string, TrackedFile>();
  private readonly projectDirs: ProjectDir[];
  private readonly context: vscode.ExtensionContext;
  private readonly emit: EmitEvent;
  private readonly output: vscode.OutputChannel;

  constructor(context: vscode.ExtensionContext, emit: EmitEvent, output: vscode.OutputChannel) {
    this.context = context;
    this.emit = emit;
    this.output = output;

    const claudeProjectsRoot = path.join(os.homedir(), ".claude", "projects");
    this.projectDirs = (vscode.workspace.workspaceFolders ?? []).map((folder) => ({
      workspaceFolder: folder.uri.fsPath,
      dir: path.join(claudeProjectsRoot, encodeClaudeProjectDir(folder.uri.fsPath)),
    }));

    const savedOffsets = context.globalState.get<Record<string, number>>(OFFSETS_STATE_KEY, {});
    for (const [file, offset] of Object.entries(savedOffsets)) {
      this.tracked.set(file, { offset, remainder: "" });
    }

    this.timer = setInterval(() => void this.poll(), POLL_INTERVAL_MS);
    void this.poll();
  }

  private async poll(): Promise<void> {
    for (const { workspaceFolder, dir } of this.projectDirs) {
      let entries: string[];
      try {
        entries = (await fs.readdir(dir, { recursive: true })).filter((name) => name.endsWith(".jsonl"));
      } catch {
        continue;
      }

      for (const entry of entries) {
        // `entry` is relative to `dir`. Flatten its separators to "_" so
        // sessionFile stays a plain filename — a subagent transcript arrives as
        // `<session-id>_subagents_<agent-id>.jsonl`, which keeps the parent
        // session id (needed to attribute a subagent's tokens back to the
        // session that spawned it) without forcing consumers to create nested
        // directories. Session ids contain "-", never "_", so splitting on
        // "_subagents_" recovers both halves unambiguously.
        await this.readNewLines(path.join(dir, entry), entry.split(path.sep).join("_"), workspaceFolder);
      }
    }

    await this.persistOffsets();
  }

  private async readNewLines(filePath: string, sessionFile: string, workspaceFolder: string): Promise<void> {
    let stat;
    try {
      stat = await fs.stat(filePath);
    } catch {
      return;
    }

    const tracked = this.tracked.get(filePath) ?? { offset: 0, remainder: "" };
    if (stat.size <= tracked.offset) {
      this.tracked.set(filePath, tracked);
      return;
    }

    let handle: fs.FileHandle | undefined;
    try {
      handle = await fs.open(filePath, "r");
      const length = stat.size - tracked.offset;
      const buffer = Buffer.alloc(length);
      await handle.read(buffer, 0, length, tracked.offset);

      const chunk = tracked.remainder + buffer.toString("utf8");
      const lines = chunk.split("\n");
      tracked.remainder = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.trim()) continue;
        this.emitLine(line, sessionFile, workspaceFolder);
      }

      tracked.offset = stat.size;
      this.tracked.set(filePath, tracked);
    } finally {
      await handle?.close();
    }
  }

  private emitLine(line: string, sessionFile: string, workspaceFolder: string): void {
    try {
      const entry: unknown = JSON.parse(line);
      const entryType =
        typeof entry === "object" && entry !== null && "type" in entry && typeof entry.type === "string"
          ? entry.type
          : undefined;
      this.emit(
        "claude-code",
        entryType ? `transcript-${entryType}` : "transcript-entry",
        { sessionFile, entry },
        workspaceFolder,
      );
    } catch (error) {
      this.output.appendLine(`Failed to parse Claude Code JSONL line in ${sessionFile}: ${String(error)}`);
    }
  }

  private async persistOffsets(): Promise<void> {
    const offsets: Record<string, number> = {};
    for (const [file, tracked] of this.tracked.entries()) {
      offsets[file] = tracked.offset;
    }
    await this.context.globalState.update(OFFSETS_STATE_KEY, offsets);
  }

  /**
   * Stop polling, then read once more.
   *
   * Claude Code writes its `cost-state` record — the session's cumulative
   * per-model token totals and `totalCostUSD`, subagents included — as the
   * session ends. On a plain `dispose()` the interval is cleared and that last
   * write is never read, so it is never even queued and `flushAll()` has
   * nothing to send. Awaiting a final poll during deactivation is what gets the
   * tail of the transcript off the machine.
   */
  async flushNow(): Promise<void> {
    clearInterval(this.timer);
    await this.poll();
  }

  dispose(): void {
    clearInterval(this.timer);
  }
}
