import "server-only";
import { createHash } from "node:crypto";
import { getStore } from "./store";

const VISITOR_LIMIT = Number(process.env.KITTO_DAILY_MESSAGE_LIMIT) || 40;
const IP_LIMIT = Number(process.env.KITTO_DAILY_IP_LIMIT) || 100;

export const NAP_MESSAGE =
  "I need a nap. Come back tomorrow, or leave your details and my humans will help.";

export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  return fwd?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
}

function hashIp(ip: string): string {
  return createHash("sha256").update(`kitto:${ip}`).digest("hex").slice(0, 32);
}

/** Count this message against the visitor and IP daily limits. */
export async function checkRateLimit(visitorId: string, ip: string): Promise<{ ok: boolean }> {
  const store = getStore();
  const [visitorCount, ipCount] = await Promise.all([
    store.bumpCounter(`v:${visitorId}`),
    store.bumpCounter(`ip:${hashIp(ip)}`),
  ]);
  return { ok: visitorCount <= VISITOR_LIMIT && ipCount <= IP_LIMIT };
}
