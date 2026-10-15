"""
Bakes the Thăng Long layout (42x32 tiles, 2016x1536 px) — Hồ Gươm, đêm Giao thừa, no moon.
Same geometry pipeline as floor.py, re-skinned: lakeside brick, temple gạch bát, red Thê Húc bridge planks,
water-puppet deck with a pond strip, old-quarter pavement, kitchen yard; wall faces with Tết character;
lime-white (vôi) embankment caps; the unreachable mass is the dark-teal lake with lantern reflections;
midnight-blue grade lit by red lantern pools.

  npx tsx tools/paint/tl-export-layout.ts && python3 tools/paint/tl_floor.py
Writes assets/maps/thang-long/tileset/tl-floor-bake.png + apps/web/public/.../tl-floor-bake.webp
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
from tl_common import layout, pub, src  # noqa: E402

LAY = layout()
T = LAY['tile']
GW, GH = LAY['w'], LAY['h']
W, H = GW * T, GH * T
ORDER = LAY['areaOrder']
A = np.array(LAY['area'], np.int16).reshape(GH, GW)

YY, XX = np.mgrid[0:H, 0:W].astype(np.float32)
APX = np.repeat(np.repeat(A, T, 0), T, 1)
FLOOR = APX >= 0


def aidx(name):
    return ORDER.index(name)


def hashf(*a):
    x = np.zeros_like(np.asarray(a[0], np.float64))
    for i, v in enumerate(a):
        x = x + np.asarray(v, np.float64) * (127.1 + 311.7 * i)
    return (np.sin(x) * 43758.5453) % 1.0


def aniso(h, w, ch, cw, seed):
    r = np.random.default_rng(seed)
    g = r.random((h // ch + 3, w // cw + 3)).astype(np.float32)
    return ndimage.zoom(g, (ch, cw), order=3)[:h, :w]


# ====================================================================== floor materials
def floor_brick(bw=30, bh=14, lo='#7e3422', hi='#a85236', grout='#4a3a2e', seed=11, moss=0.6):
    """Running-bond red brick pavement (gạch đỏ), worn, mossy joints."""
    row = np.floor(YY / bh)
    off = (row % 2) * (bw / 2)
    cx = np.floor((XX + off) / bw)
    fx, fy = (XX + off) % bw, YY % bh
    tone = hashf(cx, row + seed)
    base = mix(hexc(lo), hexc(hi), tone[..., None])
    base = base * (0.86 + 0.24 * fbm(H, W, 5, 4, seed)[..., None])
    base = base * (1 - 0.1 * (value_noise(H, W, 1.0, seed + 1) > 0.85))[..., None]
    hl = np.clip(1 - fx / 2.5, 0, 1) + np.clip(1 - fy / 2.5, 0, 1)
    sh = np.clip(1 - (bw - 1 - fx) / 3, 0, 1) + np.clip(1 - (bh - 1 - fy) / 3, 0, 1)
    base = base * (1 + 0.1 * hl[..., None] - 0.2 * sh[..., None])
    g = ((fx < 1.6) | (fy < 1.6)).astype(np.float32)
    gcol = mix(hexc(grout), hexc('#3f5226'), (smooth(0.55, 0.75, fbm(H, W, 40, 4, seed + 2)) * moss)[..., None])
    return mix(base, gcol, g[..., None])


def floor_bat(s=32):
    """Square terracotta gạch bát (temple courtyard)."""
    cx, cy = XX // s, YY // s
    fx, fy = XX % s, YY % s
    tone = hashf(cx, cy)
    base = mix(hexc('#9a4a2a'), hexc('#bf6a3e'), tone[..., None])
    base = base * (0.88 + 0.22 * fbm(H, W, 6, 4, 21)[..., None])
    hl = np.clip(1 - (fx - 2) / 3, 0, 1) + np.clip(1 - (fy - 2) / 3, 0, 1)
    sh = np.clip(1 - (s - 1 - fx) / 3, 0, 1) + np.clip(1 - (s - 1 - fy) / 3, 0, 1)
    base = base * (1 + 0.1 * hl[..., None] - 0.18 * sh[..., None])
    grout = ((fx < 2) | (fy < 2)).astype(np.float32)
    return mix(base, hexc('#4e3a2c'), grout[..., None])


def floor_planks(vertical=True, pw=16, light='#8a5530', dark='#5a3018', seed=21, gloss=0.18):
    a, b = (XX, YY) if vertical else (YY, XX)
    i = a // pw
    local = a % pw
    ln = 140 + (hashf(i, 3) * 160)
    off = hashf(i, 9) * 300
    seg = np.floor((b + off) / ln)
    tone = hashf(i, seg)
    base = mix(hexc(dark), hexc(light), (0.25 + 0.75 * tone)[..., None])
    streak = aniso(H, W, 90, 2, seed) if vertical else aniso(H, W, 2, 90, seed)
    warp = aniso(H, W, 60, 6, seed + 1) if vertical else aniso(H, W, 6, 60, seed + 1)
    grain = np.sin((local + warp * 10) * (2 * math.pi / 5.3) + tone * 6) * 0.5 + 0.5
    base = base * (0.84 + 0.14 * grain[..., None] + 0.12 * (streak[..., None] - 0.5))
    seam = (local < 1.2).astype(np.float32)
    joint = (((b + off) % ln) < 1.6).astype(np.float32)
    base = base * (1 - 0.45 * np.maximum(seam, joint)[..., None])
    base = base * (1 + 0.06 * (local < 3)[..., None])
    sheen = smooth(0.45, 0.9, fbm(H, W, 120, 3, seed + 5))
    return base + gloss * sheen[..., None] * hexc('#ffe2b0') * 0.5


def floor_bridge():
    """Thê Húc: red-lacquered planks laid across the walk, with water glints between boards."""
    horiz = np.zeros((H, W), bool)
    # planks run across the direction of travel: vertical corridor cells -> horizontal planks
    for (rx, ry, rw, rh) in LAY['rects']['corridor']:
        if rh >= rw:
            horiz[ry * T:(ry + rh) * T, rx * T:(rx + rw) * T] = True
    a = np.where(horiz, YY, XX)
    pw = 12
    i = a // pw
    local = a % pw
    tone = hashf(i, 7)
    base = mix(hexc('#7a1a12'), hexc('#a8301e'), (0.3 + 0.7 * tone)[..., None])
    n = fbm(H, W, 8, 3, 31)
    base = base * (0.82 + 0.25 * n[..., None])
    gap = (local < 1.6).astype(np.float32)
    base = mix(base, hexc('#0d1f24'), gap[..., None] * 0.9)
    base = base * (1 + 0.1 * ((local > 1.6) & (local < 3.4)))[..., None]
    wear = smooth(0.55, 0.85, fbm(H, W, 30, 4, 32))
    return mix(base, hexc('#5a2a1c'), wear[..., None] * 0.4)


def floor_earth():
    """Bếp Tết yard: packed earth with scattered old bricks and straw."""
    n = fbm(H, W, 24, 5, 41)
    base = mix(hexc('#4e3a28'), hexc('#7a5c3c'), n[..., None])
    base = base * (0.9 + 0.15 * fbm(H, W, 3, 2, 42)[..., None])
    bricks = floor_brick(28, 14, '#6e3020', '#8e4630', '#3a2a20', 43, 0.3)
    patch = smooth(0.5, 0.58, fbm(H, W, 70, 3, 44))
    base = mix(base, bricks, patch[..., None])
    straw = (np.abs(np.sin(XX * 0.9 + YY * 0.35 + fbm(H, W, 4, 2, 45) * 12)) < 0.05) & (value_noise(H, W, 6, 46) > 0.72)
    return np.where(straw[..., None], hexc('#c9a45a'), base)


def floor_pavers():
    """Old-quarter pavement: grey-blue stone slabs with lime streaks (vôi) in the joints."""
    rh = 30
    row = YY // rh
    fy = YY % rh
    off = hashf(row, 1) * 60
    wc = 52
    cx = (XX + off) // wc
    fx = (XX + off) % wc
    tone = hashf(cx, row)
    base = mix(hexc('#55595a'), hexc('#878780'), tone[..., None])
    base = base * (0.86 + 0.28 * fbm(H, W, 5, 4, 51)[..., None])
    hl = np.clip(1 - fx / 3, 0, 1) + np.clip(1 - fy / 3, 0, 1)
    sh = np.clip(1 - (wc - 1 - fx) / 4, 0, 1) + np.clip(1 - (rh - 1 - fy) / 4, 0, 1)
    base = base * (1 + 0.1 * hl[..., None] - 0.2 * sh[..., None])
    g = ((fx < 2) | (fy < 2)).astype(np.float32)
    base = mix(base, hexc('#2e2e2a'), g[..., None])
    lime = smooth(0.7, 0.85, fbm(H, W, 18, 4, 52))
    return mix(base, hexc('#d8d8c8'), lime[..., None] * 0.25)


FLOORS = {
    'courtyard_checkin': lambda: floor_brick(30, 14, '#7e3422', '#a85236', '#4a3a2e', 11, 0.7),
    'exhibition': floor_bat,
    'corridor': floor_bridge,
    'coordination': lambda: floor_planks(False, 15, '#7a5634', '#4a321c', 25, 0.1),
    'editing': floor_pavers,
    'archive': lambda: floor_brick(26, 13, '#6e3a26', '#946048', '#3a2e26', 61, 0.4),
    'artifact_storage': floor_earth,
}

img = np.zeros((H, W, 3), np.float32)
for name, fn in FLOORS.items():
    m = APX == aidx(name)
    if m.any():
        img[m] = fn()[m]
        print('floor', name)


# ====================================================================== rugs, mats, paths, pond
def rect_px(x0, y0, x1, y1):
    return (XX >= x0) & (XX < x1) & (YY >= y0) & (YY < y1)


def soft_rect(x0, y0, x1, y1, r=3.0):
    dx = np.maximum(np.maximum(x0 - XX, XX - x1), 0)
    dy = np.maximum(np.maximum(y0 - YY, YY - y1), 0)
    inside = (XX >= x0) & (XX <= x1) & (YY >= y0) & (YY <= y1)
    return np.where(inside, 1.0, np.clip(1 - np.sqrt(dx ** 2 + dy ** 2) / r, 0, 1)).astype(np.float32)


def rug(x0, y0, x1, y1, field='#8f1d16', border='#d4a03c', edge='#3a0d08', bw=14):
    global img
    sub = (slice(int(y0) - 12, int(y1) + 12), slice(int(x0) - 12, int(x1) + 12))
    xs, ys = XX[sub], YY[sub]
    sh = np.clip(1 - np.maximum(np.maximum(x0 + 3 - xs, xs - x1 - 3), np.maximum(y0 + 4 - ys, ys - y1 - 4)) / 6, 0, 1)
    img[sub] *= (1 - 0.35 * sh * ((xs > x0 - 6) & (ys > y0 - 6)))[..., None]
    inside = (xs >= x0) & (xs < x1) & (ys >= y0) & (ys < y1)
    d = np.minimum(np.minimum(xs - x0, x1 - 1 - xs), np.minimum(ys - y0, y1 - 1 - ys))
    weave = (np.sin(xs * 2.2) * np.sin(ys * 2.2)) * 0.04 + (fbm(xs.shape[0], xs.shape[1], 3, 2, 61) - 0.5) * 0.12
    col = np.broadcast_to(hexc(field), xs.shape + (3,)).copy()
    u = ((xs - x0) + (ys - y0)) / 22
    v = ((xs - x0) - (ys - y0)) / 22
    lat = np.minimum(np.abs(u - np.round(u)), np.abs(v - np.round(v)))
    col = col * (1 - 0.18 * smooth(0.07, 0.0, lat))[..., None]
    band = (d >= 3) & (d < 3 + bw)
    tt = np.where((xs - x0 < 3 + bw) | (x1 - xs < 3 + bw), ys, xs)
    mm = np.abs(((tt - y0) % 16) - 8) + np.abs(np.minimum(d - 3, bw - (d - 3)) - bw / 2) * 1.6
    bcol = mix(hexc(border) * 0.8, hexc('#2a0a06'), (smooth(6, 4, mm) * 0.75)[..., None])
    col = np.where(band[..., None], bcol, col)
    col = np.where((np.abs(d - (3 + bw)) < 1.2)[..., None], hexc(border), col)
    col = np.where((d < 3)[..., None], hexc(edge), col)
    col = col * (1 + weave[..., None]) * (0.92 + 0.08 * smooth(0, 10, d))[..., None]
    img[sub] = np.where(inside[..., None], col, img[sub])


def chieu(x0, y0, x1, y1, stripe='#a3342a'):
    global img
    m = rect_px(x0, y0, x1, y1)
    weave = ((np.floor(XX / 4) + np.floor(YY / 4)) % 2)
    col = mix(hexc('#c9b07a'), hexc('#d9c48e'), weave[..., None])
    col = np.where((((YY - y0) % 40) < 6)[..., None], mix(col, hexc(stripe), 0.65), col)
    col = col * (0.9 + 0.15 * fbm(H, W, 6, 2, 71)[..., None])
    sh = soft_rect(x0 + 3, y0 + 4, x1 + 3, y1 + 4, 6)
    img *= (1 - 0.3 * sh * (1 - m))[..., None]
    img[m] = col[m]
    bd = m & ((XX - x0 < 4) | (x1 - XX < 4) | (YY - y0 < 4) | (y1 - YY < 4))
    img[bd] = hexc('#3a2614')


def path_slabs(x0, y0, x1, y1):
    global img
    m = rect_px(x0, y0, x1, y1)
    fy = (YY - y0) % 30
    fx = (XX - x0) % 48
    col = mix(hexc('#a9a89c'), hexc('#c8c6b8'), hashf(np.floor((XX - x0) / 48), np.floor((YY - y0) / 30))[..., None])
    col = col * (0.9 + 0.18 * fbm(H, W, 4, 3, 91)[..., None])
    col = col * (1 - 0.35 * ((fy < 1.5) | (fx < 1.5))[..., None])
    img[m] = col[m]


def lake_tex(h, w, y0=0, x0=0, seed=201):
    """Dark-teal Hồ Gươm water: slow ripples + scattered glints (absolute coords for continuity)."""
    yy, xx = np.mgrid[y0:y0 + h, x0:x0 + w].astype(np.float32)
    n = fbm(h, w, 60, 4, seed)
    rip = np.sin(xx * 0.05 + np.sin(yy * 0.21 + n * 6) * 1.6 + yy * 0.9) * 0.5 + 0.5
    col = mix(hexc('#0a1f26'), hexc('#164149'), (0.35 * n + 0.25 * rip)[..., None])
    hi = (rip > 0.93) & (value_noise(h, w, 8, seed + 1) > 0.55)
    return np.where(hi[..., None], mix(col, hexc('#6fa6a8'), 0.35), col)


def pond(x0, y0, x1, y1):
    """Water strip in front of the thủy đình, lime-stone kerb."""
    global img
    m = rect_px(x0, y0, x1, y1)
    water = np.zeros((H, W, 3), np.float32)
    water[y0:y1, x0:x1] = lake_tex(y1 - y0, x1 - x0, y0, x0, 211)
    rs = np.random.default_rng(212)
    for _ in range(int((x1 - x0) / 30)):  # lantern reflections
        cx = rs.uniform(x0 + 10, x1 - 10)
        streak = np.exp(-((XX - cx) ** 2) / 20) * ((YY > y0 + 6) & (YY < y1 - 6)) * (np.sin(YY * 1.3 + cx) > -0.2)
        water += streak[..., None] * hexc('#ff9a40') * 0.35
    img[m] = water[m]
    kerb = m & ((YY > y1 - 7) | (XX < x0 + 6) | (XX > x1 - 7))
    kc = hexc('#c9c7b4') * (0.85 + 0.25 * fbm(H, W, 4, 2, 213))[..., None]
    img[kerb] = kc[kerb]
    below = rect_px(x0, y1, x1, y1 + 10)
    img[below] *= (1 - 0.4 * (1 - (YY[below] - y1) / 10))[..., None]


t = lambda v: v * T  # noqa: E731

# Đền Ngọc Sơn: red carpet from the altar to the south door
rug(t(6) + 4, t(10) - 6, t(9) - 4, t(18) - 10, field='#8a1812', border='#e0ae45', bw=10)
# Bờ Hồ: pale stone walk toward the giao thừa altar
path_slabs(t(19) + 8, t(5) + 6, t(23) - 8, t(7))
# Thủy Đình: pond strip under the water pavilion
pond(t(29), t(8), t(40), t(10) + 12)
# Thủy Đình: audience mat
chieu(t(31) + 8, t(11) + 6, t(38) - 8, t(15) + 6)
# Hàng Trống: sedge mat under the print rack
chieu(t(8) + 6, t(27) + 10, t(12) - 6, t(30) + 20, '#2e6a3a')
# Phố Ông Đồ: red paper mat where the ông đồ sits + one by the câu đối stall
chieu(t(26) + 4, t(22) + 8, t(29) - 4, t(24) - 4)
chieu(t(13) + 4, t(22) + 8, t(16) - 4, t(24) - 4)
# Bếp Tết: stone hearth slab under the pot
path_slabs(t(36) + 4, t(30), t(39) - 4, t(31) + 30)
print('rugs')

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
CAPW = 13.0
cap = (~solid_src) & (dist <= CAPW)
mass = (~solid_src) & (dist > CAPW)

# --- Hồ Gươm: the unreachable mass is dark lake water
lake = lake_tex(H, W)
far = np.clip((dist - CAPW) / 90, 0, 1)
lake = lake * (1 - 0.35 * far)[..., None]
# soft shoreline glow just past the kerb (light spilling onto the water)
lake = lake + (np.exp(-(dist - CAPW) / 14) * 0.12)[..., None] * hexc('#ffb060')
img[mass] = lake[mass]

# --- lime-white stone embankment caps (đá vôi) on every wall top
gy_, gx_ = np.gradient(dist)
along = np.where(np.abs(gy_) > np.abs(gx_), XX, YY)
seg = (along % 26) / 26
prof = np.sin(np.clip(dist / CAPW, 0, 1) * math.pi)
capcol = mix(hexc('#8e8c7c'), hexc('#e6e4d2'), (0.35 + 0.65 * prof)[..., None])
capcol = capcol * (1 - 0.3 * (seg > 0.94))[..., None]
outer = smooth(CAPW - 2.5, CAPW, dist)
capcol = mix(capcol, hexc('#202a2a'), outer[..., None] * 0.85)
capcol = mix(capcol, hexc('#4a4a40'), smooth(1.6, 0.0, dist)[..., None] * 0.7)
capcol = capcol * (0.88 + 0.18 * fbm(H, W, 6, 2, 103))[..., None]
capcol = mix(capcol, hexc('#5a6a40'), (smooth(0.7, 0.85, fbm(H, W, 14, 3, 104)) * 0.5)[..., None])
img[cap] = capcol[cap]


# --- wall faces, per room style
def frame(h, w):
    return np.mgrid[0:h, 0:w].astype(np.float32)


def red_strip(col, X, yy, h, period, half=5, seed=0):
    """Vertical red câu đối paper strips with dark abstract brush marks (no glyphs)."""
    gx = X % period
    strip = (np.abs(gx - period / 2) < half) & (yy > 12) & (yy < h - 10)
    mark = (hashf(np.floor(X / period) + seed, np.floor(yy / 6)) > 0.45) & (np.abs(gx - period / 2) < half - 2) & ((yy % 6) < 3.2)
    col = np.where(strip[..., None], hexc('#c8281c') * (0.85 + 0.15 * (1 - yy / h))[..., None], col)
    return np.where((strip & mark)[..., None], hexc('#2a0c08'), col)


def style_lakeside(h, w, x0):
    """Bờ Hồ: low lime-white balustrade with the dark lake visible behind."""
    yy, xx = frame(h, w)
    X = xx + x0
    col = lake_tex(h, w, 0, x0, 221) * 0.8
    rail_top = h * 0.42
    bal = (yy > rail_top) & (yy < h - 6)
    post = (X % 48) < 8
    bary = (X % 12) < 5
    stone = hexc('#d8d6c4') * (0.8 + 0.25 * fbm(h, w, 4, 2, 222)[..., None])
    stone = stone * (0.8 + 0.3 * (1 - (yy - rail_top) / h))[..., None]
    col = np.where((bal & (post | bary))[..., None], stone, col)
    col = np.where((np.abs(yy - rail_top) < 3.5)[..., None], hexc('#ecead8'), col)
    return col


def style_temple(h, w, x0):
    """Ngọc Sơn: red lacquer panels with black/gold câu đối boards."""
    yy, xx = frame(h, w)
    X = xx + x0
    gx = X % 96
    col = hexc('#8e1a12') * (0.75 + 0.35 * (1 - yy / h))[..., None] * (0.92 + 0.12 * fbm(h, w, 12, 3, 231)[..., None])
    stile = (gx < 5) | (gx > 91)
    col = np.where(stile[..., None], hexc('#4a120c'), col)
    board = (np.abs(gx - 48) < 7) & (yy > 12) & (yy < h - 10)
    mark = (hashf(np.floor(X / 96), np.floor(yy / 6)) > 0.4) & (np.abs(gx - 48) < 4) & ((yy % 6) < 3)
    col = np.where(board[..., None], hexc('#1c1210'), col)
    col = np.where((board & mark)[..., None], hexc('#e0b048'), col)
    col = np.where(((np.abs(np.abs(gx - 48) - 7) < 1) & (yy > 12) & (yy < h - 10))[..., None], hexc('#c99a3a'), col)
    # gold cloud scroll in side panels
    for c in (24, 72):
        r = np.sqrt((gx - c) ** 2 + ((yy - h / 2) * 1.4) ** 2)
        sw = np.abs(np.sin(r * 0.55 - np.arctan2(yy - h / 2, gx - c))) < 0.18
        col = np.where((sw & (r < 11))[..., None], mix(col, hexc('#d9a63e'), 0.7), col)
    return col


def style_bridge(h, w, x0):
    """Thê Húc: dark water below with a red railing."""
    yy, xx = frame(h, w)
    X = xx + x0
    col = lake_tex(h, w, 0, x0, 241) * 0.85
    red = hexc('#b42a1c') * (0.8 + 0.3 * (1 - yy / h))[..., None]
    rail = (np.abs(yy - h * 0.35) < 3) | (np.abs(yy - h * 0.7) < 2)
    post = ((X % 40) < 6) & (yy > h * 0.3)
    lattice = (yy > h * 0.35) & (yy < h * 0.7) & (np.abs(((X + yy) % 20) - 10) < 1.5)
    col = np.where((rail | post | lattice)[..., None], red, col)
    return col


def style_blinds(h, w, x0):
    """Thủy đình: bamboo blinds (mành) between red posts."""
    yy, xx = frame(h, w)
    X = xx + x0
    gx = X % 72
    bam = mix(hexc('#8a6a32'), hexc('#c4a056'), (0.5 + 0.5 * np.sin(yy * 2.1))[..., None])
    bam = bam * (0.8 + 0.3 * fbm(h, w, 6, 2, 251)[..., None]) * (0.75 + 0.35 * (1 - yy / h))[..., None]
    col = bam * (1 - 0.35 * ((yy % 3) < 0.9))[..., None]
    tie = (np.abs(gx - 24) < 1.2) | (np.abs(gx - 48) < 1.2)
    col = np.where(tie[..., None], hexc('#7a1a12'), col)
    post = gx < 7
    col = np.where(post[..., None], hexc('#a8231a') * (0.8 + 0.3 * (gx < 2))[..., None], col)
    return col


def style_phocu(h, w, x0):
    """Phố cổ: ochre lime plaster tube-house fronts, green shutters, red Tết strips."""
    yy, xx = frame(h, w)
    X = xx + x0
    gx = X % 144
    plaster = hexc('#c9a24e') * (0.85 + 0.2 * fbm(h, w, 14, 4, 261)[..., None])
    stain = smooth(0.55, 0.8, fbm(h, w, 20, 4, 262))
    col = mix(plaster, hexc('#6a5430'), (stain * (yy / h))[..., None] * 0.55)
    sh = ((np.abs(gx - 40) < 16) | (np.abs(gx - 104) < 16)) & (yy > 12) & (yy < h - 8)
    slat = (yy % 4) < 1.2
    green = hexc('#2e5a46') * (0.8 + 0.2 * (1 - yy / h))[..., None]
    col = np.where(sh[..., None], np.where(slat[..., None], green * 0.6, green), col)
    col = np.where((sh & (np.abs(gx % 64 - 40 % 64) < 0.8))[..., None], hexc('#1c3a2c'), col)
    col = red_strip(col, X + 72, yy, h, 144, 4, 7)
    return col


def style_hangtrong(h, w, x0):
    """Hàng Trống: whitewashed wall hung with folk prints."""
    yy, xx = frame(h, w)
    X = xx + x0
    col = hexc('#cfc6aa') * (0.82 + 0.2 * fbm(h, w, 12, 4, 271)[..., None]) * (0.8 + 0.3 * (1 - yy / h))[..., None]
    gx = X % 40
    k = np.floor(X / 40)
    pr = (gx > 6) & (gx < 34) & (yy > 14) & (yy < h - 12)
    paper = hexc('#f0e0b4')
    col = np.where(pr[..., None], paper, col)
    c = hashf(k, 3)
    pal = [hexc('#c8281c'), hexc('#2e7a3a'), hexc('#e0b040'), hexc('#1c1410')]
    cy = (14 + h - 12) / 2
    blobm = pr & (((gx - 20) / 9) ** 2 + ((yy - cy) / (h * 0.16)) ** 2 < 1)
    for i, pc in enumerate(pal):
        sel = (c >= i / 4) & (c < (i + 1) / 4)
        col = np.where((blobm & sel)[..., None], pc, col)
    inner = pr & (((gx - 18) / 4) ** 2 + ((yy - cy) / (h * 0.07)) ** 2 < 1)
    col = np.where(inner[..., None], pal[2] * 0.95, col)
    col = np.where((pr & ((np.abs(gx - 6.5) < 1) | (np.abs(gx - 33.5) < 1)))[..., None], hexc('#3a2a1a'), col)
    col = np.where((np.abs(yy - 12) < 0.8)[..., None], hexc('#3a2a1a'), col)
    return col


def style_kitchen(h, w, x0):
    """Bếp Tết: soot-stained brick with a smoke-blackened upper wall."""
    yy, xx = frame(h, w)
    X = xx + x0
    row = np.floor(yy / 8)
    bx = (X + (row % 2) * 10) % 20
    bricks = mix(hexc('#6a2e1c'), hexc('#94442a'), hashf(np.floor((X + (row % 2) * 10) / 20), row)[..., None])
    bricks = np.where(((yy % 8 < 1.4) | (bx < 1.4))[..., None], hexc('#8a7a64') * 0.7, bricks)
    soot = np.clip(1 - yy / h, 0, 1) * (0.5 + 0.5 * fbm(h, w, 18, 4, 281))
    return bricks * (1 - 0.6 * soot)[..., None]


STYLE = {
    'courtyard_checkin': style_lakeside,
    'exhibition': style_temple,
    'corridor': style_bridge,
    'coordination': style_blinds,
    'editing': style_phocu,
    'archive': style_hangtrong,
    'artifact_storage': style_kitchen,
}
LIT = ('courtyard_checkin', 'exhibition', 'corridor', 'coordination', 'editing', 'archive', 'artifact_storage')

lamps = []
for gy, x0, x1, ar, ext in runs:
    name = ORDER[ar]
    top = gy * T - ext
    bot = (gy + 1) * T
    h, w = bot - top, (x1 - x0) * T
    body = STYLE[name](h, w, x0 * T)
    yy, xx = frame(h, w)
    beam = yy < 7
    if name in ('courtyard_checkin', 'corridor'):
        body = np.where(beam[..., None], hexc('#d0cebc') * (0.85 + 0.3 * (yy < 2))[..., None], body)
    else:
        body = np.where(beam[..., None], hexc('#3a1f0e') * (0.9 + 0.3 * (yy < 2))[..., None], body)
        body = np.where((np.abs(yy - 7.5) < 1.2)[..., None], hexc('#d9a63e'), body)
    base = yy > h - 6
    body = np.where(base[..., None], hexc('#55524a') * (0.8 + 0.2 * fbm(h, w, 3, 2, 171))[..., None], body)
    body = np.where((np.abs(yy - (h - 6)) < 1)[..., None], hexc('#2a241e'), body)
    endl = smooth(6, 0, xx) * (x0 > 0 and VOID[gy + 1, x0 - 1] if gy + 1 < GH else 0)
    endr = smooth(6, 0, w - 1 - xx) * (x1 < GW and VOID[gy + 1, x1] if gy + 1 < GH else 0)
    body = body * (1 - 0.45 * np.maximum(endl, endr))[..., None]
    body = body * (1 - 0.25 * smooth(h - 14, h, yy))[..., None]
    img[top:bot, x0 * T:x1 * T] = body
    if name in LIT and (x1 - x0) >= 2:
        for gx in range(x0, x1):
            if (gx * 7 + gy * 3) % 3 == 1:
                lamps.append((gx * T + 24, top + 28))

# door sills + red posts
sill = np.zeros((H, W), bool)
posts = []
for gy in range(GH):
    for gx in range(GW):
        a = A[gy, gx]
        if a < 0:
            continue
        if gx + 1 < GW and A[gy, gx + 1] >= 0 and A[gy, gx + 1] != a:
            x = (gx + 1) * T
            sill[gy * T:(gy + 1) * T, x - 5:x + 5] = True
        if gy + 1 < GH and A[gy + 1, gx] >= 0 and A[gy + 1, gx] != a:
            y = (gy + 1) * T
            sill[y - 5:y + 5, gx * T:(gx + 1) * T] = True
sill_col = hexc('#5a3216') * (0.8 + 0.4 * fbm(H, W, 6, 2, 181))[..., None]
img[sill] = sill_col[sill]
lab, nlab = ndimage.label(sill)
for sl in ndimage.find_objects(lab):
    ys, xs = sl
    if (xs.stop - xs.start) > (ys.stop - ys.start):
        for x in (xs.start, xs.stop):
            posts.append((x, (ys.start + ys.stop) / 2))
    else:
        for y in (ys.start, ys.stop):
            posts.append(((xs.start + xs.stop) / 2, y))
    img[ys.start:ys.start + 2, xs] *= 1.25
    img[ys.stop - 2:ys.stop, xs] *= 0.6


# ====================================================================== shadows, light, grading
wall = ~FLOOR
d_wall = ndimage.distance_transform_edt(FLOOR).astype(np.float32)
ao = 1 - 0.32 * np.exp(-d_wall / 9)
shift = np.zeros_like(wall)
shift[10:, 8:] = wall[:-10, :-8]
dirsh = ndimage.gaussian_filter((shift & FLOOR).astype(np.float32), 6)
light = ao * (1 - 0.28 * dirsh)

LANTERN_KEYS = {'tl-prop-den-long': 1.0, 'tl-decor-den-long-cot': 0.85, 'tl-decor-cot-do': 0.6, 'tl-prop-ban-tho-giao-thua': 0.9,
                'tl-prop-ban-tho-ngoc-son': 0.8, 'tl-prop-thuy-dinh': 0.6, 'tl-prop-cay-neu': 0.5, 'tl-prop-ban-cau-doi': 0.5}
warm = np.zeros((H, W), np.float32)
for p in LAY['props']:
    k = LANTERN_KEYS.get(p['key'])
    if k:
        lx, ly = p['x'], p['y'] - 40
        warm += k * np.exp(-(((XX - lx) ** 2 + (YY - ly - 30) ** 2) / (2 * 95.0 ** 2)))
for (lx, ly) in lamps:
    warm += 0.55 * np.exp(-(((XX - lx) ** 2 + ((YY - ly - 60) * 1.4) ** 2) / (2 * 70.0 ** 2)))
fire = np.zeros((H, W), np.float32)
for p in LAY['props']:
    if p['key'] == 'tl-prop-noi-banh-chung':
        fire += np.exp(-(((XX - p['x']) ** 2 + (YY - p['y'] + 10) ** 2) / (2 * 120.0 ** 2)))
warm = np.clip(warm, 0, 1.4)

vig = np.ones((H, W), np.float32)
for name, rects in LAY['rects'].items():
    for (rx, ry, rw, rh) in rects:
        if name == 'corridor':
            continue
        cx, cy = (rx + rw / 2) * T, (ry + rh / 2) * T
        sx, sy = rw * T * 0.62, rh * T * 0.62
        m = APX == aidx(name)
        v = 1 - 0.18 * np.clip(((XX - cx) / sx) ** 2 + ((YY - cy) / sy) ** 2, 0, 1)
        vig = np.where(m, v, vig)

img = np.where(FLOOR[..., None], img * (light * vig)[..., None], img)
# midnight-blue night grade, cancelled where lanterns are warm
night = np.array([0.74, 0.8, 0.98], np.float32)
lit = np.clip(warm + fire, 0, 1)[..., None]
img = img * (night + (1 - night) * lit * 0.85)
img = img + warm[..., None] * hexc('#ff9a48') * 0.2 * FLOOR[..., None]
img = img + fire[..., None] * hexc('#ff7a2a') * 0.3 * FLOOR[..., None]


def lantern_on_wall(cx, cy):
    global img
    sub = (slice(int(cy - 30), int(cy + 40)), slice(int(cx - 30), int(cx + 30)))
    xs, ys = XX[sub] - cx, YY[sub] - cy
    g = np.exp(-((xs ** 2 + ys ** 2) / (2 * 16.0 ** 2)))
    img[sub] = img[sub] + g[..., None] * hexc('#ff9a40') * 0.4
    body = ((xs / 8.5) ** 2 + (ys / 10.5) ** 2) < 1
    shade = np.clip(0.55 + 0.6 * (1 - ((xs + 3) / 9) ** 2), 0.3, 1.25)
    col = hexc('#e03a1f') * shade[..., None]
    col = np.where((np.abs(np.sin(xs * 0.75)) < 0.18)[..., None], col * 0.75, col)
    img[sub] = np.where(body[..., None], col, img[sub])
    for yy0 in (-11, 11):
        capm = (np.abs(ys - yy0) < 2) & (np.abs(xs) < 5)
        img[sub] = np.where(capm[..., None], hexc('#e0b048'), img[sub])
    cord = (np.abs(xs) < 0.8) & (ys < -11) & (ys > -26)
    img[sub] = np.where(cord[..., None], hexc('#2a1a0a'), img[sub])
    tas = (np.abs(xs) < 1.2) & (ys > 13) & (ys < 22)
    img[sub] = np.where(tas[..., None], hexc('#e3a33a'), img[sub])


for (lx, ly) in lamps:
    lantern_on_wall(lx, ly)

# lantern reflections on the lake: wavy warm streaks below lamps that face open water, plus floating đèn hoa đăng
rs = np.random.default_rng(301)
refl = np.zeros((H, W), np.float32)
for (lx, ly) in lamps:
    gyl, gxl = int(ly // T), int(lx // T)
    if gyl - 1 >= 0 and VOID[max(gyl - 1, 0), min(gxl, GW - 1)]:
        pass
for _ in range(70):  # hoa đăng on the lake
    x, y = rs.uniform(0, W), rs.uniform(0, H)
    if not mass[int(y), int(x)] or dist[int(y), int(x)] < 30:
        continue
    sub = (slice(max(int(y) - 6, 0), min(int(y) + 40, H)), slice(max(int(x) - 8, 0), min(int(x) + 8, W)))
    xs, ys = XX[sub] - x, YY[sub] - y
    wav = xs + np.sin(ys * 0.6) * 1.6
    refl[sub] += np.exp(-(wav ** 2) / 3) * np.clip(1 - ys / 38, 0, 1) * (ys > 2) * (np.sin(ys * 1.4) > -0.3) * 0.55
    refl[sub] += np.exp(-((xs ** 2) / 6 + (ys ** 2) / 3)) * 1.2
img = img + (refl * mass)[..., None] * hexc('#ffa64a') * 0.6

for (px, py) in posts:
    sub = (slice(int(py - 12), int(py + 12)), slice(int(px - 12), int(px + 12)))
    xs, ys = XX[sub] - px, YY[sub] - py
    r = np.sqrt(xs ** 2 + ys ** 2)
    sh = np.exp(-(((xs - 4) ** 2 + (ys - 5) ** 2) / 40))
    img[sub] *= (1 - 0.4 * sh)[..., None]
    litp = np.clip(0.6 + 0.5 * (-(xs + ys) / 12), 0.3, 1.3)
    col = hexc('#a8231a') * litp[..., None]
    col = np.where((np.abs(r - 6.5) < 1.2)[..., None], hexc('#e0b048'), col)
    img[sub] = np.where((r < 8)[..., None], col, img[sub])

img = img + (value_noise(H, W, 1.0, 191)[..., None] - 0.5) * 0.025
img = np.clip(img, 0, 1)

out = Image.fromarray((img * 255 + 0.5).astype(np.uint8), 'RGB')
sp = src('tileset', 'tl-floor-bake.png')
pp = pub('tileset', 'tl-floor-bake.webp')
out.save(sp, optimize=True)
out.save(pp, 'WEBP', quality=86, method=6)
print('wrote', pp, out.size, os.path.getsize(pp) // 1024, 'KB webp')
