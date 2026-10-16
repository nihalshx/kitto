import { DEFAULT_MOOD, INTENTS, MODES, MOODS, type Intent, type Mode, type Mood } from "./moods";

export const META_OPEN = "<kitto_meta>";
export const META_CLOSE = "</kitto_meta>";

export interface KittoMeta {
  mood: Mood;
  mode: Mode | null;
  chips: string[];
  intent: Intent;
  roastScore: number | null;
}

export const DEFAULT_META: KittoMeta = {
  mood: DEFAULT_MOOD,
  mode: null,
  chips: [],
  intent: "none",
  roastScore: null,
};

function oneOf<T extends string>(list: readonly T[], value: unknown): T | undefined {
  return typeof value === "string" && (list as readonly string[]).includes(value) ? (value as T) : undefined;
}

/** Validate a raw metadata object against the allowed values; anything invalid falls back to defaults. */
export function normalizeMeta(raw: unknown): KittoMeta {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_META };
  const r = raw as Record<string, unknown>;

  const chips = Array.isArray(r.chips)
    ? r.chips
        .filter((c): c is string => typeof c === "string")
        .map((c) => c.trim())
        .filter((c) => c.length > 0 && c.length <= 40 && c.split(/\s+/).length <= 4)
        .slice(0, 3)
    : [];

  const score = r.roast_score;
  const roastScore =
    typeof score === "number" && Number.isInteger(score) && score >= 1 && score <= 10 ? score : null;

  return {
    mood: oneOf(MOODS, r.mood) ?? DEFAULT_MOOD,
    mode: oneOf(MODES, r.mode) ?? null,
    chips,
    intent: oneOf(INTENTS, r.intent) ?? "none",
    roastScore,
  };
}

/** Split a complete model reply into visible text and parsed metadata. */
export function parseReply(full: string): { text: string; meta: KittoMeta } {
  const start = full.indexOf(META_OPEN);
  // trimEnd only, so indexes stay aligned with what MetaStreamFilter has emitted.
  if (start === -1) return { text: full.trimEnd(), meta: { ...DEFAULT_META } };

  const text = full.slice(0, start).trimEnd();
  const afterOpen = full.slice(start + META_OPEN.length);
  const end = afterOpen.indexOf(META_CLOSE);
  const json = (end === -1 ? afterOpen : afterOpen.slice(0, end)).trim();

  try {
    return { text, meta: normalizeMeta(JSON.parse(json)) };
  } catch {
    return { text, meta: { ...DEFAULT_META } };
  }
}

/**
 * Incremental filter for streamed text. Forwards visible text as it arrives and
 * stops forwarding once `<kitto_meta>` begins. Holds back any tail that could be
 * the start of the tag so a split tag never leaks to the browser.
 */
export class MetaStreamFilter {
  private full = "";
  private emitted = 0;
  private inMeta = false;

  /** Add a chunk; returns the text that is safe to show now (may be empty). */
  push(chunk: string): string {
    this.full += chunk;
    if (this.inMeta) return "";

    const tagAt = this.full.indexOf(META_OPEN, Math.max(0, this.emitted - META_OPEN.length));
    if (tagAt !== -1) {
      this.inMeta = true;
      // Drop whitespace that sits right before the tag.
      const visibleEnd = this.full.slice(0, tagAt).trimEnd().length;
      const out = visibleEnd > this.emitted ? this.full.slice(this.emitted, visibleEnd) : "";
      this.emitted = Math.max(this.emitted, visibleEnd);
      return out;
    }

    // Hold back a suffix that is a prefix of the tag, plus trailing whitespace.
    let safeEnd = this.full.length;
    for (let k = Math.min(META_OPEN.length - 1, this.full.length); k > 0; k--) {
      if (META_OPEN.startsWith(this.full.slice(this.full.length - k))) {
        safeEnd = this.full.length - k;
        break;
      }
    }
    safeEnd = this.emitted + this.full.slice(this.emitted, safeEnd).trimEnd().length;

    if (safeEnd <= this.emitted) return "";
    const out = this.full.slice(this.emitted, safeEnd);
    this.emitted = safeEnd;
    return out;
  }

  /** Call when the stream ends; returns any held-back visible text and the parsed reply. */
  finish(): { tail: string; text: string; meta: KittoMeta } {
    const parsed = parseReply(this.full);
    const tail = parsed.text.length > this.emitted ? parsed.text.slice(this.emitted) : "";
    this.emitted = Math.max(this.emitted, parsed.text.length);
    return { tail, ...parsed };
  }
}
