// Minimal EXIF reader for JPEG: date taken (DateTimeOriginal) and GPS position. Pure, no DOM.
// Used when a photo is imported from the library, so the find gets the photo's own date/place
// instead of "today, here". Anything missing or malformed simply yields undefined.

export interface PhotoMeta { date?: string; lat?: number; lng?: number }

export function readExif(buf: ArrayBuffer): PhotoMeta {
  try {
    const v = new DataView(buf);
    if (v.byteLength < 4 || v.getUint16(0) !== 0xffd8) return {}; // not a JPEG
    let o = 2;
    while (o + 4 <= v.byteLength) {
      const marker = v.getUint16(o), len = v.getUint16(o + 2);
      if ((marker & 0xff00) !== 0xff00 || len < 2) return {};
      // APP1 "Exif\0\0"
      if (marker === 0xffe1 && v.getUint32(o + 4) === 0x45786966 && v.getUint16(o + 8) === 0) return tiff(v, o + 10);
      if (marker === 0xffda) return {}; // start of scan: no EXIF before image data
      o += 2 + len;
    }
  } catch { /* malformed */ }
  return {};
}

function tiff(v: DataView, base: number): PhotoMeta {
  const le = v.getUint16(base) === 0x4949;
  const u16 = (p: number) => v.getUint16(base + p, le);
  const u32 = (p: number) => v.getUint32(base + p, le);
  if (u16(2) !== 42) return {};

  // IFD entries: tag, type, count, value/offset
  const entries = (ifd: number) => {
    const n = u16(ifd), out = new Map<number, { type: number; count: number; at: number }>();
    for (let i = 0; i < n; i++) {
      const e = ifd + 2 + i * 12;
      const type = u16(e + 2), count = u32(e + 4);
      const size = ({ 1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 7: 1, 9: 4, 10: 8 } as Record<number, number>)[type] ?? 1;
      out.set(u16(e), { type, count, at: size * count <= 4 ? e + 8 : u32(e + 8) });
    }
    return out;
  };
  const ascii = (e?: { count: number; at: number }) => {
    if (!e) return undefined;
    let s = "";
    for (let i = 0; i < e.count; i++) { const c = v.getUint8(base + e.at + i); if (!c) break; s += String.fromCharCode(c); }
    return s;
  };
  const rationals = (e?: { count: number; at: number }) =>
    e ? Array.from({ length: e.count }, (_, i) => u32(e.at + i * 8) / (u32(e.at + i * 8 + 4) || 1)) : undefined;

  const ifd0 = entries(u32(4));
  const meta: PhotoMeta = {};

  const exifPtr = ifd0.get(0x8769);
  const exif = exifPtr ? entries(u32(exifPtr.at)) : undefined;
  const dt = ascii(exif?.get(0x9003)) ?? ascii(exif?.get(0x9004)) ?? ascii(ifd0.get(0x0132)); // DateTimeOriginal, Digitized, DateTime
  const m = dt?.match(/^(\d{4}):(\d{2}):(\d{2})/);
  if (m && m[1] !== "0000") meta.date = `${m[1]}-${m[2]}-${m[3]}`;

  const gpsPtr = ifd0.get(0x8825);
  if (gpsPtr) {
    const g = entries(u32(gpsPtr.at));
    const dms = (r?: number[]) => (r && r.length >= 3 ? r[0] + r[1] / 60 + r[2] / 3600 : undefined);
    const lat = dms(rationals(g.get(2))), lng = dms(rationals(g.get(4)));
    const latRef = ascii(g.get(1)), lngRef = ascii(g.get(3));
    if (lat !== undefined && lng !== undefined && Number.isFinite(lat) && Number.isFinite(lng) && !(lat === 0 && lng === 0)) {
      meta.lat = latRef === "S" ? -lat : lat;
      meta.lng = lngRef === "W" ? -lng : lng;
    }
  }
  return meta;
}
