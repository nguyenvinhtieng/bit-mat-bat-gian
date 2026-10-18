"""
Bakes the Sài Gòn layout (42x32 tiles, 2016x1536 px) — Hẻm 42, a warm night after the rain.
Same geometry pipeline as tl_floor.py, re-skinned: cracked alley asphalt with potholes, manholes and faded paint,
"con sâu" sidewalk pavers, gạch bông café / loft floors, oil-stained concrete for the bike park and tyre shop;
tube-house fronts (yellow / teal / pink, cửa sắt kéo, blue house-number plates), corrugated tôn, ventilation blocks;
the unreachable mass is a sea of tin roofs with inox water tanks; sodium street-lamp pools + tube lights + stall glow.

  npx tsx tools/paint/sg-export-layout.ts && python3 tools/paint/sg_floor.py
  (no numpy here? uv run --no-project --with numpy --with scipy --with pillow python tools/paint/sg_floor.py)
Writes assets/maps/sai-gon/tileset/sg-floor-bake.png + apps/web/public/.../sg-floor-bake.webp
"""
from __future__ import annotations

import math
import os
import sys

import numpy as np
from PIL import Image
from scipy import ndimage

sys.path.insert(0, os.path.dirname(__file__))
from lib import fbm, hexc, mix, smooth, value_noise  # noqa: E402
from sg_common import layout, pub, src  # noqa: E402

LAY = layout()
T = LAY['tile']
GW, GH = LAY['w'], LAY['h']
W, H = GW * T, GH * T
ORDER = LAY['areaOrder']
A = np.array(LAY['area'], np.int16).reshape(GH, GW)

YY, XX = np.mgrid[0:H, 0:W].astype(np.float32)
APX = np.repeat(np.repeat(A, T, 0), T, 1)
FLOOR = APX >= 0
t = lambda v: v * T  # noqa: E731


def aidx(name):
    return ORDER.index(name)


def hashf(*a):
    x = np.zeros_like(np.asarray(a[0], np.float64))
    for i, v in enumerate(a):
        x = x + np.asarray(v, np.float64) * (127.1 + 311.7 * i)
    return (np.sin(x) * 43758.5453) % 1.0


def edge_light(fx, fy, sw, sh_, k=3.0):
    """Bevel: lit top/left edge, shaded bottom/right edge of a tile cell."""
    hl = np.clip(1 - fx / k, 0, 1) + np.clip(1 - fy / k, 0, 1)
    sh = np.clip(1 - (sw - 1 - fx) / k, 0, 1) + np.clip(1 - (sh_ - 1 - fy) / k, 0, 1)
    return (1 + 0.1 * hl - 0.2 * sh)[..., None]


# ====================================================================== floor materials
def floor_asphalt(seed=11, lo='#2e3034', hi='#4a4c50'):
    """Alley asphalt: aggregate speckle, patched repairs, contour cracks, worn lighter wheel tracks."""
    n = fbm(H, W, 90, 4, seed)
    base = mix(hexc(lo), hexc(hi), (0.35 + 0.5 * n)[..., None])
    grit = value_noise(H, W, 1.0, seed + 1)
    base = base * (0.9 + 0.16 * grit[..., None])
    base = np.where((grit > 0.93)[..., None], base * 1.35, base)  # light stones in the mix
    # rectangular repair patches (darker, crisp edge)
    cx, cy = np.floor(XX / 150), np.floor(YY / 110)
    pr = hashf(cx, cy + seed)
    lx, ly = XX % 150, YY % 110
    pw, ph = 40 + 70 * hashf(cx + 3, cy), 30 + 50 * hashf(cx, cy + 7)
    patch = (pr > 0.72) & (lx > 20) & (lx < 20 + pw) & (ly > 18) & (ly < 18 + ph)
    base = np.where(patch[..., None], base * 0.78, base)
    rim = patch & ((lx < 21.5) | (lx > 18.5 + pw) | (ly < 19.5) | (ly > 16.5 + ph))
    base = np.where(rim[..., None], base * 0.65, base)
    # cracks: iso-lines of a mid-frequency noise
    c = fbm(H, W, 46, 4, seed + 2)
    crack = (np.abs(c - 0.5) < 0.006) & (fbm(H, W, 120, 2, seed + 3) > 0.45)
    base = np.where(crack[..., None], hexc('#17181a'), base)
    return base


def floor_consau(seed=21):
    """Gạch con sâu: interlocking S-edged sidewalk pavers, red / grey, a few sunken or missing."""
    rh, cw = 20, 30
    row = np.floor(YY / rh)
    fy = YY % rh
    off = (row % 2) * (cw / 2)
    wave = 3.6 * np.sin(fy / rh * 2 * math.pi)
    u = XX + off + wave
    col_i = np.floor(u / cw)
    fx = u % cw
    tone = hashf(col_i, row + seed)
    red = mix(hexc('#7a3c30'), hexc('#a65a44'), tone[..., None])
    grey = mix(hexc('#6a6a66'), hexc('#8a8a84'), tone[..., None])
    base = np.where((hashf(col_i + 5, row) > 0.62)[..., None], grey, red)
    base = base * (0.84 + 0.26 * fbm(H, W, 5, 4, seed + 1)[..., None]) * edge_light(fx, fy, cw, rh, 2.5)
    joint = (fx < 1.6) | (fy < 1.6)
    base = np.where(joint[..., None], hexc('#2c2622'), base)
    missing = hashf(col_i + 11, row + 3) > 0.985
    base = np.where((missing & ~joint)[..., None], hexc('#3e3428') * (0.8 + 0.4 * fbm(H, W, 3, 2, seed + 2))[..., None], base)
    dirt = smooth(0.6, 0.85, fbm(H, W, 30, 4, seed + 3))
    return mix(base, hexc('#3a3026'), dirt[..., None] * 0.45)


