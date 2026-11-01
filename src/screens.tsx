import { useEffect, useState } from "react";
import { EdIcon, Silhouette } from "./components/Art";
import { dexLabel, habitatFor, labelIn, lookalikesOf, REGION_MIN_OBS, seasonLabel, shapeOf, shortNo, textFor } from "./lib/species";
import { photoUrl } from "./lib/sync";
import { CONFIDENT, type Guess } from "./lib/rank";
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
  }, [find.id, find.photo_path]);
  return url ? <img className={className} src={url} alt="" /> : <span className="photo-wait" />;
}

/** Caught: your latest photo. Not caught: black silhouette. */
function Picture({ sp, ctx, small }: { sp: Species; ctx: Ctx; small?: boolean }) {
  const f = ctx.caught.get(sp.inat)?.[0];
  if (f) return small ? <Photo find={f} className="thumbimg" /> : (
    <div className="pic photo"><Photo find={f} /><span className="stamp">{f.observed_on}{f.place ? ` · ${f.place}` : ""}</span></div>
  );
  return small ? <Silhouette shape={shapeOf(sp)} /> : <div className="pic"><Silhouette shape={shapeOf(sp)} /><span className="lock">???</span></div>;
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
export function Dex(p: DexProps) {
  const { ctx } = p;
  const core = ctx.all.filter(s => !s.extra);
  const n = core.filter(s => ctx.caught.has(s.inat)).length;
  const item = (sp: Species) => {
    const got = ctx.caught.has(sp.inat);
    return p.mode === "grid" ? (
      <button key={sp.inat} className={`tile${got ? " got" : ""}${sp.extra ? " x" : ""}`} onClick={() => p.open(sp)}>
        <span className="tn">{shortNo(sp)}</span><span className="ted"><EdIcon ed={sp.edibility} /></span>
        <span className="tart"><Picture sp={sp} ctx={ctx} small /></span>
        <span className="tname">{name(sp, ctx.lang)}</span>
        {got && <span className="ball on tb" />}
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
      <div className="scroll">
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

export function Entry({ ctx, sp, page, open, onDelete, scrollRef }: { ctx: Ctx; sp: Species; page: 0 | 1; open(sp: Species): void; onDelete(f: Find): void; scrollRef: React.RefObject<HTMLDivElement | null> }) {
  const finds = ctx.caught.get(sp.inat) || [];
  const [confirm, setConfirm] = useState<string | null>(null);
  const head = <div className="titlebar"><span className="name">{name(sp, ctx.lang)}</span><span>{dexLabel(sp)}</span></div>;
  const dots = <div className="dots"><i className={page ? "" : "on"} /><i className={page ? "on" : ""} />&nbsp;{ctx.t("swipe")}</div>;
  if (page === 0) {
    const tx = textFor(sp, ctx.lang);
    return (
      <>{head}
        <div className="scroll" ref={scrollRef}>
          <Picture sp={sp} ctx={ctx} />
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
                : <button className="del" aria-label={ctx.t("del")} onClick={() => setConfirm(f.id)}>✕</button>}
            </div>
          )) : <p className="empty">{ctx.t("noFinds")}</p>}
        </div>
      </div>{dots}
    </>
  );
}

// ---------------------------------------------------------------- catch
export interface CatchDraft { file: Blob; species: number; observed_on: string; place: string; note: string; lat: number | null; lng: number | null }
export function Catch({ ctx, initial, onSave }: { ctx: Ctx; initial: number; onSave(d: CatchDraft): void }) {
  const [file, setFile] = useState<Blob | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [species, setSpecies] = useState(initial);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [place, setPlace] = useState("");
  const [note, setNote] = useState("");
  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(null);
  const [msg, setMsg] = useState("");
  const [ident, setIdent] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [guesses, setGuesses] = useState<Guess[]>([]);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  const byLatin = new Map(ctx.all.map(s => [s.latin, s]));
  const runIdentify = async (f: Blob) => {
    setIdent("busy"); setGuesses([]);
    try {
      const { identify } = await import("./lib/identify");
      const g = await identify(f);
      setGuesses(g); setIdent("done");
      const top = g[0] && byLatin.get(g[0].latin);
      if (top && g[0].p >= CONFIDENT) setSpecies(top.inat); // only preselect when confident
    } catch (e) { console.warn("identify failed", e); setIdent("error"); }
  };
  const locate = () => navigator.geolocation?.getCurrentPosition(
    p => { setPos({ lat: p.coords.latitude, lng: p.coords.longitude }); setMsg(ctx.t("gpsOk")); },
    () => setMsg(ctx.t("gpsFail")), { enableHighAccuracy: true, timeout: 15000 });
  // camera: now + here. library: the photo's own date/place (EXIF); never today's GPS for an old photo
  const pick = async (f: File | undefined, source: "camera" | "library") => {
    if (!f) return;
    setFile(f); setPreview(URL.createObjectURL(f)); runIdentify(f);
    if (source === "camera") { setDate(new Date().toISOString().slice(0, 10)); setPos(null); locate(); return; }
    const meta = readExif(await f.arrayBuffer());
    setDate(meta.date ?? new Date().toISOString().slice(0, 10));
    setPos(meta.lat != null && meta.lng != null ? { lat: meta.lat, lng: meta.lng } : null);
    setMsg(meta.date && meta.lat != null ? ctx.t("fromPhotoMeta") : meta.date ? ctx.t("fromPhotoDate") : ctx.t("noPhotoMeta"));
  };
  const sorted = [...ctx.all].sort((a, b) => (a.extra === b.extra ? (a.no ?? a.ex!) - (b.no ?? b.ex!) : a.extra ? 1 : -1));
  return (
    <>
      <div className="titlebar"><span>{ctx.t("catch")}</span></div>
      <div className="scroll">
        <form onSubmit={e => {
          e.preventDefault();
          if (!file) { setMsg(ctx.t("photoNeeded")); return; }
          onSave({ file, species, observed_on: date, place, note, lat: pos?.lat ?? null, lng: pos?.lng ?? null });
        }}>
          {preview && <div className="shot"><img src={preview} alt="" /></div>}
          <div className="srcrow">
            <label className="cta srcbtn"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></svg>{ctx.t("takePhoto")}
              <input id="ph" type="file" accept="image/*" capture="environment" onChange={e => { pick(e.target.files?.[0], "camera"); e.target.value = ""; }} /></label>
            <label className="cta ghost srcbtn"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2" /><circle cx="9" cy="10" r="1.8" /><path d="M4 18l5-5 4 4 3-3 4 4" /></svg>{ctx.t("fromLibrary")}
              <input id="phlib" type="file" accept="image/*" onChange={e => { pick(e.target.files?.[0], "library"); e.target.value = ""; }} /></label>
          </div>
          {ident !== "idle" && (
            <div className="box ident" aria-live="polite" ref={el => { if (el && ident === "done") el.scrollIntoView({ block: "nearest", behavior: "smooth" }); }}>
              <h3>{ctx.t("suggestion")}</h3>
              {ident === "busy" && <p className="m0">{ctx.t("analysing")}</p>}
              {ident === "error" && <p className="m0">{ctx.t("idFailed")}</p>}
              {ident === "done" && (guesses.length === 0 ? <p className="m0">{ctx.t("notSure")}</p> : <>
                <p className="m0">{guesses[0].p >= CONFIDENT ? ctx.t("probably") : ctx.t("notSure")}</p>
                <div className="guesses">
                  {guesses.map(g => {
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
            <select id="spc" value={species} onChange={e => setSpecies(Number(e.target.value))}>
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
