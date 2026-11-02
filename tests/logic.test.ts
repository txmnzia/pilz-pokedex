import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { seasonLabel, shapeOf, lookalikesOf, dexLabel, textFor } from "../src/lib/species";
import { mergeFinds, newFind, deleteFind, findsBySpecies } from "../src/lib/finds";
import { STRINGS, defaultLang } from "../src/lib/i18n";
import type { Find, Species, SpeciesFile } from "../src/lib/types";

const data: SpeciesFile = JSON.parse(readFileSync("public/data/species.json", "utf8"));
const bySpecies = (latin: string) => data.species.find(s => s.latin === latin)!;

describe("seasonLabel", () => {
  it("formats a single run", () => expect(seasonLabel([9, 10, 11])).toBe("SEP–NOV"));
  it("wraps across new year", () => expect(seasonLabel([1, 2, 11, 12])).toBe("NOV–FEB"));
  it("handles gaps", () => expect(seasonLabel([3, 4, 9, 10], "de")).toBe("MÄR–APR, SEP–OKT"));
  it("single month", () => expect(seasonLabel([6], "fr")).toBe("JUIN"));
  it("all year is null", () => expect(seasonLabel([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])).toBeNull());
});

describe("shapeOf", () => {
  it("tree polypores split by growth form", () => {
    const sh = (latin: string) => shapeOf({ latin, morph: {} } as never);
    expect([sh("Fomes fomentarius"), sh("Laetiporus sulphureus"), sh("Trametes versicolor")]).toEqual(["hoof", "rosette", "bracket"]);
  });
  it("species override beats the genus", () => {
    expect(shapeOf({ latin: "Clathrus archeri", morph: {} } as never)).toBe("starfish");
    expect(shapeOf({ latin: "Clathrus ruber", morph: {} } as never)).toBe("cage");
  });
  it("amanita from ring+volva", () => expect(shapeOf(bySpecies("Amanita phalloides"))).toBe("amanita"));
  it("bolete from pores+stem", () => expect(shapeOf(bySpecies("Boletus edulis"))).toBe("bolete"));
  it("own shape for chanterelle", () => expect(shapeOf(bySpecies("Cantharellus cibarius"))).toBe("chanterelle"));
  it("genus overrides", () => {
    expect(shapeOf(bySpecies("Clathrus ruber"))).toBe("cage");
    expect(shapeOf(bySpecies("Fomes fomentarius"))).toBe("hoof");
    expect(shapeOf(bySpecies("Trametes versicolor"))).toBe("bracket");
  });
});

describe("species data", () => {
  it("has 100 to 150 core species numbered 1..N (issue #2), the original 30 keep their numbers", () => {
    const core = data.species.filter(s => !s.extra);
    expect(core.length).toBeGreaterThanOrEqual(100);
    expect(core.length).toBeLessThanOrEqual(150);
    expect(core.map(s => s.no)).toEqual(Array.from({ length: core.length }, (_, i) => i + 1));
    expect(core.find(s => s.no === 1)?.latin).toBe("Amanita muscaria");
    expect(core.find(s => s.latin === "Gyromitra esculenta")?.edibility).toBe("deadly");
  });
  it("every lookalike resolves", () => {
    const ids = new Set(data.species.map(s => s.inat));
    for (const s of data.species) for (const l of s.lookalikes) expect(ids.has(l)).toBe(true);
  });
  it("names in all languages", () => {
    for (const s of data.species) for (const l of ["fr", "en", "de"] as const) expect(s.names[l]).toBeTruthy();
  });
  it("lookalikes include reverse links and sort dangerous first", () => {
    const cap = bySpecies("Amanita citrina");
    const looks = lookalikesOf(cap, data.species);
    expect(looks[0].edibility).toBe("deadly");
  });
  it("labels", () => {
    expect(dexLabel({ no: 7, ex: undefined })).toBe("No. 007");
    expect(dexLabel({ no: null, ex: 3 })).toBe("EX-03");
  });
  it("text falls back to another language", () => {
    const s = { ...data.species[0], text: { de: { intro: "x", habitat: "", url: "u" } } } as Species;
    expect(textFor(s, "fr")?.lang).toBe("de");
  });
});

describe("finds", () => {
  const f = (id: string, updated: string, extra: Partial<Find> = {}): Find =>
    ({ ...newFind(1), id, updated_at: updated, created_at: updated, ...extra });
  it("merge keeps local-only finds", () => {
    expect(mergeFinds([f("a", "2026-01-01")], []).map(x => x.id)).toEqual(["a"]);
  });
  it("merge: newer remote wins, older remote loses", () => {
    const local = [f("a", "2026-01-02", { note: "local" }), f("b", "2026-01-01", { note: "local" })];
    const remote = [f("a", "2026-01-01", { note: "remote" }), f("b", "2026-01-03", { note: "remote" })];
    const m = new Map(mergeFinds(local, remote).map(x => [x.id, x.note]));
    expect(m.get("a")).toBe("local");
    expect(m.get("b")).toBe("remote");
  });
  it("soft delete hides from caught", () => {
    const a = newFind(5);
    expect(findsBySpecies([a]).get(5)?.length).toBe(1);
    expect(findsBySpecies([deleteFind(a)]).get(5)).toBeUndefined();
  });
});

