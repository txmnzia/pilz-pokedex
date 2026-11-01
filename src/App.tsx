import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Device, type Hardware } from "./components/Device";
import { Catch, Dex, Entry, Login, Settings, type CatchDraft, type Ctx, type Filter } from "./screens";
import { STRINGS, defaultLang, type StringKey } from "./lib/i18n";
import { deleteFind, findsBySpecies, newFind, parseBackup, restoreInto } from "./lib/finds";
import { compress, loadFinds, putPhoto, saveFinds, store } from "./lib/local";
import { supabase } from "./lib/supabase";
import { sync } from "./lib/sync";
import type { Edibility, Find, Lang, Species, SpeciesFile } from "./lib/types";

type View = "login" | "index" | "entry" | "catch" | "settings";
type Mode = "grid" | "list";

export default function App() {
  const [data, setData] = useState<SpeciesFile | null>(null);
  const [lang, setLangState] = useState<Lang>(() => store.get("pz.lang", defaultLang()));
  const [mode, setModeState] = useState<Mode>(() => store.get("pz.mode", "grid"));
  const [user, setUser] = useState<{ id: string; email: string | null } | null>(null);
  const [offline, setOffline] = useState<boolean>(() => !supabase && store.get("pz.offline", false));
  const [authReady, setAuthReady] = useState(!supabase);
  const [view, setView] = useState<View>("index");
  const [prev, setPrev] = useState<View>("index");
  const [cur, setCur] = useState<number>(0);
  const [stack, setStack] = useState<number[]>([]);
  const [page, setPage] = useState<0 | 1>(0);
  const [sel, setSel] = useState(0);
  const [filter, setFilter] = useState<Filter>("all");
  const [edf, setEdf] = useState<Edibility | null>(null);
  const [finds, setFindsState] = useState<Find[]>(loadFinds);
  const [toast, setToast] = useState<string | null>(null);
  const [flash, setFlash] = useState(0);
  const [syncState, setSyncState] = useState<"idle" | "syncing" | "ok">("idle");
  const entryScroll = useRef<HTMLDivElement | null>(null);

  const t = useCallback((k: StringKey) => STRINGS[lang][k], [lang]);
  const setLang = (l: Lang) => { setLangState(l); store.set("pz.lang", l); };
  const setMode = (m: Mode) => { setModeState(m); store.set("pz.mode", m); };
  // every mutation is mirrored to localStorage immediately
  const setFinds = useCallback((f: Find[] | ((x: Find[]) => Find[])) => {
    setFindsState(old => { const n = typeof f === "function" ? f(old) : f; saveFinds(n); return n; });
  }, []);

  useEffect(() => { document.documentElement.lang = lang; }, [lang]);
  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/species.json`).then(r => r.json()).then(setData).catch(() => setData(null));
  }, []);

  // auth
  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user; setUser(u ? { id: u.id, email: u.email ?? null } : null); setAuthReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setUser(s?.user ? { id: s.user.id, email: s.user.email ?? null } : null));
    return () => sub.subscription.unsubscribe();
  }, []);

  // sync on login, when coming back online, and after local changes (debounced)
  const syncing = useRef(false);
  const runSync = useCallback(async () => {
    if (!user || syncing.current || !navigator.onLine) return;
    syncing.current = true; setSyncState("syncing");
    try {
      const merged = await sync(loadFinds(), user.id);
      setFinds(cur => {
        // keep anything created locally while the sync was running
        const ids = new Set(merged.map(f => f.id));
        return [...merged, ...cur.filter(f => !ids.has(f.id))];
      });
      setSyncState("ok");
    } catch { setSyncState("idle"); } finally { syncing.current = false; }
  }, [user, setFinds]);
  useEffect(() => { runSync(); }, [runSync]);
  useEffect(() => { window.addEventListener("online", runSync); return () => window.removeEventListener("online", runSync); }, [runSync]);
  const dirty = finds.some(f => !f.synced);
  useEffect(() => { if (dirty) { const h = setTimeout(runSync, 1500); return () => clearTimeout(h); } }, [dirty, finds, runSync]);

  const all = data?.species ?? [];
  const core = useMemo(() => all.filter(s => !s.extra), [all]);
  const extras = useMemo(() => all.filter(s => s.extra), [all]);
  const caught = useMemo(() => findsBySpecies(finds), [finds]);
  const ctx: Ctx = { t, lang, all, caught };
  const visible = core.filter(s =>
    (filter === "all" || (filter === "got" ? caught.has(s.inat) : !caught.has(s.inat))) && (!edf || s.edibility === edf));
  const byId = (id: number) => all.find(s => s.inat === id);
  const curSp = byId(cur);

  const signedIn = !!user || offline;
  const effectiveView: View = !authReady ? "index" : signedIn ? view : "login";

  const go = (v: View) => { if (v !== view && view !== "catch" && view !== "settings") setPrev(view); setView(v); };
  const open = (sp: Species, push = false) => {
    if (push && view === "entry") setStack(s => [...s, cur]); else if (view !== "entry") setStack([]);
    setCur(sp.inat); setPage(0); go("entry");
  };
  const step = (d: number) => {
    if (!curSp) return;
    const group = curSp.extra ? extras : core;
    const i = group.findIndex(s => s.inat === cur);
    setStack([]); setCur(group[(i + d + group.length) % group.length].inat); setPage(0);
  };
  const flashLed = (msg: string) => { setToast(msg); setFlash(x => x + 1); setTimeout(() => setToast(null), 1400); };
  const cycleFilter = (d: number) => { const f: Filter[] = ["all", "got", "missing"]; setFilter(f[(f.indexOf(filter) + d + 3) % 3]); setSel(0); };
  const scrollBy = (dy: number) => entryScroll.current?.scrollBy({ top: dy, behavior: "smooth" }) ?? document.querySelector(".lcd .scroll")?.scrollBy({ top: dy, behavior: "smooth" });
  const cols = mode === "grid" ? 3 : 1;

  const hw: Hardware = {
    up: () => effectiveView === "index" ? setSel(s => Math.max(0, s - cols)) : scrollBy(-90),
    down: () => effectiveView === "index" ? setSel(s => Math.min(visible.length - 1, s + cols)) : scrollBy(90),
    left: () => effectiveView === "entry" ? step(-1) : effectiveView === "index" ? (mode === "grid" ? setSel(s => Math.max(0, s - 1)) : cycleFilter(-1)) : undefined,
    right: () => effectiveView === "entry" ? step(1) : effectiveView === "index" ? (mode === "grid" ? setSel(s => Math.min(visible.length - 1, s + 1)) : cycleFilter(1)) : undefined,
    ok: () => { if (effectiveView === "index" && visible[sel]) open(visible[sel]); else if (effectiveView === "entry") setPage(p => (p ? 0 : 1)); },
    a: () => {
      if (effectiveView === "login" || !all.length) return;
      if (effectiveView === "index" && visible[sel]) setCur(visible[sel].inat);
      else if (effectiveView !== "entry") setCur(c => c || core[0].inat);
      go("catch");
    },
    b: () => {
      if (effectiveView === "entry") {
        if (stack.length) { setCur(stack[stack.length - 1]); setStack(s => s.slice(0, -1)); setPage(1); } else go("index");
      } else if (effectiveView === "catch" || effectiveView === "settings") setView(prev === "login" ? "index" : prev);
    },
    page: () => setPage(p => (p ? 0 : 1)),
    lang: () => { const L: Lang[] = ["fr", "en", "de"]; setLang(L[(L.indexOf(lang) + 1) % 3]); },
    menu: () => { if (signedIn) go("settings"); },
  };

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (/INPUT|SELECT|TEXTAREA/.test((e.target as HTMLElement).tagName)) return;
      const m: Record<string, keyof Hardware> = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right", Enter: "ok", Escape: "b" };
      if (m[e.key]) { e.preventDefault(); hw[m[e.key]](); }
    };
    window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k);
  });

  // swipe flips entry pages
  const tx = useRef<number | null>(null);
  const onTouchStart = (e: React.TouchEvent) => { tx.current = e.touches[0].clientX; };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (tx.current == null || effectiveView !== "entry") return;
    const dx = e.changedTouches[0].clientX - tx.current; tx.current = null;
    if (Math.abs(dx) > 50) setPage(dx < 0 ? 1 : 0);
  };

  const save = async (d: CatchDraft) => {
    const f = newFind(d.species, { observed_on: d.observed_on, place: d.place, note: d.note, lat: d.lat, lng: d.lng });
    await putPhoto(f.id, await compress(d.file));
    setFinds(x => [f, ...x]);
    setCur(d.species); setPage(0); setStack([]); setView("entry");
    flashLed(t("gotcha"));
  };
  const exportJson = () => {
    const blob = new Blob([JSON.stringify(finds.filter(f => !f.deleted), null, 2)], { type: "application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `pilzdex-${new Date().toISOString().slice(0, 10)}.json`; a.click();
  };

  let screen: React.ReactNode;
  if (!data) screen = <div className="scroll"><p>{t("loading")}</p></div>;
  else if (effectiveView === "login") screen = <Login ctx={ctx} configured={!!supabase}
    onSend={async email => {
      const { error } = await supabase!.auth.signInWithOtp({ email, options: { emailRedirectTo: location.origin + import.meta.env.BASE_URL } });
      return error?.message ?? null;
    }}
    onOffline={() => { setOffline(true); store.set("pz.offline", true); }} />;
  else if (effectiveView === "entry" && curSp) screen = <Entry ctx={ctx} sp={curSp} page={page} scrollRef={entryScroll}
    open={sp => open(sp, true)} onDelete={f => setFinds(x => x.map(y => (y.id === f.id ? deleteFind(y) : y)))} />;
  else if (effectiveView === "catch") screen = <Catch ctx={ctx} initial={cur || core[0].inat} onSave={save} />;
  else if (effectiveView === "settings") screen = <Settings ctx={ctx} email={user?.email ?? null} mode={mode} setLang={setLang} setMode={setMode}
    sources={data.sources} onExport={exportJson}
    onRestore={async json => {
      try { const b = parseBackup(json); setFinds(x => restoreInto(x, b)); return `${b.length} ${t("restored")}`; }
      catch { return t("badBackup"); }
    }}
    onSignOut={async () => { if (supabase) await supabase.auth.signOut(); setOffline(false); store.set("pz.offline", false); setView("index"); }} />;
  else screen = <Dex ctx={ctx} list={visible} extras={filter === "all" && !edf ? extras : []} sel={sel} mode={mode} filter={filter} edf={edf}
    setMode={setMode} setFilter={f => { setFilter(f); setSel(0); }} setEdf={e => { setEdf(e); setSel(0); }} open={sp => open(sp)} />;

  const status = !user ? (offline ? t("localOnly") : "") : syncState === "syncing" ? t("syncing") : dirty ? t("localOnly") : t("synced");
  return (
    <div onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} className="app">
      <Device hw={hw} ledFlash={flash} status={status} pageEnabled={effectiveView === "entry"}
        labels={{ a: t("catch"), b: t("back"), page: t("page"), lang: lang.toUpperCase(), counter: `${core.filter(s => caught.has(s.inat)).length}/${core.length || 30}`, counterSub: t("caught") }}>
        {screen}
        {toast && <div className="toast">{toast}</div>}
      </Device>
    </div>
  );
}