def floor_gach_bong(s=32, field='#e8dcc0', a='#b8402e', b='#2f7e7a', line='#3a2a22', seed=31):
    """Gạch bông: encaustic cement tiles; four tiles meet into a full rosette at every corner."""
    ix, iy = np.floor(XX / s), np.floor(YY / s)
    fx, fy = XX % s, YY % s
    cx, cy = np.abs(fx - s / 2 + 0.5), np.abs(fy - s / 2 + 0.5)
    col = np.broadcast_to(hexc(field), (H, W, 3)).copy()
    # corner quarter-rosette (B) with an outline ring
    dc = np.sqrt((s / 2 - cx) ** 2 + (s / 2 - cy) ** 2)
    col = np.where((dc < s * 0.3)[..., None], hexc(b), col)
    col = np.where((np.abs(dc - s * 0.3) < 0.9)[..., None], hexc(line), col)
    col = np.where((dc < s * 0.12)[..., None], hexc(field), col)
    # centre diamond (A) + four petals along the axes
    col = np.where((cx + cy < s * 0.16)[..., None], hexc(a), col)
    lo, hi_ = np.minimum(cx, cy), np.maximum(cx, cy)
    petal = ((lo / (s * 0.06)) ** 2 + ((hi_ - s * 0.24) / (s * 0.09)) ** 2) < 1
    col = np.where(petal[..., None], hexc(a), col)
    col = np.where((np.abs(cx + cy - s * 0.16) < 0.7)[..., None], hexc(line), col)
    # thin frame line inside each tile
    frame_ = (np.abs(np.maximum(cx, cy) - (s / 2 - 3)) < 0.7)
    col = np.where(frame_[..., None], mix(hexc(line), hexc(field), 0.4), col)
    # cement wear: each tile a little different, chipped / faded, grout lines
    tone = hashf(ix, iy + seed)
    col = col * (0.88 + 0.12 * tone[..., None]) * (0.9 + 0.14 * fbm(H, W, 7, 3, seed)[..., None])
    fade = smooth(0.55, 0.8, fbm(H, W, 40, 4, seed + 1))
    col = mix(col, hexc(field) * 0.9, fade[..., None] * 0.35)
    col = col * edge_light(fx, fy, s, s, 2.0)
    grout = (fx < 1.0) | (fy < 1.0)
    return np.where(grout[..., None], hexc('#6a6258'), col)


def floor_concrete(seed=41, lo='#6a6964', hi='#8a8882', joint=144):
    """Bare concrete: trowel swirls, expansion joints, oil stains and tyre scuffs."""
    n = fbm(H, W, 70, 4, seed)
    base = mix(hexc(lo), hexc(hi), n[..., None])
    swirl = np.sin((XX + fbm(H, W, 30, 3, seed + 1) * 60) * 0.12) * np.sin((YY + fbm(H, W, 30, 3, seed + 2) * 60) * 0.1)
    base = base * (0.94 + 0.05 * swirl[..., None]) * (0.92 + 0.12 * value_noise(H, W, 1.0, seed + 3)[..., None])
    j = ((XX % joint) < 1.5) | ((YY % joint) < 1.5)
    base = np.where(j[..., None], base * 0.6, base)
    oil = smooth(0.66, 0.8, fbm(H, W, 22, 4, seed + 4))
    base = mix(base, hexc('#1e1e1c'), oil[..., None] * 0.35)
    scuff = (np.abs(np.sin(XX * 0.05 + fbm(H, W, 40, 2, seed + 5) * 8)) < 0.04) & (fbm(H, W, 60, 2, seed + 6) > 0.55)
    return np.where(scuff[..., None], base * 0.75, base)


FLOORS = {
    'courtyard_checkin': lambda: floor_asphalt(11),
    'exhibition': floor_consau,
    'corridor': lambda: floor_asphalt(17, '#2a2c30', '#44464a'),
    'coordination': lambda: floor_gach_bong(32, '#e8dcc0', '#b8402e', '#2f7e7a', '#3a2a22', 31),
    'editing': lambda: floor_concrete(41, '#5e5d58', '#7c7a74'),
    'archive': lambda: floor_gach_bong(28, '#d6d8cc', '#d2a23a', '#3c5c8a', '#2a2a30', 37),
    'artifact_storage': lambda: floor_concrete(47, '#6e6d68', '#8e8c86', 96),
}

img = np.zeros((H, W, 3), np.float32)
for name, fn in FLOORS.items():
    m = APX == aidx(name)
    if m.any():
        img[m] = fn()[m]
        print('floor', name)


# ====================================================================== street details
def rect_px(x0, y0, x1, y1):
    return (XX >= x0) & (XX < x1) & (YY >= y0) & (YY < y1)


def soft_rect(x0, y0, x1, y1, r=3.0):
    dx = np.maximum(np.maximum(x0 - XX, XX - x1), 0)
    dy = np.maximum(np.maximum(y0 - YY, YY - y1), 0)
    inside = (XX >= x0) & (XX <= x1) & (YY >= y0) & (YY <= y1)
    return np.where(inside, 1.0, np.clip(1 - np.sqrt(dx ** 2 + dy ** 2) / r, 0, 1)).astype(np.float32)


