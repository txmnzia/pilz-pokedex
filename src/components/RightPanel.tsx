import { Silhouette } from "./Art";
import { Photo } from "../screens";
import { shapeOf } from "../lib/species";
import type { Find, Species } from "../lib/types";

export interface KeyItem { find: Find; sp: Species }

interface Props {
  label: string;
  setScreen(el: HTMLDivElement | null): void; // portal target for the screens' right-side content
  keysTitle: string;
  keys: KeyItem[];
  onOpen(sp: Species): void;
  number: string;
  stepEnabled: boolean;
  prevLabel: string;
  nextLabel: string;
  onPrev(): void;
  onNext(): void;
}

/** Web only: the second Pokédex panel. Its LCD is filled by the current screen through a portal. */
export function RightPanel(p: Props) {
  const slots = Array.from({ length: 10 }, (_, i) => p.keys[i]);
  return (
    <section className="rpanel" aria-label={p.label}>
      <header className="rtop"><span className="label">{p.label}</span></header>
      <div className="rlcd"><div className="lcd" ref={p.setScreen} /></div>
      <div>
        <div className="keyslabel"><span>{p.keysTitle}</span><span>{p.keys.length || ""}</span></div>
        <div className="keys">
          {slots.map((k, i) => k
            ? <button key={k.find.id} className="key photo" onClick={() => p.onOpen(k.sp)} title={`${k.find.observed_on}`}>
                {k.find.photo_path || !k.find.synced ? <Photo find={k.find} thumb /> : <Silhouette shape={shapeOf(k.sp)} />}
                <span className="kd">{k.find.observed_on.slice(5)}</span></button>
            : <button key={`e${i}`} className="key" disabled aria-label="" />)}
        </div>
      </div>
      <div className="rbottom">
        <button className="ybtn" onClick={p.onPrev} disabled={!p.stepEnabled}>&#9664; {p.prevLabel}</button>
        <div className="rnum">{p.number}</div>
        <button className="ybtn" onClick={p.onNext} disabled={!p.stepEnabled}>{p.nextLabel} &#9654;</button>
      </div>
    </section>
  );
}
