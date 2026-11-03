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
out = json.load(open(dst)) if os.path.exists(dst) else {}
for n, name in enumerate(labels):
    if name in out: continue
    r = get("https://api.inaturalist.org/v1/taxa?" + urllib.parse.urlencode({"q": name, "is_active": "true", "per_page": 5}))["results"]
    hit = next((t for t in r if t["rank"] in ("species", "subspecies", "variety", "form") and
                (t["name"] == name or t.get("matched_term") == name)), None)
    out[name] = (hit["id"] if hit["rank"] == "species" else hit.get("parent_id")) if hit else None
    if n % 100 == 0:
        print(f"{n}/{len(labels)}", flush=True); json.dump(out, open(dst, "w"), indent=0)
json.dump(out, open(dst, "w"), indent=0)
print(f"{sum(v is not None for v in out.values())}/{len(out)} mapped", flush=True)
