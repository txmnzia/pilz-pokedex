import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Device, type Hardware } from "./components/Device";
import { RightPanel, type KeyItem } from "./components/RightPanel";
import { Catch, Cropper, cropToBlob, Dex, Entry, Login, Settings, type CatchDraft, type Ctx, type Filter } from "./screens";
import { STRINGS, type StringKey } from "./lib/i18n";
import { deleteFind, findsBySpecies, newFind, parseBackup, photosOf, restoreInto, touchPhoto } from "./lib/finds";
import { compress, getPhoto, loadFinds, makeThumb, putPhoto, saveFinds, store, thumbKey } from "./lib/local";
import { supabase } from "./lib/supabase";
import { photoUrlOf, pullPrefs, pushPrefs, sync } from "./lib/sync";
import { loadPrefs, newerPrefs, savePrefs, type Prefs, type Sort } from "./lib/prefs";
import type { Edibility, Find, Lang, RareEntry, RefMap, Species, SpeciesFile } from "./lib/types";
import { rareSpecies, shortNo, sortByName } from "./lib/species";

type View = "login" | "index" | "entry" | "catch" | "settings";
type Mode = "grid" | "list";

export default function App() {
  const [data, setData] = useState<SpeciesFile | null>(null);
  const [rareList, setRareList] = useState<RareEntry[]>([]);
  const [refs, setRefs] = useState<RefMap>({});
  const [prefs, setPrefsState] = useState<Prefs>(loadPrefs);
  const { lang, mode, sort } = prefs;
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
  const [recrop, setRecrop] = useState<{ find: Find; photoId: string; blob: Blob; url: string } | null>(null);
  const [page, setPage] = useState<0 | 1>(0);
  const [filter, setFilter] = useState<Filter>("all");
  const [edf, setEdf] = useState<Edibility | null>(null);
  const [finds, setFindsState] = useState<Find[]>(loadFinds);
  const [toast, setToast] = useState<string | null>(null);
  const [flash, setFlash] = useState(0);
  const [syncState, setSyncState] = useState<"idle" | "syncing" | "ok">("idle");
  const entryScroll = useRef<HTMLDivElement | null>(null);
  // Web two-panel layout from 900 px: the right panel's screen is a portal target for the current view
  const [wide, setWide] = useState(() => matchMedia("(min-width: 900px)").matches);
  useEffect(() => {
    const mq = matchMedia("(min-width: 900px)"), on = () => setWide(mq.matches);
    mq.addEventListener("change", on); return () => mq.removeEventListener("change", on);
  }, []);
  const [rightEl, setRightEl] = useState<HTMLDivElement | null>(null);
  const bookRef = useRef<HTMLDivElement | null>(null);
  // the right panel starts on the line under the left header, so the halves look like they fold together
  useLayoutEffect(() => {
    const book = bookRef.current; if (!book || !wide) return;
    const run = () => {
      const dev = book.querySelector("#device"), top = book.querySelector("#device .top");
      if (dev && top) book.style.setProperty("--rtop", `${top.getBoundingClientRect().bottom - dev.getBoundingClientRect().top - 3}px`);
    };
    run(); addEventListener("resize", run); return () => removeEventListener("resize", run);
  }, [wide]);

  const t = useCallback((k: StringKey) => STRINGS[lang][k], [lang]);
  // a user change: stamp it, keep it on the device, push it to the account
  const changePrefs = (patch: Partial<Prefs>) => {
    const next = { ...prefs, ...patch, updated_at: new Date().toISOString() };
    setPrefsState(next); savePrefs(next);
    if (user) pushPrefs(next);
  };
  const setLang = (l: Lang) => changePrefs({ lang: l });
  const setMode = (m: Mode) => changePrefs({ mode: m });
  const setSort = (s: Sort) => changePrefs({ sort: s });
  // every mutation is mirrored to localStorage immediately
  const setFinds = useCallback((f: Find[] | ((x: Find[]) => Find[])) => {
    setFindsState(old => { const n = typeof f === "function" ? f(old) : f; saveFinds(n); return n; });
  }, []);

  useEffect(() => { document.documentElement.lang = lang; }, [lang]);
  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/species.json`).then(r => r.json()).then(setData).catch(() => setData(null));
    // off-dex species the photo model knows (v0.12.0); optional: without it, finds stay dex-only
    fetch(`${import.meta.env.BASE_URL}data/rares.json`).then(r => r.json()).then(j => setRareList(j.rares ?? [])).catch(() => setRareList([]));
    // reference photos for "compare before you confirm" (v0.13.0); optional
    fetch(`${import.meta.env.BASE_URL}data/refs.json`).then(r => r.json()).then(j => setRefs(j.refs ?? {})).catch(() => setRefs({}));
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

  const rares = useMemo(() => rareSpecies(rareList, finds), [rareList, finds]);
  const all = useMemo(() => [...(data?.species ?? []), ...rares], [data, rares]);
  // Order from Settings (v0.10.5, Sam): by dex number (default) or A to Z in the UI language; PREV/NEXT follow it.
  const core = useMemo(() => { const c = all.filter(s => !s.extra); return sort === "az" ? sortByName(c, lang) : [...c].sort((a, b) => (a.no ?? 0) - (b.no ?? 0)); }, [all, lang, sort]);
  const extras = useMemo(() => { const x = all.filter(s => s.extra && s.rare == null); return sort === "az" ? sortByName(x, lang) : [...x].sort((a, b) => (a.ex ?? 0) - (b.ex ?? 0)); }, [all, lang, sort]);
  const caught = useMemo(() => findsBySpecies(finds), [finds]);
  // rares you have found, by R number (or A to Z when chosen)
  const caughtRares = useMemo(() => { const r = rares.filter(x => x.rare); return sort === "az" ? sortByName(r, lang) : r.sort((a, b) => a.rare! - b.rare!); }, [rares, sort, lang]);
  const ctx: Ctx = { t, lang, all, caught, refs, right: wide ? rightEl : null };
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
    const group = curSp.rare != null ? caughtRares : curSp.extra ? extras : core;
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
    ok: () => { if (effectiveView === "entry" && !wide) setPage(p => (p ? 0 : 1)); },
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
  const openRecrop = async (f: Find, photoId?: string) => {
    const p = photosOf(f).find(x => x.id === photoId) ?? photosOf(f)[0];
    let blob = await getPhoto(p.id);
    if (!blob) { const u = await photoUrlOf(p); if (u) blob = await fetch(u).then(r => r.blob()).catch(() => undefined); }
    if (blob) setRecrop({ find: f, photoId: p.id, blob, url: URL.createObjectURL(blob) });
  };
  const closeRecrop = () => { if (recrop) URL.revokeObjectURL(recrop.url); setRecrop(null); };
  const finishRecrop = async (a: Parameters<typeof cropToBlob>[1]) => {
    if (!recrop) return;
    const out = await cropToBlob(recrop.blob, a);
    await putPhoto(recrop.photoId, out);
    const t = await makeThumb(out); if (t) await putPhoto(thumbKey(recrop.photoId, null), t); // path resets to null below
    const { find: { id }, photoId } = recrop;
    setFinds(x => x.map(y => (y.id === id ? touchPhoto(y, photoId) : y)));
    closeRecrop();
  };

  const save = async (d: CatchDraft) => {
    // the cover keeps the find id as its photo key (same as single-photo finds); extra photos get their own ids
    const ids = d.files.map((_, i) => (i === 0 ? "" : crypto.randomUUID()));
    const f0 = newFind(d.species, { observed_on: d.observed_on, place: d.place, note: d.note, lat: d.lat, lng: d.lng });
    const f = { ...f0, photos: ids.map(id => ({ id: id || f0.id, path: null })) };
    for (const [i, file] of d.files.entries()) {
      const full = await compress(file);
      await putPhoto(f.photos[i].id, full);
      const t = await makeThumb(full); if (t) await putPhoto(thumbKey(f.photos[i].id, null), t);
    }
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
  else if (effectiveView === "settings") screen = <>{wide && dexScreen()}<Settings ctx={ctx} email={user?.email ?? null} mode={mode} sort={sort} setSort={setSort} setLang={setLang} setMode={setMode}
    sources={data.sources} onExport={exportJson}
    onRestore={async json => {
      try { const b = parseBackup(json); setFinds(x => restoreInto(x, b)); return `${b.length} ${t("restored")}`; }
      catch { return t("badBackup"); }
    }}
    onSignOut={async () => { if (supabase) await supabase.auth.signOut(); setOffline(false); store.set("pz.offline", false); setView("index"); }} /></>;
  else screen = dexScreen();
  function dexScreen() {
    return <Dex ctx={wide && effectiveView === "settings" ? { ...ctx, right: null } : ctx} gridOnly={wide && effectiveView === "settings"} list={visible} extras={filter === "all" && !edf ? extras : []}
      rares={filter !== "missing" && !edf ? caughtRares : []}
      mode={mode} filter={filter} edf={edf} setFilter={setFilter} setEdf={setEdf} open={sp => open(sp)} />;
  }
  // right panel keys: this species' finds on a species page, otherwise the latest catches
  const keyItems: KeyItem[] = (effectiveView === "entry" && curSp ? (caught.get(curSp.inat) ?? []) : finds.filter(f => !f.deleted)
    .slice().sort((a, b) => b.observed_on.localeCompare(a.observed_on) || b.created_at.localeCompare(a.created_at)))
    .map(f => ({ find: f, sp: byId(f.species)! })).filter(k => k.sp);

  const status = !user ? (offline ? t("localOnly") : "") : syncState === "syncing" ? t("syncing") : dirty ? t("localOnly") : t("synced");
  return (
    <div onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} className="app">
     <div className={`book${wide ? " wide" : ""}`} ref={bookRef}>
      <Device hw={hw} ledFlash={flash} status={status} pageEnabled={effectiveView === "entry"}
        catchEnabled={signedIn && all.length > 0}
        onCatchFile={f => startCatch(f, effectiveView === "entry" && curSp ? curSp.inat : null)}
        labels={{ a: t("catch"), b: t("back"), page: t("page"), counter: String(all.filter(s => caught.has(s.inat)).length), counterSub: t("caught") }}>
        {screen}
        {recrop && <Cropper ctx={ctx} src={recrop.url} onDone={finishRecrop} onCancel={closeRecrop} />}
        {toast && <div className="toast">{toast}</div>}
      </Device>
      {wide && <>
        <div className="hinge" aria-hidden="true"><i /><i /><i /></div>
        <RightPanel label={effectiveView === "settings" ? t("settings").toUpperCase() : t("info")} setScreen={setRightEl}
          keysTitle={effectiveView === "entry" ? t("finds").toUpperCase() : t("recent")} keys={signedIn ? keyItems : []}
          onOpen={sp => open(sp, effectiveView === "entry")} number={effectiveView === "entry" && curSp ? shortNo(curSp) : "–"}
          stepEnabled={effectiveView === "entry"} prevLabel={t("prev")} nextLabel={t("next")} onPrev={() => step(-1)} onNext={() => step(1)} />
      </>}
     </div>
    </div>
  );
}
