# Silhouette archetypes for the Pilzdex (v0.10.0), 100x100, ground at y=92. Smooth curves only; each entry = list of pieces.
# Usage: python3 scripts/silhouettes.py out.json   then paste the shapes into the S table of src/components/Art.tsx.
# Rounds of review with Sam are kept in order (later assignments override earlier ones). Design page with photos:
# https://claude.ai/artifact/PQCc6WbH72kQyfdyWsqGe5
import math, json, sys
OUT = sys.argv[1] if len(sys.argv) > 1 else "silhouettes.json"
def f(x): return f"{x:.1f}".rstrip("0").rstrip(".")
def poly(pts): return "M" + " L".join(f"{f(x)} {f(y)}" for x, y in pts) + "Z"
def ell(cx, cy, rx, ry, n=40): return poly([(cx + rx*math.cos(2*math.pi*k/n), cy + ry*math.sin(2*math.pi*k/n)) for k in range(n)])
def smooth(pts):
    """closed Catmull-Rom spline through pts -> cubic bezier path (no sharp corners)"""
    n = len(pts); d = f"M{f(pts[0][0])} {f(pts[0][1])}"
    for i in range(n):
        p0, p1, p2, p3 = pts[i-1], pts[i], pts[(i+1) % n], pts[(i+2) % n]
        c1 = (p1[0] + (p2[0]-p0[0])/6, p1[1] + (p2[1]-p0[1])/6); c2 = (p2[0] - (p3[0]-p1[0])/6, p2[1] - (p3[1]-p1[1])/6)
        d += f" C{f(c1[0])} {f(c1[1])} {f(c2[0])} {f(c2[1])} {f(p2[0])} {f(p2[1])}"
    return d + "Z"
def arm(p0, p1, p2, w0, w1, n=18, cap=True):
    L, R = [], []
    for k in range(n+1):
        t = k/n
        x = (1-t)**2*p0[0] + 2*(1-t)*t*p1[0] + t*t*p2[0]; y = (1-t)**2*p0[1] + 2*(1-t)*t*p1[1] + t*t*p2[1]
        dx = 2*(1-t)*(p1[0]-p0[0]) + 2*t*(p2[0]-p1[0]); dy = 2*(1-t)*(p1[1]-p0[1]) + 2*t*(p2[1]-p1[1])
        l = math.hypot(dx, dy) or 1; nx, ny = -dy/l, dx/l; w = w0 + (w1-w0)*t
        L.append((x+nx*w, y+ny*w)); R.append((x-nx*w, y-ny*w))
    tip = []
    if cap:
        a = math.atan2(dy, dx); tip = [(x + w1*math.cos(a + math.pi/2 - math.pi*j/8), y + w1*math.sin(a + math.pi/2 - math.pi*j/8)) for j in range(1, 8)]
    return poly(L + tip + R[::-1])
def stem(xc, top, bottom, wt, wb, bulge=0):
    """stem from top to bottom: half widths wt (top) -> wb (bottom), optional club bulge near the bottom"""
    pts = []
    for k in range(9):
        t = k/8; y = top + (bottom-top)*t; w = wt + (wb-wt)*t + bulge*math.sin(math.pi*t)**2*t
        pts.append((xc - w, y))
    right = [(2*xc - x, y) for x, y in pts[::-1]]
    return smooth(pts + [(xc, bottom + 1)] + right + [(xc, top - 1)])
def cap(xc, rim, top, half, under=4, flat=0.0, umbo=0.0, dip=0.0):
    """mushroom cap: dome from rim to top, slight underside curve. flat 0..1 flattens the dome, umbo/dip shape the centre"""
    pts = []
    for k in range(13):
        a = math.pi*k/12; x = xc - half*math.cos(a)
        h = (rim - top)*(math.sin(a)**(1 - 0.75*flat))
        c = math.exp(-((x-xc)/(half*0.18))**2)
        pts.append((x, rim - h - umbo*c*(rim-top)*0.35 + dip*c*(rim-top)*0.45))
    pts += [(xc + half*0.55, rim + under*0.8), (xc, rim + under), (xc - half*0.55, rim + under*0.8)]
    return smooth(pts)
