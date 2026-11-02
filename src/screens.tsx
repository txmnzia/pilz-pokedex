import { Fragment, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CaughtBall, EdBadge, EdIcon, Silhouette } from "./components/Art";
import { dexLabel, habitatFor, labelIn, lookalikesOf, REGION_MIN_OBS, seasonLabel, shapeOf, shortNo, textFor } from "./lib/species";
import { photoUrlOf } from "./lib/sync";
import { MAX_PHOTOS, photosOf } from "./lib/finds";
import { combineGuesses, CONFIDENT, mismatch, type Guess } from "./lib/rank";
import type { Identification } from "./lib/identify";
import EasyCrop, { type Area } from "react-easy-crop";
import { readExif } from "./lib/exif";
import type { StringKey } from "./lib/i18n";
import type { Edibility, Find, FindPhoto, Lang, MorphKey, Species } from "./lib/types";

export interface Ctx {
  t: (k: StringKey) => string;
  lang: Lang;
  all: Species[];
  caught: Map<number, Find[]>;
  /** Web two-panel layout: the right panel's screen. null on phones (everything stays on the left). */
  right: HTMLElement | null;
}
/** Content for the right panel when it exists, nothing otherwise. */
const ToRight = ({ ctx, children }: { ctx: Ctx; children: React.ReactNode }) => (ctx.right ? createPortal(children, ctx.right) : null);
export type Filter = "all" | "got" | "missing";

const name = (sp: Species, lang: Lang) => sp.names[lang];
const edKey = (ed: Edibility | null): StringKey => ed ?? "unknown";
const BADGE: Record<string, StringKey> = { edible: "bEdible", none: "bNone", toxic: "bToxic", deadly: "bDeadly", unknown: "bUnknown" };
const badge = (ctx: Ctx, ed: Edibility | null, large?: boolean) =>
  <EdBadge ed={ed} label={ctx.t(BADGE[ed ?? "unknown"])} large={large} title={ed ? ctx.t(edKey(ed)) : `${ctx.t("unknown")}: ${ctx.t("unknownHint")}`} />;

