// On-device mushroom photo identifier. Free, no account, offline after the first load.
// Model (v0.15.0): FungiTastic DINOv3 ViT-S/16, 2 827 European fungi, int8 TFLite (24 MB, v0.15.1, scripts/quantize-ft.py), float32 NHWC 0..255 input
// (normalisation is inside the graph), logits out. Chosen on the golden set: see design/benchmark.html.
// LiteRT.js is imported lazily so the app itself stays small.
import { cropBox, rankGuesses, softmax, type Guess, type ModelLabel } from "./rank";
import { resampleRGB } from "./resample";

const BASE = import.meta.env.BASE_URL;
type Model = { run(t: unknown): Promise<any> };
let ready: Promise<{ model: Model; labels: ModelLabel[]; Tensor: any }> | null = null;

function load() {
  ready ??= (async () => {
    const lrt = await import("@litertjs/core");
    await lrt.loadLiteRt(`${BASE}litert/`);
    const [model, labels] = await Promise.all([
      lrt.loadAndCompile(`${BASE}models/fungitastic_int8.tflite`, { accelerator: "wasm" }),
      fetch(`${BASE}models/fungitastic-labels.json`).then(r => r.json() as Promise<ModelLabel[]>),
    ]);
    return { model: model as unknown as Model, labels, Tensor: lrt.Tensor };
  })().catch(e => { ready = null; throw e; });
  return ready;
}

/** 384x384 RGB as float32 0..255: Pillow-equivalent resize of the short side to 439, then centre crop 384 (timm eval). */
async function pixels(photo: Blob): Promise<Float32Array> {
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
  const rgb = new Float32Array(b.size * b.size * 3);
  for (let y = 0; y < b.size; y++) rgb.set(small.subarray(((y + b.y) * b.sw + b.x) * 3, ((y + b.y) * b.sw + b.x + b.size) * 3), y * b.size * 3);
  return rgb;
}

export interface Identification { guesses: Guess[]; known: ReadonlySet<string> }
let knownSet: ReadonlySet<string> | null = null;

/** All European guesses, best first, plus the species the model can recognise at all. */
export async function identify(photo: Blob): Promise<Identification> {
  const [{ model, labels, Tensor }, rgb] = await Promise.all([load(), pixels(photo)]);
  const input = new Tensor(rgb, [1, 384, 384, 3]);
  try {
    const out = await model.run(input);
    const first = Array.isArray(out) ? out[0] : out;
    const host = typeof first.moveTo === "function" ? await first.moveTo("wasm") : first;
    const guesses = rankGuesses(softmax(host.toTypedArray() as Float32Array), labels, labels.length);
    knownSet ??= new Set(labels.filter(l => l.eu).map(l => l.latin));
    host.delete?.(); if (host !== first) first.delete?.();
    return { guesses, known: knownSet };
  } finally { input.delete?.(); }
}
