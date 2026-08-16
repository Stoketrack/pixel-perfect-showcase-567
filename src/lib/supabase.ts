import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    "Supabase env vars missing. Expected VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env",
  );
}

export const supabase = createClient(url, anonKey, {
  auth: { persistSession: false },
});

/** Tables that store TokenTrack operational data. */
export type TTTable = "tokentrack_platforms" | "tokentrack_entries" | "tokentrack_payouts";