/** One photo of a find (default: its cover). */
export function Photo({ find, photo, className }: { find: Find; photo?: FindPhoto; className?: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const p = photo ?? photosOf(find)[0];
  useEffect(() => {
    let alive = true, made: string | null = null;
    photoUrlOf(p).then(u => { if (!alive) return; if (u?.startsWith("blob:")) made = u; setUrl(u); });
    return () => { alive = false; if (made) URL.revokeObjectURL(made); };
  }, [p.id, p.path, find.updated_at]);
  return url ? <img className={className} src={url} alt="" /> : <span className="photo-wait" />;
}

/** Caught: your latest photo. Not caught: black silhouette. */
function Picture({ sp, ctx, small, hint }: { sp: Species; ctx: Ctx; small?: boolean; hint?: string }) {
  const f = ctx.caught.get(sp.inat)?.[0];
  if (f) return small ? <Photo find={f} className="thumbimg" /> : (
    <div className="pic photo"><Photo find={f} /><span className="stamp">{f.observed_on}{f.place ? ` · ${f.place}` : ""}</span></div>
  );
  return small ? <Silhouette shape={shapeOf(sp)} /> : <div className="pic"><Silhouette shape={shapeOf(sp)} />{hint ? <span className="stamp">{hint}</span> : <span className="lock">???</span>}</div>;
}

/** Species page: every photo of every find (newest find first, its cover first). Swipe on the photo or use the
 *  arrows to browse (the swipe does not flip the page); tap to re-crop the photo shown. */
function Gallery({ finds, ctx, onRecrop }: { finds: Find[]; ctx: Ctx; onRecrop(f: Find, photoId: string): void }) {
  const items = finds.flatMap(f => photosOf(f).map(p => ({ f, p })));
  const [i, setI] = useState(0);
  const k = Math.min(i, items.length - 1);
  const x0 = useRef<number | null>(null);
  if (!items.length) return null;
  const { f, p } = items[k];
  const go = (d: number) => setI((k + d + items.length) % items.length);
  return (
    <div className="pic photo gallery"
      onTouchStart={e => { x0.current = e.touches[0].clientX; e.stopPropagation(); }}
      onTouchEnd={e => { e.stopPropagation(); const dx = e.changedTouches[0].clientX - (x0.current ?? e.changedTouches[0].clientX); x0.current = null; if (items.length > 1 && Math.abs(dx) > 40) go(dx < 0 ? 1 : -1); }}>
      <button type="button" className="gimg" onClick={() => onRecrop(f, p.id)} aria-label={ctx.t("crop")}><Photo find={f} photo={p} /></button>
      <span className="stamp">{f.observed_on}{items.length > 1 ? ` · ${k + 1}/${items.length}` : ""}</span>
      {items.length > 1 && <>
        <button type="button" className="garr l" aria-label={ctx.t("prev")} onClick={() => go(-1)}>‹</button>
        <button type="button" className="garr r" aria-label={ctx.t("next")} onClick={() => go(1)}>›</button>
      </>}
    </div>
  );
}

const EdPill = ({ ed, ctx }: { ed: Edibility | null; ctx: Ctx }) => (
  badge(ctx, ed, true)
);

// ---------------------------------------------------------------- login
export function Login({ ctx, configured, onSend, onOffline }: { ctx: Ctx; configured: boolean; onSend(email: string): Promise<string | null>; onOffline(): void }) {
  const [email, setEmail] = useState(() => localStorage.getItem("pz.email") || "");
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [err, setErr] = useState<string | null>(null);
  return (
    <div className="scroll">
      <div className="logo">PILZDEX</div>
      <div className="box">
        <h3>{ctx.t("loginTitle")}</h3>
        {!configured ? <p>{ctx.t("notConfigured")}</p> : state === "sent" ? <p>{ctx.t("inbox")}</p> : (
          <form onSubmit={async e => {
            e.preventDefault(); setState("sending"); setErr(null);
            try { localStorage.setItem("pz.email", email); } catch { /* ignore */ }
            const error = await onSend(email);
            if (error) { setErr(error); setState("idle"); } else setState("sent");
          }}>
            <div className="field"><label htmlFor="em">{ctx.t("email")}</label>
              <input id="em" type="email" required value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" /></div>
            <button className="cta" type="submit" disabled={state === "sending"}>{ctx.t("send")}</button>
            {err && <p className="note err">{err}</p>}
          </form>
        )}
      </div>
      {!configured && <button className="cta ghost" onClick={onOffline}>{ctx.t("offline")}</button>}
      <p className="note">{ctx.t("disclaimer")}</p>
    </div>
  );
}

// ---------------------------------------------------------------- dex
interface DexProps {
  /** web settings view: the right panel shows settings, the left dex stays a plain grid */
  gridOnly?: boolean;
  ctx: Ctx; list: Species[]; extras: Species[]; mode: "grid" | "list"; filter: Filter; edf: Edibility | null;
  setFilter(f: Filter): void; setEdf(e: Edibility | null): void; open(sp: Species): void;
}
/** Largest font size (15 -> 11 px) at which every word of a tile name sits on one line within the 2-line box. */
function fitTileNames(root: HTMLElement | null) {
  if (!root) return;
  for (const el of root.querySelectorAll<HTMLElement>(".tile .tname")) {
    let size = 15;
    el.style.fontSize = `${size}px`;
    el.classList.remove("breakall");
    const words = [...el.querySelectorAll<HTMLElement>(".w")];
    const fits = () => el.scrollHeight <= el.clientHeight + 1 && el.scrollWidth <= el.clientWidth + 1 &&
      words.every(w => w.getBoundingClientRect().width <= el.clientWidth + 0.5);
    while (!fits() && size > 11) { size -= 0.5; el.style.fontSize = `${size}px`; }
    if (!fits()) el.classList.add("breakall"); // a single word wider than the tile even at 11 px: break it rather than clip it
  }
}

/** One dex tile: number, edibility badge, picture (+ ball when caught), fitted name. Used by the dex grid and lookalikes. */
function DexTile({ sp, ctx, onOpen }: { sp: Species; ctx: Ctx; onOpen(sp: Species): void }) {
  const got = ctx.caught.has(sp.inat);
  return (
    <button className={`tile${got ? " got" : ""}${sp.extra ? " x" : ""}`} onClick={() => onOpen(sp)}>
      <span className="thead"><span className="tn">{shortNo(sp)}</span><span className="ted">{badge(ctx, sp.edibility)}</span></span>
      <span className="tart"><Picture sp={sp} ctx={ctx} small />{got && <CaughtBall caught className="cball corner" />}</span>
      <span className="tname">{name(sp, ctx.lang).split(" ").map((w, i) => <Fragment key={i}>{i ? " " : ""}<span className="w">{w}</span></Fragment>)}</span>
    </button>
  );
}

/** Refits tile names in a container on mount, font load, resize and when deps change. */
function useFitTileNames(deps: unknown[]) {
  const ref = useRef<HTMLDivElement | null>(null);
  useLayoutEffect(() => {
    const run = () => fitTileNames(ref.current);
    run();
    document.fonts?.ready.then(run); // VT323 changes widths once loaded
    window.addEventListener("resize", run);
    return () => window.removeEventListener("resize", run);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return ref;
}

export function Dex(p: DexProps) {
  const { ctx } = p;
  const gridRef = useFitTileNames([ctx.lang, p.mode, p.list, p.extras]);
  const core = ctx.all.filter(s => !s.extra);
  const n = core.filter(s => ctx.caught.has(s.inat)).length;
  const item = (sp: Species) => {
    const got = ctx.caught.has(sp.inat);
    return p.mode === "grid" ? (
      <DexTile key={sp.inat} sp={sp} ctx={ctx} onOpen={p.open} />
    ) : (
      <li key={sp.inat} className={`row${sp.extra ? " x" : ""}`} onClick={() => p.open(sp)}>
        <span className="num">{shortNo(sp)}</span><span className="thumb"><Picture sp={sp} ctx={ctx} small /></span>
        <span className="nm">{name(sp, ctx.lang)}</span><span className="ed rowed"><span className="wide">{badge(ctx, sp.edibility)}</span><span className="narrow"><EdIcon ed={sp.edibility} /></span></span>
        <CaughtBall caught={got} />
      </li>
    );
  };
  const wrap = (items: React.ReactNode[]) => p.mode === "grid" ? <div className="grid">{items}</div> : <ul className="list">{items}</ul>;
  const statusChips = (["all", "got", "missing"] as const).map(f => <button key={f} className="chip" aria-pressed={p.filter === f} onClick={() => p.setFilter(f)}>{ctx.t(f)}</button>);
  const edChips = (["edible", "none", "toxic", "deadly"] as const).map(e => (
    <button key={e} className="chip icon" aria-pressed={p.edf === e} title={ctx.t(e)} onClick={() => p.setEdf(p.edf === e ? null : e)}><span className="ed"><EdIcon ed={e} /></span></button>
  ));
  const bar = (got: number, tot: number) => <span className="bar"><i style={{ width: `${tot ? (got / tot) * 100 : 0}%` }} /></span>;
  return (
    <>
      <div className="titlebar"><span>{ctx.t("dex")}</span><span>{n}/{core.length}</span></div>
      <div className="scroll" ref={gridRef}>
        {!ctx.right && !p.gridOnly && <div className="chips one">{statusChips}<span className="sep" />{edChips}</div>}
        <ToRight ctx={ctx}>
          <div className="titlebar"><span>{ctx.t("filters")}</span><span>{p.list.length}</span></div>
          <div className="scroll">
            <div className="chips one">{statusChips}<span className="sep" />{edChips}</div>
            <div className="box"><h3>{ctx.t("progress")}</h3>
              <div className="prog"><span>{n}/{core.length}</span>{bar(n, core.length)}<span>{Math.round((n / Math.max(1, core.length)) * 100)}%</span></div></div>
            <div className="box"><h3>{ctx.t("byEd")}</h3><div className="prog">
              {(["edible", "none", "toxic", "deadly", null] as const).map(e => {
                const tot = core.filter(s => s.edibility === e), got = tot.filter(s => ctx.caught.has(s.inat)).length;
                return tot.length ? <Fragment key={String(e)}><span className="ed"><EdIcon ed={e} /></span>{bar(got, tot.length)}<span>{got}/{tot.length}</span></Fragment> : null;
              })}</div></div>
            <div className="box"><h3>{ctx.t("regions")}</h3><div className="prog">
              {(["berlin", "grenoble"] as const).map(r => {
                const tot = core.filter(s => s.regions[r] >= REGION_MIN_OBS), got = tot.filter(s => ctx.caught.has(s.inat)).length;
                return <Fragment key={r}><span>{r === "berlin" ? "Berlin" : "Grenoble"}</span>{bar(got, tot.length)}<span>{got}/{tot.length}</span></Fragment>;
              })}</div></div>
          </div>
        </ToRight>
        {wrap(p.list.map(sp => item(sp)))}
        {p.extras.length > 0 && <><h3 className="exhead">{ctx.t("exHead")} ({p.extras.length})</h3>{wrap(p.extras.map(sp => item(sp)))}</>}
      </div>
    </>
  );
}

// ---------------------------------------------------------------- entry
const MORPH_ROWS: [MorphKey, StringKey][] = [["spores", "spores"], ["cap", "cap"], ["hymenium", "hymenium"], ["stipe", "stipe"], ["ecology", "ecology"]];

export function Entry({ ctx, sp, page, open, onDelete, onCatchFile, onRecrop, scrollRef }: { ctx: Ctx; sp: Species; page: 0 | 1; open(sp: Species): void; onDelete(f: Find): void; onCatchFile(f: File): void; onRecrop(f: Find, photoId?: string): void; scrollRef: React.RefObject<HTMLDivElement | null> }) {
  const finds = ctx.caught.get(sp.inat) || [];
  const [confirm, setConfirm] = useState<string | null>(null);
  const head = <div className="titlebar"><span className="name">{name(sp, ctx.lang)}</span><span>{dexLabel(sp)}</span></div>;
  // lookalike tiles live in details(), which renders on page 2 or in the web right panel; refit when they change
  const lookRef = useFitTileNames([ctx.lang, sp.inat, page, ctx.right]);
  const dots = <div className="dots"><i className={page ? "" : "on"} /><i className={page ? "on" : ""} />&nbsp;{ctx.t("swipe")}</div>;
  const wide = !!ctx.right;
  if (page === 0 || wide) {
    const tx = textFor(sp, ctx.lang);
    return (
      <>{head}
        {wide && <ToRight ctx={ctx}>
          <div className="titlebar"><span>{dexLabel(sp)}</span><EdPill ed={sp.edibility} ctx={ctx} /></div>
          <div className="scroll">{details()}</div>
        </ToRight>}
        <div className="scroll" ref={scrollRef}>
          {finds.length
            ? <Gallery key={sp.inat} finds={finds} ctx={ctx} onRecrop={onRecrop} />
            : <label className="picbtn"><Picture sp={sp} ctx={ctx} hint={ctx.t("tapToCatch")} />
                <input type="file" accept="image/*" aria-label={ctx.t("catch")} onChange={e => { const f = e.target.files?.[0]; e.target.value = ""; if (f) onCatchFile(f); }} /></label>}
          <div className="meta"><EdPill ed={sp.edibility} ctx={ctx} />{sp.extra && <span className="chip">{ctx.t("exTag")}</span>}<span className="latin">{sp.latin}</span></div>
          {tx && <div className="box">{tx.intro}
            <p className="src"><a href={tx.url} target="_blank" rel="noreferrer">Wikipedia {tx.lang.toUpperCase()} ↗</a> · CC BY-SA</p></div>}
        </div>{!wide && dots}
      </>
    );
  }
  return <>{head}<div className="scroll" ref={scrollRef}>{details()}</div>{dots}</>;

  function details() {
  const season = seasonLabel(sp.season.months, ctx.lang);
  const max = Math.max(1, ...sp.season.histogram);
  const hab = habitatFor(sp, ctx.lang);
  const looks = lookalikesOf(sp, ctx.all);
  return (
    <>
        <div className="box">
          <div className="stat"><span>{ctx.t("season")}</span><span /><b>{season === null ? ctx.t("allYear") : season || "–"}</b></div>
          <div className="bars" aria-hidden="true">
            {sp.season.histogram.map((v, i) => <i key={i} className={sp.season.months.includes(i + 1) ? "on" : ""} style={{ height: `${Math.max(4, (v / max) * 100)}%` }} />)}
          </div>
          {MORPH_ROWS.filter(([k]) => sp.morph[k]?.length).map(([k, label]) => (
            <div className="stat" key={k}><span>{ctx.t(label)}</span><span /><b>{sp.morph[k]!.map(l => labelIn(l, ctx.lang)).join(", ")}</b></div>
          ))}
        </div>
        <div className="box"><h3>{ctx.t("where")}</h3>
          <div className="chips tight">
            {(["berlin", "grenoble"] as const).map(r => (
              <span key={r} className={`chip ${sp.regions[r] >= REGION_MIN_OBS ? "on" : "off"}`}>{r === "berlin" ? "Berlin" : "Grenoble"}</span>
            ))}
          </div>
          {hab && <>{hab.text}{hab.lang !== ctx.lang && <span className="sub"> ({ctx.t("textIn")} {hab.lang.toUpperCase()})</span>}</>}
        </div>
        {looks.length > 0 && <div className="box"><h3>{ctx.t("look")}</h3><div className="grid look" ref={lookRef}>
          {looks.map(x => <DexTile key={x.inat} sp={x} ctx={ctx} onOpen={open} />)}
        </div></div>}
        <div className="box"><h3>{ctx.t("finds")} ({finds.length})</h3>
          {finds.length ? finds.map(f => (
            <div className="find" key={f.id}>
              <span className="t"><Photo find={f} /></span>
              <span>{f.observed_on}<small>{f.place || (f.lat != null ? `${f.lat.toFixed(3)}, ${f.lng!.toFixed(3)}` : "–")}{f.note ? ` · ${f.note}` : ""}</small>
                {photosOf(f).length > 1 && <span className="fthumbs">{photosOf(f).slice(1).map(p => (
                  <button type="button" key={p.id} aria-label={ctx.t("crop")} onClick={() => onRecrop(f, p.id)}><Photo find={f} photo={p} /></button>))}</span>}</span>
              {confirm === f.id
                ? <span className="confirm">{ctx.t("confirmDel")} <button onClick={() => { onDelete(f); setConfirm(null); }}>{ctx.t("yes")}</button><button onClick={() => setConfirm(null)}>{ctx.t("no")}</button></span>
                : <span className="findbtns">
                    <button className="del" aria-label={ctx.t("crop")} onClick={() => onRecrop(f)}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 2v14a2 2 0 0 0 2 2h14M2 6h14a2 2 0 0 1 2 2v14" /></svg></button>
                    <button className="del" aria-label={ctx.t("del")} onClick={() => setConfirm(f.id)}>✕</button></span>}
            </div>
          )) : <p className="empty">{ctx.t("noFinds")}</p>}
        </div>
    </>
  );
  }
}

// ---------------------------------------------------------------- catch
export interface CatchDraft { files: Blob[]; species: number; observed_on: string; place: string; note: string; lat: number | null; lng: number | null }

const localToday = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); };
const fill = (tpl: string, v: Record<string, string>) => tpl.replace(/\{(\w+)\}/g, (_, k) => v[k] ?? "");

/** Square crop of the original photo, max 1600 px, as JPEG. */
export async function cropToBlob(src: Blob, a: Area): Promise<Blob> {
  const bmp = await createImageBitmap(src);
  const size = Math.min(1600, Math.round(a.width));
  const c = document.createElement("canvas"); c.width = c.height = size;
  const g = c.getContext("2d")!; g.imageSmoothingQuality = "high";
  g.drawImage(bmp, a.x, a.y, a.width, a.height, 0, 0, size, size); bmp.close();
  return new Promise<Blob>((res, rej) => c.toBlob(b => (b ? res(b) : rej(new Error("crop failed"))), "image/jpeg", 0.9));
}

export function Cropper({ ctx, src, onDone, onCancel, onOther }: { ctx: Ctx; src: string; onDone(a: Area): void; onCancel(): void; onOther?(f: File): void }) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [area, setArea] = useState<Area | null>(null);
  return (
    <div className="cropper" role="dialog" aria-label={ctx.t("crop")}>
      <div className="croparea">
        <EasyCrop image={src} crop={crop} zoom={zoom} maxZoom={6} aspect={1} objectFit="cover" zoomSpeed={0.4}
          onCropChange={setCrop} onZoomChange={setZoom} onCropComplete={(_, px) => setArea(px)} />
      </div>
      <p className="crophint">{ctx.t("cropHint")}</p>
      <div className={`srcrow${onOther ? " three" : ""}`}>
        <button type="button" className="cta ghost" onClick={onCancel}>{ctx.t("cancel")}</button>
        {onOther && <label className="cta ghost filebtn">{ctx.t("otherPhoto")}
          <input type="file" accept="image/*" onChange={e => { const f = e.target.files?.[0]; e.target.value = ""; if (f) onOther(f); }} /></label>}
        <button type="button" className="cta" disabled={!area} onClick={() => area && onDone(area)}>{ctx.t("useCrop")}</button>
      </div>
    </div>
  );
}

