// Browser-side helpers for the Kitto widget: visitor session and the SSE chat stream.
import type { Intent, Mode, Mood } from "./moods";

const VISITOR_KEY = "kitto.visitorId";
const NUDGE_KEY = "kitto.nudgeShown";

export function readStorage(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeStorage(key: string, value: string | null): void {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    // storage blocked (private mode etc.); the widget still works for this page view
  }
}

export const nudgeStorage = {
  seen: () => readStorage(NUDGE_KEY) === "1",
  markSeen: () => writeStorage(NUDGE_KEY, "1"),
};

export async function getVisitorId(forceNew = false): Promise<string> {
  const existing = forceNew ? null : readStorage(VISITOR_KEY);
  if (existing) return existing;

  const params = new URLSearchParams(window.location.search);
  const res = await fetch("/api/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      firstPage: window.location.pathname,
      utmSource: params.get("utm_source") ?? undefined,
    }),
  });
  if (!res.ok) throw new Error(`session ${res.status}`);
  const { visitorId } = (await res.json()) as { visitorId: string };
  writeStorage(VISITOR_KEY, visitorId);
  return visitorId;
}

export interface ReplyMeta {
  mood: Mood;
  mode: Mode | null;
  chips: string[];
  intent: Intent;
  roastScore: number | null;
  conversationId: string;
  messageId: string | null;
  demo?: boolean;
}

export type ChatResult =
  | { kind: "ok"; meta: ReplyMeta }
  | { kind: "error"; message: string }
  | { kind: "rate_limited"; message: string }
  | { kind: "unknown_visitor" }
  | { kind: "unknown_conversation" };

/** POST a message and stream the reply. `onText` gets each visible chunk. */
export async function sendChat(
  body: { visitorId: string; conversationId?: string; mode?: Mode; message: string },
  onText: (chunk: string) => void,
  signal?: AbortSignal,
): Promise<ChatResult> {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });

  if (res.status === 429) {
    const data = await res.json().catch(() => ({}));
    return { kind: "rate_limited", message: data.message ?? "I need a nap. Come back tomorrow." };
  }
  if (res.status === 401) return { kind: "unknown_visitor" };
  if (res.status === 404) return { kind: "unknown_conversation" };
  if (!res.ok || !res.body) {
    const data = await res.json().catch(() => ({}));
    return { kind: "error", message: data.message ?? "Hairball moment. Try that again?" };
  }

  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";
  let result: ChatResult = { kind: "error", message: "Hairball moment. Try that again?" };

  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += value;

    let sep: number;
    while ((sep = buffer.indexOf("\n\n")) !== -1) {
      const raw = buffer.slice(0, sep);
      buffer = buffer.slice(sep + 2);
      const event = /^event: (.+)$/m.exec(raw)?.[1];
      const data = /^data: (.+)$/m.exec(raw)?.[1];
      if (!event || !data) continue;
      const payload = JSON.parse(data);
      if (event === "text") onText(payload.text);
      else if (event === "meta") result = { kind: "ok", meta: payload };
      else if (event === "error") result = { kind: "error", message: payload.message };
    }
  }
  return result;
}

export async function submitLead(body: {
  visitorId: string;
  conversationId: string;
  name: string;
  email?: string;
  phone?: string;
  business?: string;
  need?: string;
  budgetRange?: string;
  consent: boolean;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const res = await fetch("/api/lead", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (res.ok) return { ok: true };
  const data = await res.json().catch(() => ({}));
  return { ok: false, error: data.issues?.[0] ?? data.error ?? "Something went wrong" };
}
