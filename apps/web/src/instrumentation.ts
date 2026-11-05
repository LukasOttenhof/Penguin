// Website interaction tracking — click and scroll events, timestamped and
// batched to the same Aida ingestion server the VS Code extension uses.
// Deliberately does not capture typed text content, only metadata (which
// element, static UI copy like a button's label, scroll position).

export interface WebEvent {
  id: string;
  participantId: string;
  machineId: string;
  editorSessionId: string;
  workspaceFolder: string | null;
  capturedAt: string;
  source: "web";
  type: string;
  data: Record<string, unknown>;
}

const SERVER_URL = import.meta.env.VITE_AIDA_SERVER_URL as string | undefined;
const ENV_PARTICIPANT_KEY = import.meta.env.VITE_TOKEN as string | undefined;
const PARTICIPANT_KEY_STORAGE_KEY = "aida.participantKey";
const MACHINE_ID_STORAGE_KEY = "aida.machineId";
const FLUSH_INTERVAL_MS = 10_000;
const FLUSH_BATCH_SIZE = 50;
const SCROLL_DEBOUNCE_MS = 300;

function getParticipantKey(): string | undefined {
  const url = new URL(window.location.href);
  const fromQuery = url.searchParams.get("key");
  if (fromQuery) {
    localStorage.setItem(PARTICIPANT_KEY_STORAGE_KEY, fromQuery);
    url.searchParams.delete("key");
    window.history.replaceState({}, "", url.toString());
    return fromQuery;
  }
  return localStorage.getItem(PARTICIPANT_KEY_STORAGE_KEY) ?? ENV_PARTICIPANT_KEY;
}

function getMachineId(): string {
  let id = localStorage.getItem(MACHINE_ID_STORAGE_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(MACHINE_ID_STORAGE_KEY, id);
  }
  return id;
}

const machineId = getMachineId();
const editorSessionId = crypto.randomUUID();
const queue: WebEvent[] = [];

function emit(type: string, data: Record<string, unknown>): void {
  const participantId = getParticipantKey();
  if (!participantId) return;

  queue.push({
    id: crypto.randomUUID(),
    participantId,
    machineId,
    editorSessionId,
    workspaceFolder: null,
    capturedAt: new Date().toISOString(),
    source: "web",
    type,
    data,
  });

  if (queue.length >= FLUSH_BATCH_SIZE) void flush();
}

async function flush(): Promise<void> {
  if (queue.length === 0 || !SERVER_URL) return;
  const participantId = getParticipantKey();
  if (!participantId) return;

  const batch = queue.splice(0, FLUSH_BATCH_SIZE);
  // In dev, go through Vite's dev-server proxy (same-origin, HTTPS) instead of
  // fetching SERVER_URL directly — the browser blocks HTTPS pages (like a
  // Codespaces forwarded-port URL) from making plain-HTTP requests.
  const endpoint = import.meta.env.DEV ? "/api/events" : `${SERVER_URL}/api/events`;
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${participantId}`,
      },
      body: JSON.stringify({ events: batch }),
    });
    if (!response.ok) queue.unshift(...batch);
  } catch {
    queue.unshift(...batch);
  }
}

setInterval(() => void flush(), FLUSH_INTERVAL_MS);
window.addEventListener("beforeunload", () => void flush());

function describeElement(target: EventTarget | null): Record<string, unknown> {
  if (!(target instanceof HTMLElement)) return {};
  return {
    elementTag: target.tagName.toLowerCase(),
    elementId: target.id || undefined,
    elementName: target.getAttribute("name") ?? undefined,
    elementText: target.textContent?.trim().slice(0, 200) || undefined,
  };
}

document.addEventListener(
  "click",
  (e) => {
    const target = e.target as HTMLElement | null;
    const interactive = target?.closest("button, a, [role='button'], input[type='submit'], input[type='button']");
    if (!interactive) return;
    emit("click", { pageUrl: window.location.pathname, ...describeElement(interactive) });
  },
  true,
);

let scrollDebounceTimer: ReturnType<typeof setTimeout> | undefined;
window.addEventListener(
  "scroll",
  () => {
    clearTimeout(scrollDebounceTimer);
    scrollDebounceTimer = setTimeout(() => {
      emit("scroll", {
        pageUrl: window.location.pathname,
        scrollX: window.scrollX,
        scrollY: window.scrollY,
      });
    }, SCROLL_DEBOUNCE_MS);
  },
  { passive: true },
);

// Metadata only, never the typed value itself — which field changed and how
// long its current value is, not what was written into it.
document.addEventListener(
  "input",
  (e) => {
    const target = e.target;
    if (!(target instanceof HTMLInputElement) && !(target instanceof HTMLTextAreaElement)) return;
    emit("input-change", {
      pageUrl: window.location.pathname,
      elementTag: target.tagName.toLowerCase(),
      elementId: target.id || undefined,
      elementName: target.getAttribute("name") ?? undefined,
      inputType: target instanceof HTMLInputElement ? target.type : undefined,
      valueLength: target.value.length,
    });
  },
  true,
);

window.addEventListener("focus", () => emit("window-focus-changed", { focused: true }));
window.addEventListener("blur", () => emit("window-focus-changed", { focused: false }));
