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

export function EdIcon({ ed }: { ed: Edibility | null }) {
  switch (ed) {
    case "edible":
      return <svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="9" fill="#2f8a3b" stroke="#111" strokeWidth="1.5" /><g fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round"><path d="M6.5 4.5v4.2M8 4.5v4.2M9.5 4.5v4.2M6.5 8.7q1.5 1.6 3 0M8 9.4v6.1" /><path d="M13.2 15.5V4.6q-2 1.3-2 4.6h2" /></g></svg>;
    case "none":
      return <svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="9" fill="#8a8a8a" stroke="#111" strokeWidth="1.5" /><path d="M5.5 10h9" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" /></svg>;
    case "toxic":
      return <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 1.5L19 18H1z" fill="#e08a12" stroke="#111" strokeWidth="1.5" strokeLinejoin="round" /><path d="M10 7v5" stroke="#111" strokeWidth="2.4" strokeLinecap="round" /><circle cx="10" cy="15" r="1.3" fill="#111" /></svg>;
    case "deadly":
      return <svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="9" fill="#111" stroke="#d9262b" strokeWidth="1.5" /><path d="M5 9a5 5 0 0 1 10 0c0 2-1 3-2 3.5V15H7v-2.5C6 12 5 11 5 9z" fill="#fff" /><circle cx="8" cy="9" r="1.4" fill="#111" /><circle cx="12" cy="9" r="1.4" fill="#111" /></svg>;
    default:
      return <svg viewBox="0 0 20 20" aria-hidden="true"><rect x="1.5" y="1.5" width="17" height="17" rx="3" fill="#d8d8c8" stroke="#111" strokeWidth="1.5" strokeDasharray="3 2" /><text x="10" y="14.5" textAnchor="middle" fontSize="12" fontWeight="700" fill="#111">?</text></svg>;
  }
}
