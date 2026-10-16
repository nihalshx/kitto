import "server-only";
import { getSupabaseAdmin, hasSupabase } from "./supabase";
import type { Mode, Mood } from "./moods";
import type { KittoMeta } from "./parseMeta";

export interface StoredMessage {
  role: "user" | "assistant";
  content: string;
}

export interface Store {
  createVisitor(v: { firstPage?: string; utmSource?: string; language?: string }): Promise<string>;
  visitorExists(visitorId: string): Promise<boolean>;
  /** Returns the conversation id, creating one if needed. Null if it belongs to another visitor. */
  resolveConversation(visitorId: string, conversationId: string | undefined, mode?: Mode): Promise<string | null>;
  loadHistory(conversationId: string, limit: number): Promise<StoredMessage[]>;
  saveExchange(x: {
    conversationId: string;
    userMessage: string;
    reply: string;
    meta: KittoMeta;
    inputTokens: number | null;
    outputTokens: number | null;
  }): Promise<{ assistantMessageId: string | null }>;
  /** Atomically increment today's counter for a key and return the new count. */
  bumpCounter(key: string): Promise<number>;
  /** Save a lead and mark its conversation. False if the conversation doesn't belong to the visitor. */
  saveLead(visitorId: string, lead: LeadInput): Promise<boolean>;
}

export interface LeadInput {
  conversationId: string;
  name: string;
  email?: string;
  phone?: string;
  business?: string;
  need?: string;
  budgetRange?: string;
  aiSummary?: string;
  consent: true;
}

// ---------- Supabase ----------

const supabaseStore: Store = {
  async createVisitor({ firstPage, utmSource, language }) {
    const { data, error } = await getSupabaseAdmin()
      .from("visitors")
      .insert({ first_page: firstPage ?? null, utm_source: utmSource ?? null, language: language ?? "en" })
      .select("id")
      .single();
    if (error) throw error;
    return data.id as string;
  },

  async visitorExists(visitorId) {
    const { data, error } = await getSupabaseAdmin().from("visitors").select("id").eq("id", visitorId).maybeSingle();
    if (error) throw error;
    return Boolean(data);
  },

  async resolveConversation(visitorId, conversationId, mode) {
    const db = getSupabaseAdmin();
    if (conversationId) {
      const { data, error } = await db
        .from("conversations")
        .select("id, visitor_id")
        .eq("id", conversationId)
        .maybeSingle();
      if (error) throw error;
      if (!data || data.visitor_id !== visitorId) return null;
      return data.id as string;
    }
    const { data, error } = await db
      .from("conversations")
      .insert({ visitor_id: visitorId, mode: mode ?? null, last_mood: "curious" })
      .select("id")
      .single();
    if (error) throw error;
    return data.id as string;
  },

  async loadHistory(conversationId, limit) {
    const { data, error } = await getSupabaseAdmin()
      .from("messages")
      .select("role, content")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data as StoredMessage[]).reverse();
  },

  async saveExchange({ conversationId, userMessage, reply, meta, inputTokens, outputTokens }) {
    const db = getSupabaseAdmin();
    const now = Date.now();
    const { data, error } = await db
      .from("messages")
      .insert([
        { conversation_id: conversationId, role: "user", content: userMessage, created_at: new Date(now).toISOString() },
        {
          conversation_id: conversationId,
          role: "assistant",
          content: reply,
          mood: meta.mood,
          meta,
          input_tokens: inputTokens,
          output_tokens: outputTokens,
          // +1 ms keeps ordering stable when both rows land in the same transaction.
          created_at: new Date(now + 1).toISOString(),
        },
      ])
      .select("id, role");
    if (error) throw error;

    const { data: conv } = await db.from("conversations").select("message_count").eq("id", conversationId).single();
    const update: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
      last_mood: meta.mood satisfies Mood,
      message_count: ((conv?.message_count as number | undefined) ?? 0) + 2,
    };
    if (meta.mode) update.mode = meta.mode;
    await db.from("conversations").update(update).eq("id", conversationId);

    const assistant = data?.find((m) => m.role === "assistant");
    return { assistantMessageId: (assistant?.id as string | undefined) ?? null };
  },

  async bumpCounter(key) {
    const { data, error } = await getSupabaseAdmin().rpc("increment_rate_limit", { p_key: key });
    if (error) throw error;
    return data as number;
  },

  async saveLead(visitorId, lead) {
    const db = getSupabaseAdmin();
    const { data: conv, error: convError } = await db
      .from("conversations")
      .select("visitor_id")
      .eq("id", lead.conversationId)
      .maybeSingle();
    if (convError) throw convError;
    if (!conv || conv.visitor_id !== visitorId) return false;

    const { error } = await db.from("leads").insert({
      conversation_id: lead.conversationId,
      name: lead.name,
      email: lead.email ?? null,
      phone: lead.phone ?? null,
      business: lead.business ?? null,
      need: lead.need ?? null,
      budget_range: lead.budgetRange ?? null,
      ai_summary: lead.aiSummary ?? null,
      consent: lead.consent,
    });
    if (error) throw error;
    await db.from("conversations").update({ has_lead: true, last_mood: "happy" }).eq("id", lead.conversationId);
    return true;
  },
};

// ---------- In-memory (local dev without Supabase; resets on restart) ----------

const mem = {
  visitors: new Set<string>(),
  conversations: new Map<string, { visitorId: string; messages: StoredMessage[] }>(),
  counters: new Map<string, number>(),
  leads: [] as LeadInput[],
};

const memoryStore: Store = {
  async createVisitor() {
    const id = crypto.randomUUID();
    mem.visitors.add(id);
    return id;
  },
  async visitorExists(visitorId) {
    return mem.visitors.has(visitorId);
  },
  async resolveConversation(visitorId, conversationId) {
    if (conversationId) {
      const c = mem.conversations.get(conversationId);
      return c && c.visitorId === visitorId ? conversationId : null;
    }
    const id = crypto.randomUUID();
    mem.conversations.set(id, { visitorId, messages: [] });
    return id;
  },
  async loadHistory(conversationId, limit) {
    return (mem.conversations.get(conversationId)?.messages ?? []).slice(-limit);
  },
  async saveExchange({ conversationId, userMessage, reply }) {
    mem.conversations.get(conversationId)?.messages.push(
      { role: "user", content: userMessage },
      { role: "assistant", content: reply },
    );
    return { assistantMessageId: null };
  },
  async bumpCounter(key) {
    const k = `${new Date().toISOString().slice(0, 10)}:${key}`;
    const n = (mem.counters.get(k) ?? 0) + 1;
    mem.counters.set(k, n);
    return n;
  },
  async saveLead(visitorId, lead) {
    if (mem.conversations.get(lead.conversationId)?.visitorId !== visitorId) return false;
    mem.leads.push(lead);
    return true;
  },
};

export function getStore(): Store {
  return hasSupabase() ? supabaseStore : memoryStore;
}
