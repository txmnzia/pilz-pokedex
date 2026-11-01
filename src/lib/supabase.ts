import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const SCHEMA = "pilz_pokedex";
export const BUCKET = "pilz_pokedex";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** null when the build has no Supabase config: the app then runs local-only. */
export const supabase: SupabaseClient<any, any, any> | null =
  url && key ? createClient(url, key, { db: { schema: SCHEMA } }) : null;
