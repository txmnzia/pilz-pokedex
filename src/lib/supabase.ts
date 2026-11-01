import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const SCHEMA = "pilz_pokedex";
export const BUCKET = "pilz_pokedex";

// Keep only the origin: a URL pasted from the dashboard with /rest/v1/ breaks auth ("Invalid path specified in request URL").
const rawUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim();
const url = rawUrl ? (() => { try { return new URL(rawUrl).origin; } catch { return undefined; } })() : undefined;
const key = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim();

/** null when the build has no Supabase config: the app then runs local-only. */
export const supabase: SupabaseClient<any, any, any> | null =
  url && key ? createClient(url, key, { db: { schema: SCHEMA } }) : null;