def lobed(cx, cy, rx, ry, lobes, amp, phase=0):
    pts = []
    for k in range(lobes*4):
        a = 2*math.pi*k/(lobes*4); r = 1 + amp*math.cos(lobes*a + phase)
        pts.append((cx + rx*r*math.cos(a), cy + ry*r*math.sin(a)))
    return smooth(pts)
def wavy(cx, cy, rx, ry, lobes, amp, n=120, phase=0, squash_bottom=0):
    pts = []
    for k in range(n):
        a = 2*math.pi*k/n; r = 1 + amp*math.sin(lobes*a + phase)
        y = cy + ry*r*math.sin(a)
        if squash_bottom and math.sin(a) > 0: y = cy + ry*r*math.sin(a)*(1-squash_bottom)
        pts.append((cx + rx*r*math.cos(a), y))
    return poly(pts)
G = 92
S = {}
S["amanita"] = [cap(50, 40, 12, 36, 3), stem(50, 38, 82, 6.5, 8), smooth([(43, 52), (57, 52), (63, 56.5), (61, 60), (50, 58.5), (39, 60), (37, 56.5)]), ell(50, 84, 13, 8)]
S["bolete"] = [cap(50, 50, 10, 42, 5), stem(50, 50, G, 12, 15, 4)]
S["leccinum"] = [cap(50, 34, 10, 30, 4), stem(50, 34, G, 7, 9)]
S["suillus"] = [cap(50, 40, 18, 40, 3, flat=.6), stem(50, 40, G, 8, 9), smooth([(43, 52), (57, 52), (61, 57), (50, 58), (39, 57)])]
S["gilled"] = [cap(50, 42, 16, 40, 4, flat=.35), stem(50, 42, G, 7, 8)]
S["russula"] = [cap(50, 40, 26, 42, 3, flat=.85, dip=.7), stem(50, 40, G, 11, 11)]
S["cortinarius"] = [cap(50, 38, 14, 34, 4, flat=.2), stem(50, 38, G, 7, 12, 4)]
S["funnel"] = [smooth([(8, 26), (30, 34), (50, 36), (70, 34), (92, 26), (82, 44), (62, 56), (50, 58), (38, 56), (18, 44)]), stem(50, 54, G, 6, 7)]
S["chanterelle"] = [smooth([(10, 30), (20, 26), (30, 31), (40, 26), (50, 30), (60, 26), (70, 31), (80, 26), (90, 30), (80, 46), (62, 58), (57, 70), (57, 84), (58, 92), (42, 92), (43, 84), (43, 70), (38, 58), (20, 46)])]
S["trumpet"] = [smooth([(26, 12), (38, 18), (50, 15), (62, 18), (74, 12), (68, 30), (58, 46), (55, 62), (55, 80), (56, 92), (44, 92), (45, 80), (45, 62), (42, 46), (32, 30)])]
morel = []
for k in range(40):
    a = math.pi*2*k/40; r = 1 + 0.035*math.cos(12*a)
    x = 50 + 21*r*math.sin(a); y = 36 - 28*r*math.cos(a) if math.cos(a) > 0 else 36 - 22*r*math.cos(a)
    morel.append((x, y))
S["morel"] = [smooth(morel), stem(50, 54, G, 9, 11)]
S["brain"] = [lobed(50, 40, 30, 24, 7, .08, 1), stem(50, 58, G, 10, 13)]
S["saddle"] = [smooth([(16, 40), (20, 22), (34, 16), (42, 26), (50, 22), (58, 26), (66, 16), (80, 22), (84, 40), (76, 46), (66, 40), (58, 46), (50, 42), (42, 46), (34, 40), (24, 46)]), stem(50, 42, G, 9, 12)]
S["parasol"] = [cap(50, 34, 16, 46, 3, flat=.7, umbo=.7), stem(50, 34, 88, 3.5, 4.5), smooth([(45.5, 49), (54.5, 49), (59, 53), (57.5, 56), (50, 54.8), (42.5, 56), (41, 53)]), ell(50, 88, 8, 4.5)]
S["shaggy"] = [smooth([(34, 64), (31, 44), (34, 24), (42, 12), (50, 9), (58, 12), (66, 24), (69, 44), (66, 64), (58, 67), (50, 64), (42, 67)]), stem(50, 62, G, 5.5, 6.5)]
S["bell"] = [cap(40, 34, 12, 13, 2, flat=-.6), arm((40, 34), (38, 64), (36, G), 2.6, 3.2, cap=False), cap(68, 52, 36, 9, 2, flat=-.6), arm((68, 52), (70, 74), (66, G), 2, 2.6, cap=False)]
S["tuft"] = [smooth([(22, G+1), (34, 84), (50, 82), (66, 84), (78, G+1)]),
    arm((40, 86), (32, 60), (26, 44), 3.6, 3.2, cap=False), cap(26, 44, 28, 15, 3, flat=.3),
    arm((50, 86), (50, 50), (52, 30), 3.8, 3.4, cap=False), cap(52, 30, 12, 17, 3, flat=.3),
    arm((60, 86), (68, 66), (74, 52), 3.4, 3, cap=False), cap(74, 52, 38, 14, 3, flat=.3)]
