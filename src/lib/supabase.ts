import { createClient } from "@supabase/supabase-js";

/** Project URL only — not .../rest/v1 (Supabase JS adds paths itself) */
export function normalizeSupabaseUrl(raw: string | undefined): string {
  if (!raw) return "";
  let url = raw.trim().replace(/\/+$/, "");
  url = url.replace(/\/rest\/v1$/i, "");
  return url.replace(/\/+$/, "");
}

const url = normalizeSupabaseUrl(import.meta.env.VITE_SUPABASE_URL);
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ?? "";

if (!url || !anonKey) {
  console.warn(
    "Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Copy .env.example to .env and add your Supabase keys.",
  );
}

export const supabase = createClient(url, anonKey);

export function isSupabaseConfigured(): boolean {
  return Boolean(url && anonKey);
}
