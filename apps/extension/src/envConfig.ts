import * as vscode from "vscode";
import { promises as fs } from "node:fs";
import * as path from "node:path";

export interface DotEnvCredentials {
  participantId?: string;
  serverUrl?: string;
  apiKey?: string;
  userGroup?: string;
}

/**
 * Same shape as the credentials, with the secrets masked — the output channel
 * is visible to anyone looking over the participant's shoulder, so keys stay
 * out of it while the rest of the config remains debuggable.
 */
export function describeDotEnvCredentials(credentials: DotEnvCredentials): string {
  const masked = (value: string | undefined): string | undefined =>
    value ? `${value.slice(0, 3)}…(${value.length} chars)` : undefined;

  return JSON.stringify({
    ...credentials,
    apiKey: masked(credentials.apiKey),
  });
}

function parseDotEnv(content: string): Record<string, string> {
  const values: Record<string, string> = {};
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const eqIndex = line.indexOf("=");
    if (eqIndex === -1) continue;

    const key = line.slice(0, eqIndex).trim();
    let value = line.slice(eqIndex + 1).trim();
    const isQuoted = (value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"));
    if (isQuoted) value = value.slice(1, -1);

    values[key] = value;
  }
  return values;
}

export interface DotEnvLoadResult {
  credentials: DotEnvCredentials;
  /** Which `.env` the values came from — logged so config surprises are traceable. */
  path: string;
}

/**
 * Where to look for the `.env`, in priority order: every open workspace folder
 * (the repo root, when a participant clones and opens this repo), then the repo
 * root inferred from the extension's own location — `<repo>/apps/extension`
 * resolves to `<repo>`. That last one is what makes F5 work: the Extension
 * Development Host launches with no folder open, so without it the `.env` is
 * invisible and every participant setting silently falls back to defaults.
 */
function candidateRoots(extensionPath: string | undefined): string[] {
  const roots = (vscode.workspace.workspaceFolders ?? []).map((folder) => folder.uri.fsPath);
  if (extensionPath) roots.push(path.resolve(extensionPath, "..", ".."));
  return roots;
}

/**
 * Reads Aida's settings from the repo's `.env` (USER_NAME, SERVER_URL, TOKEN,
 * GROUP) — this file is meant to be pre-filled per participant and
 * committed, so cloning the repo is the entire setup, no commands or settings needed. Returns the first candidate
 * `.env` that actually carries one of these keys, or undefined if none does.
 */
export async function readDotEnvCredentials(extensionPath?: string): Promise<DotEnvLoadResult | undefined> {
  for (const root of candidateRoots(extensionPath)) {
    const filePath = path.join(root, ".env");

    let content: string;
    try {
      content = await fs.readFile(filePath, "utf8");
    } catch {
      continue;
    }

    const values = parseDotEnv(content);
    const credentials: DotEnvCredentials = {
      participantId: values.USER_NAME || undefined,
      serverUrl: values.SERVER_URL || undefined,
      apiKey: values.TOKEN || undefined,
      userGroup: values.GROUP || undefined,
    };

    if (Object.values(credentials).some(Boolean)) return { credentials, path: filePath };
  }

  return undefined;
}
