"""Shared polite iNaturalist fetch (1 request / 1.1 s, retries, JSON cached in .cache/golden-api/)."""
import json, os, ssl, time, hashlib, urllib.request

UA = {"User-Agent": "pilz-pokedex/0.1 (https://github.com/txmnzia/pilz-pokedex)"}
ctx = ssl.create_default_context(cafile="/root/.ccr/ca-bundle.crt") if os.path.exists("/root/.ccr/ca-bundle.crt") else None
os.makedirs(".cache/golden-api", exist_ok=True)
last = [0.0]

def get(url, raw=False):
    key = ".cache/golden-api/" + hashlib.sha1(url.encode()).hexdigest() + ".json"
    if not raw and os.path.exists(key): return json.load(open(key))
    err = None
    for attempt in range(8):
        if not raw:
            wait = last[0] + 1.1 - time.time()
            if wait > 0: time.sleep(wait)
            last[0] = time.time()
        try:
            body = urllib.request.urlopen(urllib.request.Request(url, headers=UA), context=ctx, timeout=60).read()
            if not raw: open(key, "wb").write(body)
            return body if raw else json.loads(body)
        except Exception as e:
            err = e; time.sleep(3 * (attempt + 1))
    raise err
