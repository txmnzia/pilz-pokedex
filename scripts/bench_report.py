"""Benchmark overview page from the cached eval scores -> design/benchmark.html (published as an artifact).
Usage: python3 scripts/bench_report.py      (after scripts/eval.py has scored the models)
"""
import json, os, sys, collections, html, io, contextlib, importlib.util

spec = importlib.util.spec_from_file_location("ev", os.path.join(os.path.dirname(__file__), "eval.py"))
ev = importlib.util.module_from_spec(spec); sys.argv = ["eval.py", "--report"]
with contextlib.redirect_stdout(io.StringIO()): spec.loader.exec_module(ev)

MODELS = [
    ("current", "Modèle actuel", "species-classifiers fungi (Google AIY, distillé)", "3 Mo", "2 ms", "Hors ligne, dans l'app", "Apache 2.0"),
    ("fungitastic", "FungiTastic", "DINOv3 ViT-S/16, 2 827 espèces, données danoises", "46 Mo", "110 ms", "Hors ligne possible (LiteRT, même moteur)", "CC BY-NC + licence DINOv3"),
    ("bioclip2", "BioCLIP 2", "ViT-L/14, zéro-shot sur n'importe quel nom latin", "1,6 Go", "530 ms", "Trop lourd pour le téléphone", "MIT"),
    ("inat", "iNaturalist en ligne", "Vision d'iNaturalist, sans la position", "Serveur", "~1 s réseau", "En ligne seulement, compte iNat", "API non ouverte aux apps tierces"),
]
MODELS = [m for m in MODELS if os.path.exists(f".cache/eval/{m[0]}.json")]
S = {m[0]: json.load(open(f".cache/eval/{m[0]}.json")) for m in MODELS}
G = ev.G
name = {s["inat"]: s["latin"] for s in ev.species} | {r["inat"]: r["latin"] for r in ev.rares}
ED = ev.ED
L = open(".cache/df20/labels.txt").read().splitlines()
pseudo = {-(k + 1): l for k, l in enumerate(L)}
inv = {v: k for k, v in json.load(open("data/model-maps/fungitastic.json")).items() if v}
cur_labels = {-(k + 1): l["latin"] for k, l in enumerate(json.load(open("public/models/fungi-labels.json")))}

def top(q, mode):
    q = {int(k): v for k, v in q.items()}
    if mode == "app": q = {k: v for k, v in q.items() if k in ev.APPSET}
    order = sorted(q, key=lambda k: -q[k]); z = sum(q.values()) or 1
    return order, (q[order[0]] / z if order and mode == "app" else (q[order[0]] if order else 0))

def stats(m, photos, mode="open"):
    """top-1, top-3, macro recall, macro precision, confident share, confident right, deadly found, deadly->edible"""
    tp, pred, true = collections.Counter(), collections.Counter(), collections.Counter()
    t1 = t3 = conf = confok = dead = dok = dbad = n = 0
    for p in photos:
        q = S[m].get(str(p["photo"]))
        if q is None: continue
        order, pt = top(q, mode); n += 1
        a = order[0] if order else None
        ok = a == p["inat"]; t1 += ok; t3 += p["inat"] in order[:3]
        true[p["inat"]] += 1; pred[a] += 1; tp[a] += ok
        if pt >= 0.5: conf += 1; confok += ok
        if ED.get(p["inat"]) == "deadly": dead += 1; dok += ok; dbad += ED.get(a) == "edible"
    rec = sum(tp[t] / true[t] for t in true) / len(true)
    prs = [tp[t] / pred[t] for t in true if pred[t]]
    return dict(n=n, t1=t1 / n, t3=t3 / n, rec=rec, prec=sum(prs) / len(prs), conf=conf / n,
                confok=confok / conf if conf else 0, dead=dok / dead if dead else 0, dbad=dbad / dead if dead else 0, ndead=dead)

sub = set(S["inat"]) if "inat" in S else None
subset = [p for p in G if sub is None or str(p["photo"]) in sub]
full = {m[0]: stats(m[0], G) for m in MODELS if m[0] != "inat"}
same = {m[0]: stats(m[0], subset) for m in MODELS}
groups = {m[0]: {g: stats(m[0], [p for p in subset if p["kind"] == g]) for g in ("dex", "lookalike", "rare")} for m in MODELS}
app = {m[0]: stats(m[0], subset, "app") for m in MODELS}

known = {}
cm = json.load(open("data/model-maps/current.json")); fm = json.load(open("data/model-maps/fungitastic.json"))
for m, ids in (("current", set(v for v in cm.values() if v)), ("fungitastic", set(v for v in fm.values() if v))):
    known[m] = sum(t in ids for t in ev.APPSET)
known["bioclip2"] = len(ev.APPSET)
known["inat"] = None

def confusions(m, k=5):
    c = collections.Counter()
    for p in subset:
        q = S[m].get(str(p["photo"]))
        if not q: continue
        order, _ = top(q, "open")
        a = order[0] if order else None
        if a != p["inat"]:
            c[(p["latin"], name.get(a) or inv.get(a) or (pseudo.get(a) if m != "current" else cur_labels.get(a)) or "autre espèce")] += 1
    return c.most_common(k)

