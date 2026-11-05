import * as vscode from "vscode";
import { promises as fs } from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import type { EmitEvent } from "../types.js";
import { encodeClaudeProjectDir, resolveWorkspaceFolder } from "../utils.js";

/**
 * Reads the most recently modified Claude Code session transcript for a
 * workspace, raw. There's no direct link between a closed webview tab and a
 * session id, so this assumes the most recently written `.jsonl` file is the
 * one behind the panel that just closed.
 */
async function readLatestChatHistory(workspaceFolder: string | null): Promise<string | null> {
  if (!workspaceFolder) return null;

  const projectDir = path.join(os.homedir(), ".claude", "projects", encodeClaudeProjectDir(workspaceFolder));

  let entries: string[];
  try {
    entries = (await fs.readdir(projectDir)).filter((name) => name.endsWith(".jsonl"));
  } catch {
    return null;
  }
  if (entries.length === 0) return null;

  const withStats = await Promise.all(
    entries.map(async (name) => {
      const filePath = path.join(projectDir, name);
      const stat = await fs.stat(filePath);
      return { filePath, mtimeMs: stat.mtimeMs };
    }),
  );
  withStats.sort((a, b) => b.mtimeMs - a.mtimeMs);

  try {
    return await fs.readFile(withStats[0].filePath, "utf8");
  } catch {
    return null;
  }
}

/**
 * Best-effort: detects Claude Code's chat panel closing via the Tabs API.
 * VS Code exposes closed webview tabs with a `viewType` identifier, but the
 * exact string Claude Code's extension registers isn't confirmed from this
 * environment — this matches any closed webview tab whose viewType contains
 * "claude" (case-insensitive). Verify against real data (the emitted event
 * includes the raw viewType) and narrow the filter if it doesn't fire when
 * expected, or fires on the wrong panel.
 */
export function registerClaudeTabWatcher(emit: EmitEvent): vscode.Disposable[] {
  return [
    vscode.window.tabGroups.onDidChangeTabs((e) => {
      for (const tab of e.closed) {
        if (!(tab.input instanceof vscode.TabInputWebview)) continue;
        const viewType = tab.input.viewType;
        if (!viewType.toLowerCase().includes("claude")) continue;

        const workspaceFolder = resolveWorkspaceFolder();
        void readLatestChatHistory(workspaceFolder).then((chatHistory) => {
          emit(
            "window",
            "claude-chat-tab-closed",
            { viewType, tabLabel: tab.label, "chat-history": chatHistory },
            workspaceFolder,
          );
        });
      }
    }),
  ];
}