S["pear"] = [smooth([(50, 16), (66, 22), (76, 40), (72, 58), (62, 70), (60, 82), (62, 92), (38, 92), (40, 82), (38, 70), (28, 58), (24, 40), (34, 22)])]
S["ball"] = [smooth([(50, 22), (78, 26), (94, 46), (92, 70), (74, 88), (50, 92), (26, 88), (8, 70), (6, 46), (22, 26)])]
S["earthball"] = [smooth([(50, 26), (68, 26), (82, 40), (82, 58), (70, 74), (58, 80), (54, 88), (56, 92), (44, 92), (46, 88), (42, 80), (30, 74), (18, 58), (18, 40), (32, 28)])]
S["stinkhorn"] = [smooth([(40, 18), (44, 10), (56, 10), (60, 18), (62, 36), (50, 40), (38, 36)]), stem(50, 36, 82, 7, 8), smooth([(30, G), (32, 80), (42, 74), (58, 74), (68, 80), (70, G)])]
S["dogstink"] = [arm((52, 80), (46, 50), (54, 14), 6, 3.2), smooth([(34, G), (36, 82), (44, 76), (60, 76), (66, 82), (66, G)])]
S["ear"] = [smooth([(6, 16), (50, 10), (94, 18), (94, 24), (50, 18), (6, 24)]),
    smooth([(24, 22), (44, 24), (52, 38), (50, 56), (40, 74), (26, 80), (14, 72), (14, 56), (22, 50), (18, 38)]),
    smooth([(58, 24), (76, 26), (86, 40), (84, 58), (74, 68), (64, 64), (68, 54), (64, 44), (58, 38)])]
S["jelly"] = [smooth([(6, 74), (50, 70), (94, 76), (94, 82), (50, 78), (6, 82)]), lobed(50, 50, 32, 24, 7, .09), lobed(36, 40, 12, 10, 4, .1), lobed(64, 42, 12, 10, 4, .1, 1)]
S["cup"] = [smooth([(10, 40), (30, 47), (50, 50), (70, 47), (90, 40), (86, 62), (72, 80), (50, 88), (28, 80), (14, 62)]), smooth([(66, 70), (76, 73), (90, 70), (88, 82), (80, 90), (70, 88)])]
coral = [smooth([(38, G), (42, 76), (58, 76), (62, G)])]
for p0, p1, p2 in [((48, 78), (36, 60), (24, 30)), ((50, 78), (46, 50), (40, 18)), ((52, 78), (58, 50), (62, 16)), ((52, 78), (66, 60), (78, 32)),
                   ((34, 52), (24, 40), (16, 34)), ((44, 46), (52, 34), (52, 24)), ((60, 44), (70, 34), (74, 18)), ((70, 56), (82, 48), (88, 44))]:
    coral.append(arm(p0, p1, p2, 5, 2.4))
S["coral"] = coral
S["cauliflower"] = [lobed(50, 52, 38, 34, 11, .07), smooth([(42, 82), (58, 82), (60, G), (40, G)])]
hyd = cap(46, 44, 18, 38, 0, flat=.4)
teeth = []
for k in range(9):
    x = 14 + k*8; teeth.append(smooth([(x - 3, 43), (x + 3, 43), (x + 2, 47), (x, 48.5), (x - 2, 47)]))
