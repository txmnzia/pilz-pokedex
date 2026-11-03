"""Reference photos for the 'compare before you confirm' screen (v0.13.0, Sam).
For every dex species, lookalike and rare: up to 3 photos from iNaturalist's curated taxon photos, only licences that
allow reuse with credit and resizing (CC0, CC BY, CC BY-SA, CC BY-NC, CC BY-NC-SA; no ND, no all-rights-reserved),
resized to 480 px max side, JPEG. Credits go to public/data/refs.json and are listed in Settings.
Usage: python3 scripts/scrape-refs.py      (cached in .cache/refs/, safe to re-run)
"""
import json, os, ssl, sys, time, io, hashlib, urllib.request, urllib.parse
from PIL import Image

OK = {"cc0", "cc-by", "cc-by-sa", "cc-by-nc", "cc-by-nc-sa"}
PER = 3
UA = {"User-Agent": "pilz-pokedex/0.1 (https://github.com/txmnzia/pilz-pokedex)"}
ctx = ssl.create_default_context(cafile=os.environ.get("SSL_CERT_FILE", "/root/.ccr/ca-bundle.crt") if os.path.exists("/root/.ccr/ca-bundle.crt") else None)
os.makedirs(".cache/refs", exist_ok=True); os.makedirs("public/refs", exist_ok=True)
last = [0.0]
def get(url, raw=False):
    key = ".cache/refs/" + hashlib.sha1(url.encode()).hexdigest() + (".bin" if raw else ".json")
    if os.path.exists(key):
        return open(key, "rb").read() if raw else json.load(open(key))
    for attempt in range(8):
        if not raw:
            wait = last[0] + 1.1 - time.time()
            if wait > 0: time.sleep(wait)
            last[0] = time.time()
        try:
            body = urllib.request.urlopen(urllib.request.Request(url, headers=UA), context=ctx, timeout=60).read()
            open(key, "wb").write(body)
            return body if raw else json.loads(body)
        except Exception as e:
            time.sleep(3 * (attempt + 1)); err = e
    raise err
species = json.load(open("public/data/species.json"))["species"]
rares = json.load(open("public/data/rares.json"))["rares"]
taxa = [(s["inat"], s["latin"]) for s in species] + [(r["inat"], r["latin"]) for r in rares]
out = {}
for n, (inat, latin) in enumerate(taxa):
    t = get(f"https://api.inaturalist.org/v1/taxa/{inat}")["results"]
    if not t: continue
    photos = [x["photo"] for x in t[0].get("taxon_photos", [])]
    picked = []
    for ph in photos:
        if len(picked) >= PER: break
        url = ph.get("medium_url") or ""
        if (ph.get("license_code") or "") not in OK or "inaturalist-open-data" not in url: continue
        try:
            im = Image.open(io.BytesIO(get(url, raw=True))).convert("RGB")
        except Exception:
            continue
        im.thumbnail((480, 480), Image.LANCZOS)
        fn = f"{inat}-{len(picked)}.jpg"
        im.save(f"public/refs/{fn}", "JPEG", quality=74, optimize=True, progressive=True)
        picked.append({"f": fn, "by": ph.get("attribution", ""), "lic": ph["license_code"]})
    out[str(inat)] = {"latin": latin, "photos": picked}
    sys.stdout.write("." if picked else "0"); sys.stdout.flush()
json.dump({"generatedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
           "sources": {"photos": "iNaturalist curated taxon photos, open licences only (CC0, CC BY, CC BY-SA, CC BY-NC, CC BY-NC-SA), resized to 480 px"},
           "refs": out}, open("public/data/refs.json", "w"), ensure_ascii=False)
tot = sum(len(v["photos"]) for v in out.values()); none = [v["latin"] for v in out.values() if not v["photos"]]
size = sum(os.path.getsize("public/refs/" + f) for f in os.listdir("public/refs"))
print(f"\n{len(out)} taxa, {tot} photos, {size/1e6:.1f} MB; without any photo: {len(none)} {none[:8]}")
