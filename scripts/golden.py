"""Golden dataset for the photo identifier (v0.15.0, Sam): a frozen list of iNaturalist photos to measure any model.
For every dex species, lookalike and rare: up to PER research-grade observations from Europe, open licence (same set as
the reference photos), ONE photo per observation, distinct observers, newest first. Recent photos first (observed from
RECENT on) so models trained on older iNat exports have not seen them; widened to OLDER when a species has too few.
Photos already used as reference photos are skipped.
Writes data/golden.json (ids, licence, credit, date: committed) and the images to .cache/golden/ (500 px, not committed).
Usage: python3 scripts/golden.py            (API answers cached in .cache/golden-api/, safe to re-run)
       python3 scripts/golden.py --images   (only (re)download missing images from data/golden.json)
"""
import json, os, sys, time, urllib.parse

PER = 10
RECENT, OLDER = "2026-01-01", "2024-01-01"
EUROPE = 97391
LIC = "cc0,cc-by,cc-by-sa,cc-by-nc,cc-by-nc-sa"
sys.path.insert(0, os.path.dirname(__file__))
from golden_lib import get
os.makedirs(".cache/golden", exist_ok=True)

def obs(taxon, d1, d2=None):
    q = {"taxon_id": taxon, "quality_grade": "research", "place_id": EUROPE, "photo_license": LIC, "photos": "true",
         "d1": d1, "order_by": "observed_on", "order": "desc", "per_page": 100}
    if d2: q["d2"] = d2
    return get("https://api.inaturalist.org/v1/observations?" + urllib.parse.urlencode(q))["results"]

def images(items):
    miss = [g for g in items if not os.path.exists(f".cache/golden/{g['photo']}.jpg")]
    for n, g in enumerate(miss):
        body = get(g["url"], raw=True)
        open(f".cache/golden/{g['photo']}.jpg", "wb").write(body)
        if n % 100 == 0: print(f"  images {n}/{len(miss)}", flush=True)

if "--images" in sys.argv:
    images(json.load(open("data/golden.json"))["photos"]); sys.exit()

species = json.load(open("public/data/species.json"))["species"]
rares = json.load(open("public/data/rares.json"))["rares"]
refs = json.load(open("public/data/refs.json"))["refs"]
used = {p["big"].split("/photos/")[1].split("/")[0] for r in refs.values() for p in r["photos"] if p.get("big")}
taxa = [(s["inat"], s["latin"], "lookalike" if s.get("extra") else "dex") for s in species] + \
       [(r["inat"], r["latin"], "rare") for r in rares]
out, short = [], []
for n, (inat, latin, kind) in enumerate(taxa):
    picked, users, seen = [], set(), set()
    for d1, d2 in ((RECENT, None), (OLDER, RECENT)):
        for o in obs(inat, d1, d2):
            if len(picked) >= PER: break
            u = o["user"]["id"]
            ph = [p for p in o["photos"] if (p.get("license_code") or "") in LIC.split(",")]
            if u in users or not ph or o["id"] in seen: continue
            p = ph[0]
            if str(p["id"]) in used: continue
            # the golden label is the dex taxon (observations of a subspecies count for the species)
            picked.append({"inat": inat, "latin": latin, "kind": kind, "obs": o["id"], "photo": p["id"],
                           "observed": o.get("observed_on"), "lic": p["license_code"], "by": p.get("attribution"),
                           "country": (o.get("place_guess") or "").split(",")[-1].strip(),
                           "url": p["url"].replace("/square.", "/medium.")})
            users.add(u); seen.add(o["id"])
        if len(picked) >= PER: break
    out += picked
    if len(picked) < PER: short.append((latin, len(picked)))
    if n % 20 == 0: print(f"{n}/{len(taxa)} {latin}: {len(picked)}", flush=True)
json.dump({"generatedAt": time.strftime("%Y-%m-%d"), "rule": {"per": PER, "recent": RECENT, "older": OLDER,
           "place": "Europe (iNat place 97391)", "quality": "research", "licences": LIC},
           "photos": out}, open("data/golden.json", "w"), ensure_ascii=False, indent=0)
print(f"{len(out)} photos for {len(taxa)} taxa; recent: {sum(g['observed'] >= RECENT for g in out if g['observed'])}; "
      f"short ({len(short)}): {short}", flush=True)
images(out)
print("done", flush=True)