S["hedgehog"] = [hyd, *teeth, stem(46, 46, G, 9, 11)]
S["icicles"] = [smooth([(38, G), (42, 70), (44, 48), (56, 48), (58, 70), (62, G)]), smooth([(14, 46), (20, 32), (34, 26), (50, 22), (66, 26), (80, 32), (86, 46), (70, 52), (50, 54), (30, 52)])]
for k in range(11):
    x = 18 + k*6.4; L = 22 - abs(x - 50)*0.22
    S["icicles"].append(smooth([(x - 2.4, 48), (x + 2.4, 48), (x + 1.6, 48 + L*0.7), (x, 48 + L), (x - 1.6, 48 + L*0.7)]))
S["oyster"] = [smooth([(4, 4), (20, 4), (22, 96), (4, 96)]),
    smooth([(18, 22), (40, 14), (66, 12), (90, 20), (92, 30), (74, 36), (50, 38), (20, 36)]),
    smooth([(18, 48), (40, 42), (62, 42), (80, 50), (80, 58), (62, 62), (40, 62), (20, 60)]),
    smooth([(18, 72), (34, 68), (50, 70), (60, 78), (54, 84), (36, 84), (20, 82)])]
S["crust"] = [smooth([(4, 62), (50, 60), (96, 62), (96, 90), (50, 92), (4, 90)]),
    smooth([(10, 62), (16, 50), (24, 46), (30, 54), (36, 46), (44, 44), (50, 52), (58, 44), (66, 46), (72, 54), (80, 46), (88, 50), (92, 62)])]
S["nest"] = []
for cx, h in [(30, 30), (52, 38), (74, 26)]:
    S["nest"].append(smooth([(cx - 11, G - h), (cx, G - h - 2), (cx + 11, G - h), (cx + 6, G - h*0.45), (cx + 3, G), (cx - 3, G), (cx - 6, G - h*0.45)]))
S["nest"].append(smooth([(10, G), (50, G - 2), (90, G), (90, G + 3), (10, G + 3)]))
# keep the newer tree polypores, cage and starfish from the app as they are (already reviewed by Sam)
json.dump(S, open(OUT, "w"))

# ---------- round 2 (Sam's feedback) ----------
import random
R = random.Random(7)
def jit(pts, a): return [(x + R.uniform(-a, a), y + R.uniform(-a, a)) for x, y in pts]
def blob(cx, cy, rx, ry, n, amp, rot=0.0, seed=1):
    r = random.Random(seed); pts = []
    for k in range(n):
        a = 2*math.pi*k/n + rot; s = 1 + r.uniform(-amp, amp)
        pts.append((cx + rx*s*math.cos(a), cy + ry*s*math.sin(a)))
    return smooth(pts)
# funnel: rounded lips, gentle bowl, no points
S["funnel"] = [smooth([(9, 30), (12, 25), (30, 33), (50, 35), (70, 33), (88, 25), (91, 30), (84, 44), (66, 55), (55, 58), (45, 58), (34, 55), (16, 44)]), stem(50, 55, G, 6, 7)]
# chanterelle: lopsided, irregular wavy rim, leaning stem
S["chanterelle"] = [smooth([(8, 36), (12, 28), (22, 31), (28, 24), (38, 27), (46, 21), (56, 26), (66, 22), (76, 28), (86, 26), (92, 33), (82, 46), (66, 56), (58, 66), (56, 78), (58, 92), (42, 92), (43, 80), (41, 68), (32, 58), (16, 48)])]
# trumpet: leaning horn, one lip curled higher, uneven sides
S["trumpet"] = [smooth([(24, 18), (30, 12), (40, 18), (52, 14), (62, 20), (72, 8), (78, 14), (70, 30), (61, 44), (57, 60), (56, 78), (57, 92), (45, 92), (46, 78), (45, 62), (40, 48), (32, 34)])]
# hedgehog: one outline, soft teeth along the underside (no gaps)
hh = []
for k in range(41):
    a = math.pi*k/40; hh.append((46 - 37*math.cos(a), 44 - 28*math.sin(a)**0.75))
under = []
for k in range(19):
    x = 83 - k*37*2/18; y = 46 + (2.5 if k % 2 else -0.5) + (1.5 if k % 4 == 1 else 0)
    under.append((x, y))
