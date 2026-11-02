import { useId } from "react";
import type { Shape } from "../lib/species";
import type { Edibility } from "../lib/types";

// Black silhouettes, 100x100. Uncaught species only ever show these.
// Each entry: one string = several pieces (cap, stem, ring, volva) split on "M" and drawn as separate paths, so
// overlapping pieces always stay solid black (one combined path let opposite windings cancel into light stripes).
// An array = explicit pieces; a piece keeps its own holes (evenodd).
const S: Record<Shape, string | string[]> = {
  amanita: "M40 52 L37 84 Q50 90 63 84 L60 52Z M30 87 Q50 74 70 87 Q50 95 30 87Z M35 64 L65 64 L63 70 L37 70Z M12 54 Q16 16 50 14 Q84 16 88 54 Q50 60 12 54Z",
  bolete: "M36 52 Q24 80 40 91 L62 91 Q78 80 64 52Z M10 54 Q12 14 50 12 Q88 14 90 54 Q50 62 10 54Z",
  funnel: "M12 28 Q50 44 88 28 Q80 52 60 62 L58 90 L42 90 L40 62 Q20 52 12 28Z",
  morel: "M41 62 L59 62 L60 90 L40 90Z M50 10 Q76 24 72 54 Q70 66 50 66 Q30 66 28 54 Q24 24 50 10Z",
  parasol: "M45 34 L55 34 L56 90 L44 90Z M37 56 L63 56 L61 62 L39 62Z M4 40 Q20 18 50 16 Q80 18 96 40 Q50 45 4 40Z",
  tuft: "M26 46 L34 46 L35 88 L25 88Z M14 48 Q16 30 30 30 Q44 30 46 48 Q30 52 14 48Z M52 36 L60 36 L61 88 L51 88Z M39 38 Q41 18 56 18 Q71 18 73 38 Q56 42 39 38Z M70 56 L77 56 L78 88 L69 88Z M60 58 Q62 42 74 42 Q86 42 88 58 Q74 62 60 58Z M12 86 L88 86 L88 94 L12 94Z",
  // tree polypores, three outlines (v0.8.5): thin shelves (Trametes...), one big hoof (Fomes...), wavy tiers (Laetiporus...)
  bracket: "M6 4 L24 4 L24 96 L6 96Z M22 14 Q60 10 78 22 Q84 30 70 34 Q46 38 22 36Z M22 40 Q66 34 90 50 Q94 60 76 63 Q48 66 22 64Z M22 70 Q58 66 74 76 Q78 84 64 86 Q44 88 22 88Z",
  hoof: "M6 4 L24 4 L24 96 L6 96Z M22 26 Q46 20 70 28 Q88 36 86 50 Q82 60 64 62 Q44 64 22 62Z M22 70 Q40 66 56 72 Q64 78 54 82 Q40 84 22 82Z",
  rosette: "M8 4 L26 4 L28 90 L6 90Z M4 90 L96 90 L96 96 L4 96Z M22.0 82.0 L21.9 80.9 L21.6 79.9 L21.2 78.8 L21.0 77.6 L21.0 76.5 L21.4 75.4 L22.2 74.4 L23.3 73.4 L24.6 72.6 L26.0 71.8 L27.4 71.1 L28.5 70.2 L29.5 69.4 L30.3 68.4 L31.1 67.4 L32.0 66.4 L33.2 65.4 L34.6 64.7 L36.3 64.1 L38.1 63.8 L40.0 63.6 L41.9 63.4 L43.8 63.2 L45.5 63.0 L47.2 62.6 L48.8 62.1 L50.5 61.5 L52.3 61.1 L54.1 60.7 L56.0 60.6 L57.9 60.7 L59.7 61.1 L61.5 61.5 L63.2 62.1 L64.8 62.6 L66.5 63.0 L68.2 63.2 L70.1 63.4 L72.0 63.6 L73.9 63.8 L75.7 64.1 L77.4 64.7 L78.8 65.4 L80.0 66.4 L80.9 67.4 L81.7 68.4 L82.5 69.4 L83.5 70.2 L84.6 71.1 L86.0 71.8 L87.4 72.6 L88.7 73.4 L89.8 74.4 L90.6 75.4 L91.0 76.5 L91.0 77.6 L90.8 78.8 L90.4 79.9 L90.1 80.9 L90.0 82.0 L84.0 86.0 L56.0 88.0 L22.0 87.0Z M22.0 58.0 L21.9 57.1 L21.8 56.1 L21.6 55.1 L21.4 54.1 L21.3 53.1 L21.4 52.0 L21.8 51.0 L22.4 50.1 L23.3 49.2 L24.5 48.5 L25.7 47.8 L27.1 47.1 L28.4 46.5 L29.6 45.9 L30.8 45.3 L31.9 44.6 L32.9 43.8 L33.9 43.0 L34.9 42.2 L36.1 41.5 L37.4 40.8 L38.8 40.3 L40.4 39.9 L42.1 39.6 L43.8 39.6 L45.5 39.6 L47.2 39.7 L48.8 39.9 L50.4 40.0 L52.0 40.0 L53.6 40.0 L55.2 39.9 L56.8 39.7 L58.5 39.6 L60.2 39.6 L61.9 39.6 L63.6 39.9 L65.2 40.3 L66.6 40.8 L67.9 41.5 L69.1 42.2 L70.1 43.0 L71.1 43.8 L72.1 44.6 L73.2 45.3 L74.4 45.9 L75.6 46.5 L76.9 47.1 L78.3 47.8 L79.5 48.5 L80.7 49.2 L81.6 50.1 L82.2 51.0 L82.6 52.0 L82.7 53.1 L82.6 54.1 L82.4 55.1 L82.2 56.1 L82.1 57.1 L82.0 58.0 L76.0 62.0 L52.0 64.0 L22.0 63.0Z M22.0 34.0 L22.0 33.2 L21.9 32.4 L21.8 31.6 L21.7 30.8 L21.7 29.9 L21.7 29.1 L21.8 28.2 L22.1 27.3 L22.5 26.5 L23.1 25.8 L23.9 25.0 L24.8 24.4 L25.9 23.8 L27.0 23.3 L28.2 22.9 L29.4 22.5 L30.6 22.1 L31.8 21.7 L32.9 21.4 L34.0 21.0 L35.1 20.6 L36.1 20.2 L37.2 19.7 L38.3 19.2 L39.5 18.8 L40.7 18.4 L41.9 18.0 L43.3 17.7 L44.6 17.6 L46.0 17.5 L47.4 17.6 L48.7 17.7 L50.1 18.0 L51.3 18.4 L52.5 18.8 L53.7 19.2 L54.8 19.7 L55.9 20.2 L56.9 20.6 L58.0 21.0 L59.1 21.4 L60.2 21.7 L61.4 22.1 L62.6 22.5 L63.8 22.9 L65.0 23.3 L66.1 23.8 L67.2 24.4 L68.1 25.0 L68.9 25.8 L69.5 26.5 L69.9 27.3 L70.2 28.2 L70.3 29.1 L70.3 29.9 L70.3 30.8 L70.2 31.6 L70.1 32.4 L70.0 33.2 L70.0 34.0 L64.0 38.0 L46.0 40.0 L22.0 39.0Z",
  gilled: "M43 46 L57 46 L58 90 L42 90Z M12 50 Q14 20 50 18 Q86 20 88 50 Q50 57 12 50Z",
  inkcap: "M45 52 L55 52 L56 92 L44 92Z M30 56 Q26 20 38 10 Q50 4 62 10 Q74 20 70 56 Q50 62 30 56Z",
  puffball: "M50 18 Q78 18 80 48 Q80 66 66 76 L64 90 L36 90 L34 76 Q20 66 20 48 Q22 18 50 18Z",
  stinkhorn: "M44 32 L56 32 L58 82 L42 82Z M40 12 Q50 4 60 12 L60 36 Q50 40 40 36Z M32 84 Q50 72 68 84 Q50 96 32 84Z",
  // lattice ball (the only silhouette with holes: without them it is a puffball) + its volva
  cage: ["M88.0 46.0 L87.7 50.8 L86.7 55.6 L85.1 60.2 L82.9 64.5 L80.1 68.5 L76.9 72.2 L73.1 75.4 L69.0 78.0 L64.5 80.2 L59.8 81.7 L55.0 82.7 L50.0 83.0 L45.0 82.7 L40.2 81.7 L35.5 80.2 L31.0 78.0 L26.9 75.4 L23.1 72.2 L19.9 68.5 L17.1 64.5 L14.9 60.2 L13.3 55.6 L12.3 50.8 L12.0 46.0 L12.3 41.2 L13.3 36.4 L14.9 31.8 L17.1 27.5 L19.9 23.5 L23.1 19.8 L26.9 16.6 L31.0 14.0 L35.5 11.8 L40.2 10.3 L45.0 9.3 L50.0 9.0 L55.0 9.3 L59.8 10.3 L64.5 11.8 L69.0 14.0 L73.1 16.6 L76.9 19.8 L80.1 23.5 L82.9 27.5 L85.1 31.8 L86.7 36.4 L87.7 41.2Z M55.2 35.6 L44.7 35.6 L39.5 44.0 L44.8 52.4 L55.2 52.4 L60.5 44.0Z M59.1 16.3 L50.0 11.5 L40.9 16.3 L40.9 25.7 L50.0 30.5 L59.1 25.7Z M38.3 27.8 L29.2 23.0 L20.1 27.8 L20.1 37.2 L29.2 42.0 L38.3 37.2Z M38.3 50.8 L29.2 46.0 L20.1 50.8 L20.1 60.2 L29.2 65.0 L38.3 60.2Z M59.1 62.3 L50.0 57.5 L40.9 62.3 L40.9 71.7 L50.0 76.5 L59.1 71.7Z M79.9 50.8 L70.8 46.1 L61.7 50.8 L61.7 60.2 L70.8 65.0 L79.9 60.2Z M79.9 27.8 L70.8 23.0 L61.7 27.8 L61.7 37.2 L70.8 42.0 L79.9 37.2Z", "M37 79 L41 86 L50 89 L59 86 L63 79Z"],
  // octopus stinkhorn seen from above: 5 arms around the egg
  starfish: "M64.0 50.0 L63.8 52.4 L63.2 54.8 L62.1 57.0 L60.7 59.0 L59.0 60.7 L57.0 62.1 L54.8 63.2 L52.4 63.8 L50.0 64.0 L47.6 63.8 L45.2 63.2 L43.0 62.1 L41.0 60.7 L39.3 59.0 L37.9 57.0 L36.8 54.8 L36.2 52.4 L36.0 50.0 L36.2 47.6 L36.8 45.2 L37.9 43.0 L39.3 41.0 L41.0 39.3 L43.0 37.9 L45.2 36.8 L47.6 36.2 L50.0 36.0 L52.4 36.2 L54.8 36.8 L57.0 37.9 L59.0 39.3 L60.7 41.0 L62.1 43.0 L63.2 45.2 L63.8 47.6Z M40.6 42.5 L41.3 40.1 L42.0 37.7 L42.7 35.4 L43.5 33.2 L44.2 31.0 L45.0 28.8 L45.8 26.7 L46.5 24.7 L47.3 22.7 L48.1 20.8 L49.0 18.9 L49.8 17.1 L50.6 15.3 L51.5 13.6 L52.4 12.0 L53.2 10.4 L54.1 8.9 L55.0 7.4 L55.9 6.1 L57.2 5.2 L58.7 4.9 L60.2 5.2 L61.5 6.1 L62.4 7.3 L62.7 8.9 L62.4 10.4 L62.2 11.9 L61.9 13.5 L61.7 15.2 L61.4 16.8 L61.2 18.6 L61.0 20.4 L60.8 22.2 L60.6 24.0 L60.4 26.0 L60.3 27.9 L60.1 30.0 L60.0 32.0 L59.9 34.1 L59.7 36.3 L59.6 38.5 L59.5 40.8 L59.5 43.1 L59.4 45.5Z M54.2 38.8 L56.7 38.7 L59.2 38.6 L61.6 38.6 L64.0 38.6 L66.3 38.6 L68.6 38.7 L70.8 38.8 L73.0 38.9 L75.1 39.0 L77.2 39.2 L79.3 39.4 L81.2 39.6 L83.2 39.9 L85.0 40.2 L86.9 40.5 L88.6 40.8 L90.4 41.2 L92.0 41.6 L93.5 42.0 L94.8 43.0 L95.6 44.3 L95.8 45.9 L95.4 47.4 L94.4 48.6 L93.1 49.4 L91.5 49.6 L90.0 49.8 L88.4 50.1 L86.7 50.3 L85.1 50.6 L83.4 51.0 L81.6 51.3 L79.8 51.7 L78.0 52.1 L76.1 52.5 L74.2 53.0 L72.2 53.4 L70.2 53.9 L68.1 54.5 L66.0 55.0 L63.9 55.6 L61.7 56.2 L59.5 56.9 L57.2 57.5Z M62.0 50.5 L62.8 52.9 L63.7 55.2 L64.4 57.5 L65.2 59.8 L65.9 62.0 L66.5 64.2 L67.1 66.3 L67.7 68.4 L68.2 70.5 L68.7 72.6 L69.1 74.5 L69.5 76.5 L69.9 78.4 L70.2 80.3 L70.4 82.1 L70.6 83.9 L70.8 85.7 L71.0 87.4 L71.0 88.9 L70.5 90.4 L69.5 91.6 L68.1 92.2 L66.5 92.3 L65.0 91.8 L63.9 90.8 L63.2 89.3 L62.5 87.9 L61.8 86.5 L61.0 85.0 L60.2 83.5 L59.4 82.0 L58.5 80.5 L57.6 78.9 L56.7 77.2 L55.7 75.6 L54.7 73.9 L53.6 72.2 L52.5 70.4 L51.4 68.6 L50.2 66.8 L49.0 65.0 L47.7 63.1 L46.4 61.1 L45.1 59.2Z M53.2 61.6 L51.2 63.1 L49.2 64.6 L47.3 66.1 L45.4 67.4 L43.5 68.8 L41.6 70.1 L39.7 71.3 L37.9 72.5 L36.1 73.6 L34.3 74.7 L32.6 75.8 L30.8 76.7 L29.1 77.7 L27.4 78.5 L25.8 79.4 L24.1 80.1 L22.5 80.8 L20.9 81.5 L19.5 82.0 L17.9 82.0 L16.5 81.4 L15.4 80.2 L14.8 78.8 L14.9 77.2 L15.5 75.8 L16.7 74.7 L17.8 73.6 L18.9 72.5 L20.1 71.3 L21.3 70.1 L22.5 68.8 L23.7 67.5 L24.9 66.2 L26.2 64.8 L27.4 63.3 L28.7 61.8 L30.0 60.3 L31.4 58.7 L32.7 57.0 L34.1 55.4 L35.5 53.6 L36.9 51.8 L38.3 50.0 L39.7 48.1Z M40.0 56.6 L37.9 55.2 L35.9 53.8 L33.9 52.4 L32.0 51.0 L30.1 49.6 L28.3 48.2 L26.6 46.8 L24.9 45.5 L23.2 44.1 L21.6 42.7 L20.1 41.4 L18.6 40.0 L17.2 38.7 L15.9 37.3 L14.6 36.0 L13.4 34.7 L12.2 33.4 L11.1 32.1 L10.1 30.9 L9.6 29.4 L9.8 27.8 L10.6 26.4 L11.8 25.5 L13.3 25.0 L14.8 25.2 L16.2 25.9 L17.6 26.7 L19.0 27.4 L20.5 28.1 L22.0 28.9 L23.6 29.6 L25.2 30.4 L26.9 31.1 L28.6 31.9 L30.4 32.6 L32.2 33.4 L34.1 34.2 L36.0 34.9 L38.0 35.7 L40.0 36.5 L42.1 37.3 L44.2 38.1 L46.4 38.9 L48.6 39.7Z",
  ear: "M30 14 Q70 6 82 34 Q90 60 70 82 Q50 96 32 80 Q46 70 40 54 Q24 44 30 14Z",
  saddle: "M44 46 L56 46 L58 92 L42 92Z M16 30 Q30 10 50 26 Q70 10 84 30 Q80 52 50 50 Q20 52 16 30Z",
  oyster: "M14 60 Q8 30 40 20 Q76 12 90 36 Q78 52 52 58 L44 62 L42 76 L32 76 L32 62Z",
};

