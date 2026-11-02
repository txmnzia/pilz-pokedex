import { Fragment, useEffect, useLayoutEffect, useRef, useState } from "react";
import { EdIcon, Silhouette } from "./components/Art";
import { dexLabel, habitatFor, labelIn, lookalikesOf, REGION_MIN_OBS, seasonLabel, shapeOf, shortNo, textFor } from "./lib/species";
import { photoUrl } from "./lib/sync";
import { CONFIDENT, mismatch, type Guess } from "./lib/rank";
import type { Identification } from "./lib/identify";
import EasyCrop, { type Area } from "react-easy-crop";
import { readExif } from "./lib/exif";
import type { StringKey } from "./lib/i18n";
import type { Edibility, Find, Lang, MorphKey, Species } from "./lib/types";

export interface Ctx {
  t: (k: StringKey) => string;
  lang: Lang;
  all: Species[];
  caught: Map<number, Find[]>;
}
export type Filter = "all" | "got" | "missing";

const name = (sp: Species, lang: Lang) => sp.names[lang];
const edKey = (ed: Edibility | null): StringKey => ed ?? "unknown";

function Photo({ find, className }: { find: Find; className?: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let alive = true, made: string | null = null;
    photoUrl(find).then(u => { if (!alive) return; if (u?.startsWith("blob:")) made = u; setUrl(u); });
    return () => { alive = false; if (made) URL.revokeObjectURL(made); };
  }, [find.id, find.photo_path, find.updated_at]);
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