S["hedgehog"] = [smooth(hh + under), stem(48, 46, G, 9, 11)]
# cage: irregular ball, irregular holes of different sizes (still the only shape with holes)
holes = [(50, 40, 10, 8.5, .3), (29, 34, 8, 9, -.4), (70, 32, 9, 7.5, .5), (34, 58, 9.5, 8, .2), (63, 57, 8, 9.5, -.3), (49, 70, 7, 6, .1), (78, 49, 5.5, 7, .6), (20, 50, 5, 6.5, -.2), (52, 20, 7, 5, 0)]
cage = blob(50, 46, 39, 37, 14, .04, seed=3)
for i, (cx, cy, rx, ry, rot) in enumerate(holes):
    pts = []; r = random.Random(10 + i)
    for k in range(7):
        a = 2*math.pi*k/7 + rot; s = 1 + r.uniform(-.18, .18)
        pts.append((cx + rx*s*math.cos(a), cy + ry*s*math.sin(a)))
    cage += " " + smooth(pts[::-1])
S["cage"] = [cage, smooth([(38, 80), (46, 84), (54, 85), (63, 80), (61, 89), (50, 92), (40, 89)])]
# starfish: 5 arms of different length, width, curl; off-centre egg
star = [ell(48, 52, 13, 12)]
for ang, ln, w0, curl in [(-95, 40, 9, 14), (-22, 44, 10, -8), (40, 36, 8.5, 20), (112, 42, 9.5, -14), (178, 34, 8, 10)]:
    a = math.radians(ang); c = math.radians(ang + curl); e = math.radians(ang + curl*1.8)
    p0 = (48 + 5*math.cos(a), 52 + 5*math.sin(a)); p1 = (48 + ln*.62*math.cos(c), 52 + ln*.62*math.sin(c)); p2 = (48 + ln*math.cos(e), 52 + ln*math.sin(e))
    star.append(arm(p0, p1, p2, w0, 3.2))
S["starfish"] = star
# ear: no branch; two cupped ear lobes, attached at the top
S["ear"] = [smooth([(26, 14), (44, 16), (54, 30), (54, 50), (46, 70), (32, 84), (18, 80), (12, 64), (20, 54), (16, 40), (18, 24)]),
            smooth([(60, 22), (76, 22), (88, 36), (86, 56), (76, 68), (64, 66), (68, 52), (62, 42), (58, 32)])]
# jelly: no twig; irregular lobed blob
S["jelly"] = [blob(50, 52, 34, 26, 16, .12, seed=5), blob(34, 40, 13, 11, 8, .15, seed=6), blob(66, 42, 14, 12, 8, .15, seed=8), blob(52, 66, 16, 11, 8, .15, seed=9)]
# cauliflower: irregular ruffled mass, lopsided, uneven lobes
cf = []
r = random.Random(4)
for k in range(26):
    a = 2*math.pi*k/26; s = 1 + (0.09 if k % 2 else -0.05) + r.uniform(-.06, .06)
    rx, ry = (40, 32) if math.cos(a) > 0 else (35, 33)
    cf.append((48 + rx*s*math.cos(a), 50 + ry*s*math.sin(a) - (4 if math.sin(a) < 0 and math.cos(a) > 0 else 0)))
S["cauliflower"] = [smooth(cf), smooth([(42, 80), (56, 80), (59, G), (40, G)])]
# icicles (Hericium coralloides): white coral, arching branches, rows of short hanging spines under every branch
ic = [smooth([(42, G), (44, 76), (48, 66), (54, 66), (58, 76), (60, G)])]
branches = [((50, 70), (30, 56), (14, 52)), ((50, 70), (44, 46), (30, 30)), ((52, 68), (60, 44), (74, 30)), ((52, 70), (72, 58), (88, 56)), ((40, 48), (48, 30), (52, 16))]
for p0, p1, p2 in branches:
    ic.append(arm(p0, p1, p2, 4, 2.4))
    for k in range(1, 8):
        t = k/8
        x = (1-t)**2*p0[0] + 2*(1-t)*t*p1[0] + t*t*p2[0]; y = (1-t)**2*p0[1] + 2*(1-t)*t*p1[1] + t*t*p2[1]
        L = 7 + (k % 3)
        ic.append(smooth([(x - 1.5, y + 1), (x + 1.5, y + 1), (x + .9, y + L*.7), (x, y + L), (x - .9, y + L*.7)]))
