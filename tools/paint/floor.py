"""
Bakes the whole Cố đô Huế layout (42x32 tiles, 2016x1536 px) into one painted background:
floors per room (gạch bát, gỗ lim, men ngọc, đá cẩm thạch, đá xanh…), rugs, inlays, 3/4 wall faces
with per-room character (sơn son thếp vàng, song cửa, rèm nhung, bản đồ sao, tủ châu bản, tường gạch),
yellow glazed ridge caps (ngói lưu ly) on every wall top, dark tiled roofs over the unreachable mass,
door sills + lacquer posts at every doorway, contact shadows / AO and warm lantern light.

  python3 tools/paint/floor.py            (after: npx tsx tools/paint/export-layout.ts)
Writes assets/maps/co-do-hue/tileset/hue-floor-bake.png and apps/web/public/.../hue-floor-bake.webp
"""
from __future__ import annotations

import json
import math
import os
import sys

import numpy as np
from PIL import Image
from scipy import ndimage

sys.path.insert(0, os.path.dirname(__file__))
from lib import fbm, hexc, mix, smooth, value_noise  # noqa: E402

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '../..'))
LAY = json.load(open(os.path.join(os.path.dirname(__file__), '_layout.json')))
T = LAY['tile']
GW, GH = LAY['w'], LAY['h']
W, H = GW * T, GH * T
ORDER = LAY['areaOrder']
A = np.array(LAY['area'], np.int16).reshape(GH, GW)
rng = np.random.default_rng(1802)  # Gia Long

YY, XX = np.mgrid[0:H, 0:W].astype(np.float32)
APX = np.repeat(np.repeat(A, T, 0), T, 1)  # area per pixel
FLOOR = APX >= 0


def aidx(name):
    return ORDER.index(name)


def hashf(*a):
    """deterministic pseudo-random [0,1) from integer arrays"""
    x = np.zeros_like(np.asarray(a[0], np.float64))
    for i, v in enumerate(a):
        x = x + np.asarray(v, np.float64) * (127.1 + 311.7 * i)
    return (np.sin(x) * 43758.5453) % 1.0