def sub_of(cx, cy, r):
    return (slice(max(int(cy - r), 0), min(int(cy + r), H)), slice(max(int(cx - r), 0), min(int(cx + r), W)))


ASPHALT = (APX == aidx('courtyard_checkin')) | (APX == aidx('corridor'))
PUDDLE = np.zeros((H, W), np.float32)


def paint_line(x0, y0, x1, y1, col='#d8d2b0', dash=0, op=0.55):
    """Faded road paint (worn by tyres)."""
    global img
    m = rect_px(x0, y0, x1, y1)
    if dash:
        along = XX if (x1 - x0) > (y1 - y0) else YY
        m &= (along % (dash * 2)) < dash
    wear = np.clip(0.35 + 0.9 * fbm(H, W, 6, 3, 501) - 0.4 * value_noise(H, W, 1.5, 502), 0, 1)
    k = (m * wear * op)[..., None]
    img = mix(img, hexc(col), k)


def manhole(cx, cy, r=15):
    global img
    sub = sub_of(cx, cy, r + 4)
    xs, ys = XX[sub] - cx, YY[sub] - cy
    d = np.sqrt(xs ** 2 + ys ** 2)
    iron = hexc('#3c3c3a') * (0.85 + 0.25 * fbm(H, W, 3, 2, 511)[sub])[..., None]
    grid = ((np.abs(((xs + ys) % 6) - 3) < 0.8) | (np.abs(((xs - ys) % 6) - 3) < 0.8)) & (d < r - 4)
    col = np.where(grid[..., None], iron * 1.4, iron)
    col = np.where((np.abs(d - (r - 2.5)) < 1.2)[..., None], hexc('#5a5a56'), col)
    col = col * (1 + 0.15 * np.clip(-(xs + ys) / r, -1, 1))[..., None]
    img[sub] = np.where((d < r)[..., None], col, img[sub])
    ringm = (d >= r) & (d < r + 2.5)
    img[sub] = np.where(ringm[..., None], img[sub] * 0.7, img[sub])


def pothole(cx, cy, r, seed, water=True):
    """Ragged hole: crumbled lighter rim, dark broken base, often holding rain water."""
    global img
    sub = sub_of(cx, cy, r * 1.8)
    xs, ys = XX[sub] - cx, YY[sub] - cy
    ang = np.arctan2(ys, xs)
    rr = r * (1 + 0.28 * np.sin(ang * 3 + seed) + 0.16 * np.sin(ang * 7 + seed * 2)) * (0.85 + 0.3 * fbm(H, W, 6, 2, 520 + seed)[sub])
    d = np.sqrt(xs ** 2 + (ys * 1.3) ** 2)
    hole = d < rr
    rim = (d >= rr) & (d < rr + 3.5)
    img[sub] = np.where(rim[..., None], img[sub] * 1.25, img[sub])
    inside = hexc('#1c1a18') * (0.8 + 0.5 * value_noise(sub[0].stop - sub[0].start, sub[1].stop - sub[1].start, 1.5, 530 + seed))[..., None]
    inside = inside * (0.6 + 0.4 * np.clip(d / np.maximum(rr, 1), 0, 1))[..., None]
    img[sub] = np.where(hole[..., None], inside, img[sub])
    if water:
        PUDDLE[sub] = np.maximum(PUDDLE[sub], (d < rr * 0.85).astype(np.float32))


def puddles(mask, seed, amount=0.72):
    """Shallow rain puddles in the dips of the asphalt."""
    p = smooth(amount, amount + 0.02, fbm(H, W, 44, 4, seed)) * mask
    PUDDLE[:] = np.maximum(PUDDLE, p)


def chieu(x0, y0, x1, y1, stripe='#2f7e7a', seed=71):
    """Woven sedge mat (chiếu) — the hụi mat."""
    global img
    m = rect_px(x0, y0, x1, y1)
    weave = ((np.floor(XX / 4) + np.floor(YY / 4)) % 2)
    col = mix(hexc('#c9b07a'), hexc('#dcc792'), weave[..., None])
    col = np.where((((YY - y0) % 36) < 5)[..., None], mix(col, hexc(stripe), 0.6), col)
    col = np.where((((YY - y0) % 36) > 30)[..., None], mix(col, hexc('#b8402e'), 0.5), col)
    col = col * (0.9 + 0.15 * fbm(H, W, 6, 2, seed)[..., None])
    sh = soft_rect(x0 + 3, y0 + 4, x1 + 3, y1 + 4, 6)
    img *= (1 - 0.3 * sh * (1 - m))[..., None]
    img[m] = col[m]
    bd = m & ((XX - x0 < 3) | (x1 - XX < 3) | (YY - y0 < 3) | (y1 - YY < 3))
    img[bd] = hexc('#5a3a1c')


def bay_lines(x0, y0, x1, y1, step):
    """Faded yellow parking-bay ticks along the back of the bike park."""
    for x in np.arange(x0, x1 + 1, step):
        paint_line(x - 1.5, y0, x + 1.5, y1, '#e0b83a', 0, 0.6)
    paint_line(x0, y1 - 1.5, x1, y1 + 1.5, '#e0b83a', 0, 0.5)


