import type { AidaEvent } from "./types.js";

export interface UploadResult {
  ok: boolean;
  status?: number;
  error?: string;
}

export async function uploadEvents(
  serverUrl: string,
  apiKey: string | undefined,
  events: AidaEvent[],
): Promise<UploadResult> {
  try {
    const response = await fetch(`${serverUrl}/api/events`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(apiKey ? { authorization: `Bearer ${apiKey}` } : {}),
      },
      body: JSON.stringify({ events }),
    });

    if (!response.ok) {
      const error = await response.text().catch(() => response.statusText);
      return { ok: false, status: response.status, error };
    }
    return { ok: true, status: response.status };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}
