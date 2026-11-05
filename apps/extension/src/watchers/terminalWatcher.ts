import * as vscode from "vscode";
import type { EmitEvent } from "../types.js";
import { resolveWorkspaceFolder } from "../utils.js";

const ERROR_OUTPUT_MAX_LENGTH = 2000;

async function readErrorOutput(execution: vscode.TerminalShellExecution): Promise<string | null> {
  try {
    let output = "";
    for await (const chunk of execution.read()) {
      output += chunk;
      if (output.length >= ERROR_OUTPUT_MAX_LENGTH) break;
    }
    return output.slice(0, ERROR_OUTPUT_MAX_LENGTH) || null;
  } catch {
    return null;
  }
}

export function registerTerminalWatcher(emit: EmitEvent): vscode.Disposable[] {
  const disposables: vscode.Disposable[] = [
    vscode.window.onDidOpenTerminal((terminal) => {
      emit("terminal", "terminal-opened", { name: terminal.name }, resolveWorkspaceFolder());
    }),
    vscode.window.onDidCloseTerminal((terminal) => {
      emit(
        "terminal",
        "terminal-closed",
        { name: terminal.name, exitCode: terminal.exitStatus?.code ?? null },
        resolveWorkspaceFolder(),
      );
    }),
  ];

  // Shell integration events require the shell integration API (stable since VS Code 1.93)
  // and a shell with integration enabled; they silently never fire otherwise.
  disposables.push(
    vscode.window.onDidStartTerminalShellExecution((e) => {
      emit(
        "terminal",
        "command-started",
        { terminalName: e.terminal.name, commandLine: e.execution.commandLine.value },
        resolveWorkspaceFolder(),
      );
    }),
    vscode.window.onDidEndTerminalShellExecution((e) => {
      const exitCode = e.exitCode ?? null;
      const workspaceFolder = resolveWorkspaceFolder();
      const commandLine = e.execution.commandLine.value;
      const terminalName = e.terminal.name;

      if (exitCode) {
        // Only pull the output stream on failure — reading it has a cost and
        // most successful commands' output isn't interesting for this study.
        void readErrorOutput(e.execution).then((errorOutput) => {
          emit("terminal", "command-ended", { terminalName, commandLine, exitCode, errorOutput }, workspaceFolder);
        });
      } else {
        emit("terminal", "command-ended", { terminalName, commandLine, exitCode, errorOutput: null }, workspaceFolder);
      }
    }),
  );

  return disposables;
}
