import * as vscode from "vscode";

export function resolveWorkspaceFolder(uri?: vscode.Uri): string | null {
  if (uri) {
    const folder = vscode.workspace.getWorkspaceFolder(uri);
    if (folder) return folder.uri.fsPath;
  }
  return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? null;
}

/**
 * Claude Code stores per-project session transcripts under
 * `~/.claude/projects/<encoded-path>/<session-id>.jsonl`, where the encoded
 * path is the project's absolute path with `\`, `/`, and `:` replaced by `-`.
 */
export function encodeClaudeProjectDir(fsPath: string): string {
  return fsPath.replace(/[\\/:]/g, "-");
}

const TRACKABLE_URI_SCHEMES = new Set(["file", "untitled"]);

/**
 * Excludes VS Code's virtual/internal documents (output channels, this
 * extension's own log, Claude Code's diff-preview scheme, git blame views,
 * etc.) from editor instrumentation — only real files on disk or unsaved
 * drafts count as participant activity.
 */
export function isTrackableDocument(uri: vscode.Uri): boolean {
  return TRACKABLE_URI_SCHEMES.has(uri.scheme);
}
