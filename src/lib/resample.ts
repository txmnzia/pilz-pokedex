// Anti-aliased bilinear (triangle filter) resize, same algorithm as Pillow's Image.resize(BILINEAR):
// when shrinking, the filter support grows with the scale factor, so every source pixel contributes.
// Browsers' canvas downscaling does not do this, which cost ~5 points of top-1 accuracy (measured).
// Pure: RGB(A) bytes in, RGB bytes out.

function weights(inSize: number, outSize: number) {
  const scale = inSize / outSize;
  const fscale = Math.max(scale, 1);
  const support = fscale; // bilinear support 1.0, scaled when downsampling
  const out: { start: number; w: Float64Array }[] = [];
  for (let i = 0; i < outSize; i++) {
    const center = (i + 0.5) * scale;
    const start = Math.max(0, Math.floor(center - support + 0.5));
    const end = Math.min(inSize, Math.floor(center + support + 0.5));
    const w = new Float64Array(end - start);
    let sum = 0;
    for (let j = start; j < end; j++) {
      const x = (j - center + 0.5) / fscale;
      const v = Math.max(0, 1 - Math.abs(x));
      w[j - start] = v; sum += v;
    }
    if (sum > 0) for (let k = 0; k < w.length; k++) w[k] /= sum;
    out.push({ start, w });
  }
  return out;
}

/** src: width*height*channels bytes (channels 3 or 4). Returns ow*oh*3 RGB bytes. */
export function resampleRGB(src: ArrayLike<number>, width: number, height: number, channels: number, ow: number, oh: number): Uint8Array {
  const wx = weights(width, ow), wy = weights(height, oh);
  const tmp = new Float32Array(ow * height * 3); // horizontal pass
  for (let y = 0; y < height; y++) {
    const row = y * width * channels;
    for (let x = 0; x < ow; x++) {
      const { start, w } = wx[x];
      let r = 0, g = 0, b = 0;
      for (let k = 0; k < w.length; k++) {
        const p = row + (start + k) * channels, c = w[k];
        r += src[p] * c; g += src[p + 1] * c; b += src[p + 2] * c;
      }
      const t = (y * ow + x) * 3; tmp[t] = r; tmp[t + 1] = g; tmp[t + 2] = b;
    }
  }
  const out = new Uint8Array(ow * oh * 3); // vertical pass
  for (let y = 0; y < oh; y++) {
    const { start, w } = wy[y];
    for (let x = 0; x < ow; x++) {
      let r = 0, g = 0, b = 0;
      for (let k = 0; k < w.length; k++) {
        const t = ((start + k) * ow + x) * 3, c = w[k];
        r += tmp[t] * c; g += tmp[t + 1] * c; b += tmp[t + 2] * c;
      }
      const o = (y * ow + x) * 3;
      out[o] = Math.min(255, Math.max(0, Math.round(r)));
      out[o + 1] = Math.min(255, Math.max(0, Math.round(g)));
      out[o + 2] = Math.min(255, Math.max(0, Math.round(b)));
    }
  }
  return out;
}