def aniso(h, w, ch, cw, seed):
    """streaky noise: cells of ch x cw px"""
    r = np.random.default_rng(seed)
    g = r.random((h // ch + 3, w // cw + 3)).astype(np.float32)
    z = ndimage.zoom(g, (ch, cw), order=3)
    return z[:h, :w]


# ====================================================================== floor materials
def floor_bat():
    """Huế terracotta 'gạch bát' squares, worn, with moss in the joints (outdoor courtyard)."""
    s = 24
    cx, cy = XX // s, YY // s
    fx, fy = XX % s, YY % s
    tone = hashf(cx, cy)
    base = mix(hexc('#b4582f'), hexc('#c97a4a'), tone[..., None])
    fade = hashf(cx + 7, cy * 3) > 0.82
    base = np.where(fade[..., None], mix(base, hexc('#cfa27a'), 0.35), base)
    n = fbm(H, W, 6, 4, 11)
    base = base * (0.9 + 0.22 * n[..., None])
    pits = (value_noise(H, W, 1.0, 12) > 0.86) * 0.12
    base = base * (1 - pits[..., None])
    # bevel
    hl = np.clip(1 - (fx - 2) / 3, 0, 1) + np.clip(1 - (fy - 2) / 3, 0, 1)
    sh = np.clip(1 - (s - 1 - fx) / 3, 0, 1) + np.clip(1 - (s - 1 - fy) / 3, 0, 1)
    base = base * (1 + 0.12 * hl[..., None] - 0.18 * sh[..., None])
    grout = ((fx < 2) | (fy < 2)).astype(np.float32)
    gcol = mix(hexc('#5b3d2a'), hexc('#7a6346'), fbm(H, W, 4, 2, 13)[..., None])
    moss = smooth(0.55, 0.75, fbm(H, W, 40, 4, 14))
    gcol = mix(gcol, hexc('#4b5a2a'), moss[..., None] * 0.8)
    return mix(base, gcol, grout[..., None])


def floor_planks(vertical=True, pw=16, light='#8a5530', dark='#5a3018', seed=21, gloss=0.18):
    """Polished wooden planks (gỗ lim) with grain, staggered joints and soft sheen."""
    a, b = (XX, YY) if vertical else (YY, XX)
    i = a // pw
    local = a % pw
    ln = 140 + (hashf(i, 3) * 160)
    off = hashf(i, 9) * 300
    seg = np.floor((b + off) / ln)
    tone = hashf(i, seg)
    base = mix(hexc(dark), hexc(light), (0.25 + 0.75 * tone)[..., None])
    if vertical:
        streak = aniso(H, W, 90, 2, seed)
        warp = aniso(H, W, 60, 6, seed + 1)
    else:
        streak = aniso(H, W, 2, 90, seed)
        warp = aniso(H, W, 6, 60, seed + 1)
    grain = np.sin((local + warp * 10) * (2 * math.pi / 5.3) + tone * 6) * 0.5 + 0.5
    base = base * (0.84 + 0.14 * grain[..., None] + 0.12 * (streak[..., None] - 0.5))
    seam = (local < 1.2).astype(np.float32)
    joint = (((b + off) % ln) < 1.6).astype(np.float32)
    base = base * (1 - 0.45 * np.maximum(seam, joint)[..., None])
    base = base * (1 + 0.06 * (local < 3)[..., None])  # edge catch light
    sheen = smooth(0.45, 0.9, fbm(H, W, 120, 3, seed + 5))
    return base + gloss * sheen[..., None] * hexc('#ffe2b0') * 0.5


def floor_jade():
    """Green-glazed diamond tiles with tiny bronze inserts (theatre)."""
    s = 34.0
    u = (XX + YY) / s
    v = (XX - YY) / s
    cu, cv = np.floor(u), np.floor(v)
    fu, fv = u - cu, v - cv
    tone = hashf(cu, cv)
    base = mix(hexc('#1f5a46'), hexc('#3c8a6a'), tone[..., None])
    glaze = fbm(H, W, 10, 3, 31)
    base = base * (0.85 + 0.3 * glaze[..., None])
    # glossy spot toward light (upper-left in each tile)
    d = np.sqrt((fu - 0.3) ** 2 + (fv - 0.5) ** 2)
    base = base + (np.clip(1 - d / 0.35, 0, 1) ** 2 * 0.25)[..., None]
    edge = np.minimum(np.minimum(fu, 1 - fu), np.minimum(fv, 1 - fv))
    base = base * (1 - 0.25 * smooth(0.12, 0.0, edge)[..., None])
    grout = (edge < 0.035).astype(np.float32)
    base = mix(base, hexc('#14261e'), grout[..., None])
    # bronze square at intersections
    du = np.minimum(fu, 1 - fu)
    dv = np.minimum(fv, 1 - fv)
    ins = ((du < 0.09) & (dv < 0.09)).astype(np.float32)
    return mix(base, hexc('#c49a4a') * (0.8 + 0.4 * glaze[..., None]), ins[..., None])


def floor_marble():
    """Cream marble slabs with soft veins (observatory)."""
    s = 48
    cx, cy = (XX + 24) // s, YY // s
    fx, fy = (XX + 24) % s, YY % s
    tone = hashf(cx, cy)
    base = mix(hexc('#d9cba9'), hexc('#efe5cc'), tone[..., None])
    n = fbm(H, W, 30, 5, 41)
    vein = np.abs(np.sin(XX * 0.018 + YY * 0.011 + n * 9 + tone * 5))
    base = base * (1 - 0.18 * smooth(0.08, 0.0, vein)[..., None])
    base = base * (0.94 + 0.1 * fbm(H, W, 5, 3, 42)[..., None])
    hl = np.clip(1 - fx / 3, 0, 1) + np.clip(1 - fy / 3, 0, 1)
    sh = np.clip(1 - (s - 1 - fx) / 3, 0, 1) + np.clip(1 - (s - 1 - fy) / 3, 0, 1)
    base = base * (1 + 0.06 * hl[..., None] - 0.1 * sh[..., None])
    grout = ((fx < 1.3) | (fy < 1.3)).astype(np.float32)
    return mix(base, hexc('#8d7f63'), grout[..., None])


def floor_granite():
    """Grey-blue stone ashlar (đá Thanh) with moss joints (Thế Miếu courtyard)."""
    rh = 32
    row = YY // rh
    fy = YY % rh
    off = hashf(row, 1) * 70
    # variable slab widths per row: use 3 sizes via hashed cuts
    wcell = 56
    cx = (XX + off) // wcell
    fx = (XX + off) % wcell
    tone = hashf(cx, row)
    base = mix(hexc('#6e7068'), hexc('#a29f94'), tone[..., None])
    n = fbm(H, W, 5, 4, 51)
    base = base * (0.85 + 0.3 * n[..., None])
    speck = (value_noise(H, W, 1.0, 52) > 0.8) * 0.1
    base = base * (1 + speck[..., None]) * (1 - 0.05 * (value_noise(H, W, 1.0, 53) > 0.85)[..., None])
    hl = np.clip(1 - fx / 3, 0, 1) + np.clip(1 - fy / 3, 0, 1)
    sh = np.clip(1 - (wcell - 1 - fx) / 4, 0, 1) + np.clip(1 - (rh - 1 - fy) / 4, 0, 1)
    base = base * (1 + 0.1 * hl[..., None] - 0.2 * sh[..., None])
    grout = ((fx < 2) | (fy < 2)).astype(np.float32)
    moss = smooth(0.5, 0.72, fbm(H, W, 36, 4, 54))
    gcol = mix(hexc('#3e3b33'), hexc('#45602b'), moss[..., None])
    out = mix(base, gcol, grout[..., None])
    # moss creeping on the stones too
    out = mix(out, hexc('#5a6e34'), (smooth(0.7, 0.85, fbm(H, W, 24, 4, 55)) * 0.35)[..., None])
    return out


FLOORS = {
    'courtyard_checkin': floor_bat,
    'exhibition': lambda: floor_planks(True, 16, '#7a4422', '#4a240f', 21, 0.22),
    'corridor': lambda: floor_planks(True, 14, '#94603a', '#5e3a1e', 23, 0.15),
    'coordination': floor_jade,
    'editing': floor_marble,
    'archive': lambda: floor_planks(False, 15, '#9a6a40', '#6a4424', 25, 0.12),
    'artifact_storage': floor_granite,
}

img = np.zeros((H, W, 3), np.float32)
for name, fn in FLOORS.items():
    m = APX == aidx(name)
    if not m.any():
        continue
    tex = fn()
    img[m] = tex[m]
    print('floor', name)


# ====================================================================== rugs & inlays
def rect_px(x0, y0, x1, y1):
    return (XX >= x0) & (XX < x1) & (YY >= y0) & (YY < y1)


def soft_rect(x0, y0, x1, y1, r=3.0):
    dx = np.maximum(np.maximum(x0 - XX, XX - x1), 0)
    dy = np.maximum(np.maximum(y0 - YY, YY - y1), 0)
    inside = (XX >= x0) & (XX <= x1) & (YY >= y0) & (YY <= y1)
    d = np.sqrt(dx ** 2 + dy ** 2)
    return np.where(inside, 1.0, np.clip(1 - d / r, 0, 1)).astype(np.float32)


def rug(x0, y0, x1, y1, field='#8f1d16', border='#d4a03c', edge='#3a0d08', motif='diamond', bw=14, medallion=False):
    """Woven rug: dark edge, gold patterned border, red field with woven texture."""
    global img
    sub = (slice(int(y0) - 12, int(y1) + 12), slice(int(x0) - 12, int(x1) + 12))
    xs, ys = XX[sub], YY[sub]
    # cast shadow
    sh = np.clip(1 - np.maximum(np.maximum(x0 + 3 - xs, xs - x1 - 3), np.maximum(y0 + 4 - ys, ys - y1 - 4)) / 6, 0, 1)
    img[sub] *= (1 - 0.35 * sh * ((xs > x0 - 6) & (ys > y0 - 6)))[..., None]
    inside = (xs >= x0) & (xs < x1) & (ys >= y0) & (ys < y1)
    d = np.minimum(np.minimum(xs - x0, x1 - 1 - xs), np.minimum(ys - y0, y1 - 1 - ys))
    weave = (np.sin(xs * 2.2) * np.sin(ys * 2.2)) * 0.04 + (fbm(xs.shape[0], xs.shape[1], 3, 2, 61) - 0.5) * 0.12
    col = np.broadcast_to(hexc(field), xs.shape + (3,)).copy()
    # field pattern: faint lattice of darker diamonds
    u = ((xs - x0) + (ys - y0)) / 22
    v = ((xs - x0) - (ys - y0)) / 22
    lat = np.minimum(np.abs(u - np.round(u)), np.abs(v - np.round(v)))
    col = col * (1 - 0.18 * smooth(0.07, 0.0, lat))[..., None]
    if medallion:
        mx, my = (x0 + x1) / 2, (y0 + y1) / 2
        rr = np.sqrt((xs - mx) ** 2 + ((ys - my) * 1.0) ** 2)
        R = min(x1 - x0, y1 - y0) * 0.32
        col = mix(col, hexc(border) * 0.95, (smooth(R, R - 2, rr) * smooth(R - 6, R - 4, rr))[..., None])
        col = mix(col, hexc('#5a120c'), (smooth(R - 7, R - 9, rr))[..., None] * 0.6)
        ang = np.arctan2(ys - my, xs - mx)
        petal = (np.cos(ang * 8) * 0.5 + 0.5) * (R - 10)
        col = mix(col, hexc(border), (smooth(petal + 1, petal - 1, rr) * (rr < R - 10))[..., None] * 0.85)
    # border band
    band = (d >= 3) & (d < 3 + bw)
    t = np.where((xs - x0 < 3 + bw) | (x1 - xs < 3 + bw), ys, xs)
    if motif == 'diamond':
        mm = np.abs(((t - y0) % 16) - 8) + np.abs(np.minimum(d - 3, bw - (d - 3)) - bw / 2) * 1.6
        pat = smooth(6, 4, mm)
    else:
        pat = (np.sin(t * 0.5) > 0.4).astype(np.float32)
    bcol = mix(hexc(border) * 0.8, hexc('#2a0a06'), (pat * 0.75)[..., None])
    inner_line = (np.abs(d - (3 + bw)) < 1.2)
    col = np.where(band[..., None], bcol, col)
    col = np.where(inner_line[..., None], hexc(border), col)
    col = np.where((d < 3)[..., None], hexc(edge), col)
    col = col * (1 + weave[..., None])
    # light falloff toward edges (pile)
    col = col * (0.92 + 0.08 * smooth(0, 10, d))[..., None]
    img[sub] = np.where(inside[..., None], col, img[sub])
    # fringe at short ends
    fr = ((ys >= y1) & (ys < y1 + 5) | (ys < y0) & (ys >= y0 - 5)) & (xs >= x0 + 2) & (xs < x1 - 2) & ((xs.astype(int) % 3) == 0)
    img[sub] = np.where(fr[..., None], hexc('#e8d6a8') * 0.9, img[sub])


t = lambda v: v * T  # noqa: E731

# Thái Hòa: imperial red carpet from the throne to the south door
rug(t(6) + 4, t(10) - 6, t(9) - 4, t(18) - 10, field='#8a1812', border='#e0ae45', bw=10)
# Trường Lang runners
rug(t(20) + 2, t(7) + 8, t(22) - 2, t(18) - 8, field='#7d1a14', border='#c9963b', bw=8)
rug(t(13) + 8, t(12) - 18, t(19) - 4, t(13) + 18, field='#7d1a14', border='#c9963b', bw=8)
rug(t(23) + 4, t(12) - 18, t(29) - 8, t(13) + 18, field='#7d1a14', border='#c9963b', bw=8)
# Duyệt Thị: audience rug in front of the stage
rug(t(31) + 8, t(11) + 4, t(38) - 8, t(15) + 8, field='#6b1a3a', border='#d4a03c', bw=12, medallion=True)
# Nội Các: woven sedge mat (chiếu cói)
def chieu(x0, y0, x1, y1):
    global img
    m = rect_px(x0, y0, x1, y1)
    weave = ((np.floor(XX / 4) + np.floor(YY / 4)) % 2)
    stripe = ((YY - y0) % 40 < 6)
    col = mix(hexc('#c9b07a'), hexc('#d9c48e'), weave[..., None])
    col = np.where(stripe[..., None], mix(col, hexc('#a3342a'), 0.65), col)
    col = col * (0.9 + 0.15 * fbm(H, W, 6, 2, 71)[..., None])
    edge = soft_rect(x0, y0, x1, y1, 4)
    sh = soft_rect(x0 + 3, y0 + 4, x1 + 3, y1 + 4, 6)
    img *= (1 - 0.3 * sh * (1 - m))[..., None]
    img[m] = col[m]
    bd = m & ((XX - x0 < 4) | (x1 - XX < 4) | (YY - y0 < 4) | (y1 - YY < 4))
    img[bd] = hexc('#3a2614')


chieu(t(8) + 6, t(27) + 10, t(12) - 6, t(30) + 20)
# Khâm Thiên Giám: inlaid bronze star compass (la bàn sao) on the marble
def compass(cx, cy, R):
    global img
    sub = (slice(int(cy - R - 4), int(cy + R + 4)), slice(int(cx - R - 4), int(cx + R + 4)))
    xs, ys = XX[sub] - cx, YY[sub] - cy
    r = np.sqrt(xs ** 2 + ys ** 2)
    ang = np.arctan2(ys, xs)
    col = img[sub].copy()
    brass = hexc('#b8893a') * (0.85 + 0.3 * fbm(xs.shape[0], xs.shape[1], 4, 2, 81))[..., None]
    navy = hexc('#1d2c44')
    disk = smooth(R, R - 1.5, r)
    col = mix(col, navy * (0.9 + 0.2 * (1 - r / R))[..., None], disk[..., None])
    for rr, wdt in ((R - 3, 2.2), (R * 0.72, 1.4), (R * 0.42, 1.2)):
        col = mix(col, brass, (smooth(wdt, 0, np.abs(r - rr)))[..., None])
    # 8-point star
    star = (np.abs(np.cos(ang * 4)) ** 8) * R * 0.95 + R * 0.12
    col = mix(col, brass * 1.1, (smooth(1.5, -1.5, r - star) * (r < R * 0.95))[..., None] * 0.9)
    # tick marks (24 tiết khí)
    tick = (np.abs(((ang / (2 * math.pi) * 24) % 1) - 0.5) > 0.42) & (r > R * 0.78) & (r < R - 5)
    col = np.where(tick[..., None], brass, col)
    # star dots
    rs = np.random.default_rng(5)
    for _ in range(40):
        a0 = rs.random() * 2 * math.pi
        r0 = rs.random() ** 0.5 * R * 0.7
        px, py = math.cos(a0) * r0, math.sin(a0) * r0
        dd = np.sqrt((xs - px) ** 2 + (ys - py) ** 2)
        col = mix(col, hexc('#ffe9a8'), smooth(1.6, 0.4, dd)[..., None])
    # rim shadow
    col = col * (1 - 0.3 * (smooth(R + 4, R, r) * (r > R))[..., None])
    img[sub] = col


compass(t(21), t(20.6), 62)
# Thế Miếu: processional stone path (đường thần đạo)
def path_slabs(x0, y0, x1, y1):
    global img
    m = rect_px(x0, y0, x1, y1)
    fy = (YY - y0) % 30
    fx = (XX - x0) % 48
    col = mix(hexc('#b8b2a2'), hexc('#cfc8b6'), hashf(np.floor((XX - x0) / 48), np.floor((YY - y0) / 30))[..., None])
    col = col * (0.9 + 0.18 * fbm(H, W, 4, 3, 91)[..., None])
    col = col * (1 - 0.35 * ((fy < 1.5) | (fx < 1.5))[..., None])
    img[m] = col[m]


path_slabs(t(28) + 8, t(26), t(32) - 8, t(31))
# Sân Ngọ Môn: ceremonial walkway of pale stone toward the altar
path_slabs(t(19) + 8, t(5) + 6, t(23) - 8, t(7))
# Duyệt Thị Đường stage (sân khấu) — darker lacquered boards with a red apron edge
def stage(x0, y0, x1, y1):
    global img
    m = rect_px(x0, y0, x1, y1)
    planks = floor_planks(False, 12, '#6a3a1e', '#3f1f0c', 27, 0.25)
    img[m] = planks[m]
    apron = rect_px(x0, y1 - 10, x1, y1)
    yy = (YY - (y1 - 10)) / 10
    col = hexc('#8f1c14') * (1 - 0.45 * yy)[..., None]
    fr = (XX.astype(int) % 6 < 3) & (YY > y1 - 4)
    col = np.where(fr[..., None], hexc('#d6a23a') * 0.9, col)
    img[apron] = col[apron]
    below = rect_px(x0, y1, x1, y1 + 14)
    img[below] *= (1 - 0.45 * (1 - (YY[below] - y1) / 14))[..., None]


stage(t(29), t(8), t(40), t(10))
print('rugs')

# ====================================================================== walls
VOID = A < 0
face_cells = np.zeros_like(VOID)
face_cells[:-1] = VOID[:-1] & (A[1:] >= 0)
EXT = 26  # px a wall face rises into the void cell above

face_px = np.zeros((H, W), bool)
face_style = np.full((H, W), -1, np.int16)
runs = []  # (row, x0, x1, area)
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

# --- dark roofs (ngói âm dương) over unreachable mass
def roof_tiles():
    rowh = 14
    r = np.floor(YY / rowh)
    fy = (YY % rowh) / rowh
    off = (r % 2) * 7
    fx = ((XX + off) % 14) / 14
    prof = np.clip(np.cos((fx - 0.5) * math.pi), 0, 1) ** 0.8
    col = hexc('#5a3624') * (0.45 + 0.55 * prof)[..., None]
    col = col * (0.75 + 0.35 * fy)[..., None]
    col = col * (1 - 0.5 * (fy > 0.86))[..., None]
    col = col * (0.85 + 0.3 * fbm(H, W, 20, 3, 101))[..., None]
    lich = smooth(0.6, 0.8, fbm(H, W, 30, 4, 102))
    col = mix(col, hexc('#3e4a2c'), lich[..., None] * 0.5)
    return col


roof = roof_tiles()
dark = np.clip((dist - CAPW) / 70, 0, 1)
roof = roof * (0.78 - 0.45 * dark)[..., None]
img[mass] = roof[mass]

# --- glazed yellow ridge caps (ngói lưu ly) on every wall top
gy_, gx_ = np.gradient(dist)
along = np.where(np.abs(gy_) > np.abs(gx_), XX, YY)
seg = (along % 11) / 11
prof = np.sin(np.clip(dist / CAPW, 0, 1) * math.pi)
capcol = mix(hexc('#8a5c18'), hexc('#d9ae4c'), (0.35 + 0.65 * prof)[..., None])
capcol = capcol * (1 - 0.25 * (seg > 0.88))[..., None]
capcol = capcol + (smooth(0.8, 1.0, prof) * 0.12)[..., None] * hexc('#fff3c2')
outer = smooth(CAPW - 2.5, CAPW, dist)
capcol = mix(capcol, hexc('#3a2410'), outer[..., None] * 0.85)
inner = smooth(1.6, 0.0, dist)
capcol = mix(capcol, hexc('#5a3a14'), inner[..., None] * 0.7)
capcol = capcol * (0.9 + 0.15 * fbm(H, W, 6, 2, 103))[..., None]
img[cap] = capcol[cap]


# --- wall faces, per room style
def frame(h, w):
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    return yy, xx


def style_lacquer(h, w, x0):
    yy, xx = frame(h, w)
    gx = (xx + x0) % 48
    col = hexc('#8e1a12') * (0.75 + 0.35 * (1 - yy / h))[..., None]
    col = col * (0.92 + 0.12 * fbm(h, w, 12, 3, 111)[..., None])
    stile = (gx < 5) | (gx > 43)
    col = np.where(stile[..., None], hexc('#4a120c') * (0.8 + 0.3 * (gx < 2))[..., None], col)
    inset = (np.abs(gx - 24) < 15) & (yy > 12) & (yy < h - 12)
    edge = inset & ((np.abs(np.abs(gx - 24) - 15) < 1.6) | (np.abs(yy - 12) < 1.6) | (np.abs(yy - (h - 12)) < 1.6))
    col = np.where(inset[..., None], col * 0.82, col)
    # gold cloud scroll inside each panel
    cy = (12 + h - 12) / 2
    r = np.sqrt(((gx - 24) * 1.0) ** 2 + ((yy - cy) * 1.4) ** 2)
    swirl = np.abs(np.sin(r * 0.55 - np.arctan2(yy - cy, gx - 24) * 1.0)) < 0.18
    col = np.where((inset & swirl & (r < 12))[..., None], mix(col, hexc('#d9a63e'), 0.7), col)
    col = np.where(edge[..., None], hexc('#e3b24c'), col)
    return col


def style_lattice(h, w, x0):
    yy, xx = frame(h, w)
    gx = (xx + x0) % 48
    wood = hexc('#4a2a14') * (0.8 + 0.3 * fbm(h, w, 8, 3, 121)[..., None])
    paper = mix(hexc('#f5d58c'), hexc('#ffeec2'), (1 - yy / h)[..., None]) * (0.92 + 0.1 * fbm(h, w, 4, 2, 122)[..., None])
    win = (gx > 6) & (gx < 42) & (yy > 10) & (yy < h * 0.62)
    bars = ((gx.astype(int) - 6) % 8 < 2) | ((yy.astype(int) - 10) % 8 < 2)
    col = np.where((win & ~bars)[..., None], paper, wood)
    # lower wooden panel with recessed frame
    lower = (yy >= h * 0.62 + 3) & (yy < h - 7) & (gx > 6) & (gx < 42)
    col = np.where(lower[..., None], wood * 0.82, col)
    col = col * (0.85 + 0.25 * (1 - yy / h))[..., None]
    return col


def style_curtain(h, w, x0):
    yy, xx = frame(h, w)
    X = xx + x0
    folds = np.sin(X * (2 * math.pi / 17) + np.sin(X * 0.05) * 1.5) * 0.5 + 0.5
    col = hexc('#7a1018') * (0.5 + 0.7 * folds)[..., None]
    col = col + (folds ** 6 * 0.12)[..., None]
    val = yy < 13
    scal = (yy < 13 + 4 * np.abs(np.sin(X * math.pi / 24)))
    col = np.where(scal[..., None], mix(hexc('#c99a2e'), hexc('#f0cd6a'), (1 - yy / 16)[..., None]), col)
    col = np.where((val & (yy > 10))[..., None], hexc('#7a5212'), col)
    fringe = (yy > h - 10) & (yy < h - 6) | ((yy >= h - 10) & (yy < h - 3) & (X.astype(int) % 3 == 0))
    col = np.where(fringe[..., None], hexc('#e2b247'), col)
    return col


def style_brick(h, w, x0):
    yy, xx = frame(h, w)
    X = xx + x0
    plaster = hexc('#c99a52') * (0.85 + 0.2 * fbm(h, w, 14, 4, 131)[..., None])
    stain = smooth(0.55, 0.8, fbm(h, w, 20, 4, 132))
    plaster = mix(plaster, hexc('#7a6038'), (stain * (yy / h))[..., None] * 0.5)
    lowtop = h * 0.5
    row = np.floor((yy - lowtop) / 8)
    bx = (X + (row % 2) * 10) % 20
    bricks = mix(hexc('#7d3520'), hexc('#a4492a'), hashf(np.floor((X + (row % 2) * 10) / 20), row)[..., None])
    mortar = ((yy - lowtop) % 8 < 1.5) | (bx < 1.5)
    bricks = np.where(mortar[..., None], hexc('#b9a585') * 0.8, bricks)
    col = np.where((yy > lowtop)[..., None], bricks, plaster)
    # moulding line
    col = np.where((np.abs(yy - lowtop) < 2)[..., None], hexc('#e5c98a'), col)
    # round lattice windows every 4 tiles (cửa sổ tròn)
    gx = X % 192
    r = np.sqrt((gx - 96) ** 2 + (yy - lowtop * 0.55) ** 2)
    win = r < 11
    grid = ((gx.astype(int) % 5) < 1) | ((yy.astype(int) % 5) < 1)
    col = np.where(win[..., None], np.where(grid[..., None], hexc('#3a2410'), hexc('#ffd98a')), col)
    col = np.where((np.abs(r - 12) < 1.6)[..., None], hexc('#5a3a1a'), col)
    return col * (0.85 + 0.2 * (1 - yy / h))[..., None]


def style_stone(h, w, x0):
    yy, xx = frame(h, w)
    X = xx + x0
    row = np.floor(yy / 15)
    bx = (X + (row % 2) * 17) % 34
    col = mix(hexc('#6d6c64'), hexc('#9d998c'), hashf(np.floor((X + (row % 2) * 17) / 34), row)[..., None])
    col = col * (0.85 + 0.3 * fbm(h, w, 5, 3, 141)[..., None])
    j = (yy % 15 < 1.6) | (bx < 1.6)
    col = np.where(j[..., None], hexc('#3a3a32'), col)
    moss = smooth(0.55, 0.75, fbm(h, w, 12, 4, 142)) * (yy / h)
    col = mix(col, hexc('#4c6a2c'), moss[..., None] * 0.7)
    return col * (0.8 + 0.25 * (1 - yy / h))[..., None]


def style_starchart(h, w, x0):
    yy, xx = frame(h, w)
    X = xx + x0
    gx = X % 96
    col = hexc('#16243a') * (0.8 + 0.3 * (1 - yy / h))[..., None] * (0.9 + 0.15 * fbm(h, w, 10, 3, 151)[..., None])
    stile = (gx < 6) | ((X % 48) < 3)
    rs = np.random.default_rng(int(x0) + 3)
    for _ in range(int(w / 6)):
        px, py = rs.random() * w, 10 + rs.random() * (h - 22)
        d = np.sqrt((xx - px) ** 2 + (yy - py) ** 2)
        col = mix(col, hexc('#ffe7a0'), smooth(1.4, 0.2, d)[..., None])
    cx = 48 + 0
    r = np.sqrt((gx - cx) ** 2 + (yy - h * 0.45) ** 2)
    col = mix(col, hexc('#c9a24a'), (smooth(1.2, 0, np.abs(r - 18)) + smooth(1.0, 0, np.abs(r - 11)) * 0.7)[..., None])
    col = np.where(stile[..., None], hexc('#3a2414') * (0.9 + 0.2 * fbm(h, w, 6, 2, 152)[..., None]), col)
    return col


def style_cabinet(h, w, x0):
    yy, xx = frame(h, w)
    X = xx + x0
    wood = hexc('#4a2a12') * (0.8 + 0.3 * fbm(h, w, 8, 3, 161)[..., None])
    cw, chh = 16, 14
    cx, cy = np.floor(X / cw), np.floor((yy - 6) / chh)
    fx, fy = X % cw, (yy - 6) % chh
    cell = (fx > 2) & (fy > 2) & (yy > 6) & (yy < h - 8)
    kind = hashf(cx, cy)
    inner = hexc('#1a0e06') * np.ones_like(wood)
    # scroll ends: two circles per cell
    for ox in (5.5, 11):
        d = np.sqrt((fx - ox) ** 2 + (fy - 8.5) ** 2)
        sc = (d < 3.2) & (kind > 0.25)
        inner = np.where(sc[..., None], mix(hexc('#e9dcb8'), hexc('#c9b88e'), (d / 3.2)[..., None]), inner)
        tie = (d < 1.2) & (kind > 0.6)
        inner = np.where(tie[..., None], hexc('#b02a1c'), inner)
    # book bundles in some cells (yellow imperial covers)
    books = (kind < 0.25) & (fx > 3) & (fy > 4)
    inner = np.where(books[..., None], mix(hexc('#d9a33a'), hexc('#8a5a14'), ((fx % 3) < 1)[..., None] * 0.6), inner)
    col = np.where(cell[..., None], inner, wood)
    return col * (0.85 + 0.2 * (1 - yy / h))[..., None]


STYLE = {
    'courtyard_checkin': style_brick,
    'exhibition': style_lacquer,
    'corridor': style_lattice,
    'coordination': style_curtain,
    'editing': style_starchart,
    'archive': style_cabinet,
    'artifact_storage': style_stone,
}

lamps = []  # wall lantern positions (for light pools)
for gy, x0, x1, ar, ext in runs:
    name = ORDER[ar]
    top = gy * T - ext
    bot = (gy + 1) * T
    h, w = bot - top, (x1 - x0) * T
    body = STYLE[name](h, w, x0 * T)
    yy, xx = frame(h, w)
    # top beam + gold fillet, stone baseboard
    beam = yy < 7
    body = np.where(beam[..., None], hexc('#3a1f0e') * (0.9 + 0.3 * (yy < 2))[..., None], body)
    body = np.where((np.abs(yy - 7.5) < 1.2)[..., None], hexc('#d9a63e'), body)
    base = yy > h - 6
    body = np.where(base[..., None], hexc('#5b544a') * (0.8 + 0.2 * fbm(h, w, 3, 2, 171))[..., None], body)
    body = np.where((np.abs(yy - (h - 6)) < 1)[..., None], hexc('#2a241e'), body)
    # end shading where the run meets side walls
    endl = smooth(6, 0, xx) * (x0 > 0 and VOID[gy + 1, x0 - 1] if gy + 1 < GH else 0)
    endr = smooth(6, 0, w - 1 - xx) * (x1 < GW and VOID[gy + 1, x1] if gy + 1 < GH else 0)
    body = body * (1 - 0.45 * np.maximum(endl, endr))[..., None]
    # ambient occlusion along the bottom
    body = body * (1 - 0.25 * smooth(h - 14, h, yy))[..., None]
    img[top:bot, x0 * T:x1 * T] = body
    # hanging lanterns on corridor / courtyard faces (every 4 tiles)
    if name in ('corridor', 'courtyard_checkin', 'exhibition', 'coordination') and (x1 - x0) >= 2:
        for gx in range(x0, x1):
            if (gx * 7 + gy * 3) % 4 == 1:
                lamps.append((gx * T + 24, top + 28))

# door sills + lacquer posts between areas
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
            for yy_ in (gy, gy + 1):
                pass
        if gy + 1 < GH and A[gy + 1, gx] >= 0 and A[gy + 1, gx] != a:
            y = (gy + 1) * T
            sill[y - 5:y + 5, gx * T:(gx + 1) * T] = True
# sill shading: wooden beam with highlight
sl_n = fbm(H, W, 6, 2, 181)
sill_col = hexc('#5a3216') * (0.8 + 0.4 * sl_n)[..., None]
img[sill] = sill_col[sill]
lab, nlab = ndimage.label(sill)
for i, sl in enumerate(ndimage.find_objects(lab)):
    ys, xs = sl
    if (xs.stop - xs.start) > (ys.stop - ys.start):  # horizontal sill -> posts at both ends
        for x in (xs.start, xs.stop):
            posts.append((x, (ys.start + ys.stop) / 2))
    else:
        for y in (ys.start, ys.stop):
            posts.append(((xs.start + xs.stop) / 2, y))
    # edge highlight / shadow
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

# props: contact light pools for lanterns
lanterns = [(p['x'], p['y'] - 40) for p in LAY['props'] if p['key'] in ('hue-prop-den-cung-dinh', 'hue-decor-den-da')]
warm = np.zeros((H, W), np.float32)
for (lx, ly) in lanterns:
    warm += np.exp(-(((XX - lx) ** 2 + (YY - ly - 30) ** 2) / (2 * 95.0 ** 2)))
for (lx, ly) in lamps:
    warm += 0.55 * np.exp(-(((XX - lx) ** 2 + ((YY - ly - 60) * 1.4) ** 2) / (2 * 70.0 ** 2)))
warm = np.clip(warm, 0, 1.4)

# per-room soft vignette (rooms brighter in the middle)
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

img = np.where(FLOOR[..., None], img * (light * vig)[..., None], img)
img = img + warm[..., None] * hexc('#ffb35a') * 0.22 * FLOOR[..., None]

# wall lanterns painted on faces (red silk lantern + glow)
def lantern_on_wall(cx, cy):
    global img
    sub = (slice(int(cy - 30), int(cy + 40)), slice(int(cx - 30), int(cx + 30)))
    xs, ys = XX[sub] - cx, YY[sub] - cy
    g = np.exp(-((xs ** 2 + ys ** 2) / (2 * 16.0 ** 2)))
    img[sub] = img[sub] + g[..., None] * hexc('#ff9a40') * 0.35
    body = ((xs / 8.5) ** 2 + (ys / 10.5) ** 2) < 1
    shade = np.clip(0.55 + 0.6 * (1 - ((xs + 3) / 9) ** 2), 0.3, 1.25)
    col = hexc('#d2361f') * shade[..., None]
    ribs = (np.abs(np.sin(xs * 0.75)) < 0.18)
    col = np.where(ribs[..., None], col * 0.75, col)
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

# lacquer door posts seen from above at every doorway end
for (px, py) in posts:
    sub = (slice(int(py - 12), int(py + 12)), slice(int(px - 12), int(px + 12)))
    xs, ys = XX[sub] - px, YY[sub] - py
    r = np.sqrt(xs ** 2 + ys ** 2)
    sh = np.exp(-(((xs - 4) ** 2 + (ys - 5) ** 2) / 40))
    img[sub] *= (1 - 0.4 * sh)[..., None]
    lit = np.clip(0.6 + 0.5 * (-(xs + ys) / 12), 0.3, 1.3)
    col = hexc('#a8231a') * lit[..., None]
    col = np.where((np.abs(r - 6.5) < 1.2)[..., None], hexc('#e0b048'), col)
    img[sub] = np.where((r < 8)[..., None], col, img[sub])

# subtle night grade + film grain so nothing reads as flat vector
img = img * np.array([1.0, 0.97, 0.92], np.float32)
img = img + (value_noise(H, W, 1.0, 191)[..., None] - 0.5) * 0.025
img = np.clip(img, 0, 1)

out = Image.fromarray((img * 255 + 0.5).astype(np.uint8), 'RGB')
src = os.path.join(ROOT, 'assets/maps/co-do-hue/tileset/hue-floor-bake.png')
pub = os.path.join(ROOT, 'apps/web/public/assets/maps/co-do-hue/tileset/hue-floor-bake.webp')
os.makedirs(os.path.dirname(src), exist_ok=True)
os.makedirs(os.path.dirname(pub), exist_ok=True)
out.save(src, optimize=True)
out.save(pub, 'WEBP', quality=86, method=6)
json.dump({'lamps': lamps, 'posts': posts}, open(os.path.join(os.path.dirname(__file__), '_bake.json'), 'w'))
print('wrote', src, os.path.getsize(pub) // 1024, 'KB webp')