const EdPill = ({ ed, ctx }: { ed: Edibility | null; ctx: Ctx }) => (
  <span className={`edpill ${ed ?? "unknown"}`} title={ed ? undefined : ctx.t("unknownHint")}><EdIcon ed={ed} />{ctx.t(edKey(ed))}</span>
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

export function Dex(p: DexProps) {
  const { ctx } = p;
  const gridRef = useRef<HTMLDivElement | null>(null);
  useLayoutEffect(() => {
    const run = () => fitTileNames(gridRef.current);
    run();
    document.fonts?.ready.then(run); // VT323 changes widths once loaded
    window.addEventListener("resize", run);
    return () => window.removeEventListener("resize", run);
  }, [ctx.lang, p.mode, p.list, p.extras]);
  const core = ctx.all.filter(s => !s.extra);
  const n = core.filter(s => ctx.caught.has(s.inat)).length;
  const item = (sp: Species) => {
    const got = ctx.caught.has(sp.inat);
    return p.mode === "grid" ? (
      <button key={sp.inat} className={`tile${got ? " got" : ""}${sp.extra ? " x" : ""}`} onClick={() => p.open(sp)}>
        <span className="thead"><span className="tn">{shortNo(sp)}</span><span className="ted"><EdIcon ed={sp.edibility} /></span></span>
        <span className="tart"><Picture sp={sp} ctx={ctx} small /></span>
        <span className="tname">{name(sp, ctx.lang).split(" ").map((w, i) => <Fragment key={i}>{i ? " " : ""}<span className="w">{w}</span></Fragment>)}</span>
      </button>
    ) : (
      <li key={sp.inat} className={`row${sp.extra ? " x" : ""}`} onClick={() => p.open(sp)}>
        <span className="num">{shortNo(sp)}</span><span className="thumb"><Picture sp={sp} ctx={ctx} small /></span>
        <span className="nm">{name(sp, ctx.lang)}</span><span className="ed"><EdIcon ed={sp.edibility} /></span>
        <span className={`ball${got ? " on" : ""}`} />
      </li>
    );
  };
  const wrap = (items: React.ReactNode[]) => p.mode === "grid" ? <div className="grid">{items}</div> : <ul className="list">{items}</ul>;
  return (
    <>
      <div className="titlebar"><span>{ctx.t("dex")}</span><span>{n}/{core.length}</span></div>
      <div className="scroll" ref={gridRef}>
        <div className="chips">
          {(["all", "got", "missing"] as const).map(f => <button key={f} className="chip" aria-pressed={p.filter === f} onClick={() => p.setFilter(f)}>{ctx.t(f)}</button>)}
        </div>
        <div className="chips">
          {(["edible", "none", "toxic", "deadly"] as const).map(e => (
            <button key={e} className="chip" aria-pressed={p.edf === e} title={ctx.t(e)} onClick={() => p.setEdf(p.edf === e ? null : e)}><span className="ed"><EdIcon ed={e} /></span></button>
          ))}
        </div>
        {wrap(p.list.map(sp => item(sp)))}
        {p.extras.length > 0 && <><h3 className="exhead">{ctx.t("exHead")} ({p.extras.length})</h3>{wrap(p.extras.map(sp => item(sp)))}</>}
      </div>
    </>
  );
}

// ---------------------------------------------------------------- entry
const MORPH_ROWS: [MorphKey, StringKey][] = [["spores", "spores"], ["cap", "cap"], ["hymenium", "hymenium"], ["stipe", "stipe"], ["ecology", "ecology"]];

export function Entry({ ctx, sp, page, open, onDelete, onCatchFile, onRecrop, scrollRef }: { ctx: Ctx; sp: Species; page: 0 | 1; open(sp: Species): void; onDelete(f: Find): void; onCatchFile(f: File): void; onRecrop(f: Find): void; scrollRef: React.RefObject<HTMLDivElement | null> }) {
  const finds = ctx.caught.get(sp.inat) || [];
  const [confirm, setConfirm] = useState<string | null>(null);
  const head = <div className="titlebar"><span className="name">{name(sp, ctx.lang)}</span><span>{dexLabel(sp)}</span></div>;
  const dots = <div className="dots"><i className={page ? "" : "on"} /><i className={page ? "on" : ""} />&nbsp;{ctx.t("swipe")}</div>;
  if (page === 0) {
    const tx = textFor(sp, ctx.lang);
    return (
      <>{head}
        <div className="scroll" ref={scrollRef}>
          {finds.length
            ? <button type="button" className="picbtn" onClick={() => onRecrop(finds[0])} aria-label={ctx.t("crop")}><Picture sp={sp} ctx={ctx} /></button>
            : <label className="picbtn"><Picture sp={sp} ctx={ctx} hint={ctx.t("tapToCatch")} />
                <input type="file" accept="image/*" aria-label={ctx.t("catch")} onChange={e => { const f = e.target.files?.[0]; e.target.value = ""; if (f) onCatchFile(f); }} /></label>}
          <div className="meta"><EdPill ed={sp.edibility} ctx={ctx} />{sp.extra && <span className="chip">{ctx.t("exTag")}</span>}<span className="latin">{sp.latin}</span></div>
          {tx && <div className="box">{tx.intro}
            <p className="src"><a href={tx.url} target="_blank" rel="noreferrer">Wikipedia {tx.lang.toUpperCase()} ↗</a> · CC BY-SA</p></div>}
        </div>{dots}
      </>
    );
  }
  const season = seasonLabel(sp.season.months, ctx.lang);
  const max = Math.max(1, ...sp.season.histogram);
  const hab = habitatFor(sp, ctx.lang);
  const looks = lookalikesOf(sp, ctx.all);
  return (
    <>{head}
      <div className="scroll" ref={scrollRef}>
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
        {looks.length > 0 && <div className="box"><h3>{ctx.t("look")}</h3><div className="look">
          {looks.map(x => (
            <button key={x.inat} className="lk" onClick={() => open(x)}>
              <Picture sp={x} ctx={ctx} small /><span>{name(x, ctx.lang)}</span>
              <span className="ed"><EdIcon ed={x.edibility} /></span><span className="sub tiny">{dexLabel(x)}</span>
            </button>
          ))}
        </div></div>}
        <div className="box"><h3>{ctx.t("finds")} ({finds.length})</h3>
          {finds.length ? finds.map(f => (
            <div className="find" key={f.id}>
              <span className="t"><Photo find={f} /></span>
              <span>{f.observed_on}<small>{f.place || (f.lat != null ? `${f.lat.toFixed(3)}, ${f.lng!.toFixed(3)}` : "–")}{f.note ? ` · ${f.note}` : ""}</small></span>
              {confirm === f.id
                ? <span className="confirm">{ctx.t("confirmDel")} <button onClick={() => { onDelete(f); setConfirm(null); }}>{ctx.t("yes")}</button><button onClick={() => setConfirm(null)}>{ctx.t("no")}</button></span>
                : <span className="findbtns">
                    <button className="del" aria-label={ctx.t("crop")} onClick={() => onRecrop(f)}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 2v14a2 2 0 0 0 2 2h14M2 6h14a2 2 0 0 1 2 2v14" /></svg></button>
                    <button className="del" aria-label={ctx.t("del")} onClick={() => setConfirm(f.id)}>✕</button></span>}
            </div>
          )) : <p className="empty">{ctx.t("noFinds")}</p>}
        </div>
      </div>{dots}
    </>
  );
}

// ---------------------------------------------------------------- catch
export interface CatchDraft { file: Blob; species: number; observed_on: string; place: string; note: string; lat: number | null; lng: number | null }

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

export function Cropper({ ctx, src, onDone, onCancel }: { ctx: Ctx; src: string; onDone(a: Area): void; onCancel(): void }) {
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
      <div className="srcrow">
        <button type="button" className="cta ghost" onClick={onCancel}>{ctx.t("cancel")}</button>
        <button type="button" className="cta" disabled={!area} onClick={() => area && onDone(area)}>{ctx.t("useCrop")}</button>
      </div>
    </div>
  );
}

