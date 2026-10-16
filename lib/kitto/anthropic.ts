import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { KITTO_INPUT_NOTE, KITTO_SYSTEM_PROMPT } from "./systemPrompt";
import type { Mode } from "./moods";

export const CHAT_MODEL = "claude-sonnet-5-5";
export const HELPER_MODEL = "claude-haiku-5-5";

export const MAX_TOKENS_DEFAULT = 700;
export const MAX_TOKENS_LONG = 1500;

// Server-side refusal fallback on the Claude API (beta).
const FALLBACK_BETA = "server-side-fallback-2026-07-01";

let client: Anthropic | null = null;
export function getAnthropic(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not set");
  client ??= new Anthropic({ maxRetries: 1, timeout: 60_000 });
  return client;
}

/** Wrap a visitor message so pasted material is treated as content, not instructions. */
export function wrapUserMessage(message: string, mode?: Mode): string {
  const hint = mode ? `[Visitor picked mode: ${mode}]\n` : "";
  // Neutralise any closing tag the visitor typed so they can't break out of the wrapper.
  const safe = message.replace(/<\/?user_content>/gi, "");
  return `${hint}<user_content>\n${safe}\n</user_content>`;
}

/** Content plans and full rewrites need more room than a normal chat reply. */
export function pickMaxTokens(message: string): number {
  return /\b(plan|calendar|schedule|7[- ]day|week|rewrite|list)\b/i.test(message)
    ? MAX_TOKENS_LONG
    : MAX_TOKENS_DEFAULT;
}

/** Start a streamed Kitto reply. The system prompt is cached (it never changes between requests). */
export function streamKittoReply(messages: Anthropic.Beta.BetaMessageParam[], maxTokens: number) {
  return getAnthropic().beta.messages.stream({
    model: CHAT_MODEL,
    max_tokens: maxTokens,
    betas: [FALLBACK_BETA],
    fallbacks: "default",
    // Chat replies are short; skip extended thinking to keep first-token latency low.
    thinking: { type: "between_tools" },
    output_config: { effort: "low" },
    system: [
      { type: "text", text: KITTO_SYSTEM_PROMPT },
      { type: "text", text: KITTO_INPUT_NOTE, cache_control: { type: "ephemeral" } },
    ],
    messages,
  });
}
