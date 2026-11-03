"""public/models/fungitastic-labels.json for the on-device identifier (v0.15.0): one entry per model output, index-aligned.
A label that is a synonym of a Pilzdex species (dex, lookalike, rare) gets the Pilzdex Latin name, so the app matches it
(e.g. the model says Lepista nuda, the dex says Collybia nuda). Mapping: data/model-maps/fungitastic.json (model-map.py).
All labels are European (FungiTastic = Danish Fungi Atlas), so eu is true for every label.
Usage: python3 scripts/ft-labels.py
"""
import json
labels = open("data/model-maps/fungitastic-labels.txt").read().splitlines()
m = json.load(open("data/model-maps/fungitastic.json"))
taxa = {s["inat"]: s["latin"] for s in json.load(open("public/data/species.json"))["species"]}
taxa |= {r["inat"]: r["latin"] for r in json.load(open("public/data/rares.json"))["rares"]}
out = [{"latin": taxa.get(m.get(l), l), "common": "", "eu": True} for l in labels]
json.dump(out, open("public/models/fungitastic-labels.json", "w"), ensure_ascii=False, separators=(",", ":"))
print(len(out), "labels;", len({o["latin"] for o in out if o["latin"] in taxa.values()}), "Pilzdex taxa")
