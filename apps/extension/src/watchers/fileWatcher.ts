import * as vscode from "vscode";
import type { EmitEvent } from "../types.js";
import { resolveWorkspaceFolder } from "../utils.js";

export function registerFileWatcher(emit: EmitEvent): vscode.Disposable[] {
  return [
    vscode.workspace.onDidCreateFiles((e) => {
      for (const uri of e.files) {
        emit("file", "file-created", { uri: uri.toString() }, resolveWorkspaceFolder(uri));
      }
    }),
    vscode.workspace.onDidDeleteFiles((e) => {
      for (const uri of e.files) {
        emit("file", "file-deleted", { uri: uri.toString() }, resolveWorkspaceFolder(uri));
      }
    }),
    vscode.workspace.onDidRenameFiles((e) => {
      for (const { oldUri, newUri } of e.files) {
        emit(
          "file",
          "file-renamed",
          { oldUri: oldUri.toString(), newUri: newUri.toString() },
          resolveWorkspaceFolder(newUri),
        );
      }
    }),
  ];
}
