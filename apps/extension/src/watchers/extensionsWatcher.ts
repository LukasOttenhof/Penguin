import * as vscode from "vscode";
import type { EmitEvent } from "../types.js";
import { resolveWorkspaceFolder } from "../utils.js";

/**
 * `vscode.extensions.onDidChange` carries no payload — it just signals that
 * the set of extensions changed. We diff `vscode.extensions.all` against the
 * last known snapshot to figure out what was actually added/removed
 * (covers install, uninstall, enable, and disable — VS Code doesn't expose
 * which of those specifically happened, only that the set changed).
 */
export function registerExtensionsWatcher(emit: EmitEvent): vscode.Disposable[] {
  let knownIds = new Set(vscode.extensions.all.map((extension) => extension.id));

  return [
    vscode.extensions.onDidChange(() => {
      const currentIds = new Set(vscode.extensions.all.map((extension) => extension.id));

      for (const id of currentIds) {
        if (!knownIds.has(id)) {
          emit("extensions", "extension-added", { extensionId: id }, resolveWorkspaceFolder());
        }
      }
      for (const id of knownIds) {
        if (!currentIds.has(id)) {
          emit("extensions", "extension-removed", { extensionId: id }, resolveWorkspaceFolder());
        }
      }

      knownIds = currentIds;
    }),
  ];
}
