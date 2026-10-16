import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let admin: SupabaseClient | null = null;

/** True when Supabase env vars are present. Without them the API uses an in-memory dev store. */
export function hasSupabase(): boolean {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

/** Service-role client. Server only: bypasses RLS, never import from client components. */
export function getSupabaseAdmin(): SupabaseClient {
  if (!hasSupabase()) throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not set");
  admin ??= createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return admin;
}