S["icicles"] = ic
# on wood, without the wood
S["oyster"] = [smooth([(8, 20), (30, 12), (60, 10), (88, 18), (92, 28), (74, 34), (44, 36), (10, 32)]),
               smooth([(8, 46), (32, 40), (58, 40), (80, 48), (80, 57), (60, 62), (34, 62), (10, 58)]),
               smooth([(8, 70), (26, 66), (44, 68), (56, 76), (50, 84), (30, 86), (10, 82)])]
S["hoof"] = [smooth([(10, 22), (40, 18), (66, 24), (86, 38), (90, 52), (80, 62), (56, 66), (30, 66), (10, 64)]),
             smooth([(10, 72), (32, 70), (50, 74), (54, 80), (44, 86), (26, 86), (10, 84)])]
S["bracket"] = [smooth([(10, 14), (36, 10), (62, 12), (80, 20), (76, 28), (50, 32), (10, 30)]),
                smooth([(10, 42), (40, 36), (70, 38), (90, 48), (84, 56), (54, 60), (10, 58)]),
                smooth([(10, 70), (34, 66), (58, 68), (74, 76), (66, 82), (40, 86), (10, 84)])]
def fan(x0, y0, w, h, waves, seed):
    r = random.Random(seed); pts = []
    for k in range(25):
        a = math.pi*(1 - k/24); s = 1 + 0.07*math.sin(k/24*math.pi*waves*2)**2 + r.uniform(-.02, .02)
        pts.append((x0 + w/2 + w/2*s*math.cos(a), y0 - h*s*math.sin(a)))
    pts += [(x0 + w*0.8, y0 + 4), (x0 + w/2, y0 + 6), (x0 + w*0.2, y0 + 4)]
    return smooth(pts)
S["rosette"] = [fan(10, 84, 80, 26, 5, 1), fan(16, 64, 62, 22, 4, 2), fan(30, 44, 44, 18, 3, 3), smooth([(40, 84), (60, 84), (62, G), (38, G)])]
# crust (Stereum): overlapping rows of thin wavy frills, no log
cr = []
for i, (y, x0, x1) in enumerate([(30, 14, 86), (52, 8, 92), (74, 16, 84)]):
    top = []; r = random.Random(20 + i)
    n = 9
    for k in range(n + 1):
        x = x0 + (x1 - x0)*k/n; top.append((x, y - 6 - (5 if k % 2 else 0) + r.uniform(-1.5, 1.5)))
    cr.append(smooth(top + [(x1 - 4, y + 4), ((x0 + x1)/2, y + 6), (x0 + 4, y + 4)]))
S["crust"] = cr
json.dump(S, open(OUT, "w"))
print("round 2", len(S))

# ---------- round 2b ----------
S["cage"][1] = smooth([(37, 76), (63, 76), (61, 88), (50, 92), (39, 88)])
def shell(x0, ymid, length, h_out, h_in, waves, seed, tilt=0.0):
    """oyster fan: narrow attachment at x0, flaring to a wavy rounded outer rim"""
    r = random.Random(seed); top, bot = [], []
    for k in range(13):
        t = k/12; x = x0 + length*t; half = h_in + (h_out - h_in)*(t**0.8)
        top.append((x, ymid - half - tilt*t*10)); bot.append((x, ymid + half*0.55 - tilt*t*10))
    rim = []
    for k in range(1, 10):
        a = -math.pi/2 + math.pi*k/10; s = 1 + 0.05*math.sin(k*waves) + r.uniform(-.02, .02)
        rim.append((x0 + length + 7*s*math.cos(a), ymid - tilt*10 + (h_out*0.78)*s*math.sin(a) - h_out*0.22))
    return smooth(top + rim + bot[::-1])
S["oyster"] = [shell(10, 30, 66, 15, 4, 3, 1, .3), shell(10, 58, 58, 13, 3.5, 2, 2, -.1), shell(10, 82, 40, 9, 3, 2, 3, 0)]
def half_moon(x0, ycen, depth, half_h, seed):
    r = random.Random(seed); pts = [(x0, ycen + half_h*0.55)]
    for k in range(15):
        a = -math.pi/2 + math.pi*k/14; s = 1 + r.uniform(-.03, .03)
        pts.append((x0 + depth*s*math.cos(a), ycen + half_h*s*math.sin(a)*(0.9 if a < 0 else 0.55)))
    pts += [(x0, ycen - half_h*0.9)]
    return smooth(pts[::-1])