pct = lambda x: f"{x * 100:.0f}"
esc = html.escape
nsub = len(subset); ntaxa = len({p["inat"] for p in subset})

def best(key, rows, low=False):
    vals = [r[key] for r in rows.values()]
    return min(vals) if low else max(vals)

rows_same = same
B = {k: best(k, rows_same, k == "dbad") for k in ("t1", "t3", "rec", "prec", "confok", "dead", "dbad")}

def cell(m, k, low=False):
    v = rows_same[m][k]
    cls = " best" if abs(v - B[k]) < 1e-9 else ""
    return f'<td class="num{cls}">{pct(v)}<span class="u">%</span></td>'

def bar(v, cls):
    return f'<span class="bar {cls}"><i style="width:{v * 100:.1f}%"></i></span>'

head_cells = "".join(f'<th scope="col"><span class="mname">{esc(m[1])}</span></th>' for m in MODELS)
def mrow(label, hint, k):
    return f'<tr><th scope="row">{label}<small>{hint}</small></th>' + "".join(cell(m[0], k) for m in MODELS) + "</tr>"
def trow(label, vals):
    return f'<tr class="facts"><th scope="row">{label}</th>' + "".join(f"<td>{esc(v)}</td>" for v in vals) + "</tr>"

table = f"""
<table class="cmp">
<thead><tr><th></th>{head_cells}</tr></thead>
<tbody>
{mrow("Bonne espèce en 1<sup>er</sup>", "top-1", "t1")}
{mrow("Bonne espèce dans les 3 suggestions", "top-3", "t3")}
{mrow("Recall moyen par espèce", "la vraie espèce est trouvée", "rec")}
{mrow("Précision moyenne par espèce", "quand il dit X, c'est X", "prec")}
{mrow("Juste quand il se dit sûr", "p ≥ 0,5, seuil de l'app", "confok")}
{mrow("Mortelles reconnues", f"{rows_same[MODELS[0][0]]['ndead']} photos d'espèces mortelles", "dead")}
<tr class="danger"><th scope="row">Mortelle annoncée comestible<small>l'erreur qui compte, plus bas = mieux</small></th>{"".join(cell(m[0], "dbad") for m in MODELS)}</tr>
{trow("Espèces de l'app connues", [f"{known[m[0]]} / 360" if known[m[0]] is not None else "presque toutes" for m in MODELS])}
{trow("Taille", [m[3] for m in MODELS])}
{trow("Temps par photo", [m[4] for m in MODELS])}
{trow("Où ça tourne", [m[5] for m in MODELS])}
{trow("Licence", [m[6] for m in MODELS])}
</tbody></table>"""

gl = {"dex": "Pokédex (181)", "lookalike": "Sosies (168)", "rare": "Raretés (11)"}
bars = ""
for g in ("dex", "lookalike", "rare"):
    bars += f'<div class="grp"><h3>{gl[g]}</h3>'
    for m in MODELS:
        s = groups[m[0]][g]
        bars += (f'<div class="brow"><span class="bl">{esc(m[1])}</span>'
                 f'<span class="bars">{bar(s["t1"], "b1")}{bar(s["t3"], "b3")}</span>'
                 f'<span class="bv num">{pct(s["t1"])} <em>/ {pct(s["t3"])}</em></span></div>')
    bars += "</div>"

conf_html = ""
for m in MODELS:
    items = "".join(f"<li><i>{esc(a)}</i> <span class='arrow'>→</span> <i>{esc(b)}</i> <span class='num'>{v}×</span></li>" for (a, b), v in confusions(m[0]))
    conf_html += f'<div class="conf"><h3>{esc(m[1])}</h3><ol>{items}</ol></div>'

app_rows = "".join(
    f"<tr><th scope='row'>{esc(m[1])}</th><td class='num'>{pct(same[m[0]]['t1'])}% → {pct(app[m[0]]['t1'])}%</td>"
    f"<td class='num'>{pct(same[m[0]]['dbad'])}% → {pct(app[m[0]]['dbad'])}%</td></tr>" for m in MODELS)

full_note = ""
if sub is not None:
    full_note = ("Sur les 3 511 photos (sans iNaturalist) : " + ", ".join(
        f"{esc(m[1])} {pct(full[m[0]]['t1'])} % / {pct(full[m[0]]['t3'])} %" for m in MODELS if m[0] != "inat") +
        " (top-1 / top-3). Mêmes écarts que sur le sous-ensemble.")

page = open(os.path.join(os.path.dirname(__file__), "bench_template.html")).read()
for k, v in {"TABLE": table, "BARS": bars, "CONF": conf_html, "APPROWS": app_rows, "NSUB": f"{nsub:,}".replace(",", " "),
             "NTAXA": str(ntaxa), "FULLNOTE": full_note, "DATE": json.load(open("data/golden.json"))["generatedAt"]}.items():
    page = page.replace("{{" + k + "}}", v)
os.makedirs("design", exist_ok=True)
open("design/benchmark.html", "w").write(page)
print("design/benchmark.html", {m: {k: round(v, 3) for k, v in s.items()} for m, s in same.items()})
