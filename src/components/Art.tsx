import { useId } from "react";
import type { Shape } from "../lib/species";
import type { Edibility } from "../lib/types";

// Black silhouettes, 100x100. Uncaught species only ever show these.
const S: Record<Shape, string> = {
  amanita: "M40 52 L37 84 Q50 90 63 84 L60 52Z M30 87 Q50 74 70 87 Q50 95 30 87Z M35 64 L65 64 L63 70 L37 70Z M12 54 Q16 16 50 14 Q84 16 88 54 Q50 60 12 54Z",
  bolete: "M36 52 Q24 80 40 91 L62 91 Q78 80 64 52Z M10 54 Q12 14 50 12 Q88 14 90 54 Q50 62 10 54Z",
  funnel: "M12 28 Q50 44 88 28 Q80 52 60 62 L58 90 L42 90 L40 62 Q20 52 12 28Z",
  morel: "M41 62 L59 62 L60 90 L40 90Z M50 10 Q76 24 72 54 Q70 66 50 66 Q30 66 28 54 Q24 24 50 10Z",
  parasol: "M45 34 L55 34 L56 90 L44 90Z M37 56 L63 56 L61 62 L39 62Z M4 40 Q20 18 50 16 Q80 18 96 40 Q50 45 4 40Z",
  tuft: "M26 46 L34 46 L35 88 L25 88Z M14 48 Q16 30 30 30 Q44 30 46 48 Q30 52 14 48Z M52 36 L60 36 L61 88 L51 88Z M39 38 Q41 18 56 18 Q71 18 73 38 Q56 42 39 38Z M70 56 L77 56 L78 88 L69 88Z M60 58 Q62 42 74 42 Q86 42 88 58 Q74 62 60 58Z M12 86 L88 86 L88 94 L12 94Z",
  bracket: "M6 8 L20 8 L20 94 L6 94Z M20 22 Q70 8 90 26 Q66 36 20 34Z M20 46 Q74 32 94 50 Q68 60 20 58Z M20 70 Q64 58 84 74 Q60 82 20 80Z",
  gilled: "M43 46 L57 46 L58 90 L42 90Z M12 50 Q14 20 50 18 Q86 20 88 50 Q50 57 12 50Z",
  inkcap: "M45 52 L55 52 L56 92 L44 92Z M30 56 Q26 20 38 10 Q50 4 62 10 Q74 20 70 56 Q50 62 30 56Z",
  puffball: "M50 18 Q78 18 80 48 Q80 66 66 76 L64 90 L36 90 L34 76 Q20 66 20 48 Q22 18 50 18Z",
  stinkhorn: "M44 32 L56 32 L58 82 L42 82Z M40 12 Q50 4 60 12 L60 36 Q50 40 40 36Z M32 84 Q50 72 68 84 Q50 96 32 84Z",
  cage: "M50 10 Q86 14 86 52 Q84 86 50 90 Q16 86 14 52 Q14 14 50 10Z M50 22 Q30 26 28 50 Q30 74 50 78 Q70 74 72 50 Q70 26 50 22Z",
  ear: "M30 14 Q70 6 82 34 Q90 60 70 82 Q50 96 32 80 Q46 70 40 54 Q24 44 30 14Z",
  saddle: "M44 46 L56 46 L58 92 L42 92Z M16 30 Q30 10 50 26 Q70 10 84 30 Q80 52 50 50 Q20 52 16 30Z",
  oyster: "M14 60 Q8 30 40 20 Q76 12 90 36 Q78 52 52 58 L44 62 L42 76 L32 76 L32 62Z",
};

export function Silhouette({ shape, className = "art" }: { shape: Shape; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 100 100" aria-hidden="true">
      <path d={S[shape]} fill="#0f1a0a" fillRule={shape === "cage" ? "evenodd" : "nonzero"} />
    </svg>
  );
}