# Đầu hẻm (pickup point): centre dashes, a stop bar at the alley mouth, a manhole and a couple of potholes
paint_line(t(15) + 10, t(4) - 2, t(27) - 10, t(4) + 2, '#e8e0c0', 26, 0.45)
paint_line(t(19) + 6, t(6) + 30, t(23) - 6, t(6) + 36, '#e8e0c0', 0, 0.5)
manhole(t(18) + 4, t(5) + 10)
pothole(t(24) + 12, t(5) + 6, 13, 1)
pothole(t(16) + 30, t(1) + 34, 9, 2)
# Hẻm xương cá: dashed centre line down the spine + across the ribs, manholes, potholes, rain puddles
paint_line(t(21) - 2, t(7), t(21) + 2, t(19), '#e8d27a', 18, 0.4)
paint_line(t(13), t(12) + 22, t(29), t(12) + 26, '#e8d27a', 18, 0.4)
for (mx, my) in ((t(20) + 24, t(9) + 8), (t(15) + 20, t(12) + 4), (t(26) + 30, t(12) + 4), (t(10) + 24, t(21) + 30), (t(34) + 24, t(22) + 10)):
    manhole(mx, my)
for i, (px_, py_, r) in enumerate(((t(22) + 8, t(15) + 20, 12), (t(14) + 24, t(13) + 8, 9), (t(10) + 10, t(24) + 12, 10), (t(34) + 30, t(19) + 18, 11))):
    pothole(px_, py_, r, 10 + i)
puddles(ASPHALT.astype(np.float32), 541, 0.76)
# Quán cóc: the hụi mat by the khui hụi corner
chieu(t(34) + 20, t(14) + 10, t(38) + 30, t(16) + 40, '#2f7e7a', 71)
# Gác lửng: mat for counting cash by the window, another under the ledger table
chieu(t(4) + 12, t(27) + 30, t(7) + 30, t(30) + 20, '#b8402e', 72)
chieu(t(9) + 20, t(28) + 4, t(12) + 20, t(30) + 30, '#2f7e7a', 73)
# Bãi giữ xe: bay ticks along the north wall
bay_lines(t(23) + 18, t(26) + 4, t(38) - 18, t(27) + 30, 48)
print('details')

# ====================================================================== walls
VOID = A < 0
face_cells = np.zeros_like(VOID)
face_cells[:-1] = VOID[:-1] & (A[1:] >= 0)
EXT = 26

face_px = np.zeros((H, W), bool)
runs = []
for gy in range(GH):
    gx = 0
    while gx < GW:
        if face_cells[gy, gx]:
            ar = A[gy + 1, gx]
            x0 = gx
            while gx < GW and face_cells[gy, gx] and A[gy + 1, gx] == ar:
                gx += 1
            ext = EXT if gy > 0 and np.all(VOID[gy - 1, x0:gx]) and not np.any(face_cells[gy - 1, x0:gx]) else 0
            runs.append((gy, x0, gx, int(ar), ext))
            face_px[gy * T - ext:(gy + 1) * T, x0 * T:gx * T] = True
        else:
            gx += 1

solid_src = FLOOR | face_px
dist = ndimage.distance_transform_edt(~solid_src).astype(np.float32)
CAPW = 12.0
cap = (~solid_src) & (dist <= CAPW)
mass = (~solid_src) & (dist > CAPW)


# --- the unreachable mass: a sea of tin roofs (mái tôn) with inox water tanks, seen from above
def roofs():
    s = 64
    ix, iy = np.floor(XX / s), np.floor(YY / s)
    jx = (XX + 40 * hashf(iy, 1)) // 112
    jy = (YY + 30 * hashf(jx, 2)) // 88
    k = hashf(jx, jy)
    pal = [hexc('#7a4a32'), hexc('#5e6266'), hexc('#3e5a78'), hexc('#8a6a3c'), hexc('#4e5a4a'), hexc('#6e4038')]
    col = np.zeros((H, W, 3), np.float32)
    for i, c in enumerate(pal):
        sel = (k >= i / len(pal)) & (k < (i + 1) / len(pal))
        col[sel] = c
    vert = hashf(jx + 9, jy) > 0.5
    along = np.where(vert, XX, YY)
    corr = 0.5 + 0.5 * np.sin(along * 2 * math.pi / 7)
    col = col * (0.72 + 0.4 * corr)[..., None]
    rust = smooth(0.58, 0.8, fbm(H, W, 26, 4, 601))
    col = mix(col, hexc('#5a2e1a'), rust[..., None] * 0.5)
    lx = (XX + 40 * hashf(iy, 1)) % 112
    ly = (YY + 30 * hashf(jx, 2)) % 88
    seam = (lx < 3) | (ly < 3)
    col = np.where(seam[..., None], hexc('#141416'), col)
    col = col * (0.85 + 0.2 * fbm(H, W, 8, 2, 602))[..., None]
    return col, ix, iy


roof, rix, riy = roofs()
far = np.clip((dist - CAPW) / 110, 0, 1)
roof = roof * (0.62 - 0.3 * far)[..., None]
img[mass] = roof[mass]

