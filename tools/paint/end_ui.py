"""Painted assets for the end-of-game victory popup: faction emblems + title ribbon (tools/paint)."""
import os, sys, math
sys.path.insert(0, os.path.dirname(__file__))
import lib
import numpy as np
from lib import Mat
import props as PR
ROOT = PR.ROOT
PUB = os.path.join(ROOT, 'apps/web/public/assets/maps/common/ui/end')
SRC = os.path.join(ROOT, 'assets/maps/common/ui/end')
os.makedirs(PUB, exist_ok=True); os.makedirs(SRC, exist_ok=True)

def save(name, im, q=90):
    im.save(os.path.join(SRC, name + '.png'), optimize=True)
    im.save(os.path.join(PUB, name + '.webp'), 'WEBP', quality=q, method=6)
    print('end', name, im.size)

LACQUER = Mat('#5a100a', shine=0.5, rough=30, amb=0.4, diff=0.8, tex=lib.tex_noise(0.1, 4, 91))
LACQ_D = Mat('#4a0e08', shine=0.5, rough=26, amb=0.38, diff=0.75, tex=lib.tex_noise(0.1, 4, 92))
SUN = Mat('#ffc24a', shine=0.7, rough=26, amb=0.6, diff=0.6, tex=lib.tex_gold(93), spec_col='#fff6d8')
DUSK = Mat('#1e4a3c', shine=0.4, rough=20, amb=0.42, diff=0.7, tex=lib.tex_noise(0.12, 8, 94))
CLOUD = Mat('#f3e6c8', shine=0.1, rough=8, amb=0.6, diff=0.5, tex=lib.tex_noise(0.05, 3, 95))
NIGHT = Mat('#1c1028', shine=0.45, rough=26, amb=0.35, diff=0.75, tex=lib.tex_noise(0.14, 5, 96))
VIOLET = Mat('#24123a', shine=0.45, rough=26, amb=0.35, diff=0.75, tex=lib.tex_noise(0.14, 5, 97))
BLOOD = Mat('#d8321f', shine=0.6, rough=30, amb=0.5, diff=0.7, tex=lib.tex_noise(0.1, 4, 98))
IRON = Mat('#5b5466', shine=0.7, rough=30, amb=0.36, diff=0.8, tex=lib.tex_noise(0.1, 5, 99))

S = 320
C = S / 2

def rays(p, n, r0, r1, half, color, op, phase=0.0):
    for k in range(n):
        a = phase + k / n * 2 * math.pi
        d = half / r1
        p.poly([(C + math.cos(a - d * 0.2) * r0, C + math.sin(a - d * 0.2) * r0),
                (C + math.cos(a - d) * r1, C + math.sin(a - d) * r1),
                (C + math.cos(a + d) * r1, C + math.sin(a + d) * r1),
                (C + math.cos(a + d * 0.2) * r0, C + math.sin(a + d * 0.2) * r0)], color, alpha=op)

R = 112  # inner disc radius

def medallion(scene, rim, stud):
    """Brass rim with studs around `scene` (a P painted freely, clipped here to the inner disc)."""
    p = PR.P(S, S)
    p.shadow(C, C + 10, 124, 124, 0.35, 0.5)
    p.blob(C, C, 126, 126, rim, flat=0.55)
    p.ring(C, C, 119, 119, 2.2, PR.DWOOD)
    for k in range(8):
        a = k / 8 * 2 * math.pi + math.pi / 8
        p.blob(C + math.cos(a) * 122, C + math.sin(a) * 122, 6.5, 6.5, stud, flat=0.4)
    disc = lib.ellipse_mask(scene.L.w, scene.L.h, C * PR.SS, C * PR.SS, R * PR.SS, R * PR.SS, 1.5 * PR.SS)
    p.L.over(scene.L.rgb, scene.L.a * disc)
    p.ring(C, C, R, R, 2.6, PR.DWOOD)
    return p

def vignette(p, color, op):
    p.L.over(np.broadcast_to(lib.hexc(color), (p.L.h, p.L.w, 3)),
             op * np.clip(1 - lib.ellipse_mask(p.L.w, p.L.h, C * PR.SS, C * PR.SS, R * PR.SS * 0.8, R * PR.SS * 0.8, 26 * PR.SS), 0, 1))

def cloud(p, x, y, s):
    for dx, dy, r in ((-1.1, 0.2, 0.7), (0, -0.2, 1.0), (1.1, 0.2, 0.75), (0.5, 0.45, 0.6), (-0.5, 0.45, 0.6)):
        p.blob(x + dx * s, y + dy * s, r * s, r * s * 0.8, CLOUD, flat=0.6)

