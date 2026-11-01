import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { seasonLabel, shapeOf, lookalikesOf, dexLabel, textFor } from "../src/lib/species";
import { mergeFinds, newFind, deleteFind, findsBySpecies } from "../src/lib/finds";
import { STRINGS, defaultLang } from "../src/lib/i18n";
import type { Find, Species, SpeciesFile } from "../src/lib/types";

const data: SpeciesFile = JSON.parse(readFileSync("public/data/species.json", "utf8"));
const bySpecies = (latin: string) => data.species.find(s => s.latin === latin)!;

describe("seasonLabel", () => {
  it("formats a single run", () => expect(seasonLabel([9, 10, 11])).toBe("IX–XI"));
  it("wraps across new year", () => expect(seasonLabel([1, 2, 11, 12])).toBe("XI–II"));
  it("handles gaps", () => expect(seasonLabel([3, 4, 9, 10])).toBe("III–IV, IX–X"));
  it("single month", () => expect(seasonLabel([5])).toBe("V"));
  it("all year is null", () => expect(seasonLabel([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])).toBeNull());
});

describe("shapeOf", () => {
  it("amanita from ring+volva", () => expect(shapeOf(bySpecies("Amanita phalloides"))).toBe("amanita"));
  it("bolete from pores+stem", () => expect(shapeOf(bySpecies("Boletus edulis"))).toBe("bolete"));
  it("funnel for chanterelle", () => expect(shapeOf(bySpecies("Cantharellus cibarius"))).toBe("funnel"));
  it("genus overrides", () => {
    expect(shapeOf(bySpecies("Clathrus ruber"))).toBe("cage");
    expect(shapeOf(bySpecies("Fomes fomentarius"))).toBe("bracket");
  });
});

describe("species data", () => {
  it("has 30 numbered core species", () => {
    const core = data.species.filter(s => !s.extra);
    expect(core.map(s => s.no)).toEqual(Array.from({ length: 30 }, (_, i) => i + 1));
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