/** One photo button (the OS offers camera or library), crop, then identification:
 *  opened from a species page = verify silently and only warn on a likely mix-up;
 *  opened from the list = suggest the top 3. */
/** One photo in the catch form: the original (for re-cropping), the crop, and its own identification. */
interface Shot { key: number; orig: File; origUrl: string; blob: Blob | null; url: string | null; guesses: Guess[] | null }

export function Catch({ ctx, initial, startFile, onSave, onCancelEmpty }: { ctx: Ctx; initial: number | null; startFile: File | null; onSave(d: CatchDraft): void; onCancelEmpty(): void }) {
  const [shots, setShots] = useState<Shot[]>([]);
  const [cropKey, setCropKey] = useState<number | null>(null); // shot being cropped
  const [species, setSpecies] = useState<number | null>(initial);
  const [date, setDate] = useState(localToday);
  const place = "";
  const note = "";
  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(null);
  const [msg, setMsg] = useState("");
  const [identErr, setIdentErr] = useState(false);
  const [known, setKnown] = useState<ReadonlySet<string> | null>(null);
  const [dismissed, setDismissed] = useState<string | null>(null);
  const verify = initial != null;
  const nextKey = useRef(1);
  const shotsRef = useRef(shots); shotsRef.current = shots;
  useEffect(() => () => { for (const x of shotsRef.current) { URL.revokeObjectURL(x.origUrl); if (x.url) URL.revokeObjectURL(x.url); } }, []);
  const byLatin = new Map(ctx.all.map(s => [s.latin, s]));
  const byId = new Map(ctx.all.map(s => [s.inat, s]));
  const spName = (g: Guess) => { const s = byLatin.get(g.latin); return s ? name(s, ctx.lang) : g.common ? `${g.latin} (${g.common})` : g.latin; };

  // identification: each cropped photo on its own, then combined (geometric mean, see combineGuesses)
  const done = shots.filter(x => x.guesses);
  const busy = shots.some(x => x.blob && !x.guesses) && !identErr;
  const guesses = combineGuesses(done.map(x => x.guesses!));
  const ident: "idle" | "busy" | "done" | "error" = identErr && !done.length ? "error" : busy ? "busy" : done.length ? "done" : "idle";
  const result: Identification | null = done.length && known ? { guesses, known } : null;
  const runIdentify = async (key: number, f: Blob) => {
    setDismissed(null);
    try {
      const { identify } = await import("./lib/identify");
      const r = await identify(f);
      setKnown(r.known);
      setShots(xs => {
        const next = xs.map(x => (x.key === key ? { ...x, guesses: r.guesses } : x));
        const all = combineGuesses(next.filter(x => x.guesses).map(x => x.guesses!));
        const top = all[0] && byLatin.get(all[0].latin);
        if (!verify && top && all[0].p >= CONFIDENT) setSpecies(s => s ?? top.inat); // suggest mode: preselect when confident
        return next;
      });
    } catch (e) { console.warn("identify failed", e); setIdentErr(true); }
  };
  const locate = () => navigator.geolocation?.getCurrentPosition(
    p => { setPos({ lat: p.coords.latitude, lng: p.coords.longitude }); setMsg(ctx.t("gpsOk")); },
    () => setMsg(ctx.t("gpsFail")), { enableHighAccuracy: true, timeout: 15000 });

  // The OS decides camera or library, so the FIRST photo's own metadata decides date/place:
  // an older photo keeps its date and stored place (never today's GPS); a fresh one gets today + current GPS.
  const readMeta = async (f: File) => {
    const meta = readExif(await f.arrayBuffer());
    const gps = meta.lat != null && meta.lng != null ? { lat: meta.lat, lng: meta.lng } : null;
    if (meta.date && meta.date !== localToday()) { setDate(meta.date); setPos(gps); }
    else { setDate(localToday()); setMsg(""); if (gps) setPos(gps); else { setPos(null); locate(); } }
  };
  /** New photo (replace = re-pick the original of an existing shot from the cropper's "Other photo"). */
  const pick = async (f: File | undefined, replace?: number) => {
    if (!f) return;
    if (replace != null) {
      setShots(xs => xs.map(x => { if (x.key !== replace) return x; URL.revokeObjectURL(x.origUrl); return { ...x, orig: f, origUrl: URL.createObjectURL(f) }; }));
      if (shotsRef.current[0]?.key === replace) readMeta(f);
      return;
    }
    if (shotsRef.current.length >= MAX_PHOTOS) return;
    const key = nextKey.current++;
    const first = shotsRef.current.length === 0;
    setShots(xs => [...xs, { key, orig: f, origUrl: URL.createObjectURL(f), blob: null, url: null, guesses: null }]);
    setCropKey(key);
    if (first) readMeta(f);
  };
  const started = useRef(false);
  useEffect(() => { if (startFile && !started.current) { started.current = true; pick(startFile); } });
  const cropping = shots.find(x => x.key === cropKey) ?? null;
  const finishCrop = async (a: Area) => {
    const shot = cropping; setCropKey(null);
    if (!shot) return;
    const blob = await cropToBlob(shot.orig, a);
    setShots(xs => xs.map(x => { if (x.key !== shot.key) return x; if (x.url) URL.revokeObjectURL(x.url); return { ...x, blob, url: URL.createObjectURL(blob), guesses: null }; }));
    runIdentify(shot.key, blob);
  };
  const cancelCrop = () => {
    const shot = cropping; setCropKey(null);
    if (shot && !shot.blob) { // a photo that was never cropped is dropped
      URL.revokeObjectURL(shot.origUrl);
      const rest = shotsRef.current.filter(x => x.key !== shot.key);
      setShots(rest);
      if (!rest.length) onCancelEmpty();
    }
  };
  const remove = (key: number) => setShots(xs => { const x = xs.find(y => y.key === key); if (x) { URL.revokeObjectURL(x.origUrl); if (x.url) URL.revokeObjectURL(x.url); } return xs.filter(y => y.key !== key); });
  const ready = shots.filter(x => x.blob);
  /** Put a cropped photo at position idx among the cropped ones (the first one is the cover). */
  const moveTo = (key: number, idx: number) => setShots(xs => {
    const done = xs.filter(x => x.blob && x.key !== key), moving = xs.find(x => x.key === key);
    if (!moving) return xs;
    done.splice(Math.max(0, Math.min(idx, done.length)), 0, moving);
    return [...done, ...xs.filter(x => !x.blob)];
  });
  // Drag to reorder (pointer events: iOS Safari has no HTML drag and drop on touch). A tap without movement = crop.
  const strip = useRef<HTMLDivElement | null>(null);
  const drag = useRef<{ key: number; from: number; x0: number; y0: number; moved: boolean; slots: DOMRect[] } | null>(null);
  const [dragView, setDragView] = useState<{ key: number; to: number; dx: number; dy: number } | null>(null);
  const onDown = (e: React.PointerEvent, key: number, from: number) => {
    if ((e.target as Element).closest(".shx") || e.button > 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const slots = [...(strip.current?.querySelectorAll(".sh:not(.add)") ?? [])].map(el => el.getBoundingClientRect());
    drag.current = { key, from, x0: e.clientX, y0: e.clientY, moved: false, slots };
  };
  const onMove = (e: React.PointerEvent) => {
    const d = drag.current; if (!d) return;
    const dx = e.clientX - d.x0, dy = e.clientY - d.y0;
    if (!d.moved && Math.hypot(dx, dy) < 8) return;
    d.moved = true;
    const to = d.slots.filter((r, i) => i !== d.from && r.left + r.width / 2 < e.clientX).length;
    setDragView({ key: d.key, to, dx, dy });
  };
  const onUp = () => {
    const d = drag.current; drag.current = null;
    if (!d) return;
    if (d.moved) { if (dragView) moveTo(d.key, dragView.to); } else setCropKey(d.key);
    setDragView(null);
  };
  const onCancelDrag = () => { drag.current = null; setDragView(null); };
  // order shown while dragging: the dragged photo already sits in its target slot and follows the finger
  const shown = (() => {
    if (!dragView) return ready;
    const rest = ready.filter(x => x.key !== dragView.key), me = ready.find(x => x.key === dragView.key)!;
    rest.splice(dragView.to, 0, me); return rest;
  })();
  const dragStyle = (key: number, slot: number): React.CSSProperties | undefined => {
    const d = drag.current;
    if (!dragView || dragView.key !== key || !d) return undefined;
    const from = d.slots[d.from], to = d.slots[slot] ?? from;
    return { transform: `translate(${from.left + dragView.dx - to.left}px, ${dragView.dy}px) scale(1.08)`, zIndex: 3 };
  };

  const sel = species != null ? byId.get(species) : undefined;
  const warn = ident === "done" && result && sel && verify ? mismatch(result.guesses, sel.latin, result.known) : null;
  const warnKey = warn && sel ? `${sel.inat}:${warn.latin}` : null;
  const warnSp = warn ? byLatin.get(warn.latin) : undefined;
  const sorted = [...ctx.all].sort((a, b) => (a.extra === b.extra ? (a.no ?? a.ex!) - (b.no ?? b.ex!) : a.extra ? 1 : -1));
  const submit = () => {
    if (!ready.length) { setMsg(ctx.t("photoNeeded")); return; }
    if (species == null) { setMsg(ctx.t("pickSpecies")); return; }
    onSave({ files: ready.map(x => x.blob!), species, observed_on: date, place, note, lat: pos?.lat ?? null, lng: pos?.lng ?? null });
  };

  const warnBox = verify && warn && warnKey !== dismissed && (
    <div className="box warnbox" role="alert" ref={el => el?.scrollIntoView({ block: "nearest", behavior: "smooth" })}>
      <p className="m0">{fill(ctx.t("areYouSure"), { x: sel ? name(sel, ctx.lang) : "", y: spName(warn), p: `${Math.round(warn.p * 100)}%` })}</p>
      <div className="srcrow">
        {warnSp
          ? <button type="button" className="cta" onClick={() => setSpecies(warnSp.inat)}>{fill(ctx.t("switchTo"), { y: name(warnSp, ctx.lang) })}</button>
          : <span className="note">{ctx.t("notInDex")}</span>}
        <button type="button" className="cta ghost" onClick={() => setDismissed(warnKey)}>{fill(ctx.t("keep"), { x: sel ? name(sel, ctx.lang) : "" })}</button>
      </div>
    </div>
  );

  const cover = ready[0];
  const addLabel = (cls: string, content: React.ReactNode) => (
    <label className={cls}>{content}
      <input type="file" accept="image/*" aria-label={ctx.t("addPhoto")} onChange={e => { pick(e.target.files?.[0]); e.target.value = ""; }} /></label>);
  const camera = <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></svg>;
  const photoPart = <>
    {cover
      ? <button type="button" className="shot" onClick={() => setCropKey(cover.key)} aria-label={ctx.t("crop")}>
          <img src={cover.url!} alt="" /><span className="stamp">{ctx.t("tapToChange")}</span></button>
      : addLabel("cta srcbtn", <>{camera}{ctx.t("addPhoto")}</>)}
    {cover && <div className="shots" ref={strip} aria-label={ctx.t("photos")}>
      {shown.map((x, slot) => {
        const i = ready.indexOf(x);
        return (
          <div key={x.key} className={`sh${dragView?.key === x.key ? " dragging" : ""}`} style={dragStyle(x.key, slot)}
            role="button" tabIndex={0} aria-label={`${ctx.t("crop")} ${i + 1}/${ready.length}`}
            onPointerDown={e => onDown(e, x.key, i)} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onCancelDrag}
            onKeyDown={e => {
              if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setCropKey(x.key); }
              if (e.key === "ArrowLeft" || e.key === "ArrowRight") { e.preventDefault(); moveTo(x.key, i + (e.key === "ArrowLeft" ? -1 : 1)); }
            }}>
            <img src={x.url!} alt="" draggable={false} />
            <button type="button" className="shx" aria-label={ctx.t("removePhoto")} onClick={() => remove(x.key)}>✕</button>
          </div>);
      })}
      {shots.length < MAX_PHOTOS && addLabel("sh add", <><span aria-hidden="true">+</span><small>{ctx.t("addPhoto")}</small></>)}
    </div>}
    {cover && <p className="note autometa">{date} · GPS {pos ? "✓" : "–"}{ready.length > 1 ? ` · ${ctx.t("dragToReorder")}` : ready.length < MAX_PHOTOS ? ` · ${ctx.t("morePhotos")}` : ""}</p>}
  </>;

  const formPart = <>
    {!verify && ident !== "idle" && (
      <div className="box ident" aria-live="polite">
        <h3>{ctx.t("suggestion")}</h3>
        {ident === "busy" && <p className="m0">{ctx.t("analysing")}</p>}
        {ident === "error" && <p className="m0">{ctx.t("idFailed")}</p>}
        {ident === "done" && result && (result.guesses.length === 0 ? <p className="m0">{ctx.t("notSure")}</p> : <>
          <p className="m0">{result.guesses[0].p >= CONFIDENT ? ctx.t("probably") : ctx.t("notSure")}{done.length > 1 ? <small> ({fill(ctx.t("fromPhotos"), { n: String(done.length) })})</small> : null}</p>
          <div className="guesses">
            {result.guesses.slice(0, 3).map(g => {
              const sp = byLatin.get(g.latin);
              const pct = `${Math.round(g.p * 100)}%`;
              return sp
                ? <button type="button" key={g.latin} className="guess" aria-pressed={species === sp.inat} onClick={() => setSpecies(sp.inat)}>
                    <span className="ed"><EdIcon ed={sp.edibility} /></span><span className="gname">{name(sp, ctx.lang)}</span><b>{pct}</b></button>
                : <div key={g.latin} className="guess off">
                    <span className="ed" /><span className="gname"><i>{g.latin}</i><small>{ctx.t("notInDex")}</small></span><b>{pct}</b></div>;
            })}
          </div>
          <p className="note">{ctx.t("idDisclaimer")}</p>
        </>)}
      </div>
    )}
    <div className="field"><label htmlFor="spc">{ctx.t("species")}</label>
      <select id="spc" value={species ?? ""} onChange={e => setSpecies(e.target.value ? Number(e.target.value) : null)}>
        {species == null && <option value="">{ctx.t("choose")}</option>}
        {sorted.map(sp => <option key={sp.inat} value={sp.inat}>{dexLabel(sp)} {name(sp, ctx.lang)}</option>)}
      </select></div>
    <button className="cta" type="button" onClick={submit}>{ctx.t("save")}</button>
    <p className="note" id="catchMsg" aria-live="polite">{msg}</p>
  </>;

  return (
    <>
      <div className="titlebar"><span>{ctx.t("catch")}</span>{sel && verify && <span className="name">{name(sel, ctx.lang)}</span>}</div>
      <div className="scroll">
        <form onSubmit={e => { e.preventDefault(); submit(); }}>
          {!ctx.right && warnBox}
          {photoPart}
          {!ctx.right && formPart}
        </form>
      </div>
      <ToRight ctx={ctx}>
        <div className="titlebar"><span>{ctx.t(verify ? "species" : "suggestion")}</span></div>
        <div className="scroll">{warnBox}{formPart}</div>
      </ToRight>
      {cropping && <Cropper key={cropping.key + cropping.origUrl} ctx={ctx} src={cropping.origUrl} onDone={finishCrop} onOther={f => pick(f, cropping.key)} onCancel={cancelCrop} />}
    </>
  );
}