/** One photo button (the OS offers camera or library), crop, then identification:
 *  opened from a species page = verify silently and only warn on a likely mix-up;
 *  opened from the list = suggest the top 3. */
export function Catch({ ctx, initial, startFile, onSave, onCancelEmpty }: { ctx: Ctx; initial: number | null; startFile: File | null; onSave(d: CatchDraft): void; onCancelEmpty(): void }) {
  const [orig, setOrig] = useState<File | null>(null);
  const [origUrl, setOrigUrl] = useState<string | null>(null);
  const [cropping, setCropping] = useState(false);
  const [file, setFile] = useState<Blob | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [species, setSpecies] = useState<number | null>(initial);
  const [date, setDate] = useState(localToday);
  const [place, setPlace] = useState("");
  const [note, setNote] = useState("");
  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(null);
  const [msg, setMsg] = useState("");
  const [ident, setIdent] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [result, setResult] = useState<Identification | null>(null);
  const [dismissed, setDismissed] = useState<string | null>(null);
  const verify = initial != null;
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  useEffect(() => () => { if (origUrl) URL.revokeObjectURL(origUrl); }, [origUrl]);
  const byLatin = new Map(ctx.all.map(s => [s.latin, s]));
  const byId = new Map(ctx.all.map(s => [s.inat, s]));
  const spName = (g: Guess) => { const s = byLatin.get(g.latin); return s ? name(s, ctx.lang) : g.common ? `${g.latin} (${g.common})` : g.latin; };

  const runIdentify = async (f: Blob) => {
    setIdent("busy"); setResult(null); setDismissed(null);
    try {
      const { identify } = await import("./lib/identify");
      const r = await identify(f);
      setResult(r); setIdent("done");
      const top = r.guesses[0] && byLatin.get(r.guesses[0].latin);
      if (!verify && top && r.guesses[0].p >= CONFIDENT) setSpecies(s => s ?? top.inat); // suggest mode: preselect when confident
    } catch (e) { console.warn("identify failed", e); setIdent("error"); }
  };
  const locate = () => navigator.geolocation?.getCurrentPosition(
    p => { setPos({ lat: p.coords.latitude, lng: p.coords.longitude }); setMsg(ctx.t("gpsOk")); },
    () => setMsg(ctx.t("gpsFail")), { enableHighAccuracy: true, timeout: 15000 });

  // The OS decides camera or library, so the photo's own metadata decides date/place:
  // an older photo keeps its date and stored place (never today's GPS); a fresh one gets today + current GPS.
  const pick = async (f: File | undefined) => {
    if (!f) return;
    setOrig(f); setOrigUrl(URL.createObjectURL(f)); setCropping(true);
    const meta = readExif(await f.arrayBuffer());
    const gps = meta.lat != null && meta.lng != null ? { lat: meta.lat, lng: meta.lng } : null;
    if (meta.date && meta.date !== localToday()) {
      setDate(meta.date); setPos(gps);
      setMsg(gps ? ctx.t("fromPhotoMeta") : ctx.t("fromPhotoDate"));
    } else {
      setDate(localToday()); setMsg("");
      if (gps) { setPos(gps); setMsg(ctx.t("fromPhotoMeta")); } else { setPos(null); locate(); }
    }
  };
  const started = useRef(false);
  useEffect(() => { if (startFile && !started.current) { started.current = true; pick(startFile); } });
  const finishCrop = async (a: Area) => {
    setCropping(false);
    const blob = await cropToBlob(orig!, a);
    setFile(blob); setPreview(URL.createObjectURL(blob)); runIdentify(blob);
  };

  const sel = species != null ? byId.get(species) : undefined;
  const warn = ident === "done" && result && sel && verify ? mismatch(result.guesses, sel.latin, result.known) : null;
  const warnKey = warn && sel ? `${sel.inat}:${warn.latin}` : null;
  const warnSp = warn ? byLatin.get(warn.latin) : undefined;
  const sorted = [...ctx.all].sort((a, b) => (a.extra === b.extra ? (a.no ?? a.ex!) - (b.no ?? b.ex!) : a.extra ? 1 : -1));
  return (
    <>
      <div className="titlebar"><span>{ctx.t("catch")}</span>{sel && verify && <span className="name">{name(sel, ctx.lang)}</span>}</div>
      <div className="scroll">
        <form onSubmit={e => {
          e.preventDefault();
          if (!file) { setMsg(ctx.t("photoNeeded")); return; }
          if (species == null) { setMsg(ctx.t("pickSpecies")); return; }
          onSave({ file, species, observed_on: date, place, note, lat: pos?.lat ?? null, lng: pos?.lng ?? null });
        }}>
          {verify && warn && warnKey !== dismissed && (
            <div className="box warnbox" role="alert" ref={el => el?.scrollIntoView({ block: "nearest", behavior: "smooth" })}>
              <p className="m0">{fill(ctx.t("areYouSure"), { x: sel ? name(sel, ctx.lang) : "", y: spName(warn), p: `${Math.round(warn.p * 100)}%` })}</p>
              <div className="srcrow">
                {warnSp
                  ? <button type="button" className="cta" onClick={() => setSpecies(warnSp.inat)}>{fill(ctx.t("switchTo"), { y: name(warnSp, ctx.lang) })}</button>
                  : <span className="note">{ctx.t("notInDex")}</span>}
                <button type="button" className="cta ghost" onClick={() => setDismissed(warnKey)}>{fill(ctx.t("keep"), { x: sel ? name(sel, ctx.lang) : "" })}</button>
              </div>
            </div>
          )}

          {preview && <button type="button" className="shot" onClick={() => setCropping(true)} aria-label={ctx.t("crop")}>
            <img src={preview} alt="" /><span className="stamp">{ctx.t("tapToCrop")}</span></button>}
          <label className="cta srcbtn"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></svg>
            {preview ? ctx.t("otherPhoto") : ctx.t("addPhoto")}
            <input id="ph" type="file" accept="image/*" onChange={e => { pick(e.target.files?.[0]); e.target.value = ""; }} /></label>

          {!verify && ident !== "idle" && (
            <div className="box ident" aria-live="polite">
              <h3>{ctx.t("suggestion")}</h3>
              {ident === "busy" && <p className="m0">{ctx.t("analysing")}</p>}
              {ident === "error" && <p className="m0">{ctx.t("idFailed")}</p>}
              {ident === "done" && result && (result.guesses.length === 0 ? <p className="m0">{ctx.t("notSure")}</p> : <>
                <p className="m0">{result.guesses[0].p >= CONFIDENT ? ctx.t("probably") : ctx.t("notSure")}</p>
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
          <div className="field"><label htmlFor="dt">{ctx.t("date")}</label><input id="dt" type="date" value={date} onChange={e => setDate(e.target.value)} /></div>
          <div className="field"><label htmlFor="pl">{ctx.t("place")}</label>
            <div className="inrow"><input id="pl" value={place} placeholder={ctx.t("placeHint")} onChange={e => setPlace(e.target.value)} />
              <button type="button" className="chip" onClick={locate} aria-pressed={!!pos}>📍 GPS</button></div></div>
          <div className="field"><label htmlFor="nt">{ctx.t("note")}</label><input id="nt" value={note} onChange={e => setNote(e.target.value)} /></div>
          <button className="cta" type="submit">{ctx.t("save")}</button>
          <p className="note" id="catchMsg" aria-live="polite">{msg}</p>
        </form>
      </div>
      {cropping && origUrl && <Cropper ctx={ctx} src={origUrl} onDone={finishCrop} onCancel={() => { setCropping(false); if (!file) { setOrig(null); setOrigUrl(null); onCancelEmpty(); } }} />}
    </>
  );
}

// ---------------------------------------------------------------- settings
export function Settings({ ctx, email, mode, setLang, setMode, onSignOut, onExport, onRestore, sources }: {
  ctx: Ctx; email: string | null; mode: "grid" | "list"; setLang(l: Lang): void; setMode(m: "grid" | "list"): void;
  onSignOut(): void; onExport(): void; onRestore(json: string): Promise<string>; sources: Record<string, string>;
}) {
  const [msg, setMsg] = useState("");
  return (
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
}
