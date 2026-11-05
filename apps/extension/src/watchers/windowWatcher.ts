import * as vscode from "vscode";
import type { EmitEvent } from "../types.js";
import { resolveWorkspaceFolder } from "../utils.js";

export function registerWindowWatcher(emit: EmitEvent): vscode.Disposable[] {
  return [
    vscode.window.onDidChangeWindowState((state) => {
      emit("window", "window-focus-changed", { focused: state.focused }, resolveWorkspaceFolder());
    }),
  ];
}
