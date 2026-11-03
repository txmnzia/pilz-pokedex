"""Measure photo identifiers on the golden set (data/golden.json, images in .cache/golden/ via scripts/golden.py).
Every model gives, per photo, a probability per iNat taxon id (labels mapped with scripts/model-map.py, so synonyms
count). Two scores per model:
  open : the model's own label set (European labels only for the current model, as the app does)
  app  : renormalised over the taxa a find can be (dex + lookalikes + rares), which is what the app can show
Usage: python3 scripts/eval.py current fungitastic bioclip2 [inat]      (scores cached in .cache/eval/<model>.npz)
       python3 scripts/eval.py --report                                    (table from the cached scores)
"""
import json, os, sys, math, numpy as np
from PIL import Image

G = json.load(open("data/golden.json"))["photos"]
species = json.load(open("public/data/species.json"))["species"]
rares = json.load(open("public/data/rares.json"))["rares"]
APP = [s["inat"] for s in species] + [r["inat"] for r in rares]
APPSET = set(APP)
KIND = {s["inat"]: ("lookalike" if s.get("extra") else "dex") for s in species} | {r["inat"]: "rare" for r in rares}
os.makedirs(".cache/eval", exist_ok=True)
MAPS = "data/model-maps"

def img(p): return Image.open(f".cache/golden/{p['photo']}.jpg").convert("RGB")

def center(im, short, crop):
    w, h = im.size; k = short / min(w, h)
    im = im.resize((round(w * k), round(h * k)), Image.BILINEAR); w, h = im.size
    l, t = (w - crop) // 2, (h - crop) // 2
    return im.crop((l, t, l + crop, t + crop))

def softmax(x): x = np.exp(x - x.max()); return x / x.sum()

def labels_to_ids(model, labels):
    m = json.load(open(f"{MAPS}/{model}.json"))
    return np.array([m.get(l) or -1 for l in labels])

# each runner returns (ids array aligned with the score vector, function photo -> probabilities)
def run_current():
    from ai_edge_litert.interpreter import Interpreter
    L = json.load(open("public/models/fungi-labels.json"))
    eu = np.array([l["eu"] for l in L], dtype=float)
    it = Interpreter(model_path="public/models/fungi_int8.tflite"); it.allocate_tensors()
    i, o = it.get_input_details()[0], it.get_output_details()[0]
    def f(p):
        it.set_tensor(i["index"], np.asarray(center(img(p), 183, 160), dtype=np.uint8)[None]); it.invoke()
        q = it.get_tensor(o["index"])[0] / 256.0 * eu; return q / q.sum()
    return labels_to_ids("current", [l["latin"] for l in L]), f

def run_fungitastic():
    from ai_edge_litert.interpreter import Interpreter
    labels = open(".cache/df20/labels.txt").read().splitlines()
    it = Interpreter(model_path=".cache/df20/ft_fp16.tflite", num_threads=4); it.allocate_tensors()
    i, o = it.get_input_details()[0], it.get_output_details()[0]
    def f(p):
        it.set_tensor(i["index"], np.asarray(center(img(p), 439, 384), dtype=np.float32)[None]); it.invoke()
        return softmax(it.get_tensor(o["index"])[0])
    return labels_to_ids("fungitastic", labels), f

def run_bioclip2():
    import torch, open_clip
    model, _, pre = open_clip.create_model_and_transforms("hf-hub:imageomics/bioclip-2", cache_dir=".cache/hf")
    tok = open_clip.get_tokenizer("hf-hub:imageomics/bioclip-2", cache_dir=".cache/hf")
    # label set = FungiTastic's (open set of ~2800 European fungi) + the app taxa it lacks: comparable with fungitastic
    ft = json.load(open(f"{MAPS}/fungitastic.json"))
    names = {}
    for l, t in ft.items():
        if t and t not in names: names[t] = l
    for s in species + rares:
        names[s["inat"]] = s["latin"]
    ids = np.array(list(names)); model.eval()
    with torch.no_grad():
        T = []
        for k in range(0, len(ids), 256):
            T.append(model.encode_text(tok([f"a photo of {names[t]}." for t in ids[k:k + 256]])))
        T = torch.cat(T); T = T / T.norm(dim=-1, keepdim=True)
    def f(p):
        with torch.no_grad():
            e = model.encode_image(pre(img(p)).unsqueeze(0)); e = e / e.norm(dim=-1, keepdim=True)
            return (100.0 * e @ T.T).softmax(-1)[0].numpy()
    return ids, f