export function Silhouette({ shape, className = "art" }: { shape: Shape; className?: string }) {
  const v = S[shape];
  const pieces = Array.isArray(v) ? v : v.split(/(?=M)/).map(x => x.trim()).filter(Boolean);
  return (
    <svg className={className} viewBox="0 0 100 100" aria-hidden="true">
      {pieces.map((d, i) => <path key={i} d={d} fill="#0f1a0a" fillRule="evenodd" />)}
    </svg>
  );
}

// Edibility as Pokédex "type" badges (v0.8.0, design/badges.html option C): bevelled, fixed width.
// EdIcon = glyph badge (24px, 20px on small phones), EdBadge = word badge (60px, or 84px large on the species page).
const BITMAPS: Record<string, string[]> = {
  fork: ["............", "..x.x.x...x.", "..x.x.x..xx.", "..x.x.x..xx.", "..xxxxx..xx.", "...xxx...xx.", "....x....xx.", "....x.....x.", "....x.....x.", "....x.....x.", "....x.....x.", "............"],
  plate: ["............", "...xxxxxx...", "..x......x..", ".x..xxxx..x.", ".x.x....x.x.", ".x.x....x.x.", ".x.x....x.x.", ".x.x....x.x.", ".x..xxxx..x.", "..x......x..", "...xxxxxx...", "............"],
  bang: [".....xx.....", ".....xx.....", ".....xx.....", ".....xx.....", ".....xx.....", ".....xx.....", ".....xx.....", "............", "............", ".....xx.....", ".....xx.....", "............"],
  skull: ["...xxxxxx...", "..xxxxxxxx..", ".xxxxxxxxxx.", ".xx..xx..xx.", ".xx..xx..xx.", ".xxxxxxxxxx.", "..xxx..xxx..", "...xxxxxx...", "...x.xx.x...", "...xxxxxx...", "............", "............"],
  ask: ["............", "....xxxx....", "...xx..xx...", ".......xx...", "......xx....", ".....xx.....", ".....xx.....", "............", ".....xx.....", ".....xx.....", "............", "............"],
};
const GLYPH: Record<string, string> = Object.fromEntries(Object.entries(BITMAPS).map(([k, rows]) =>
  [k, rows.flatMap((r, y) => [...r].map((c, x) => c === "x" ? `M${x} ${y}h1v1h-1z` : "")).join("")]));
const GL: Record<string, string> = { edible: "fork", none: "plate", toxic: "bang", deadly: "skull", unknown: "ask" };
const tone = (ed: Edibility | null) => ed ?? "unknown";

export function EdIcon({ ed }: { ed: Edibility | null }) {
  return (
    <span className={`bdg g t-${tone(ed)}`} aria-hidden="true">
      <svg className="bglyph" viewBox="0 0 12 12" shapeRendering="crispEdges"><path d={GLYPH[GL[tone(ed)]]} fill="#fff" /></svg>
    </span>
  );
}

export function EdBadge({ ed, label, large, title }: { ed: Edibility | null; label: string; large?: boolean; title?: string }) {
  return <span className={`bdg w t-${tone(ed)}${large ? " lg" : ""}`} title={title}>{label}</span>;
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
