// User preferences: local-first, synced per account (newer updated_at wins).
import type { Lang } from "./types";
import { store } from "./local";
import { defaultLang } from "./i18n";

export type Mode = "grid" | "list";
/** Dex order (v0.10.5, Sam): by number (= popularity rank, default) or A to Z in the UI language. */
export type Sort = "no" | "az";
export interface Prefs { lang: Lang; mode: Mode; sort: Sort; updated_at: string }

const LANGS: Lang[] = ["fr", "en", "de"];
const MODES: Mode[] = ["grid", "list"];
const SORTS: Sort[] = ["no", "az"];

/** Validates anything (localStorage, DB row) into Prefs; unknown values fall back to defaults. */
export function normalizePrefs(raw: Partial<Prefs> | null | undefined, fallback: Prefs): Prefs {
  return {
    lang: LANGS.includes(raw?.lang as Lang) ? (raw!.lang as Lang) : fallback.lang,
    mode: MODES.includes(raw?.mode as Mode) ? (raw!.mode as Mode) : fallback.mode,
    sort: SORTS.includes(raw?.sort as Sort) ? (raw!.sort as Sort) : fallback.sort,
    updated_at: typeof raw?.updated_at === "string" ? raw.updated_at : fallback.updated_at,
  };
}

/** Newer wins; on a tie keep local. */
export const newerPrefs = (local: Prefs, remote: Prefs | null): Prefs =>
  remote && remote.updated_at > local.updated_at ? remote : local;

export function loadPrefs(): Prefs {
  const base: Prefs = { lang: defaultLang(), mode: "grid", sort: "no", updated_at: "1970-01-01T00:00:00.000Z" };
  // migrate the v0.1 keys once
  const legacy = { lang: store.get<Lang | null>("pz.lang", null) ?? undefined, mode: store.get<Mode | null>("pz.mode", null) ?? undefined };
  return normalizePrefs(store.get<Partial<Prefs> | null>("pz.prefs", null) ?? legacy, base);
}
export const savePrefs = (p: Prefs) => store.set("pz.prefs", p);