rs = np.random.default_rng(611)
for _ in range(46):  # inox water tanks + potted plants on the roofs
    x, y = rs.uniform(0, W), rs.uniform(0, H)
    if not mass[int(y), int(x)] or dist[int(y), int(x)] < 34:
        continue
    sub = sub_of(x, y, 22)
    xs, ys = XX[sub] - x, YY[sub] - y
    d = np.sqrt(xs ** 2 + ys ** 2)
    if rs.random() < 0.6:
        r = rs.uniform(11, 16)
        img[sub] *= (1 - 0.45 * np.exp(-(((xs - 5) ** 2 + (ys - 6) ** 2) / (2 * r * r))))[..., None]
        lit = np.clip(0.55 + 0.5 * (-(xs + ys) / r), 0.3, 1.2)
        col = hexc('#b8bec4') * lit[..., None] * 0.62
        col = np.where((np.abs(d - r * 0.62) < 1)[..., None], col * 0.7, col)
        col = np.where((d < r * 0.22)[..., None], hexc('#3a3e44') * 0.6, col)
        img[sub] = np.where((d < r)[..., None], col, img[sub])
    else:
        r = rs.uniform(6, 9)
        leaf = (d < r * (1 + 0.25 * np.sin(np.arctan2(ys, xs) * 7))) & (d < r * 1.3)
        img[sub] = np.where(leaf[..., None], hexc('#2e4a26') * (0.7 + 0.5 * value_noise(*xs.shape, 2, 612))[..., None] * 0.7, img[sub])
        bloom = leaf & (value_noise(*xs.shape, 2.5, 613) > 0.78)
        img[sub] = np.where(bloom[..., None], hexc('#c8306a') * 0.7, img[sub])

# --- concrete parapet caps on every wall top
gy_, gx_ = np.gradient(dist)
along = np.where(np.abs(gy_) > np.abs(gx_), XX, YY)
seg = (along % 40) / 40
prof = np.sin(np.clip(dist / CAPW, 0, 1) * math.pi)
capcol = mix(hexc('#6a6a66'), hexc('#bebcb4'), (0.35 + 0.65 * prof)[..., None])
capcol = capcol * (1 - 0.3 * (seg > 0.95))[..., None]
outer = smooth(CAPW - 2.5, CAPW, dist)
capcol = mix(capcol, hexc('#1a1a1c'), outer[..., None] * 0.85)
capcol = mix(capcol, hexc('#3a3a38'), smooth(1.6, 0.0, dist)[..., None] * 0.7)
capcol = capcol * (0.86 + 0.2 * fbm(H, W, 6, 2, 621))[..., None]
capcol = mix(capcol, hexc('#3e4a32'), (smooth(0.72, 0.86, fbm(H, W, 14, 3, 622)) * 0.45)[..., None])  # damp moss
img[cap] = capcol[cap]


# --- wall faces, per room style
def frame(h, w):
    return np.mgrid[0:h, 0:w].astype(np.float32)


HOUSE = [hexc('#e4b844'), hexc('#3fa6a0'), hexc('#e58aa0'), hexc('#8ccfb0'), hexc('#6fa8d8'), hexc('#efe2c4')]


def plaster(col, h, w, seed, stain=0.5):
    col = col * (0.86 + 0.18 * fbm(h, w, 14, 4, seed)[..., None])
    yy, _ = frame(h, w)
    st = smooth(0.5, 0.8, fbm(h, w, 18, 4, seed + 1))
    drip = smooth(0.6, 0.9, fbm(h, w, 3, 2, seed + 2) * 0.4 + fbm(h, w, 40, 2, seed + 3) * 0.6)
    return mix(col, hexc('#4a4234'), (np.maximum(st * yy / h, drip * 0.5) * stain)[..., None])


def rolling_door(col, X, yy, h, x0, x1, top, slat='#6a7470'):
    """Cửa sắt kéo: collapsible steel door — vertical slats with diamond scissor links, half pulled."""
    m = (X >= x0) & (X < x1) & (yy > top) & (yy < h - 6)
    gx = (X - x0) % 8
    steel = hexc(slat) * (0.75 + 0.35 * (1 - (yy - top) / h))[..., None]
    door = np.where((gx < 3)[..., None], steel * 1.15, hexc('#141618'))
    lnk = (np.abs(((X - x0 + yy * 0.8) % 16) - 8) < 0.9) | (np.abs(((X - x0 - yy * 0.8) % 16) - 8) < 0.9)
    door = np.where((lnk & (gx >= 3))[..., None], steel * 0.9, door)
    # warm light leaking from inside through the gaps
    door = np.where(((gx >= 3) & ~lnk)[..., None], door + hexc('#ffb860') * 0.18, door)
    col = np.where(m[..., None], door, col)
    return np.where(((X >= x0) & (X < x1) & (np.abs(yy - top) < 2))[..., None], hexc('#2a2c2e'), col)


def number_plate(col, X, yy, cx, cy):
    """Blue house-number plate (no digits): white border + two pale bars."""
    m = (np.abs(X - cx) < 9) & (np.abs(yy - cy) < 6)
    col = np.where(m[..., None], hexc('#1f5fae'), col)
    brd = m & ((np.abs(np.abs(X - cx) - 7.5) < 0.8) | (np.abs(np.abs(yy - cy) - 4.5) < 0.8)) & (np.abs(X - cx) < 8.3) & (np.abs(yy - cy) < 5.3)
    col = np.where(brd[..., None], hexc('#e8eef4'), col)
    bars = (np.abs(yy - cy) < 1.4) & ((np.abs(X - cx + 3) < 1.6) | (np.abs(X - cx - 2) < 2.4))
    return np.where(bars[..., None], hexc('#c8d4e4'), col)


