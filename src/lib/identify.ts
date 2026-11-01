// On-device mushroom photo identifier. Free, no account, offline after the first load.
// LiteRT.js is imported lazily so the app itself stays small.
import { cropBox, rankGuesses, type Guess, type ModelLabel } from "./rank";
import { resampleRGB } from "./resample";

const BASE = import.meta.env.BASE_URL;
type Model = { run(t: unknown): Promise<any> };
let ready: Promise<{ model: Model; labels: ModelLabel[]; Tensor: any }> | null = null;

function load() {
  ready ??= (async () => {
    const lrt = await import("@litertjs/core");
    await lrt.loadLiteRt(`${BASE}litert/`);
    const [model, labels] = await Promise.all([
      lrt.loadAndCompile(`${BASE}models/fungi_int8.tflite`, { accelerator: "wasm" }),
      fetch(`${BASE}models/fungi-labels.json`).then(r => r.json() as Promise<ModelLabel[]>),
    ]);
    return { model: model as unknown as Model, labels, Tensor: lrt.Tensor };
  })().catch(e => { ready = null; throw e; });
  return ready;
}

/** 160x160 RGB uint8: Pillow-equivalent resize of the short side to 183, then centre crop 160 (model card). */
async function pixels(photo: Blob): Promise<Uint8Array> {
  const bmp = await createImageBitmap(photo);
  const b = cropBox(bmp.width, bmp.height);
  // Decode at most ~4x the target with the browser (cheap, keeps memory low on 12 MP photos),
  // then do the real anti-aliased resize in JS so results match the measured accuracy.
  const k = Math.min(1, (4 * b.sw) / bmp.width);
  const iw = Math.max(b.sw, Math.round(bmp.width * k)), ih = Math.max(b.sh, Math.round(bmp.height * k));
  const c = document.createElement("canvas"); c.width = iw; c.height = ih;
  const g = c.getContext("2d", { willReadFrequently: true })!;
  g.imageSmoothingQuality = "high";
  g.drawImage(bmp, 0, 0, iw, ih); bmp.close();
  const rgba = g.getImageData(0, 0, iw, ih).data;
  const small = resampleRGB(rgba, iw, ih, 4, b.sw, b.sh);
  const rgb = new Uint8Array(b.size * b.size * 3);
  for (let y = 0; y < b.size; y++) rgb.set(small.subarray(((y + b.y) * b.sw + b.x) * 3, ((y + b.y) * b.sw + b.x + b.size) * 3), y * b.size * 3);
  return rgb;
}

export async function identify(photo: Blob): Promise<Guess[]> {
  const [{ model, labels, Tensor }, rgb] = await Promise.all([load(), pixels(photo)]);
  const input = new Tensor(rgb, [1, 160, 160, 3]);
  try {
    const out = await model.run(input);
    const first = Array.isArray(out) ? out[0] : out;
    const host = typeof first.moveTo === "function" ? await first.moveTo("wasm") : first;
    const raw = host.toTypedArray() as Uint8Array;
    const guesses = rankGuesses(raw, labels);
    host.delete?.(); if (host !== first) first.delete?.();
    return guesses;
  } finally { input.delete?.(); }
}