def run_inat():
    """iNaturalist's own computer vision (online). Needs INAT_JWT (https://www.inaturalist.org/users/api_token, 24 h).
    Polite: 1 request / 2 s, a subset of 3 photos per taxon. No location sent (fair against offline models)."""
    import urllib.request, uuid, time, ssl
    jwt = os.environ["INAT_JWT"]
    ctx = ssl.create_default_context(cafile="/root/.ccr/ca-bundle.crt") if os.path.exists("/root/.ccr/ca-bundle.crt") else None
    seen = {}
    def f(p):
        b = uuid.uuid4().hex; data = open(f".cache/golden/{p['photo']}.jpg", "rb").read()
        body = (f"--{b}\r\nContent-Disposition: form-data; name=\"image\"; filename=\"x.jpg\"\r\nContent-Type: image/jpeg\r\n\r\n"
                ).encode() + data + f"\r\n--{b}--\r\n".encode()
        time.sleep(2)
        r = json.loads(urllib.request.urlopen(urllib.request.Request(
            "https://api.inaturalist.org/v1/computervision/score_image", data=body, method="POST",
            headers={"Authorization": jwt, "Content-Type": f"multipart/form-data; boundary={b}",
                     "User-Agent": "pilz-pokedex/0.1 (https://github.com/txmnzia/pilz-pokedex)"}), context=ctx, timeout=60).read())
        out = {}
        for x in r["results"]:
            t = x["taxon"]; tid = t["id"] if t["rank"] == "species" else (t.get("parent_id") if t["rank"] in ("subspecies", "variety", "form") else None)
            if tid: out[tid] = out.get(tid, 0) + x.get("combined_score", x.get("vision_score", 0))
        return out
    return None, f

RUN = {"current": run_current, "fungitastic": run_fungitastic, "bioclip2": run_bioclip2, "inat": run_inat}

def score(model):
    path = f".cache/eval/{model}.json"
    done = json.load(open(path)) if os.path.exists(path) else {}
    photos = G if model != "inat" else [p for k, p in enumerate(G) if sum(q["inat"] == p["inat"] for q in G[:k]) < 3]
    todo = [p for p in photos if str(p["photo"]) not in done]
    if not todo: return done
    ids, f = RUN[model]()
    for n, p in enumerate(todo):
        try: q = f(p)
        except FileNotFoundError: continue
        if ids is None: top = q
        else:
            agg = {}
            for t, v in zip(ids, q):
                if t > 0: agg[int(t)] = agg.get(int(t), 0.0) + float(v)
            top = agg
        # keep the 50 best taxa (enough for top-k in both modes) + all app taxa with p > 0
        keep = dict(sorted(top.items(), key=lambda kv: -kv[1])[:50])
        keep |= {t: v for t, v in top.items() if t in APPSET and v > 1e-6}
        done[str(p["photo"])] = {str(k): round(v, 6) for k, v in keep.items()}
        if n % 100 == 0:
            print(f"{model} {n}/{len(todo)}", flush=True); json.dump(done, open(path, "w"))
    json.dump(done, open(path, "w")); return done

def report(models):
    rows = []
    for m in models:
        path = f".cache/eval/{m}.json"
        if not os.path.exists(path): continue
        S = json.load(open(path))
        for mode in ("open", "app"):
            for grp in ("dex", "lookalike", "rare", "all"):
                ps = [p for p in G if str(p["photo"]) in S and (grp == "all" or p["kind"] == grp)]
                if not ps: continue
                t1 = t3 = conf = confok = 0
                for p in ps:
                    q = {int(k): v for k, v in S[str(p["photo"])].items()}
                    if mode == "app":
                        q = {k: v for k, v in q.items() if k in APPSET}; z = sum(q.values()) or 1; q = {k: v / z for k, v in q.items()}
                    order = sorted(q, key=lambda k: -q[k])
                    ok1 = bool(order) and order[0] == p["inat"]
                    t1 += ok1; t3 += p["inat"] in order[:3]
                    if order and q[order[0]] >= 0.5: conf += 1; confok += ok1
                n = len(ps)
                rows.append((m, mode, grp, n, t1 / n, t3 / n, conf / n, confok / conf if conf else float("nan")))
    print(f"{'model':12s} {'mode':5s} {'group':10s} {'n':>5s} {'top-1':>6s} {'top-3':>6s} {'p>=.5':>6s} {'right':>6s}")
    for m, mode, grp, n, a, b, c, d in rows:
        print(f"{m:12s} {mode:5s} {grp:10s} {n:5d} {a:6.1%} {b:6.1%} {c:6.1%} {d:6.1%}")
    return rows

if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    if "--report" not in sys.argv:
        for m in args: score(m)
    report(args or list(RUN))
