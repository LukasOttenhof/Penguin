import * as vscode from "vscode";
import type { EmitEvent } from "../types.js";
import { isTrackableDocument, resolveWorkspaceFolder } from "../utils.js";

export function registerEditorWatcher(emit: EmitEvent): vscode.Disposable[] {
  return [
    vscode.workspace.onDidOpenTextDocument((doc) => {
      if (!isTrackableDocument(doc.uri)) return;
      emit(
        "editor",
        "document-opened",
        { uri: doc.uri.toString(), languageId: doc.languageId },
        resolveWorkspaceFolder(doc.uri),
      );
    }),
    vscode.workspace.onDidCloseTextDocument((doc) => {
      if (!isTrackableDocument(doc.uri)) return;
      emit(
        "editor",
        "document-closed",
        { uri: doc.uri.toString(), languageId: doc.languageId },
        resolveWorkspaceFolder(doc.uri),
      );
    }),
    vscode.workspace.onDidSaveTextDocument((doc) => {
      if (!isTrackableDocument(doc.uri)) return;
      emit(
        "editor",
        "document-saved",
        { uri: doc.uri.toString(), languageId: doc.languageId },
        resolveWorkspaceFolder(doc.uri),
      );
    }),
    vscode.workspace.onDidChangeTextDocument((e) => {
      if (e.contentChanges.length === 0 || !isTrackableDocument(e.document.uri)) return;
      const linesAdded = e.contentChanges.reduce((sum, c) => sum + (c.text.split("\n").length - 1), 0);
      const linesRemoved = e.contentChanges.reduce((sum, c) => sum + (c.range.end.line - c.range.start.line), 0);
      emit(
        "editor",
        "text-changed",
        {
          uri: e.document.uri.toString(),
          languageId: e.document.languageId,
          changeCount: e.contentChanges.length,
          linesAdded,
          linesRemoved,
        },
        resolveWorkspaceFolder(e.document.uri),
      );
    }),
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      if (!editor || !isTrackableDocument(editor.document.uri)) return;
      emit(
        "editor",
        "active-editor-changed",
        { uri: editor.document.uri.toString(), languageId: editor.document.languageId },
        resolveWorkspaceFolder(editor.document.uri),
      );
    }),
    vscode.window.onDidChangeTextEditorSelection((e) => {
      if (!isTrackableDocument(e.textEditor.document.uri)) return;
      const primary = e.selections[0];
      emit(
        "editor",
        "selection-changed",
        {
          uri: e.textEditor.document.uri.toString(),
          selectionCount: e.selections.length,
          startLine: primary.start.line,
          endLine: primary.end.line,
        },
        resolveWorkspaceFolder(e.textEditor.document.uri),
      );
    }),
  ];
}