def style_tube_fronts(h, w, x0, awning=False, seed=0):
    """Nhà ống: each 96 px a different painted front, steel door, blue plate; optional striped tarp awning."""
    yy, xx = frame(h, w)
    X = xx + x0
    k = np.floor(X / 96)
    col = np.zeros((h, w, 3), np.float32)
    hk = hashf(k + seed, 3)
    for i, c in enumerate(HOUSE):
        sel = (hk >= i / len(HOUSE)) & (hk < (i + 1) / len(HOUSE))
        col[sel] = c
    col = plaster(col, h, w, 700 + seed, 0.7)
    gx = X % 96
    col = np.where(((gx < 2) | (gx > 94))[..., None], col * 0.55, col)  # party walls
    top = 10 if awning else h * 0.28
    for s in range(int(x0 // 96), int((x0 + w) // 96) + 1):
        a = s * 96 + 12
        col = rolling_door(col, X, yy, h, a, a + 56 + 16 * (hashf(np.float64(s), 5) > 0.5), top + 4)
        col = number_plate(col, X, yy, s * 96 + 82, top + 8)
    if awning:
        band = yy < 12
        stripe = (np.floor(X / 12) % 2) == 0
        tarp = np.where(stripe[..., None], hexc('#c83a2c'), hexc('#ece6d8'))
        tarp = np.where((hashf(k, 9) > 0.5)[..., None], np.where(stripe[..., None], hexc('#2a5e9e'), hexc('#ece6d8')), tarp)
        sc = (yy > 9) & (np.abs(((X % 12) - 6)) < 6 - (yy - 9) * 2)
        col = np.where((band | sc)[..., None], tarp * (0.85 + 0.2 * (yy < 3))[..., None], col)
    return col


def style_alley(h, w, x0):
    """Hẻm: weathered plaster, drain pipes, wall-mounted AC units, a bundle of cables along the top."""
    yy, xx = frame(h, w)
    X = xx + x0
    col = plaster(np.broadcast_to(hexc('#d8cfb4'), (h, w, 3)).copy(), h, w, 721, 0.9)
    pipe = (np.abs((X % 168) - 20) < 2.5)
    col = np.where(pipe[..., None], hexc('#8a8e90') * (0.8 + 0.4 * (np.abs((X % 168) - 19) < 0.8))[..., None], col)
    ac = (np.abs((X % 168) - 96) < 15) & (yy > h * 0.38) & (yy < h * 0.38 + 18)
    acc = hexc('#d4d6d2') * (1 - 0.35 * ((np.floor((yy - h * 0.38) / 2.5) % 2) == 0) * (np.abs((X % 168) - 96) < 13))[..., None]
    col = np.where(ac[..., None], acc, col)
    for k, (yc, c) in enumerate(((8, '#141414'), (11, '#1c1c1c'), (14, '#101010'))):
        sag = yc + 3 * np.sin((X + k * 40) * math.pi / 96) ** 2
        col = np.where((np.abs(yy - sag) < 1.1)[..., None], hexc(c), col)
    return col


def style_cafe(h, w, x0):
    """Quán cóc: mint wall over a dado of small blue-white tiles, corrugated tin lip at the top."""
    yy, xx = frame(h, w)
    X = xx + x0
    col = plaster(np.broadcast_to(hexc('#9ccfb8'), (h, w, 3)).copy(), h, w, 731, 0.5)
    dado = yy > h * 0.5
    tile = mix(hexc('#e8eef0'), hexc('#4a7ab0'), (((np.floor(X / 8) + np.floor(yy / 8)) % 2) * 0.85)[..., None])
    tile = np.where(((X % 8 < 0.8) | (yy % 8 < 0.8))[..., None], hexc('#9aa4a8'), tile)
    col = np.where(dado[..., None], tile, col)
    col = np.where((np.abs(yy - h * 0.5) < 1.2)[..., None], hexc('#2a4a6a'), col)
    lip = yy < 10
    corr = 0.6 + 0.4 * np.sin(X * 2 * math.pi / 7)
    col = np.where(lip[..., None], hexc('#8a9096') * corr[..., None], col)
    return col


def style_tole(h, w, x0):
    """Tiệm vá xe: blue corrugated tôn sheets with rust streaks and bolt rows."""
    yy, xx = frame(h, w)
    X = xx + x0
    corr = 0.5 + 0.5 * np.sin(X * 2 * math.pi / 9)
    col = hexc('#3a6a9a') * (0.65 + 0.45 * corr)[..., None] * (0.8 + 0.3 * (1 - yy / h))[..., None]
    rust = smooth(0.5, 0.75, fbm(h, w, 6, 3, 741) * 0.4 + fbm(h, w, 40, 2, 742) * 0.6) * np.clip(yy / h + 0.2, 0, 1)
    col = mix(col, hexc('#7a3e1c'), rust[..., None] * 0.7)
    seam = (X % 108) < 2
    col = np.where(seam[..., None], col * 0.5, col)
    bolt = ((X % 27) < 2) & ((np.abs(yy - 10) < 1) | (np.abs(yy - (h - 14)) < 1))
    return np.where(bolt[..., None], hexc('#c8ccd0'), col)


def style_loft(h, w, x0):
    """Gác lửng nhà trọ: pastel green plaster, barred windows glowing warm, a few hangers of laundry."""
    yy, xx = frame(h, w)
    X = xx + x0
    col = plaster(np.broadcast_to(hexc('#b4d4a8'), (h, w, 3)).copy(), h, w, 751, 0.8)
    gx = X % 120
    win = (np.abs(gx - 60) < 26) & (yy > h * 0.2) & (yy < h * 0.72)
    glass = mix(hexc('#ffd690'), hexc('#d88a3a'), (yy / h)[..., None]) * 0.95
    col = np.where(win[..., None], glass, col)
    bars = win & ((np.abs(((gx - 34) % 7) - 3.5) < 0.9) | (np.abs(yy - h * 0.46) < 0.9))
    col = np.where(bars[..., None], hexc('#1e2a22'), col)
    fr = (np.abs(gx - 60) < 28) & (yy > h * 0.2 - 2) & (yy < h * 0.72 + 2) & ~win
    col = np.where(fr[..., None], hexc('#2e4a3a'), col)
    cloth = (np.abs(gx - 104) < 7) & (yy > 6) & (yy < 6 + 16 + 6 * hashf(np.floor(X / 120), 3))
    cc = np.where((hashf(np.floor(X / 120), 4) > 0.5), 1, 0)
    col = np.where((cloth & (cc == 1))[..., None], hexc('#d84a6a'), np.where(cloth[..., None], hexc('#f0e8d0'), col))
    col = np.where((np.abs(yy - 6) < 0.8)[..., None], hexc('#202020'), col)
    return col


def style_apartment(h, w, x0):
    """Chung cư cũ: grey stained concrete with a band of gạch thông gió (ventilation blocks)."""
    yy, xx = frame(h, w)
    X = xx + x0
    col = plaster(np.broadcast_to(hexc('#a4a39c'), (h, w, 3)).copy(), h, w, 761, 1.0)
    band = (yy > h * 0.22) & (yy < h * 0.22 + 24)
    bx, by = X % 12, (yy - h * 0.22) % 12
    hole = ((bx - 6) ** 2 + (by - 6) ** 2) < 14
    vent = np.where(hole[..., None], hexc('#1a1c1e'), hexc('#c4c2ba') * (0.85 + 0.2 * ((bx < 1.2) | (by < 1.2)))[..., None])
    col = np.where(band[..., None], vent, col)
    col = np.where(((np.abs(yy - h * 0.22) < 1.2) | (np.abs(yy - h * 0.22 - 24) < 1.2))[..., None], hexc('#5a5a56'), col)
    return col


STYLE = {
    'courtyard_checkin': lambda h, w, x0: style_tube_fronts(h, w, x0, False, 0),
    'exhibition': lambda h, w, x0: style_tube_fronts(h, w, x0, True, 7),
    'corridor': style_alley,
    'coordination': style_cafe,
    'editing': style_tole,
    'archive': style_loft,
    'artifact_storage': style_apartment,
}

tubes = []  # fluorescent tube lights on wall faces
for gy, x0, x1, ar, ext in runs:
    name = ORDER[ar]
    top = gy * T - ext
    bot = (gy + 1) * T
    h, w = bot - top, (x1 - x0) * T
    body = STYLE[name](h, w, x0 * T)
    yy, xx = frame(h, w)
    # concrete beam + kerb at the foot of every wall
    beam = yy < 5
    body = np.where(beam[..., None], hexc('#8a8882') * (0.85 + 0.3 * (yy < 2))[..., None], body)
    base = yy > h - 6
    body = np.where(base[..., None], hexc('#5a5852') * (0.8 + 0.2 * fbm(h, w, 3, 2, 771))[..., None], body)
    body = np.where((np.abs(yy - (h - 6)) < 1)[..., None], hexc('#262420'), body)
    endl = smooth(6, 0, xx) * (x0 > 0 and VOID[gy + 1, x0 - 1] if gy + 1 < GH else 0)
    endr = smooth(6, 0, w - 1 - xx) * (x1 < GW and VOID[gy + 1, x1] if gy + 1 < GH else 0)
    body = body * (1 - 0.45 * np.maximum(endl, endr))[..., None]
    body = body * (1 - 0.25 * smooth(h - 14, h, yy))[..., None]
    img[top:bot, x0 * T:x1 * T] = body
    if (x1 - x0) >= 2:
        for gx in range(x0, x1):
            if (gx * 5 + gy * 3) % 4 == 1:
                tubes.append((gx * T + 24, top + 14))

# door sills (raised concrete thresholds)
sill = np.zeros((H, W), bool)
for gy in range(GH):
    for gx in range(GW):
        a = A[gy, gx]
        if a < 0:
            continue
        if gx + 1 < GW and A[gy, gx + 1] >= 0 and A[gy, gx + 1] != a:
            x = (gx + 1) * T
            sill[gy * T:(gy + 1) * T, x - 4:x + 4] = True
        if gy + 1 < GH and A[gy + 1, gx] >= 0 and A[gy + 1, gx] != a:
            y = (gy + 1) * T
            sill[y - 4:y + 4, gx * T:(gx + 1) * T] = True
sill_col = hexc('#8e8c84') * (0.8 + 0.35 * fbm(H, W, 5, 2, 781))[..., None]
img[sill] = sill_col[sill]
lab, nlab = ndimage.label(sill)
for sl in ndimage.find_objects(lab):
    ys, xs = sl
    img[ys.start:ys.start + 2, xs] *= 1.2
    img[ys.stop - 2:ys.stop, xs] *= 0.55


# ====================================================================== shadows, light, grading
wall = ~FLOOR
d_wall = ndimage.distance_transform_edt(FLOOR).astype(np.float32)
ao = 1 - 0.34 * np.exp(-d_wall / 9)
shift = np.zeros_like(wall)
shift[10:, 8:] = wall[:-10, :-8]
dirsh = ndimage.gaussian_filter((shift & FLOOR).astype(np.float32), 6)
light = ao * (1 - 0.28 * dirsh)


def pool(x, y, r, sy=1.0):
    return np.exp(-(((XX - x) ** 2 + ((YY - y) * sy) ** 2) / (2 * r * r)))


SODIUM_KEYS = {'sg-prop-courtyard-cot-dien': 1.0, 'sg-prop-corridor-cot-dien': 1.0, 'sg-prop-editing-cot-dien': 0.95, 'sg-decor-cot-dien': 0.85}
STALL_KEYS = {'sg-prop-exhibition-xe-banh-mi': 0.85, 'sg-prop-exhibition-xe-com-tam': 0.85, 'sg-prop-exhibition-xe-hu-tieu': 0.75,
              'sg-prop-coordination-quay-ca-phe': 0.85, 'sg-prop-exhibition-xe-nuoc-mia': 0.6, 'sg-prop-editing-ke-xang': 0.45,
              'sg-prop-exhibition-bang-hieu': 0.5, 'sg-prop-archive-ban-dem-tien': 0.5}
sodium = np.zeros((H, W), np.float32)
stall = np.zeros((H, W), np.float32)
altar = np.zeros((H, W), np.float32)
for p in LAY['props']:
    k = SODIUM_KEYS.get(p['key'])
    if k:
        sodium += k * pool(p['x'] + 6, p['y'] + 6, 120.0)
    k = STALL_KEYS.get(p['key'])
    if k:
        stall += k * pool(p['x'], p['y'] - 6, 78.0)
    if p['key'] == 'sg-decor-ban-tho-ong-dia':
        altar += pool(p['x'], p['y'] + 10, 46.0)
tube = np.zeros((H, W), np.float32)
for (lx, ly) in tubes:
    tube += 0.5 * pool(lx, ly + 60, 64.0, 1.3)
sodium, stall, tube = np.clip(sodium, 0, 1.3), np.clip(stall, 0, 1.2), np.clip(tube, 0, 1.0)

vig = np.ones((H, W), np.float32)
for name, rects in LAY['rects'].items():
    for (rx, ry, rw, rh) in rects:
        if name == 'corridor':
            continue
        cx, cy = (rx + rw / 2) * T, (ry + rh / 2) * T
        sx, sy = rw * T * 0.62, rh * T * 0.62
        m = APX == aidx(name)
        v = 1 - 0.16 * np.clip(((XX - cx) / sx) ** 2 + ((YY - cy) / sy) ** 2, 0, 1)
        vig = np.where(m, v, vig)

# wet asphalt: puddles go dark and glossy, mirroring the lamps above
pd = ndimage.gaussian_filter(PUDDLE, 1.2) * FLOOR
img = mix(img, img * 0.45 + hexc('#1a2230') * 0.3, pd[..., None])

img = np.where(FLOOR[..., None], img * (light * vig)[..., None], img)
night = np.array([0.6, 0.66, 0.9], np.float32)
lit = np.clip(sodium * 0.95 + stall * 0.85 + tube * 0.7 + altar * 0.5, 0, 1)[..., None]
img = img * (night + (1 - night) * lit * 0.9)
F = FLOOR[..., None]
img = img + sodium[..., None] * hexc('#ff9a2e') * 0.2 * F
img = img + stall[..., None] * hexc('#ffe2a0') * 0.12 * F
img = img + tube[..., None] * hexc('#d8f0ff') * 0.06 * F
img = img + altar[..., None] * hexc('#ff4a2a') * 0.22 * F
# puddle reflections: sharp, rippled copies of the light
rip = 0.65 + 0.35 * np.sin(YY * 0.9 + fbm(H, W, 6, 2, 801) * 9)
img = img + (pd * rip * np.clip(sodium * 1.2 + stall * 0.6, 0, 1.4))[..., None] * hexc('#ffb050') * 0.2
img = img + (pd * smooth(0.82, 0.95, value_noise(H, W, 3, 802)))[..., None] * hexc('#c8dcff') * 0.16


def tube_light(cx, cy):
    """Bare fluorescent tube on a wall face."""
    global img
    sub = sub_of(cx, cy, 30)
    xs, ys = XX[sub] - cx, YY[sub] - cy
    g = np.exp(-((xs ** 2) / (2 * 18.0 ** 2) + (ys ** 2) / (2 * 8.0 ** 2)))
    img[sub] = img[sub] + g[..., None] * hexc('#d8f0ff') * 0.35
    body = (np.abs(xs) < 13) & (np.abs(ys) < 1.8)
    img[sub] = np.where(body[..., None], hexc('#f4fbff'), img[sub])
    clip_ = ((np.abs(np.abs(xs) - 14) < 1.6) & (np.abs(ys) < 2.6))
    img[sub] = np.where(clip_[..., None], hexc('#5a5a58'), img[sub])


for (lx, ly) in tubes:
    tube_light(lx, ly)

img = img + (value_noise(H, W, 1.0, 891)[..., None] - 0.5) * 0.025
img = np.clip(img, 0, 1)

out = Image.fromarray((img * 255 + 0.5).astype(np.uint8), 'RGB')
sp = src('tileset', 'sg-floor-bake.png')
pp = pub('tileset', 'sg-floor-bake.webp')
out.save(sp, optimize=True)
out.save(pp, 'WEBP', quality=86, method=6)
print('wrote', pp, out.size, os.path.getsize(pp) // 1024, 'KB webp')
