import * as vscode from "vscode";
import type { EmitEvent } from "../types.js";
import { resolveWorkspaceFolder } from "../utils.js";

export function registerDebugWatcher(emit: EmitEvent): vscode.Disposable[] {
  return [
    vscode.debug.onDidStartDebugSession((session) => {
      emit("debug", "session-started", { type: session.type, name: session.name }, resolveWorkspaceFolder());
    }),
    vscode.debug.onDidTerminateDebugSession((session) => {
      emit("debug", "session-terminated", { type: session.type, name: session.name }, resolveWorkspaceFolder());
    }),
    vscode.debug.onDidChangeBreakpoints((e) => {
      emit(
        "debug",
        "breakpoints-changed",
        { added: e.added.length, removed: e.removed.length, changed: e.changed.length },
        resolveWorkspaceFolder(),
      );
    }),
  ];
}
