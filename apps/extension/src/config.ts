import * as vscode from "vscode";

const SECTION = "aida";
const API_KEY_SECRET = "aida.apiKey";

export function getServerUrl(): string | undefined {
  const url = vscode.workspace.getConfiguration(SECTION).get<string>("serverUrl", "").trim();
  return url.length > 0 ? url.replace(/\/+$/, "") : undefined;
}

export function getParticipantId(): string | undefined {
  const id = vscode.workspace.getConfiguration(SECTION).get<string>("participantId", "").trim();
  return id.length > 0 ? id : undefined;
}

export async function setParticipantId(
  id: string,
  target: vscode.ConfigurationTarget = vscode.ConfigurationTarget.Global,
): Promise<void> {
  await vscode.workspace.getConfiguration(SECTION).update("participantId", id, target);
}

export async function setServerUrl(
  url: string,
  target: vscode.ConfigurationTarget = vscode.ConfigurationTarget.Global,
): Promise<void> {
  await vscode.workspace.getConfiguration(SECTION).update("serverUrl", url, target);
}

export async function getApiKey(context: vscode.ExtensionContext): Promise<string | undefined> {
  return context.secrets.get(API_KEY_SECRET);
}

export async function setApiKey(context: vscode.ExtensionContext, key: string): Promise<void> {
  await context.secrets.store(API_KEY_SECRET, key);
}

export function getUserGroup(): string | undefined {
  const value = vscode.workspace.getConfiguration(SECTION).get<string>("userGroup", "").trim();
  return value.length > 0 ? value : undefined;
}

export async function setUserGroup(
  group: string,
  target: vscode.ConfigurationTarget = vscode.ConfigurationTarget.Global,
): Promise<void> {
  await vscode.workspace.getConfiguration(SECTION).update("userGroup", group, target);
}
