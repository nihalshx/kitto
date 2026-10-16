import { z } from "zod";
import { getStore } from "@/lib/kitto/store";

const Body = z.object({
  firstPage: z.string().max(500).optional(),
  utmSource: z.string().max(100).optional(),
  language: z.enum(["en", "ml"]).optional(),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return Response.json({ error: "invalid_request" }, { status: 400 });

  try {
    const visitorId = await getStore().createVisitor(parsed.data);
    return Response.json({ visitorId });
  } catch (err) {
    console.error("[kitto/session] failed to create visitor", err);
    return Response.json({ error: "unavailable" }, { status: 503 });
  }
}
