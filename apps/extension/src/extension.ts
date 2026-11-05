import * as vscode from "vscode";
import {
  getApiKey,
  getParticipantId,
  getServerUrl,
  getUserGroup,
  setApiKey,
  setParticipantId,
  setServerUrl,
  setUserGroup,
} from "./config.js";
import { describeDotEnvCredentials, readDotEnvCredentials } from "./envConfig.js";
import { EventQueue } from "./eventQueue.js";
import { registerEditorWatcher } from "./watchers/editorWatcher.js";
import { registerFileWatcher } from "./watchers/fileWatcher.js";
import { registerTerminalWatcher } from "./watchers/terminalWatcher.js";
import { registerDebugWatcher } from "./watchers/debugWatcher.js";
import { registerWindowWatcher } from "./watchers/windowWatcher.js";
import { registerExtensionsWatcher } from "./watchers/extensionsWatcher.js";
import { registerClaudeTabWatcher } from "./watchers/claudeTabWatcher.js";
import { ClaudeCodeWatcher } from "./watchers/claudeCodeWatcher.js";
import { resolveWorkspaceFolder } from "./utils.js";

let queue: EventQueue | undefined;
/** Held so `deactivate` can read the tail of the Claude Code transcript. */
let claudeCodeWatcher: ClaudeCodeWatcher | undefined;

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  const output = vscode.window.createOutputChannel("Aida Instrumentation");
  context.subscriptions.push(output);

  const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusBarItem.command = "aida.showStatus";
  context.subscriptions.push(statusBarItem);



  const finishedButton = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 99);
  finishedButton.text = "$(play) Start Session";
  finishedButton.tooltip = "Aida: start this session";
  finishedButton.command = "aida.markFinished";
  finishedButton.show();
  context.subscriptions.push(finishedButton);

  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  output.appendLine(`Aida: workspace folder resolved to: ${workspaceFolder?.uri.fsPath ?? "(none)"}`);

  type SessionState = "not-started" | "active" | "paused";
  let sessionState: SessionState = "not-started";
  try {
    const dotEnv = await readDotEnvCredentials(context.extensionPath);
    const dotEnvCredentials = dotEnv?.credentials;
    output.appendLine(
      dotEnv
        ? `Aida: .env credentials found in ${dotEnv.path}: ${describeDotEnvCredentials(dotEnv.credentials)}`
        : "Aida: no .env credentials found.",
    );
    if (dotEnvCredentials) {
      if (dotEnvCredentials.participantId) {
        await setParticipantId(dotEnvCredentials.participantId, vscode.ConfigurationTarget.Workspace);
      }
      if (dotEnvCredentials.serverUrl) {
        await setServerUrl(dotEnvCredentials.serverUrl, vscode.ConfigurationTarget.Workspace);
      }
      if (dotEnvCredentials.apiKey) {
        await setApiKey(context, dotEnvCredentials.apiKey);
      }
      if (dotEnvCredentials.userGroup) {
        await setUserGroup(dotEnvCredentials.userGroup, vscode.ConfigurationTarget.Workspace);
      }
      output.appendLine("Aida: configuration loaded from workspace .env file.");
    }
  } catch (error) {
    output.appendLine(`Aida: FAILED to load .env configuration: ${String(error)}`);
    void vscode.window.showErrorMessage(`Aida: failed to load .env configuration: ${String(error)}`);
  }

  output.show(true);

  const updateStatusBar = (): void => {
    const participantId = getParticipantId();
    const queued = queue?.size ?? 0;
    statusBarItem.text = `$(pulse) Aida${queued > 0 ? ` (${queued})` : ""}`;
    statusBarItem.tooltip = participantId
      ? `Aida Instrumentation — participant: ${participantId}, queued: ${queued}`
      : "Aida Instrumentation — participant ID not set";
    statusBarItem.backgroundColor = participantId
      ? undefined
      : new vscode.ThemeColor("statusBarItem.warningBackground");
    statusBarItem.show();
  };

  queue = new EventQueue(context, output, updateStatusBar);
  context.subscriptions.push(queue);

  const emit = queue.enqueue;

  context.subscriptions.push(
    ...registerEditorWatcher(emit),
    ...registerFileWatcher(emit),
    ...registerTerminalWatcher(emit),
    ...registerDebugWatcher(emit),
    ...registerWindowWatcher(emit),
    ...registerExtensionsWatcher(emit),
    ...registerClaudeTabWatcher(emit),
    (claudeCodeWatcher = new ClaudeCodeWatcher(context, emit, output)),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("aida.setParticipantId", async () => {
      const id = await vscode.window.showInputBox({
        prompt: "Enter your participant ID for this study",
        value: getParticipantId() ?? "",
        ignoreFocusOut: true,
      });
      if (id) {
        await setParticipantId(id.trim());
        updateStatusBar();
        vscode.window.showInformationMessage(`Aida: participant ID set to "${id.trim()}".`);
      }
    }),
    vscode.commands.registerCommand("aida.setApiKey", async () => {
      const key = await vscode.window.showInputBox({
        prompt: "Enter the API key for the Aida logging server",
        password: true,
        ignoreFocusOut: true,
      });
      if (key) {
        await setApiKey(context, key.trim());
        vscode.window.showInformationMessage("Aida: API key saved.");
      }
    }),
    vscode.commands.registerCommand("aida.markFinished", async () => {
      if (sessionState === "not-started") {
        const confirmed = await vscode.window.showInformationMessage(
          "Start this session? This tells the researchers you're beginning work.",
          { modal: true },
          "Start Session",
        );
        if (confirmed !== "Start Session") return;

        emit("session", "session-started", { startedAt: new Date().toISOString() }, resolveWorkspaceFolder());
        await queue?.flush();
        sessionState = "active";
        finishedButton.text = "$(check) Finished";
        finishedButton.tooltip = "Aida: mark this session as finished";
        updateStatusBar();
        vscode.window.showInformationMessage("Aida: session started.");
      }
      else if (sessionState === "active") {
        const confirmed = await vscode.window.showInformationMessage(
          "Mark this session as finished? This tells the researchers you're done for now.",
          { modal: true },
          "Mark Finished",
        );
        if (confirmed !== "Mark Finished") return;

        emit("session", "session-finished", { finishedAt: new Date().toISOString() }, resolveWorkspaceFolder());
        await queue?.flush();
        sessionState = "paused";
        finishedButton.text = "$(debug-continue) Continue";
        finishedButton.tooltip = "Aida: resume this session";
        updateStatusBar();
        vscode.window.showInformationMessage("Aida: session marked finished. You can close VS Code now.");
      }
      else {
        const confirmed = await vscode.window.showInformationMessage(
          "Continue this session? This tells the researchers you're resuming work.",
          { modal: true },
          "Continue Session",
        );
        if (confirmed !== "Continue Session") return;

        emit("session", "session-resumed", { resumedAt: new Date().toISOString() }, resolveWorkspaceFolder());
        await queue?.flush();
        sessionState = "active";
        finishedButton.text = "$(check) Finished";
        finishedButton.tooltip = "Aida: mark this session as finished";
        updateStatusBar();
        vscode.window.showInformationMessage("Aida: session resumed.");
      }
    }),
    vscode.commands.registerCommand("aida.flushNow", async () => {
      await queue?.flush();
      updateStatusBar();
    }),
    vscode.commands.registerCommand("aida.showStatus", async () => {
      const participantId = getParticipantId();
      const serverUrl = getServerUrl();
      const apiKey = await getApiKey(context);
      output.appendLine("--- Aida Instrumentation status ---");
      output.appendLine(`Participant ID: ${participantId ?? "(not set)"}`);
      output.appendLine(`Server URL: ${serverUrl ?? "(not set)"}`);
      output.appendLine(`API key set: ${apiKey ? "yes" : "no"}`);
      output.appendLine(`User group: ${getUserGroup() ?? "(not set)"}`);
      output.appendLine(`Queued events: ${queue?.size ?? 0}`);
      output.show();
    }),
  );

  if (!getParticipantId()) {
    void vscode.window
      .showWarningMessage("Aida Instrumentation: no participant ID set.", "Set participant ID")
      .then((choice) => {
        if (choice) void vscode.commands.executeCommand("aida.setParticipantId");
      });
  }

  updateStatusBar();
  output.appendLine("Aida Instrumentation activated.");
}

export async function deactivate(): Promise<void> {
  // Read the tail of the Claude Code transcript FIRST. The session's last lines
  // — including the `cost-state` record with its cumulative token totals and
  // totalCostUSD — are usually written in the seconds before the host goes
  // away, after the watcher's final 3s tick. Draining the queue without this
  // read would ship everything except the numbers that matter most.
  await claudeCodeWatcher?.flushNow();
  // Drain everything — a single flush would only take the first batch.
  await queue?.flushAll();
}