describe("i18n", () => {
  it("all languages have the same keys", () => {
    const k = Object.keys(STRINGS.fr).sort();
    expect(Object.keys(STRINGS.en).sort()).toEqual(k);
    expect(Object.keys(STRINGS.de).sort()).toEqual(k);
  });
  it("default language from browser", () => {
    expect(defaultLang(["de-DE", "en"])).toBe("de");
    expect(defaultLang(["es"])).toBe("en");
  });
});

import { parseBackup, restoreInto } from "../src/lib/finds";
describe("backup", () => {
  it("round-trips and skips junk", () => {
    const a = newFind(9, { place: "X" });
    const parsed = parseBackup(JSON.stringify([a, { nope: 1 }, null]));
    expect(parsed.length).toBe(1);
    expect(parsed[0].place).toBe("X");
    expect(parsed[0].synced).toBe(false);
  });
  it("rejects non-arrays", () => expect(() => parseBackup("{}")).toThrow());
  it("restore merges, never drops", () => {
    const local = newFind(1), backup = newFind(2);
    const r = restoreInto([local], parseBackup(JSON.stringify([backup])));
    expect(r.length).toBe(2);
    expect(r.find(f => f.id === backup.id)?.synced).toBe(false);
  });
});

import { normalizePrefs, newerPrefs, type Prefs } from "../src/lib/prefs";
describe("prefs", () => {
  const base: Prefs = { lang: "en", mode: "grid", updated_at: "2026-01-01T00:00:00.000Z" };
  it("rejects unknown values", () => {
    expect(normalizePrefs({ lang: "xx" as never, mode: "list" }, base)).toEqual({ ...base, mode: "list" });
  });
  it("newer account prefs win, older lose, tie keeps device", () => {
    const remoteNew = { ...base, lang: "de" as const, updated_at: "2026-02-01T00:00:00.000Z" };
    expect(newerPrefs(base, remoteNew).lang).toBe("de");
    expect(newerPrefs({ ...base, updated_at: "2026-03-01T00:00:00.000Z" }, remoteNew).lang).toBe("en");
    expect(newerPrefs(base, { ...base, lang: "fr" })).toBe(base);
    expect(newerPrefs(base, null)).toBe(base);
  });
});

import { cropBox, rankGuesses } from "../src/lib/rank";
describe("photo identifier post-processing", () => {
  const labels = [{ latin: "A a", common: "", eu: true }, { latin: "B b", common: "", eu: false }, { latin: "C c", common: "", eu: true }];
  it("drops non-European classes and renormalises", () => {
    const g = rankGuesses([64, 128, 64], labels);
    expect(g.map(x => x.latin)).toEqual(["A a", "C c"]);
    expect(g[0].p).toBeCloseTo(0.5);
  });
  it("empty when nothing European scores", () => expect(rankGuesses([0, 255, 0], labels)).toEqual([]));
  it("centre crop matches the model card (183 -> 160)", () => {
    expect(cropBox(4000, 3000)).toMatchObject({ sh: 183, sw: 244, x: 42, y: 11, size: 160 });
  });
  it("labels file covers the dex", async () => {
    const { readFileSync } = await import("node:fs");
    const lab = JSON.parse(readFileSync("public/models/fungi-labels.json", "utf8"));
    const latin = new Set(lab.map((l: { latin: string }) => l.latin));
    const core = data.species.filter(s => !s.extra);
    expect(core.filter(s => latin.has(s.latin)).length).toBeGreaterThanOrEqual(29);
  });
});

import { resampleRGB } from "../src/lib/resample";
describe("resampleRGB (Pillow-style bilinear)", () => {
  it("averages when halving", () => {
    // 2x1 RGB: black + white -> 1x1 mid grey
    expect([...resampleRGB([0, 0, 0, 255, 255, 255], 2, 1, 3, 1, 1)]).toEqual([128, 128, 128]);
  });
  it("keeps a flat colour and drops alpha", () => {
    const src = new Uint8Array(8 * 8 * 4).map((_, i) => (i % 4 === 3 ? 255 : 77));
    expect(new Set(resampleRGB(src, 8, 8, 4, 3, 3))).toEqual(new Set([77]));
  });
  it("output size", () => expect(resampleRGB(new Uint8Array(10 * 6 * 3), 10, 6, 3, 5, 3).length).toBe(45));
});

