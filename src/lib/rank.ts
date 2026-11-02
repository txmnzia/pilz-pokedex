// Pure post-processing for the photo identifier (no DOM, unit-tested).

export interface ModelLabel { latin: string; common: string; eu: boolean }
export interface Guess { latin: string; common: string; p: number }

/** Below this, the app says "not sure" instead of "probably". Measured: >= 0.5 -> 78% of photos, 85.6% right. */
export const CONFIDENT = 0.5;

/** Model output is uint8 with scale 1/256. Keep European classes only, renormalise, return the top n. */
export function rankGuesses(raw: ArrayLike<number>, labels: ModelLabel[], n = 3): Guess[] {
  let sum = 0;
  const p = new Float64Array(labels.length);
  for (let i = 0; i < labels.length; i++) if (labels[i].eu) { p[i] = raw[i] / 256; sum += p[i]; }
  if (sum <= 0) return [];
  return [...p.keys()]
    .filter(i => p[i] > 0)
    .sort((a, b) => p[b] - p[a])
    .slice(0, n)
    .map(i => ({ latin: labels[i].latin, common: labels[i].common, p: p[i] / sum }));
}

/** Square centre crop after scaling the short side to `short` (the model card's 183 -> 160). */
export function cropBox(w: number, h: number, short = 183, size = 160) {
  const k = short / Math.min(w, h);
  const sw = Math.round(w * k), sh = Math.round(h * k);
  return { scale: k, sw, sh, x: Math.floor((sw - size) / 2), y: Math.floor((sh - size) / 2), size };
}

/** "Are you sure?" thresholds. Measured on 232 photos: false alarm 7.3% of correct catches,
 *  catches 70% of mix-ups with a known lookalike (0.7 would give 3.9% / 60%). */
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
 *  Measured on pairs of photos of the same species (different observations, so an upper bound for top + side views
 *  of one mushroom): 1 photo 74% top-1, 2 photos 91% (mean of p 89%, max 87%), 3 photos 95%. */
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