// Edibility "LED" icons: coloured lamp, soft highlight, white 12x12 pixel glyph (v0.7.0).
const BITMAPS: Record<string, string[]> = {
  fork: ["............", "..x.x.x...x.", "..x.x.x..xx.", "..x.x.x..xx.", "..xxxxx..xx.", "...xxx...xx.", "....x....xx.", "....x.....x.", "....x.....x.", "....x.....x.", "....x.....x.", "............"],
  plate: ["............", "...xxxxxx...", "..x......x..", ".x..xxxx..x.", ".x.x....x.x.", ".x.x....x.x.", ".x.x....x.x.", ".x.x....x.x.", ".x..xxxx..x.", "..x......x..", "...xxxxxx...", "............"],
  bang: [".....xx.....", ".....xx.....", ".....xx.....", ".....xx.....", ".....xx.....", ".....xx.....", ".....xx.....", "............", "............", ".....xx.....", ".....xx.....", "............"],
  skull: ["...xxxxxx...", "..xxxxxxxx..", ".xxxxxxxxxx.", ".xx..xx..xx.", ".xx..xx..xx.", ".xxxxxxxxxx.", "..xxx..xxx..", "...xxxxxx...", "...x.xx.x...", "...xxxxxx...", "............", "............"],
  ask: ["............", "....xxxx....", "...xx..xx...", ".......xx...", "......xx....", ".....xx.....", ".....xx.....", "............", ".....xx.....", ".....xx.....", "............", "............"],
};
// One path per bitmap: a 1x1 square per lit pixel, offset so the 12x12 glyph sits centred in a 22x22 lamp.
const GLYPH: Record<string, string> = Object.fromEntries(Object.entries(BITMAPS).map(([k, rows]) =>
  [k, rows.flatMap((r, y) => [...r].map((c, x) => c === "x" ? `M${x + 5} ${y + 5}h1v1h-1z` : "")).join("")]));
const LED: Record<string, { fill: string; glyph: string; ink: string }> = {
  edible: { fill: "#4caf50", glyph: "fork", ink: "#fff" },
  none: { fill: "#9e9e8e", glyph: "plate", ink: "#fff" },
  toxic: { fill: "#d83a2e", glyph: "bang", ink: "#fff" },
  deadly: { fill: "#2a2a2a", glyph: "skull", ink: "#fff" },
  unknown: { fill: "#d8d8c8", glyph: "ask", ink: "#111" },
};

export function EdIcon({ ed }: { ed: Edibility | null }) {
  const l = LED[ed ?? "unknown"];
  return (
    <svg viewBox="0 0 22 22" aria-hidden="true">
      <circle cx="11" cy="11" r="10" fill={l.fill} stroke="#111" strokeWidth="1.8" />
      {/* subtle shine: small, faint, top-left, under the glyph so the glyph stays crisp */}
      <ellipse cx="6.6" cy="5.6" rx="2.6" ry="1.6" fill="#fff" opacity=".28" />
      <path d={GLYPH[l.glyph]} fill={l.ink} shapeRendering="crispEdges" />
    </svg>
  );
}

/** Capture ball: glossy red/white when caught, a faint dashed "ghost" outline when not. */
export function CaughtBall({ caught, className = "cball" }: { caught: boolean; className?: string }) {
  const id = useId();
  if (!caught) return (
    <svg className={`${className} ghost`} viewBox="0 0 24 24" aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeWidth="1.6" opacity=".38">
        <circle cx="12" cy="12" r="9.5" strokeDasharray="2.6 2" />
        <path d="M2.5 12h6M15 12h6.5" />
        <circle cx="12" cy="12" r="3" />
      </g>
    </svg>
  );
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ff6b5e" /><stop offset="1" stopColor="#c81e22" /></linearGradient></defs>
      <path d="M2.5 12a9.5 9.5 0 0 1 19 0z" fill={`url(#${id})`} />
      <path d="M2.5 12a9.5 9.5 0 0 0 19 0z" fill="#fff" />
      <circle cx="12" cy="12" r="9.5" fill="none" stroke="#160b0b" strokeWidth="1.8" />
      <path d="M2.5 12h19" stroke="#160b0b" strokeWidth="2" />
      <circle cx="12" cy="12" r="3" fill="#fff" stroke="#160b0b" strokeWidth="1.8" />
      <ellipse cx="8.5" cy="7" rx="2.4" ry="1.4" fill="#fff" opacity=".6" />
    </svg>
  );
}
