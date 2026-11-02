import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Device, type Hardware } from "./components/Device";
import { Catch, Cropper, cropToBlob, Dex, Entry, Login, Settings, type CatchDraft, type Ctx, type Filter } from "./screens";
import { STRINGS, type StringKey } from "./lib/i18n";
import { deleteFind, findsBySpecies, newFind, parseBackup, restoreInto } from "./lib/finds";
import { compress, getPhoto, loadFinds, putPhoto, saveFinds, store } from "./lib/local";
import { supabase } from "./lib/supabase";
import { photoUrl, pullPrefs, pushPrefs, sync } from "./lib/sync";
import { loadPrefs, newerPrefs, savePrefs, type Prefs } from "./lib/prefs";
import type { Edibility, Find, Lang, Species, SpeciesFile } from "./lib/types";

type View = "login" | "index" | "entry" | "catch" | "settings";
type Mode = "grid" | "list";

export default function App() {
  const [data, setData] = useState<SpeciesFile | null>(null);
  const [prefs, setPrefsState] = useState<Prefs>(loadPrefs);
  const { lang, mode } = prefs;
  const [user, setUser] = useState<{ id: string; email: string | null } | null>(null);
  const [offline, setOffline] = useState<boolean>(() => !supabase && store.get("pz.offline", false));
  const [authReady, setAuthReady] = useState(!supabase);
  const [view, setView] = useState<View>("index");
  const [prev, setPrev] = useState<View>("index");
  const [cur, setCur] = useState<number>(0);
  const [stack, setStack] = useState<number[]>([]);
  const [catchFor, setCatchFor] = useState<number | null>(null);
  const [catchFile, setCatchFile] = useState<File | null>(null);
  const [catchKey, setCatchKey] = useState(0);
  const [recrop, setRecrop] = useState<{ find: Find; blob: Blob; url: string } | null>(null);
  const [page, setPage] = useState<0 | 1>(0);
  const [filter, setFilter] = useState<Filter>("all");
  const [edf, setEdf] = useState<Edibility | null>(null);
  const [finds, setFindsState] = useState<Find[]>(loadFinds);
  const [toast, setToast] = useState<string | null>(null);
  const [flash, setFlash] = useState(0);
  const [syncState, setSyncState] = useState<"idle" | "syncing" | "ok">("idle");
  const entryScroll = useRef<HTMLDivElement | null>(null);

  const t = useCallback((k: StringKey) => STRINGS[lang][k], [lang]);
  // a user change: stamp it, keep it on the device, push it to the account
  const changePrefs = (patch: Partial<Prefs>) => {
    const next = { ...prefs, ...patch, updated_at: new Date().toISOString() };
    setPrefsState(next); savePrefs(next);
    if (user) pushPrefs(next);
  };
  const setLang = (l: Lang) => changePrefs({ lang: l });
  const setMode = (m: Mode) => changePrefs({ mode: m });
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

  // preferences follow the account: on sign-in take the newer of device and account
  useEffect(() => {
    if (!user) return;
    let alive = true;
    pullPrefs(loadPrefs()).then(remote => {
      if (!alive) return;
      const local = loadPrefs();
      const winner = newerPrefs(local, remote);
      if (winner !== local) { setPrefsState(winner); savePrefs(winner); } else pushPrefs(local);
    });
    return () => { alive = false; };
  }, [user]);

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
  const scrollBy = (dy: number) => entryScroll.current?.scrollBy({ top: dy, behavior: "smooth" }) ?? document.querySelector(".lcd .scroll")?.scrollBy({ top: dy, behavior: "smooth" });

  const hw: Hardware = {
    // touch-first: arrows scroll; in an entry, left/right step to the previous/next species
    up: () => scrollBy(-180),
    down: () => scrollBy(180),
    left: () => { if (effectiveView === "entry") step(-1); },
    right: () => { if (effectiveView === "entry") step(1); },
    ok: () => { if (effectiveView === "entry") setPage(p => (p ? 0 : 1)); },
    b: () => {
      if (effectiveView === "entry") {
        if (stack.length) { setCur(stack[stack.length - 1]); setStack(s => s.slice(0, -1)); setPage(1); } else go("index");
      } else if (effectiveView === "catch" || effectiveView === "settings") setView(prev === "login" ? "index" : prev);
    },
    page: () => setPage(p => (p ? 0 : 1)),
    menu: () => { if (!signedIn) return; if (effectiveView === "settings") setView(prev === "login" ? "index" : prev); else go("settings"); }, // toggles
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

  // CATCH (or tapping a silhouette) hands the picked photo straight to the catch screen's cropper
  const startCatch = (f: File, forSpecies: number | null) => {
    setCatchFor(forSpecies); setCatchFile(f); setCatchKey(k => k + 1); go("catch");
  };
  // Re-crop an existing find's photo: replaces the stored image and re-syncs it
  const openRecrop = async (f: Find) => {
    let blob = await getPhoto(f.id);
    if (!blob) { const u = await photoUrl(f); if (u) blob = await fetch(u).then(r => r.blob()).catch(() => undefined); }
    if (blob) setRecrop({ find: f, blob, url: URL.createObjectURL(blob) });
  };
  const closeRecrop = () => { if (recrop) URL.revokeObjectURL(recrop.url); setRecrop(null); };
  const finishRecrop = async (a: Parameters<typeof cropToBlob>[1]) => {
    if (!recrop) return;
    const out = await cropToBlob(recrop.blob, a);
    await putPhoto(recrop.find.id, out);
    const id = recrop.find.id;
    setFinds(x => x.map(y => (y.id === id ? { ...y, photo_path: null, synced: false, updated_at: new Date().toISOString() } : y)));
    closeRecrop();
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
    onCatchFile={f => startCatch(f, curSp.inat)} onRecrop={openRecrop}
    open={sp => open(sp, true)} onDelete={f => setFinds(x => x.map(y => (y.id === f.id ? deleteFind(y) : y)))} />;
  else if (effectiveView === "catch") screen = <Catch key={catchKey} ctx={ctx} initial={catchFor} startFile={catchFile} onSave={save} onCancelEmpty={() => setView(prev === "login" ? "index" : prev)} />;
  else if (effectiveView === "settings") screen = <Settings ctx={ctx} email={user?.email ?? null} mode={mode} setLang={setLang} setMode={setMode}
    sources={data.sources} onExport={exportJson}
    onRestore={async json => {
      try { const b = parseBackup(json); setFinds(x => restoreInto(x, b)); return `${b.length} ${t("restored")}`; }
      catch { return t("badBackup"); }
    }}
    onSignOut={async () => { if (supabase) await supabase.auth.signOut(); setOffline(false); store.set("pz.offline", false); setView("index"); }} />;
  else screen = <Dex ctx={ctx} list={visible} extras={filter === "all" && !edf ? extras : []} mode={mode} filter={filter} edf={edf}
    setFilter={setFilter} setEdf={setEdf} open={sp => open(sp)} />;

  const status = !user ? (offline ? t("localOnly") : "") : syncState === "syncing" ? t("syncing") : dirty ? t("localOnly") : t("synced");
  return (
    <div onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} className="app">
      <Device hw={hw} ledFlash={flash} status={status} pageEnabled={effectiveView === "entry"}
        catchEnabled={signedIn && all.length > 0}
        onCatchFile={f => startCatch(f, effectiveView === "entry" && curSp ? curSp.inat : null)}
        labels={{ a: t("catch"), b: t("back"), page: t("page"), counter: `${core.filter(s => caught.has(s.inat)).length}/${core.length || 30}`, counterSub: t("caught") }}>
        {screen}
        {recrop && <Cropper ctx={ctx} src={recrop.url} onDone={finishRecrop} onCancel={closeRecrop} />}
        {toast && <div className="toast">{toast}</div>}
      </Device>
    </div>
  );
}