# 1) crew victory: dawn over the Ngọ Môn gate, the Ban Sóc calendar is saved
sc = PR.P(S, S)
sc.ell(C, C, 130, 130, '#2c5f6a')
sc.ell(C, C + 60, 150, 110, '#f0a050', op=0.9, blur=40)
sc.glow(C, C + 30, 120, '#ffd27a', 0.8)
rays(sc, 14, 34, 150, 12, SUN, 0.45)
sc.blob(C, C + 26, 44, 44, SUN, flat=0.45)
sc.ell(C, C + 26, 28, 28, '#fff3cc', op=0.45, blur=6)
cloud(sc, C - 62, C - 52, 15)
cloud(sc, C + 66, C - 26, 12)
# gate: wall base, central tower with a two-tier lacquer roof
sc.rect(C - 130, C + 50, C + 130, C + 140, '#3b1a12')
sc.rect(C - 130, C + 50, C + 130, C + 56, '#6b2f1c')
for x in (-76, 0, 76):
    sc.rect(C + x - 12, C + 72, C + x + 12, C + 140, '#120806', r=12)
sc.rect(C - 52, C + 22, C + 52, C + 52, '#7a2a18')
for x in range(-44, 52, 16):
    sc.rect(C + x - 2, C + 24, C + x + 2, C + 50, '#c9963e', op=0.8)
sc.poly([(C - 74, C + 26), (C - 40, C + 8), (C + 40, C + 8), (C + 74, C + 26), (C + 62, C + 22), (C, C + 16), (C - 62, C + 22)], PR.JADE)
sc.rect(C - 34, C - 6, C + 34, C + 10, '#7a2a18')
sc.poly([(C - 58, C - 2), (C - 28, C - 20), (C + 28, C - 20), (C + 58, C - 2), (C + 46, C - 6), (C, C - 12), (C - 46, C - 6)], PR.JADE)
sc.ell(C, C - 24, 4, 4, '#ffd36b')
vignette(sc, '#0b1a18', 0.55)
p = medallion(sc, PR.BRASS, PR.BRASS)
p.blob(C, C + 122, 22, 12, PR.JADE, flat=0.5)
for dx, a in ((-12, -0.6), (0, 0), (12, 0.6)):
    p.poly([(C + dx - 8, C + 124), (C + dx + 18 * math.sin(a), C + 102), (C + dx + 8, C + 124)], Mat('#f2a6b0', shine=0.3, rough=12, amb=0.55, diff=0.6))
save('victory-crew', p.image())

# 2) shadow victory: the eternal night, a blood moon eclipse over a hooded figure
sc = PR.P(S, S)
sc.ell(C, C, 130, 130, '#160b22')
sc.glow(C, C - 30, 110, '#a0201a', 0.75)
sc.blob(C, C - 30, 46, 46, BLOOD, flat=0.4)
sc.ell(C + 22, C - 42, 42, 42, '#160b22', blur=1.5)  # eclipse bite leaves a crescent
for x, y in ((-80, -60), (-54, -86), (70, -76), (86, -12), (-90, 4), (40, -96)):
    sc.ell(C + x, C + y, 1.8, 1.8, '#f6d6ff', op=0.85)
sc.smoke(C - 70, C + 120, 90, seed=4, alpha=0.35)
sc.smoke(C + 70, C + 120, 90, seed=5, alpha=0.35)
sc.poly([(C - 110, C + 130), (C - 60, C + 50), (C - 26, C + 18), (C, C + 8), (C + 26, C + 18), (C + 60, C + 50), (C + 110, C + 130)], VIOLET)
sc.blob(C, C + 34, 34, 38, VIOLET, flat=0.5)
sc.ell(C, C + 42, 21, 24, '#07030b')
sc.ell(C - 8, C + 40, 3.4, 2.4, '#ff4b36'); sc.ell(C + 8, C + 40, 3.4, 2.4, '#ff4b36')
sc.glow(C, C + 40, 18, '#ff4b36', 0.35)
vignette(sc, '#05020a', 0.6)
p = medallion(sc, IRON, BLOOD)
p.tube((C - 38, C + 140), (C + 26, C + 100), 3.2, PR.BRASS)
p.tube((C + 38, C + 140), (C - 26, C + 100), 3.2, PR.BRASS)
p.blob(C, C + 122, 12, 9, BLOOD, flat=0.5)
save('victory-killer', p.image())

# 3) title ribbon — lacquered banner with folded tails and brass trims; text is drawn by the UI
W, H = 680, 150
p = PR.P(W, H)
p.shadow(W / 2, H - 20, 300, 14, 0.4, 0.6)
for side in (-1, 1):
    x0 = W / 2 + side * 250
    x1 = W / 2 + side * 330
    p.poly([(x0, 46), (x1, 46), (x1 - side * 28, 82), (x1, 118), (x0, 118)], LACQ_D)
    p.poly([(x0, 104), (W / 2 + side * 280, 118), (x0, 118)], Mat('#33080a', shine=0.2, rough=10, amb=0.4, diff=0.6))
p.poly([(70, 26), (W - 70, 26), (W - 84, 104), (84, 104)], LACQUER, grad=0.3)
p.line([(74, 32), (W - 74, 32)], 3, '#e8b860', op=0.9)
p.line([(84, 98), (W - 84, 98)], 3, '#e8b860', op=0.9)
for x in (96, W - 96):
    p.blob(x, 65, 10, 10, PR.BRASS, flat=0.45)
    p.ring(x, 65, 6, 6, 1.2, PR.DWOOD)
save('victory-ribbon', p.image())
