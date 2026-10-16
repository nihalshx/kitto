import { z } from "zod";
import { emailLead, summarizeConversation } from "@/lib/kitto/leads";
import { getStore } from "@/lib/kitto/store";

const Body = z
  .object({
    visitorId: z.uuid(),
    conversationId: z.uuid(),
    name: z.string().trim().min(1).max(100),
    email: z.email().max(200).optional().or(z.literal("").transform(() => undefined)),
    phone: z
      .string()
      .trim()
      .regex(/^\+?[0-9 ()-]{7,20}$/)
      .optional()
      .or(z.literal("").transform(() => undefined)),
    business: z.string().trim().max(200).optional(),
    need: z.string().trim().max(1000).optional(),
    budgetRange: z.string().trim().max(50).optional(),
    consent: z.literal(true),
  })
  .refine((b) => b.email || b.phone, { message: "Email or WhatsApp number is required", path: ["email"] });

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return Response.json(
      { error: "invalid_request", issues: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`) },
      { status: 400 },
    );
  }
  const { visitorId, ...lead } = parsed.data;

  try {
    const store = getStore();
    const history = await store.loadHistory(lead.conversationId, 20);
    const aiSummary = await summarizeConversation(history);
    const saved = await store.saveLead(visitorId, { ...lead, aiSummary });
    if (!saved) return Response.json({ error: "unknown_conversation" }, { status: 404 });

    const origin = new URL(req.url).origin;
    await emailLead({ ...lead, aiSummary }, `${origin}/admin/conversations/${lead.conversationId}`).catch((err) =>
      console.error("[kitto/lead] email error", err),
    );
    return Response.json({ ok: true });
  } catch (err) {
    console.error("[kitto/lead] failed to save lead", err);
    return Response.json({ error: "unavailable" }, { status: 503 });
  }
}