import { readExif } from "../src/lib/exif";
describe("readExif", () => {
  const load = (f: string) => { const b = readFileSync(`tests/fixtures/${f}`); return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength); };
  it("date and GPS (N/E)", () => {
    const m = readExif(load("exif-berlin.jpg"));
    expect(m.date).toBe("2024-09-15");
    expect(m.lat).toBeCloseTo(52.52, 3);
    expect(m.lng).toBeCloseTo(13.405, 3);
  });
  it("S/W are negative", () => {
    const m = readExif(load("exif-southwest.jpg"));
    expect(m.date).toBe("2023-05-02");
    expect(m.lat).toBeLessThan(0); expect(m.lng).toBeLessThan(0);
  });
  it("date only", () => expect(readExif(load("exif-dateonly.jpg"))).toEqual({ date: "2022-10-01" }));
  it("no EXIF / not a JPEG", () => {
    expect(readExif(load("no-exif.jpg"))).toEqual({});
    expect(readExif(new Uint8Array([1, 2, 3, 4]).buffer)).toEqual({});
  });
});

import { mismatch } from "../src/lib/rank";
describe("are-you-sure check", () => {
  const known = new Set(["Boletus edulis", "Suillus luteus", "Imleria badia"]);
  const g = (...x: [string, number][]) => x.map(([latin, p]) => ({ latin, common: "", p }));
  it("silent when the photo agrees", () => expect(mismatch(g(["Boletus edulis", 0.8]), "Boletus edulis", known)).toBeNull());
  it("warns when confident about another species and the pick is unlikely", () =>
    expect(mismatch(g(["Suillus luteus", 0.89], ["Boletus edulis", 0.02]), "Boletus edulis", known)?.latin).toBe("Suillus luteus"));
  it("silent when the pick is still plausible", () =>
    expect(mismatch(g(["Suillus luteus", 0.6], ["Boletus edulis", 0.3]), "Boletus edulis", known)).toBeNull());
  it("silent when the model is unsure", () => expect(mismatch(g(["Suillus luteus", 0.4]), "Boletus edulis", known)).toBeNull());
  it("silent for species the model never learned", () =>
    expect(mismatch(g(["Suillus luteus", 0.95]), "Oudemansiella mucida", known)).toBeNull());
});

import { sortByName } from "../src/lib/species";
describe("sortByName", () => {
  const mk = (fr: string, en: string) => ({ names: { fr, en, de: en } }) as Pick<Species, "names">;
  it("sorts A to Z in the UI language, ignoring accents and case", () => {
    const l = [mk("Pied-bleu", "blewit"), mk("Écailleux", "Zebra"), mk("amanite", "Apple")];
    expect(sortByName(l, "fr").map(s => s.names.fr)).toEqual(["amanite", "Écailleux", "Pied-bleu"]);
    expect(sortByName(l, "en").map(s => s.names.en)).toEqual(["Apple", "blewit", "Zebra"]);
    expect(l[0].names.fr).toBe("Pied-bleu"); // input untouched
  });
});

import { combineGuesses } from "../src/lib/rank";
import { photosOf, touchPhoto } from "../src/lib/finds";
describe("multi-photo finds (issue #1)", () => {
  const g = (latin: string, p: number) => ({ latin, common: "", p });
  it("combines photos with a geometric mean: agreement wins over one confident outlier", () => {
    const a = [g("A", 0.6), g("B", 0.4)], b = [g("B", 0.7), g("A", 0.01), g("C", 0.29)];
    const c = combineGuesses([a, b]);
    expect(c[0].latin).toBe("B");
    expect(c.reduce((s, x) => s + x.p, 0)).toBeCloseTo(1, 6);
    expect(combineGuesses([a])).toBe(a);
    expect(combineGuesses([[], a])).toBe(a);
  });
  it("old finds have one photo under the find id; re-crop resets only that photo", () => {
    const f = newFind(1, { photo_path: "u/x.jpg" });
    expect(photosOf(f)).toEqual([{ id: f.id, path: "u/x.jpg" }]);
    const two = { ...f, photos: [{ id: f.id, path: "u/x.jpg" }, { id: "p2", path: "u/p2.jpg" }] };
    const t = touchPhoto(two, "p2");
    expect(t.photos).toEqual([{ id: f.id, path: "u/x.jpg" }, { id: "p2", path: null }]);
    expect(t.photo_path).toBe("u/x.jpg");
    expect(t.synced).toBe(false);
    expect(touchPhoto(two, f.id).photo_path).toBeNull();
  });
  it("a server without the photos column never wipes local photos", () => {
    const f = { ...newFind(1), photos: [{ id: "a", path: "u/a.jpg" }, { id: "b", path: "u/b.jpg" }] };
    const { photos: _p, ...remote } = f;
    expect(mergeFinds([f], [remote as typeof f])[0].photos).toEqual(f.photos);
  });
});
