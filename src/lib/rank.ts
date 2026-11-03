// Pure post-processing for the photo identifier (no DOM, unit-tested).

export interface ModelLabel { latin: string; common: string; eu: boolean }
export interface Guess { latin: string; common: string; p: number }

/** Below this, the app says "not sure" instead of "probably". Measured in Chromium on 1078 golden photos (v0.15.0,
 *  FungiTastic): >= 0.5 -> 54% of photos, 82.7% right (0.4: 63% / 78%; 0.6: 45% / 86%). */
export const CONFIDENT = 0.5;

/** Softmax of the model's logits (numerically stable). */
export function softmax(logits: ArrayLike<number>): Float64Array {
  let max = -Infinity;
  for (let i = 0; i < logits.length; i++) if (logits[i] > max) max = logits[i];
  const p = new Float64Array(logits.length); let sum = 0;
  for (let i = 0; i < logits.length; i++) { p[i] = Math.exp(logits[i] - max); sum += p[i]; }
  for (let i = 0; i < p.length; i++) p[i] /= sum;
  return p;
}

/** Probabilities per model label -> guesses, best first. Keeps European labels only, ADDS labels that name the same
 *  species (two model names can be synonyms of one Pilzdex species), renormalises, returns the top n. */
export function rankGuesses(probs: ArrayLike<number>, labels: ModelLabel[], n = 3): Guess[] {
  const by = new Map<string, Guess>(); let sum = 0;
  for (let i = 0; i < labels.length; i++) {
    const l = labels[i], v = probs[i];
    if (!l.eu || !(v > 0)) continue;
    sum += v;
    const g = by.get(l.latin);
    if (g) g.p += v; else by.set(l.latin, { latin: l.latin, common: l.common, p: v });
  }
  if (sum <= 0) return [];
  return [...by.values()].sort((a, b) => b.p - a.p).slice(0, n).map(g => ({ ...g, p: g.p / sum }));
}

/** Square centre crop after scaling the short side to `short` (FungiTastic eval transform: 439 -> 384). */
export function cropBox(w: number, h: number, short = 439, size = 384) {
  const k = short / Math.min(w, h);
  const sw = Math.round(w * k), sh = Math.round(h * k);
  return { scale: k, sw, sh, x: Math.floor((sw - size) / 2), y: Math.floor((sh - size) / 2), size };
}

/** "Are you sure?" thresholds. Measured in Chromium on 1078 golden photos (v0.15.0, FungiTastic): false alarm 4.6% of
 *  correct catches, catches 53% of mix-ups with any lookalike of the dex (0.4: 6.3% / 61%; 0.7: 2.7% / 38%). */
export const WARN_TOP = 0.5;
export const WARN_SELECTED = 0.1;

/** The species the photo looks like instead of the selected one, or null (agrees, unsure, or model can't judge). */
export function mismatch(guesses: Guess[], selected: string, known: ReadonlySet<string>): Guess | null {
  if (!known.has(selected) || !guesses.length) return null; // model never learned it: can't judge
  const top = guesses[0];
  if (top.latin === selected || top.p < WARN_TOP) return null;
  const pSel = guesses.find(g => g.latin === selected)?.p ?? 0;
  return pSel < WARN_SELECTED ? top : null;
}

/** Combine the guesses of several photos of the same mushroom: geometric mean of the probabilities, renormalised.
 *  Measured on photos of the same species from different observations (v0.15.0, FungiTastic, golden set):
 *  1 photo 59.5% top-1, 2 photos 67.3%, 3 photos 71.0%. */
export function combineGuesses(lists: Guess[][], eps = 1e-4): Guess[] {
  const valid = lists.filter(l => l.length);
  if (valid.length <= 1) return valid[0] ?? [];
  const info = new Map<string, Guess>();
  for (const l of valid) for (const g of l) if (!info.has(g.latin)) info.set(g.latin, g);
  const score = new Map<string, number>();
  for (const latin of info.keys()) {
    let s = 0;
    for (const l of valid) s += Math.log((l.find(g => g.latin === latin)?.p ?? 0) + eps);
    score.set(latin, Math.exp(s / valid.length));
  }
  const sum = [...score.values()].reduce((a, b) => a + b, 0);
  return [...score.entries()].sort((a, b) => b[1] - a[1]).map(([latin, v]) => ({ ...info.get(latin)!, p: v / sum }));
}