S["bracket"] = [half_moon(10, 22, 70, 13, 1), half_moon(10, 50, 80, 14, 2), half_moon(10, 76, 58, 11, 3)]
json.dump(S, open(OUT, "w"))

# ---------- round 2c ----------
star = [ell(49, 51, 12, 11)]
for ang, ln, w0, curl in [(-88, 41, 9.5, 6), (-12, 44, 10, -5), (62, 37, 8.5, 8), (128, 42, 9.5, -4), (196, 35, 8, 5)]:
    a = math.radians(ang); c = math.radians(ang + curl); e = math.radians(ang + curl*2)
    p0 = (49 + 4*math.cos(a), 51 + 4*math.sin(a)); p1 = (49 + ln*.6*math.cos(c), 51 + ln*.6*math.sin(c)); p2 = (49 + ln*math.cos(e), 51 + ln*math.sin(e))
    star.append(arm(p0, p1, p2, w0, 3.4))
S["starfish"] = star
def shelf(y, depth, h, wob=0.0):
    x = 10
    return smooth([(x, y - h), (x + depth*.45, y - h - 1.5), (x + depth*.8, y - h*.65 + wob), (x + depth, y - h*.05), (x + depth*.88, y + h*.45),
                   (x + depth*.55, y + h*.62), (x + depth*.2, y + h*.6), (x, y + h*.55)])
S["bracket"] = [shelf(22, 68, 12, 1), shelf(50, 80, 13, -1), shelf(76, 56, 10, 1)]
S["hoof"] = [smooth([(10, 20), (40, 17), (64, 22), (84, 34), (90, 48), (82, 60), (58, 65), (30, 66), (10, 64)]), shelf(78, 44, 8)]
def fanshell(y, length, h, seed):
    r = random.Random(seed)
    w = lambda: r.uniform(-1.2, 1.2)
    return smooth([(8, y - 1.5), (26, y - h*.45), (46, y - h*.85 + w()), (64, y - h + w()), (78, y - h*.7 + w()), (8 + length, y - h*.05),
                   (78, y + h*.45 + w()), (60, y + h*.6), (36, y + h*.38), (8, y + 1.5)])
S["oyster"] = [fanshell(26, 80, 16, 1), fanshell(56, 72, 14, 2), fanshell(82, 52, 10, 3)]
json.dump(S, open(OUT, "w"))
def fan2(y, L, h):
    return smooth([(8, y - 1), (8 + L*.28, y - h*.5), (8 + L*.6, y - h), (8 + L*.86, y - h*.85), (8 + L, y - h*.3), (8 + L*.97, y + h*.2),
                   (8 + L*.8, y + h*.5), (8 + L*.5, y + h*.55), (8 + L*.24, y + h*.35), (8, y + 1)])
S["oyster"] = [fan2(26, 80, 17), fan2(56, 70, 15), fan2(82, 50, 11)]
json.dump(S, open(OUT, "w"))

# ---------- round 3 (photos) ----------
# Clathrus archeri seen from the side: arms rising out of a round egg and curving inward like a claw, a small egg beside it
claw = [smooth([(26, 78), (30, 66), (40, 60), (52, 59), (62, 62), (68, 70), (68, 82), (60, 90), (46, 92), (32, 89)])]
for (bx, tx, ty, w0, lean) in [(34, 30, 22, 5.2, 10), (42, 40, 12, 5.6, 4), (50, 54, 10, 5.8, -2), (58, 66, 16, 5.4, -8), (64, 76, 28, 5, -12)]:
    claw.append(arm((bx, 64), (bx + (tx - bx)*0.2 - lean*0.6, 40), (tx, ty), w0, 1.8))
claw.append(smooth([(74, 92), (76, 82), (84, 78), (92, 82), (94, 90), (86, 94)]))
S["starfish"] = claw
# Pleurotus: cluster of rounded overlapping shell caps (no point)
S["oyster"] = [blob(36, 30, 26, 17, 12, .05, rot=.2, seed=31), blob(68, 34, 24, 16, 12, .05, rot=.4, seed=32),
               blob(30, 60, 22, 15, 12, .05, rot=.1, seed=33), blob(62, 64, 26, 17, 12, .05, rot=.3, seed=34), blob(46, 84, 18, 10, 10, .05, seed=35)]
json.dump(S, open(OUT, "w"))
