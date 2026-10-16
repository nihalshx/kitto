import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { pickMaxTokens, streamKittoReply, wrapUserMessage } from "@/lib/kitto/anthropic";
import { MODES } from "@/lib/kitto/moods";
import { MetaStreamFilter } from "@/lib/kitto/parseMeta";
import { checkRateLimit, clientIp, NAP_MESSAGE } from "@/lib/kitto/rateLimit";
import { getStore } from "@/lib/kitto/store";

const HISTORY_LIMIT = 20;
const FALLBACK_LINE = "Hairball moment. Try that again?";

const Body = z.object({
  visitorId: z.uuid(),
  conversationId: z.uuid().optional(),
  mode: z.enum(MODES).optional(),
  message: z.string().trim().min(1).max(1000),
});

function sse(event: string, data: unknown): Uint8Array {
  return new TextEncoder().encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

export async function POST(req: Request) {
  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch (err) {
    const issues = err instanceof z.ZodError ? err.issues.map((i) => `${i.path.join(".")}: ${i.message}`) : undefined;
    return Response.json({ error: "invalid_request", issues }, { status: 400 });
  }

  const store = getStore();
  let conversationId: string;
  let history: Awaited<ReturnType<typeof store.loadHistory>>;
  try {
    if (!(await store.visitorExists(body.visitorId))) {
      return Response.json({ error: "unknown_visitor" }, { status: 401 });
    }

    const limit = await checkRateLimit(body.visitorId, clientIp(req));
    if (!limit.ok) {
      return Response.json({ error: "rate_limited", message: NAP_MESSAGE, showLeadForm: true }, { status: 429 });
    }

    const resolved = await store.resolveConversation(body.visitorId, body.conversationId, body.mode);
    if (!resolved) return Response.json({ error: "unknown_conversation" }, { status: 404 });
    conversationId = resolved;
    history = await store.loadHistory(conversationId, HISTORY_LIMIT);
  } catch (err) {
    console.error("[kitto/chat] storage error", err);
    return Response.json({ error: "unavailable", message: FALLBACK_LINE, retry: true }, { status: 503 });
  }

  // The API needs the first message to be from the user.
  while (history.length && history[0].role !== "user") history.shift();

  const messages: Anthropic.Beta.BetaMessageParam[] = [
    ...history.map((m) => ({
      role: m.role,
      content: m.role === "user" ? wrapUserMessage(m.content) : m.content,
    })),
    { role: "user", content: wrapUserMessage(body.message, body.mode) },
  ];

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const filter = new MetaStreamFilter();
      try {
        const claude = streamKittoReply(messages, pickMaxTokens(body.message));
        req.signal.addEventListener("abort", () => claude.abort());

        for await (const event of claude) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            const visible = filter.push(event.delta.text);
            if (visible) controller.enqueue(sse("text", { text: visible }));
          }
        }

        const final = await claude.finalMessage();
        if (final.stop_reason === "refusal") {
          // Any partial text already shown should be replaced by the fallback line.
          controller.enqueue(sse("error", { message: FALLBACK_LINE, retry: true, discardPartial: true }));
          return;
        }

        const { tail, text, meta } = filter.finish();
        if (tail) controller.enqueue(sse("text", { text: tail }));

        const reply = text.trim() || FALLBACK_LINE;
        let messageId: string | null = null;
        try {
          ({ assistantMessageId: messageId } = await store.saveExchange({
            conversationId,
            userMessage: body.message,
            reply,
            meta,
            inputTokens:
              final.usage.input_tokens +
              (final.usage.cache_read_input_tokens ?? 0) +
              (final.usage.cache_creation_input_tokens ?? 0),
            outputTokens: final.usage.output_tokens,
          }));
        } catch (err) {
          console.error("[kitto/chat] failed to save exchange", err);
        }

        controller.enqueue(sse("meta", { ...meta, conversationId, messageId }));
      } catch (err) {
        if (req.signal.aborted) return;
        console.error("[kitto/chat] model error", err instanceof Anthropic.APIError ? `${err.status} ${err.message}` : err);
        controller.enqueue(sse("error", { message: FALLBACK_LINE, retry: true, discardPartial: true }));
      } finally {
        try {
          controller.close();
        } catch {
          // already closed by an aborted client
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