// ---------------------------------------------------------------- settings
export function Settings({ ctx, email, mode, setLang, setMode, onSignOut, onExport, onRestore, sources }: {
  ctx: Ctx; email: string | null; mode: "grid" | "list"; setLang(l: Lang): void; setMode(m: "grid" | "list"): void;
  onSignOut(): void; onExport(): void; onRestore(json: string): Promise<string>; sources: Record<string, string>;
}) {
  const [msg, setMsg] = useState("");
  const body = (
    <>
      <div className="titlebar"><span>{ctx.t("settings")}</span></div>
      <div className="scroll">
        <div className="box"><h3>{ctx.t("language")}</h3><div className="seg">
          {(["fr", "en", "de"] as const).map(l => <button key={l} aria-pressed={ctx.lang === l} onClick={() => setLang(l)}>{l.toUpperCase()}</button>)}
        </div></div>
        <div className="box"><h3>{ctx.t("view")}</h3><div className="seg">
          {(["grid", "list"] as const).map(m => <button key={m} aria-pressed={mode === m} onClick={() => setMode(m)}>{ctx.t(m)}</button>)}
        </div></div>
        <div className="box"><h3>{ctx.t("account")}</h3>
          <p className="m0">{email ?? ctx.t("localOnly")}</p>
          <button className="cta" onClick={onSignOut}>{ctx.t("signout")}</button></div>
        <div className="box"><h3>{ctx.t("export")}</h3><button className="cta" onClick={onExport}>{ctx.t("download")}</button>
          <label className="cta ghost filebtn">{ctx.t("restore")}<input type="file" accept="application/json,.json" onChange={async e => {
            const f = e.target.files?.[0]; e.target.value = ""; if (!f) return;
            setMsg(await onRestore(await f.text()));
          }} /></label>{msg && <p className="note">{msg}</p>}</div>
        <div className="box"><h3>{ctx.t("credits")}</h3>
          <ul className="credits">{Object.entries(sources).map(([k, v]) => <li key={k}>{v}</li>)}<li>{ctx.t("idCredit")}</li></ul></div>
        <p className="note">{ctx.t("disclaimer")}</p>
      </div>
    </>
  );
  return ctx.right ? createPortal(body, ctx.right) : body;
}
