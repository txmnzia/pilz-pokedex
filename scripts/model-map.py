"""Map a model's label names to current iNaturalist taxon ids, so synonyms count (e.g. FungiTastic says Lepista nuda,
iNat and the dex say Collybia nuda). Uses iNat's taxon search, which matches old names too.
Usage: python3 scripts/model-map.py <labels.txt or labels.json> <out.json>     (cached in .cache/golden-api/)
Output: {label: inat_taxon_id or null}
"""
import json, sys, urllib.parse, os
sys.path.insert(0, os.path.dirname(__file__))
from golden_lib import get

src, dst = sys.argv[1], sys.argv[2]
labels = [l["latin"] for l in json.load(open(src))] if src.endswith(".json") else [l for l in open(src).read().split("\n") if l]
out = {} if "--redo" in sys.argv or not os.path.exists(dst) else json.load(open(dst))
# human decisions for ambiguous names (a name that is a synonym of several species), with the reason
OV = json.load(open("data/model-maps/overrides.json")) if os.path.exists("data/model-maps/overrides.json") else {}
model = os.path.basename(dst).removesuffix(".json")
ambiguous = {}
for n, name in enumerate(labels):
    if name in out: continue
    if name in OV.get(model, {}):
        out[name] = OV[model][name]["inat"]; continue
    ep = name.split(" ")
    # the name as given, then the other Latin genders of the epithet (labels like "Polyporus umbellata")
    tries = [name] + ([" ".join(ep[:-1] + [ep[-1][:-len(a)] + b]) for a in ("us", "a", "um") if ep[-1].endswith(a)
                       for b in ("us", "a", "um") if b != a] if len(ep) == 2 else [])
    found = None
    for q in tries:
        r = get("https://api.inaturalist.org/v1/taxa?" + urllib.parse.urlencode({"q": q, "is_active": "true", "per_page": 5}))["results"]
        nominate = q + " " + q.split(" ")[-1]          # "Clitocybe odora odora" = the species itself
        ids = []
        for t in r:
            if t["rank"] not in ("species", "subspecies", "variety", "form"): continue
            if t.get("iconic_taxon_name") not in ("Fungi", "Protozoa", None): continue
            m = t.get("matched_term")
            if t["name"] == q or m == q or m == nominate:
                tid = t["id"] if t["rank"] == "species" else t.get("parent_id")
                if tid not in ids: ids.append(tid)
        if ids:
            if len(ids) > 1: ambiguous[name] = ids
            found = ids[0] if len(ids) == 1 else None
            break
    out[name] = found
    if n % 100 == 0:
        print(f"{n}/{len(labels)}", flush=True); json.dump(out, open(dst, "w"), indent=0)
json.dump(out, open(dst, "w"), indent=0)
print(f"{sum(v is not None for v in out.values())}/{len(out)} mapped; ambiguous (left unmapped, decide in "
      f"data/model-maps/overrides.json): {ambiguous}", flush=True)
