"""
Painted props + room decor for the Thăng Long map (Hồ Gươm, đêm Giao thừa).
  python3 tools/paint/tl_props.py [key ...]
Writes assets/maps/thang-long/props/<key>.png (source) and packs
apps/web/public/assets/maps/thang-long/atlas/tl-decor-0.{webp,json} (Phaser hash atlas).
Same pipeline as props.py (4x supersampled, bottom-centre anchor, no text baked in) — reuses its P wrapper + materials.
"""
from __future__ import annotations

import math
import os
import sys

import numpy as np
from PIL import Image

sys.path.insert(0, os.path.dirname(__file__))
import lib  # noqa: E402
import props as PR  # noqa: E402
from lib import M, Mat, hexc, tex_noise, tex_stone, tex_wood  # noqa: E402
from props import (BARK, BRASS, IRON, BRONZE, BROWNGLAZE, CREAM, DWOOD, GOLD, GSTONE, INK, LACQ, LEAF, LEAF2, PAPER, PORC, RSILK,  # noqa: E402
                   SS, STONE, WOOD, YSILK, P, bands, blue_white)
from tl_common import pack_atlas, src  # noqa: E402

REG = {}


def sprite(key, w, h):
    def deco(fn):
        REG[key] = (w, h, fn)
        return fn
    return deco


# ====================================================================== materials
PEACH = Mat('#f4a6bd', shine=0.2, rough=10, amb=0.66, diff=0.5, tex=tex_noise(0.08, 2, 301))
PEACH2 = Mat('#e0628a', shine=0.2, rough=10, amb=0.6, diff=0.55, tex=tex_noise(0.08, 2, 302))
KUMQ = Mat('#f39a1c', shine=0.65, rough=34, amb=0.5, diff=0.7, spec_col='#fff2c0')
BAMBOO = Mat('#b49a4e', shine=0.3, rough=18, amb=0.45, diff=0.7, tex=tex_wood(2.0, seed=303, dark='#6a5424'))
BAMBOO_D = Mat('#7d6a32', shine=0.25, rough=16, amb=0.42, diff=0.7, tex=tex_wood(2.0, seed=304, dark='#3a2e12'))
LIME = Mat('#eceee0', shine=0.05, rough=6, amb=0.62, diff=0.5, tex=tex_noise(0.08, 2, 305))
LIMEWALL = Mat('#cdc6ae', shine=0.05, rough=6, amb=0.5, diff=0.62, tex=tex_stone(306, 4, 0.22))
ROOF = Mat('#3b302c', shine=0.25, rough=12, amb=0.4, diff=0.7, tex=tex_noise(0.18, 2, 307))
REDP = Mat('#c9241b', shine=0.12, rough=8, amb=0.55, diff=0.55, tex=tex_noise(0.07, 3, 308))
DONG = Mat('#3e7d33', shine=0.4, rough=26, amb=0.42, diff=0.75, tex=tex_noise(0.12, 3, 309, '#5c9a3e'))
BANHCHUNG = Mat('#4b7a2e', shine=0.15, rough=10, amb=0.45, diff=0.7, tex=tex_noise(0.1, 3, 310))
BANANA = Mat('#e8c53c', shine=0.3, rough=16, amb=0.52, diff=0.65, tex=tex_noise(0.08, 4, 311))
POMELO = Mat('#b9c54c', shine=0.4, rough=22, amb=0.48, diff=0.7, tex=tex_noise(0.1, 2, 312))
PERSIM = Mat('#e0572a', shine=0.55, rough=30, amb=0.48, diff=0.72)
CUSTARD = Mat('#93b35c', shine=0.2, rough=10, amb=0.46, diff=0.7, tex=tex_noise(0.35, 2, 313))
CLAY = Mat('#a8603a', shine=0.12, rough=8, amb=0.45, diff=0.66, tex=tex_noise(0.12, 3, 314))
RICE = Mat('#f2eee0', shine=0.1, rough=6, amb=0.62, diff=0.5, tex=tex_noise(0.25, 1, 315))
MUNG = Mat('#e8b93a', shine=0.1, rough=6, amb=0.58, diff=0.55, tex=tex_noise(0.25, 1, 316))
PORK = Mat('#e8a890', shine=0.3, rough=14, amb=0.55, diff=0.6, tex=tex_noise(0.1, 2, 317))
WATER = Mat('#1c4a52', shine=0.8, rough=60, amb=0.35, diff=0.6, tex=tex_noise(0.12, 6, 318), spec_col='#bfe8ff')
PUPPET = Mat('#e9b24a', shine=0.6, rough=34, amb=0.48, diff=0.7)
SKIN = Mat('#f0caa0', shine=0.5, rough=30, amb=0.55, diff=0.6)
TERRA = Mat('#9a4a2a', shine=0.15, rough=10, amb=0.45, diff=0.66, tex=tex_noise(0.12, 2, 319))
LACQ_D = M['lacquer_dark']


# ====================================================================== helpers
def lantern(p: P, cx, cy, s=1.0, col='#d4321c', tassel=True):
    """Red silk lantern centred on (cx, cy); body ~46*s tall."""
    mat = Mat(col, shine=0.25, rough=10, amb=0.72, diff=0.5, tex=tex_noise(0.08, 3, 43))
    p.lathe(cx, cy + 22 * s, lambda t: (3 + 12 * math.sin(math.pi * min(1, max(0, t))) ** 0.8) * s, mat, 44 * s,
            deco=lambda u, t: (hexc('#8a1810'), (np.abs(np.sin(u * 18)) < 0.12) * 0.7))
    p.lathe(cx, cy - 18 * s, lambda t: 6 * s, GOLD, 4 * s)
    p.lathe(cx, cy + 26 * s, lambda t: 6 * s, GOLD, 4 * s)
    p.glow(cx, cy + 2 * s, 15 * s, '#ffd27a', 0.55)
    if tassel:
        p.line([(cx, cy + 26 * s), (cx, cy + 40 * s)], 2 * s, '#e3a33a')
        p.blob(cx, cy + 41 * s, 2.2 * s, 3 * s, GOLD)


def arc_tube(p: P, cx, cy, r, a0, a1, rad, mat, n=8, ry=1.0):
    pts = [(cx + math.cos(a0 + (a1 - a0) * i / n) * r, cy + math.sin(a0 + (a1 - a0) * i / n) * r * ry) for i in range(n + 1)]
    for i in range(n):
        f = i / n
        rr = rad * (0.55 + 0.45 * math.sin(math.pi * (f + 0.5 / n)))
        p.tube(pts[i], pts[i + 1], rr, mat)


def blossom_branch(p: P, pts, r0, seed, density=1.0, mat=None):
    """Dark peach branch through pts with pink blossoms/buds."""
    rs = np.random.default_rng(seed)
    for i in range(len(pts) - 1):
        f0, f1 = i / (len(pts) - 1), (i + 1) / (len(pts) - 1)
        p.tube(pts[i], pts[i + 1], r0 * (1 - 0.7 * f0), BARK if mat is None else mat, r1=r0 * (1 - 0.7 * f1))
    for i in range(len(pts) - 1):
        (ax, ay), (bx, by) = pts[i], pts[i + 1]
        for _ in range(int(5 * density)):
            t = rs.random()
            x, y = ax + (bx - ax) * t + rs.normal(0, 2.2), ay + (by - ay) * t + rs.normal(0, 2.2)
            big = rs.random() < 0.65
            r = (2.6 if big else 1.6) * (0.8 + 0.4 * rs.random())
            for k in range(5 if big else 1):
                a = k / 5 * 2 * math.pi + rs.random()
                d = r * 0.65 if big else 0
                p.blob(x + math.cos(a) * d, y + math.sin(a) * d * 0.85, r * 0.62, r * 0.55, PEACH if rs.random() < 0.7 else PEACH2)
            if big:
                p.ell(x, y, 0.7, 0.7, '#9a1a3a')


def kumquat_bush(p: P, cx, cy, r, seed):
    rs = np.random.default_rng(seed)
    for _ in range(int(r * 5)):
        a, d = rs.random() * 2 * math.pi, rs.random() ** 0.6 * r
        p.blob(cx + math.cos(a) * d, cy + math.sin(a) * d * 0.85, 3.4, 2.6, LEAF if rs.random() < 0.55 else LEAF2)
    for _ in range(int(r * 1.3)):
        a, d = rs.random() * 2 * math.pi, rs.random() ** 0.8 * r * 0.9
        p.blob(cx + math.cos(a) * d, cy + math.sin(a) * d * 0.85, 2.3, 2.3, KUMQ)
    for _ in range(3):  # red lucky tags
        a, d = rs.random() * 2 * math.pi, rs.random() * r * 0.7
        x, y = cx + math.cos(a) * d, cy + math.sin(a) * d * 0.8
        p.line([(x, y - 3), (x, y)], 0.5, '#e0b048')
        p.rect(x - 1.6, y, x + 1.6, y + 5, '#d02a1c')


def abstract_strokes(p: P, x0, y0, x1, y1, seed, col='#f0c860', vertical=True, n=5, w=1.6):
    """Gilded brush-stroke clusters that read as calligraphy without being text."""
    rs = np.random.default_rng(seed)
    for g in range(n):
        if vertical:
            gx, gy = (x0 + x1) / 2, y0 + (g + 0.5) * (y1 - y0) / n
            sx, sy = (x1 - x0) * 0.35, (y1 - y0) / n * 0.35
        else:
            gx, gy = x0 + (g + 0.5) * (x1 - x0) / n, (y0 + y1) / 2
            sx, sy = (x1 - x0) / n * 0.35, (y1 - y0) * 0.35
        for _ in range(4):
            ax, ay = gx + rs.uniform(-sx, sx) * 0.7, gy + rs.uniform(-sy, sy) * 0.7
            if rs.random() < 0.5:
                pts = [(ax - sx * rs.uniform(0.3, 0.8), ay), (ax + sx * rs.uniform(0.3, 0.8), ay + rs.uniform(-0.6, 0.6))]
            else:
                pts = [(ax, ay - sy * rs.uniform(0.3, 0.9)), (ax + rs.uniform(-0.8, 0.8), ay + sy * rs.uniform(0.3, 0.9))]
            p.line(pts, w, col)


def scroll(p: P, x, y, w, h, seed, rod=True):
    """Vertical red câu đối scroll with gold border + abstract strokes."""
    p.shadow(x + w / 2 + 2, y + h, w * 0.4, 1.5, 0.25)
    p.poly([(x, y), (x + w, y), (x + w, y + h), (x, y + h)], REDP, n=(-0.15, 0.1, 1), grad=0.15)
    p.line([(x + 1.2, y + 2), (x + 1.2, y + h - 2)], 0.6, '#e8b84c')
    p.line([(x + w - 1.2, y + 2), (x + w - 1.2, y + h - 2)], 0.6, '#e8b84c')
    abstract_strokes(p, x + 1, y + 3, x + w - 1, y + h - 3, seed, '#2a0c08' if w < 12 else '#1c0806', True, max(3, int(h / 14)), max(0.8, w * 0.1))
    if rod:
        p.tube((x - 2, y), (x + w + 2, y), 1.4, DWOOD)
        p.tube((x - 1.5, y + h), (x + w + 1.5, y + h), 1.4, DWOOD)


def roof(p: P, cx, ye, hw, hgt, mat=ROOF, curl=8, ridge=True):
    """Curved-eave Vietnamese roof: eave at ye, half-width hw, height hgt, corners curl upwards."""
    n = 18
    eave = [(cx - hw + 2 * hw * i / n, ye + 3 * math.sin(math.pi * i / n) - curl * (abs(i / n - 0.5) * 2) ** 4) for i in range(n + 1)]
    top = [(cx + hw * 0.55, ye - hgt), (cx - hw * 0.55, ye - hgt)]
    pts = eave + top
    p.poly(pts, mat, n=(-0.15, 0.7, 0.7), grad=-0.25)
    # tile channels
    for i in range(1, 14):
        f = i / 14
        xb = cx - hw + 2 * hw * f
        xt = cx - hw * 0.55 + hw * 1.1 * f
        yb = ye + 3 * math.sin(math.pi * f) - curl * (abs(f - 0.5) * 2) ** 4
        p.line([(xt, ye - hgt + 1), (xb, yb - 1)], 0.7, '#1a1412', 0.6)
    p.line([(x, y + 0.5) for x, y in eave], 1.4, '#6a5848', 0.9)
    if ridge:
        p.tube((cx - hw * 0.6, ye - hgt), (cx + hw * 0.6, ye - hgt), 1.8, Mat('#4a3c34', shine=0.3, rough=14, amb=0.45, diff=0.7))
        for sx in (-1, 1):
            x = cx + sx * hw * 0.6
            p.tube((x, ye - hgt), (x + sx * 4, ye - hgt - 5), 1.4, Mat('#4a3c34', shine=0.3, rough=14, amb=0.45, diff=0.7), r1=0.6)
    for sx in (-1, 1):
        p.blob(cx + sx * hw, ye - curl - 1, 1.6, 1.6, GOLD)


def fruit_tray(p: P, cx, cy, s=1.0, seed=1):
    """Mâm ngũ quả on a footed lacquer stand; cy = tray rim."""
    p.lathe(cx, cy + 14 * s, lambda t: (7 - 3 * math.sin(math.pi * t)) * s, LACQ, 10 * s)
    p.lathe(cx, cy + 4 * s, lambda t: (24 - 4 * (1 - t)) * s, LACQ, 4 * s, cap_mat=LACQ, deco=bands([(0.7, 1.0, '#e0b048')]))
    # bananas fanned behind
    for k in range(5):
        a0 = math.pi * (1.05 + 0.06 * k)
        arc_tube(p, cx + (-4 + 2 * k) * s, cy - 2 * s, 18 * s, a0, a0 + 1.0, 2.6 * s, BANANA, 7, 0.9)
    p.tube((cx - 18 * s, cy - 6 * s), (cx - 14 * s, cy - 2 * s), 2.6 * s, Mat('#6a7a2a', amb=0.45, diff=0.7))
    p.blob(cx + 2 * s, cy - 13 * s, 9.5 * s, 9 * s, POMELO)
    p.line([(cx + 2 * s, cy - 22 * s), (cx + 3 * s, cy - 25 * s)], 1 * s, '#3a4a1a')
    p.blob(cx + 5 * s, cy - 25 * s, 2.8 * s, 1.2 * s, LEAF)
    for k in range(5):  # buddha's hand fingers
        p.tube((cx + 12 * s, cy - 6 * s), (cx + (12 + 4 * math.cos(k)) * s + 4 * s, cy - (10 + 2 * k) * s), 1.6 * s, Mat('#e6c234', shine=0.45, rough=24, amb=0.5, diff=0.68))
    p.blob(cx - 11 * s, cy - 4 * s, 4.6 * s, 4.2 * s, CUSTARD)
    rs = np.random.default_rng(seed)
    for k in range(9):
        x = cx + (-18 + 36 * k / 8) * s + rs.uniform(-1, 1) * s
        y = cy - (1.5 + 2.5 * math.sin(math.pi * k / 8)) * s
        p.blob(x, y, 3 * s, 2.8 * s, KUMQ if k % 3 else PERSIM)
    p.blob(cx - 3 * s, cy - 6 * s, 3.4 * s, 3.2 * s, Mat('#cc2a2a', shine=0.6, rough=30, amb=0.5, diff=0.7))


def banh_chung(p: P, cx, cy, s=1.0):
    """Square bánh chưng parcel seen in 3/4, (cx, cy) = bottom centre."""
    p.box(cx - 9 * s, cy - 15 * s, 18 * s, 7 * s, 8 * s, BANHCHUNG, top=Mat('#5d8f38', shine=0.25, rough=12, amb=0.5, diff=0.66, tex=tex_noise(0.12, 2, 320)))
    for f in (0.33, 0.66):
        x = cx - 9 * s + 18 * s * f
        p.line([(x - 1 * s, cy - 15 * s), (x + 0.5 * s, cy - 8 * s), (x + 0.5 * s, cy)], 0.7 * s, '#e8dfa0')
        y = cy - 15 * s + 7 * s * f
        p.line([(cx - 9 * s, y), (cx + 9 * s, y)], 0.7 * s, '#e8dfa0')


def candle(p: P, x, yb, s=1.0):
    p.lathe(x, yb, lambda t: (4 - 2.5 * t) * s if t < 0.85 else 3 * s, BRASS, 18 * s)
    p.lathe(x, yb - 18 * s, lambda t: 1.6 * s, RSILK, 8 * s)
    p.ell(x, yb - 29 * s, 1.3 * s, 2.6 * s, '#ffd27a')
    p.glow(x, yb - 29 * s, 8 * s, '#ffb04a', 0.5)


def censer(p: P, cx, yb, s=1.0, smoke=True, seed=5):
    for x0, x1 in ((-12, -10), (12, 10), (0, 0)):
        p.tube((cx + x1 * s, yb - 8 * s), (cx + x0 * s, yb), 2.2 * s, M['bronze_dark'], r1=1.6 * s)
    p.lathe(cx, yb - 4 * s, lambda t: (12 + 5 * math.sin(math.pi * min(1, t * 1.1))) * s, BRONZE, 16 * s, top_open=True, deco=bands([(0.75, 0.82, '#6a4a22')]))
    for k in range(3):
        x = cx + (-4 + 4 * k) * s
        p.line([(x, yb - 22 * s), (x + (k - 1) * 0.6, yb - 34 * s)], 0.7 * s, '#c84a2a')
        p.ell(x + (k - 1) * 0.6, yb - 34 * s, 0.8 * s, 0.8 * s, '#ff9a3a')
    if smoke:
        p.smoke(cx, yb - 34 * s, 36 * s, seed, 0.28)


def neu(p: P, cx, base, top, s=1.0, seed=1):
    """Cây nêu: bamboo pole with leaf tuft, khánh chime, red cloth, small lantern."""
    lean = 3 * s
    p.tube((cx, base), (cx + lean, top), 2.6 * s, BAMBOO, r1=1.5 * s)
    for k in range(1, 9):  # nodes
        f = k / 9
        y = base + (top - base) * f
        x = cx + lean * f
        p.line([(x - 2.4 * s * (1 - 0.4 * f), y), (x + 2.4 * s * (1 - 0.4 * f), y)], 0.7 * s, '#5a4818')
    tx, ty = cx + lean, top
    rs = np.random.default_rng(seed)
    for _ in range(int(26 * s)):  # leafy bamboo tuft
        a = rs.uniform(-math.pi, 0.15)
        d = rs.uniform(4, 16) * s
        p.tube((tx, ty), (tx + math.cos(a) * d, ty + math.sin(a) * d * 0.8 + 4 * s), 1.4 * s, LEAF if rs.random() < 0.5 else LEAF2, r1=0.4 * s)
    # crossbar with hangings
    by = ty + 12 * s
    p.tube((tx - 12 * s, by), (tx + 12 * s, by - 1 * s), 1.0 * s, BAMBOO_D)
    for hx, kind in ((-11, 'khanh'), (-4, 'cloth'), (5, 'bell'), (11, 'cloth')):
        x = tx + hx * s
        p.line([(x, by), (x, by + 8 * s)], 0.5 * s, '#e0c890')
        if kind == 'khanh':
            p.poly([(x - 4 * s, by + 8 * s), (x + 4 * s, by + 8 * s), (x + 2 * s, by + 14 * s), (x - 2 * s, by + 14 * s)], TERRA)
        elif kind == 'bell':
            p.lathe(x, by + 13 * s, lambda t: (2.6 - 1.4 * t) * s, GOLD, 5 * s)
        else:
            p.poly([(x - 1.6 * s, by + 8 * s), (x + 1.6 * s, by + 8 * s), (x + 2.6 * s, by + 26 * s), (x - 0.4 * s, by + 24 * s)], RSILK, n=(0.2, 0.1, 1))
    # red streamer down the pole
    sx = cx + lean * 0.55
    sy = base + (top - base) * 0.55
    p.poly([(sx - 1.5 * s, sy), (sx + 2 * s, sy), (sx + 6 * s, sy + 22 * s), (sx + 3 * s, sy + 26 * s)], REDP, n=(0.3, 0.1, 1))
    lantern(p, cx + lean * 0.42 + 9 * s, base + (top - base) * 0.42 + 6 * s, 0.32 * s, tassel=False)
    p.line([(cx + lean * 0.42, base + (top - base) * 0.42 - 3 * s), (cx + lean * 0.42 + 9 * s, base + (top - base) * 0.42)], 0.5 * s, '#2a1a0a')


def lime_mark(p: P, cx, cy, rx, ry, op=0.85):
    """Vôi bột on the ground: ring + bow-and-arrow strokes (to ward off quỷ)."""
    p.ring(cx, cy, rx, ry, 0.9, LIME)
    p.line([(cx - rx * 0.55, cy + ry * 0.45), (cx + rx * 0.4, cy - ry * 0.6)], 1.2, '#eef0e2', op)
    for k in range(9):
        a = math.pi * (0.25 + 0.5 * k / 8)
        p.ell(cx + math.cos(a + 1.6) * rx * 0.5 - rx * 0.1, cy + math.sin(a + 1.6) * ry * 0.5, 1.1, 0.8, '#eef0e2', op)


def dongho_print(p: P, x, y, w, h, seed):
    """Small Đông Hồ print: điệp paper + blocky folk animal in red/yellow/green/black."""
    rs = np.random.default_rng(seed)
    p.rect(x - 1, y - 1, x + w + 1, y + h + 1, '#2a1a0e')
    p.paint(lib.rect_mask(p.L.w, p.L.h, x * SS, y * SS, (x + w) * SS, (y + h) * SS), '#f1e2b8')
    shimmer = (lib.value_noise(p.L.h, p.L.w, 1.5, seed) > 0.75) * lib.rect_mask(p.L.w, p.L.h, x * SS, y * SS, (x + w) * SS, (y + h) * SS)
    p.paint(shimmer, '#fff8e0', 0.6)
    cx, cy = x + w / 2, y + h * 0.56
    kind = seed % 3
    if kind == 0:  # pig
        p.ell(cx, cy, w * 0.34, h * 0.22, '#1c1410')
        p.ell(cx - w * 0.04, cy - h * 0.02, w * 0.24, h * 0.14, '#d8a03a')
        p.ell(cx - w * 0.08, cy, w * 0.08, h * 0.06, '#2e7a3a')
        for lx in (-0.2, 0.18):
            p.rect(cx + w * lx, cy + h * 0.15, cx + w * lx + w * 0.06, cy + h * 0.3, '#1c1410')
    elif kind == 1:  # rooster
        p.ell(cx, cy + h * 0.04, w * 0.26, h * 0.18, '#c8281c')
        p.ell(cx + w * 0.16, cy - h * 0.16, w * 0.1, h * 0.1, '#c8281c')
        p.poly([(cx - w * 0.2, cy), (cx - w * 0.42, cy - h * 0.3), (cx - w * 0.12, cy - h * 0.08)], Mat('#2e7a3a', amb=0.6, diff=0.4))
        p.ell(cx, cy + h * 0.04, w * 0.12, h * 0.08, '#e0b040')
        p.rect(cx - w * 0.04, cy + h * 0.2, cx, cy + h * 0.32, '#1c1410')
    else:  # carp
        p.ell(cx, cy, w * 0.32, h * 0.14, '#e0b040')
        p.poly([(cx + w * 0.28, cy), (cx + w * 0.44, cy - h * 0.12), (cx + w * 0.44, cy + h * 0.12)], Mat('#c8281c', amb=0.6, diff=0.4))
        p.ell(cx - w * 0.06, cy, w * 0.12, h * 0.08, '#c8281c')
        p.ell(cx - w * 0.2, cy - h * 0.02, w * 0.03, h * 0.03, '#1c1410')
    for k in range(3):  # border blocks
        p.rect(x + 1.5 + k * w * 0.3, y + 1.5, x + 1.5 + k * w * 0.3 + w * 0.12, y + 3.5, ['#c8281c', '#2e7a3a', '#e0b040'][(k + seed) % 3])


def water_patch(p: P, cx, cy, rx, ry, seed=1, glints='#ffcf7a'):
    p.ell(cx, cy, rx, ry, '#0e2a30')
    p.ell(cx, cy - ry * 0.1, rx * 0.95, ry * 0.8, '#15393f', 0.8, blur=2)
    rs = np.random.default_rng(seed)
    for _ in range(int(rx / 3)):
        x, y = cx + rs.uniform(-0.85, 0.85) * rx, cy + rs.uniform(-0.6, 0.7) * ry
        ln = rs.uniform(3, 9)
        p.line([(x - ln, y), (x + ln, y)], 0.6, '#6fa6a8', 0.5)
    for _ in range(int(rx / 8)):
        x, y = cx + rs.uniform(-0.6, 0.6) * rx, cy + rs.uniform(-0.3, 0.6) * ry
        p.line([(x - 2, y), (x + 2, y)], 0.8, glints, 0.7)


# ====================================================================== Bờ Hồ · Cây Nêu (courtyard)
@sprite('tl-prop-cay-neu', 112, 288)
def cay_neu(p: P):
    p.shadow(56, 280, 26, 7)
    p.blob(56, 278, 18, 6, Mat('#4a3426', amb=0.45, diff=0.6, tex=tex_noise(0.3, 2, 330)), flat=0.4)
    lime_mark(p, 56, 278, 26, 8)
    neu(p, 54, 276, 34, 1.6, 7)


@sprite('tl-prop-ban-tho-giao-thua', 192, 128)
def ban_tho_giao_thua(p: P):
    p.shadow(96, 120, 90, 9)
    for x in (16, 168):
        p.box(x, 104, 8, 3, 18, LACQ_D, top=LACQ_D)
    p.box(8, 58, 176, 30, 10, LACQ, top=Mat('#a8261a', shine=0.6, rough=40, amb=0.36, diff=0.8, tex=lib.tex_lacquer(331)))
    # red cloth skirt with gold trim
    p.poly([(10, 96), (182, 96), (178, 116), (14, 116)], RSILK, n=(-0.1, 0.0, 1), grad=0.3)
    p.line([(12, 99), (180, 99)], 1.6, '#e0b048')
    p.line([(14, 113), (178, 113)], 1.0, '#e0b048')
    for k in range(6):
        p.ring(30 + k * 26, 106, 4, 3, 0.6, GOLD)
    # offerings, back to front
    vase_x = 160
    p.lathe(vase_x, 74, lambda t: 6 + 3 * math.sin(math.pi * t) if t < 0.8 else 3.5, PORC, 22, deco=blue_white)
    blossom_branch(p, [(vase_x, 52), (vase_x - 6, 30), (vase_x - 16, 14)], 1.6, 41)
    blossom_branch(p, [(vase_x, 52), (vase_x + 8, 34), (vase_x + 12, 18)], 1.4, 42)
    fruit_tray(p, 96, 70, 1.0, 3)
    candle(p, 60, 78)
    candle(p, 132, 78)
    censer(p, 96, 88, 0.6, True, 9)
    banh_chung(p, 30, 84, 1.1)
    banh_chung(p, 44, 78, 0.9)
    p.lathe(140, 88, lambda t: 10 - 1.5 * t, PORC, 3)  # đĩa xôi gấc
    p.blob(140, 82, 8, 4, Mat('#c8301e', shine=0.3, rough=14, amb=0.52, diff=0.65, tex=tex_noise(0.2, 1, 332)), flat=0.6)


@sprite('tl-prop-xe-hoa', 144, 128)
def xe_hoa(p: P):
    p.shadow(72, 122, 66, 7)
    p.tube((12, 96), (-4, 112), 2, DWOOD)
    p.box(14, 78, 112, 12, 16, WOOD, top=Mat('#6a4022', shine=0.1, rough=8, amb=0.42, diff=0.7, tex=tex_wood(3, seed=333, vertical=False)))
    # load: peach branches + kumquat pot + red paper
    blossom_branch(p, [(40, 84), (32, 54), (20, 26), (14, 12)], 2.4, 51, 1.3)
    blossom_branch(p, [(52, 84), (58, 50), (54, 22)], 2.2, 52, 1.3)
    blossom_branch(p, [(36, 70), (52, 40), (70, 24)], 1.6, 53, 1.2)
    p.lathe(98, 86, lambda t: 12 + 4 * t, BROWNGLAZE, 16, top_open=True)
    kumquat_bush(p, 98, 56, 18, 54)
    p.box(64, 76, 22, 6, 4, REDP, top=REDP)
    for x in (34, 114):
        p.ring(x, 104, 15, 17, 2.2, DWOOD)
        p.blob(x, 104, 3, 3, DWOOD)
        for k in range(6):
            a = k / 6 * math.pi
            p.line([(x - math.cos(a) * 14, 104 - math.sin(a) * 16), (x + math.cos(a) * 14, 104 + math.sin(a) * 16)], 1.0, '#3a2010')


@sprite('tl-decor-chau-quat', 64, 112)
def chau_quat(p: P):
    p.shadow(32, 106, 22, 6)
    p.lathe(32, 108, lambda t: 13 + 7 * t if t < 0.85 else 21, BROWNGLAZE, 26, top_open=True, cap_mat=BROWNGLAZE, deco=bands([(0.1, 0.16, '#d8a43a'), (0.86, 0.9, '#d8a43a')]))
    p.ell(32, 82.5, 17, 4.6, '#2a1a10')
    p.tube((32, 82), (31, 58), 2.2, BARK, r1=1.4)
    kumquat_bush(p, 32, 46, 22, 61)


@sprite('tl-decor-chau-dao', 64, 128)
def chau_dao(p: P):
    p.shadow(32, 122, 22, 6)
    p.lathe(32, 124, lambda t: 12 + 6 * math.sin(math.pi * t * 0.9), PORC, 24, top_open=True, cap_mat=PORC, deco=blue_white)
    p.ell(32, 100.5, 15, 4.2, '#2a1a10')
    blossom_branch(p, [(32, 100), (26, 70), (14, 44), (8, 26)], 2.6, 62, 1.2)
    blossom_branch(p, [(32, 98), (38, 66), (50, 40), (54, 18)], 2.4, 63, 1.2)
    blossom_branch(p, [(30, 80), (34, 50), (30, 10)], 1.6, 64, 1.1)


# ====================================================================== Đền Ngọc Sơn (exhibition)
@sprite('tl-prop-hoanh-phi', 192, 112)
def hoanh_phi(p: P):
    PR.hoanh_phi(p)
    for x in (8, 184):
        p.line([(x, 0), (x, 14)], 0.7, '#2a1a0a')
        lantern(p, x, 30, 0.42)


@sprite('tl-prop-ban-tho-ngoc-son', 160, 144)
def ban_tho_ngoc_son(p: P):
    p.shadow(80, 136, 76, 8)
    # carved gilded backboard (cửa võng)
    p.box(14, 10, 132, 4, 70, LACQ_D, top=GOLD)
    p.poly([(20, 16), (140, 16), (140, 78), (124, 66), (80, 60), (36, 66), (20, 78)], LACQ, n=(-0.1, 0.1, 1))
    rs = np.random.default_rng(71)
    for _ in range(46):
        x, y = rs.uniform(24, 136), rs.uniform(18, 58)
        p.ring(x, y, rs.uniform(1.6, 3.6), rs.uniform(1.2, 2.6), 0.5, GOLD)
    p.line([(20, 78), (36, 66), (80, 60), (124, 66), (140, 78)], 1.6, '#e3b24c')
    # stepped altar
    for x in (10, 144):
        p.box(x, 118, 6, 2, 16, LACQ_D, top=LACQ_D)
    p.box(6, 92, 148, 18, 18, LACQ, top=Mat('#a8261a', shine=0.6, rough=40, amb=0.36, diff=0.8, tex=lib.tex_lacquer(334)))
    p.rect(8, 112, 152, 113.5, '#e0b048')
    p.box(36, 76, 88, 16, 10, LACQ, top=GOLD)
    for x in (22, 138):
        p.lathe(x, 104, lambda t: 6 + 3.5 * math.sin(math.pi * t) if t < 0.8 else 3.5, PORC, 26, deco=blue_white)
    blossom_branch(p, [(138, 80), (144, 56), (152, 40)], 1.4, 72)
    blossom_branch(p, [(22, 80), (16, 56), (8, 42)], 1.4, 73)
    candle(p, 46, 90, 1.1)
    candle(p, 114, 90, 1.1)
    censer(p, 80, 96, 1.0, True, 11)


@sprite('tl-prop-ban-ngu-qua', 112, 112)
def ban_ngu_qua(p: P):
    p.shadow(56, 104, 50, 7)
    for x in (12, 94):
        p.box(x, 86, 6, 2, 18, LACQ_D, top=LACQ_D)
    p.box(6, 64, 100, 22, 12, LACQ, top=Mat('#a8261a', shine=0.6, rough=40, amb=0.36, diff=0.8, tex=lib.tex_lacquer(335)))
    p.rect(6, 86.5, 106, 88, '#e0b048')
    fruit_tray(p, 56, 62, 1.15, 7)
    candle(p, 16, 80, 0.8)
    candle(p, 96, 80, 0.8)


@sprite('tl-decor-hac-rua', 64, 128)
def hac_rua(p: P):
    p.shadow(32, 122, 22, 6)
    # turtle
    p.blob(32, 112, 18, 9, BRONZE, flat=0.6)
    p.ring(32, 109, 12, 5, 0.6, M['bronze_dark'])
    p.blob(50, 114, 4.5, 3.5, BRONZE)
    for x in (18, 44):
        p.blob(x, 119, 3.4, 2.2, M['bronze_dark'])
    # crane
    for x in (28, 36):
        p.tube((x, 108), (x + 1, 76), 1.3, BRONZE)
    p.blob(32, 70, 10, 12, BRONZE)
    p.poly([(24, 64), (14, 80), (26, 78)], M['bronze_dark'])
    p.tube((36, 62), (38, 40), 2.4, BRONZE, r1=1.6)
    p.tube((38, 40), (34, 22), 1.6, BRONZE, r1=1.4)
    p.blob(34, 20, 3.6, 3.2, BRONZE)
    p.ell(34, 17.5, 1.6, 1.0, '#c8281c')
    p.tube((36, 20), (46, 28), 1.0, GOLD, r1=0.4)


@sprite('tl-decor-cot-cau-doi', 64, 176)
def cot_cau_doi(p: P):
    p.shadow(32, 170, 20, 5)
    p.lathe(32, 172, lambda t: 15 - 4 * t, GSTONE, 12, cap_mat=GSTONE)
    p.lathe(32, 162, lambda t: 11.5, LACQ, 150, cap_mat=LACQ, deco=bands([(0.02, 0.05, '#e0b048'), (0.95, 0.98, '#e0b048')]))
    # black lacquer câu đối board with gilded strokes
    p.poly([(23, 30), (41, 30), (41, 142), (23, 142)], Mat('#1c1210', shine=0.6, rough=40, amb=0.36, diff=0.7), n=(-0.1, 0.1, 1))
    p.line([(23, 30), (41, 30), (41, 142), (23, 142), (23, 30)], 1.0, '#c99a3a')
    abstract_strokes(p, 25, 34, 39, 138, 81, '#f0c860', True, 7, 1.4)


@sprite('tl-prop-den-long', 64, 128)
def den_long(p: P):
    p.shadow(32, 121, 15, 5)
    p.lathe(32, 122, lambda t: 11 - 5 * t, STONE, 8)
    p.tube((32, 116), (32, 18), 2.3, LACQ_D)
    p.tube((32, 20), (50, 20), 1.6, LACQ_D)
    p.blob(50, 20, 2, 2, GOLD)
    p.blob(32, 15, 3, 3, GOLD)
    p.line([(46, 20), (46, 30)], 0.8, '#2a1a0a')
    lantern(p, 40, 56, 0.86)
    p.glow(40, 58, 26, '#ff9a40', 0.35)


@sprite('tl-decor-binh-dao', 48, 112)
def binh_dao(p: P):
    p.shadow(24, 106, 15, 5)

    def prof(t):
        return 6 + 9 * math.sin(math.pi * min(1, t * 1.25)) ** 1.2 if t < 0.8 else 4.5 + (t - 0.8) * 10
    p.lathe(24, 108, prof, PORC, 40, deco=blue_white)
    blossom_branch(p, [(24, 70), (16, 44), (8, 20)], 1.6, 91)
    blossom_branch(p, [(24, 70), (32, 46), (40, 22), (42, 8)], 1.6, 92)


# ====================================================================== Cầu Thê Húc (corridor)
@sprite('tl-decor-den-long-cot', 48, 128)
def den_long_cot(p: P):
    p.shadow(24, 122, 12, 4)
    p.box(16, 112, 16, 6, 8, GSTONE, top=GSTONE)
    p.tube((24, 114), (24, 22), 3.2, LACQ)
    p.lathe(24, 24, lambda t: 4.5 * (1 - t) + 1, GOLD, 8)
    p.tube((24, 32), (40, 30), 1.4, LACQ_D)
    p.line([(38, 30), (38, 40)], 0.7, '#2a1a0a')
    lantern(p, 38, 58, 0.62)
    p.rect(19, 46, 29, 50, '#e0b048')


# ====================================================================== Thủy Đình Rối Nước (coordination)
@sprite('tl-prop-thuy-dinh', 176, 176)
def thuy_dinh(p: P):
    water_patch(p, 88, 160, 86, 15, 101)
    # stone footing + platform
    p.box(20, 132, 136, 8, 12, GSTONE, top=GSTONE)
    p.box(26, 118, 124, 14, 6, WOOD, top=Mat('#6a4022', shine=0.2, rough=10, amb=0.42, diff=0.7, tex=tex_wood(3, seed=336, vertical=False)))
    # back wall with bamboo blinds (mành) + doorways
    p.poly([(34, 68), (142, 68), (142, 120), (34, 120)], LACQ_D, n=(-0.1, 0.1, 1), grad=0.25)
    for x0, x1 in ((40, 70), (106, 136)):
        p.poly([(x0, 74), (x1, 74), (x1, 116), (x0, 116)], Mat('#b8954a', amb=0.55, diff=0.5, tex=tex_noise(0.1, 2, 337)), n=(0, 0, 1), grad=0.2)
        for y in range(76, 116, 3):
            p.line([(x0, y), (x1, y)], 0.5, '#6a4a1a', 0.7)
    p.poly([(76, 80), (100, 80), (100, 118), (76, 118)], Mat('#1a0c08', amb=0.4, diff=0.3), n=(0, 0, 1))
    p.glow(88, 104, 16, '#ff9a40', 0.35)
    for x in (30, 58, 118, 146):
        p.tube((x, 120), (x, 66), 2.6, LACQ)
    # two-tier curved roof
    roof(p, 88, 68, 74, 20, ROOF, 10)
    p.poly([(56, 46), (120, 46), (116, 52), (60, 52)], LACQ_D)
    roof(p, 88, 46, 52, 18, ROOF, 9)
    for x in (34, 142):
        p.line([(x, 70), (x, 78)], 0.6, '#2a1a0a')
        lantern(p, x, 90, 0.36)


@sprite('tl-prop-ca-tru', 128, 96)
def ca_tru(p: P):
    p.shadow(64, 86, 60, 8)
    # chiếu hoa
    p.poly([(8, 62), (120, 62), (126, 86), (2, 86)], Mat('#d6bd84', amb=0.55, diff=0.5, tex=tex_noise(0.12, 2, 338)), n=(0, 0.9, 0.4))
    for k in range(1, 6):
        y = 62 + 24 * k / 6
        p.line([(8 - 6 * k / 6, y), (120 + 6 * k / 6, y)], 0.8, '#a3342a', 0.6)
    p.line([(8, 62), (120, 62), (126, 86), (2, 86), (8, 62)], 1.4, '#7a2a1a')
    # trống chầu on a small stand
    p.lathe(28, 64, lambda t: 12 + 2 * math.sin(math.pi * t), LACQ, 18, cap_mat=Mat('#e2cf9e', shine=0.1, rough=6, amb=0.62, diff=0.45, tex=tex_noise(0.08, 6, 44)))
    p.tube((40, 50), (52, 34), 1.2, DWOOD)
    # đàn đáy lying diagonally
    p.box(56, 58, 22, 10, 6, WOOD, top=Mat('#a06a3a', shine=0.4, rough=30, amb=0.45, diff=0.7, tex=tex_wood(2.5, seed=339)))
    p.tube((78, 62), (120, 46), 1.6, DWOOD)
    for k in range(3):
        p.line([(58, 60 + k * 2.5), (118, 45 + k * 1.2)], 0.3, '#f3e6c0', 0.9)
    # phách: block + two sticks
    p.box(84, 70, 16, 5, 4, BAMBOO, top=BAMBOO)
    p.tube((88, 68), (104, 62), 0.9, BAMBOO_D)
    p.tube((90, 71), (106, 66), 0.9, BAMBOO_D)
    p.blob(40, 78, 9, 3.5, Mat('#7a1a3a', shine=0.2, rough=10, amb=0.5, diff=0.65, tex=tex_noise(0.08, 2, 51)), flat=0.5)


@sprite('tl-decor-ghe-tre', 112, 64)
def ghe_tre(p: P):
    p.shadow(56, 58, 52, 6)
    for x in (12, 100):
        p.tube((x, 58), (x, 34), 2, BAMBOO_D)
        p.tube((x - 4, 58), (x - 4, 36), 1.6, BAMBOO_D)
    for k in range(7):
        y = 30 + k * 1.8
        p.tube((6, y), (106, y), 1.2, BAMBOO)
    p.tube((8, 46), (104, 46), 1.4, BAMBOO_D)


@sprite('tl-decor-gia-roi', 96, 96)
def gia_roi(p: P):
    p.shadow(48, 90, 44, 6)
    p.box(8, 70, 80, 8, 12, DWOOD, top=DWOOD)
    rs = np.random.default_rng(111)
    for k, x in enumerate((22, 48, 74)):
        p.tube((x, 72), (x, 52), 1.2, BAMBOO_D)
        robe = [PUPPET, RSILK, Mat('#3c8a5a', shine=0.5, rough=30, amb=0.48, diff=0.7)][k]
        p.poly([(x - 9, 54), (x + 9, 54), (x + 6, 34), (x - 6, 34)], robe, n=(-0.2, 0.2, 1), grad=0.2)
        p.tube((x - 6, 38), (x - 13, 46 + rs.uniform(-4, 2)), 2, robe)
        p.tube((x + 6, 38), (x + 13, 44 + rs.uniform(-4, 2)), 2, robe)
        p.blob(x, 26, 7, 7.5, SKIN)
        p.ell(x - 2.4, 25, 0.9, 1.2, '#1c1410')
        p.ell(x + 2.4, 25, 0.9, 1.2, '#1c1410')
        p.line([(x - 2.5, 30), (x, 31.2), (x + 2.5, 30)], 0.8, '#a0281c')
        if k == 0:  # chú Tễu tuft
            p.blob(x, 18.5, 2.2, 2, Mat('#1c1410', amb=0.4, diff=0.5))
        else:
            p.lathe(x, 21, lambda t: 7 - 4 * t, robe, 6)


@sprite('tl-decor-cot-do', 48, 176)
def cot_do(p: P):
    p.shadow(24, 170, 16, 5)
    p.lathe(24, 172, lambda t: 12 - 3 * t, GSTONE, 10, cap_mat=GSTONE)
    p.lathe(24, 164, lambda t: 9, LACQ, 150, cap_mat=LACQ, deco=bands([(0.02, 0.05, '#e0b048'), (0.6, 0.62, '#e0b048'), (0.95, 0.98, '#e0b048')]))
    p.line([(24, 60), (24, 66)], 0.7, '#2a1a0a')
    lantern(p, 24, 84, 0.46)


@sprite('tl-decor-co-hoi', 48, 176)
def co_hoi(p: P):
    p.shadow(14, 170, 12, 4)
    p.lathe(14, 172, lambda t: 9 - 3 * t, GSTONE, 8)
    p.tube((14, 166), (14, 8), 1.8, BAMBOO)
    p.blob(14, 7, 2.4, 2.4, GOLD)
    cols = ['#c8281c', '#e8b52e', '#2e7a3a', '#2a4a9a', '#f0ece0']
    for k, c in enumerate(cols):
        y0, y1 = 12 + k * 18, 12 + (k + 1) * 18
        w0, w1 = 26 + 2 * math.sin(k), 26 + 2 * math.sin(k + 1)
        p.poly([(15, y0), (15 + w0, y0 + 3 + 2 * math.sin(k * 1.7)), (15 + w1, y1 + 3 + 2 * math.sin((k + 1) * 1.7)), (15, y1)],
               Mat(c, shine=0.15, rough=8, amb=0.55, diff=0.6, tex=tex_noise(0.06, 2, 340 + k)), n=(0.2 * math.sin(k * 2), 0.1, 1))
    p.poly([(15, 102), (41, 107), (34, 116), (15, 112)], Mat('#c8281c', amb=0.55, diff=0.6))


@sprite('tl-prop-ao-roi', 96, 80)
def ao_roi(p: P):
    p.shadow(48, 74, 46, 6)
    p.box(4, 36, 88, 26, 14, DWOOD, top=DWOOD)
    p.poly([(9, 40), (87, 40), (87, 58), (9, 58)], WATER, n=(0, 0.9, 0.4), grad=-0.2)
    rs = np.random.default_rng(121)
    for _ in range(10):
        x, y = rs.uniform(14, 82), rs.uniform(42, 56)
        p.line([(x - 4, y), (x + 4, y)], 0.5, '#8fc3c0', 0.6)
    # chú Tễu bobbing out of the water + pole
    p.tube((30, 52), (70, 36), 1.0, BAMBOO_D)
    p.poly([(34, 52), (50, 52), (48, 38), (36, 38)], PUPPET, n=(-0.2, 0.2, 1))
    p.ell(42, 52, 12, 2.5, '#bfe8e8', 0.5)
    p.blob(42, 32, 6.5, 7, SKIN)
    p.blob(42, 25, 2, 1.8, Mat('#1c1410', amb=0.4, diff=0.5))
    p.ell(40, 31, 0.8, 1.1, '#1c1410')
    p.ell(44.4, 31, 0.8, 1.1, '#1c1410')
    p.line([(39.5, 35), (42, 36), (44.5, 35)], 0.7, '#a0281c')


# ====================================================================== Phố Ông Đồ · Tháp Bút (editing)
@sprite('tl-prop-thap-but', 112, 224)
def thap_but(p: P):
    p.shadow(56, 216, 50, 9)
    rs = np.random.default_rng(131)
    # rocky mound (núi Độc Tôn)
    for _ in range(26):
        x, y = rs.uniform(16, 96), rs.uniform(196, 214)
        p.blob(x, y, rs.uniform(6, 12), rs.uniform(4, 7), GSTONE, flat=0.6)
    for _ in range(14):
        x, y = rs.uniform(14, 98), rs.uniform(200, 216)
        p.blob(x, y, 3, 2, LEAF2)
    # tiers of the tower: square, tapering
    tiers = [(30, 52, 196), (33, 46, 158), (36, 40, 124), (38, 36, 94), (40, 32, 68)]
    for i, (hw2, w, yb) in enumerate(tiers):
        x = 56 - w / 2
        h = (yb - (tiers[i + 1][2] if i + 1 < len(tiers) else 44))
        p.box(x, yb - h, w, 4, h - 4, LIMEWALL, top=LIMEWALL)
        p.rect(x, yb - 4, x + w, yb - 2, '#8a8270', 0.8)
        moss = lib.value_noise(p.L.h, p.L.w, 3.0, 132 + i) > 0.82
        p.paint(moss * lib.rect_mask(p.L.w, p.L.h, x * SS, (yb - h) * SS, (x + w) * SS, yb * SS), '#4c6a3a', 0.4)
    p.rect(52, 150, 60, 158, '#2a2420', 0.85)  # small niche
    # brush tip on top
    p.lathe(56, 46, lambda t: 9 * (1 - t) ** 0.7 + 1, Mat('#2a2622', shine=0.3, rough=14, amb=0.4, diff=0.6), 24)
    p.lathe(56, 48, lambda t: 10, GSTONE, 4)


@sprite('tl-prop-chong-ong-do', 112, 96)
def chong_ong_do(p: P):
    p.shadow(56, 90, 52, 7)
    for x in (12, 98):
        p.tube((x, 88), (x, 62), 2, BAMBOO_D)
    p.box(6, 50, 100, 18, 6, BAMBOO, top=BAMBOO)
    for k in range(1, 14):
        x = 6 + 100 * k / 14
        p.line([(x, 50.5), (x, 67.5)], 0.6, '#6a5424', 0.8)
    # red paper sheets, ink stone, brush pot, ink bowl
    p.poly([(20, 52), (52, 50), (56, 62), (22, 66)], REDP, n=(0, 0.9, 0.4))
    p.poly([(24, 50), (50, 48), (52, 58), (26, 61)], REDP, n=(0, 0.9, 0.4))
    abstract_strokes(p, 28, 51, 48, 58, 141, '#1a0c08', False, 2, 1.0)
    p.box(64, 52, 14, 8, 3, Mat('#2a2622', shine=0.6, rough=40, amb=0.4, diff=0.6))
    p.ell(71, 55, 4, 2, '#0a0806')
    p.lathe(88, 60, lambda t: 5, Mat('#4a6a5a', shine=0.5, rough=30, amb=0.45, diff=0.65), 12, top_open=True)
    for dx in (-2, 0, 2):
        p.tube((88 + dx, 50), (88 + dx * 2.5, 34), 0.8, BAMBOO)
        p.blob(88 + dx * 2.5, 33, 1.3, 2.2, INK)
    p.tube((58, 64), (76, 58), 0.8, BAMBOO)
    p.blob(77, 57.5, 1.2, 1.0, INK)


@sprite('tl-prop-ban-cau-doi', 112, 112)
def ban_cau_doi(p: P):
    p.shadow(56, 106, 52, 7)
    # bamboo frame with two hanging blank scrolls behind the low table
    for x in (12, 100):
        p.tube((x, 84), (x, 8), 1.8, BAMBOO_D)
    p.tube((8, 10), (104, 10), 1.6, BAMBOO)
    scroll(p, 22, 14, 14, 62, 151)
    scroll(p, 76, 14, 14, 62, 152)
    lantern(p, 56, 34, 0.42)
    p.line([(56, 10), (56, 18)], 0.6, '#2a1a0a')
    for x in (18, 92):
        p.box(x, 92, 4, 2, 12, DWOOD, top=DWOOD)
    p.box(12, 80, 88, 12, 6, DWOOD, top=Mat('#5a3016', shine=0.35, rough=30, amb=0.42, diff=0.72, tex=tex_wood(3.0, seed=341, vertical=False)))
    for k in range(4):
        p.tube((20 + k * 6, 84 - k * 0.5), (44 + k * 6, 84 - k * 0.5), 2.2, REDP)
    p.box(62, 82, 12, 6, 2, Mat('#2a2622', shine=0.6, rough=40, amb=0.4, diff=0.6))
    p.tube((80, 86), (96, 80), 0.8, BAMBOO)
    p.blob(97, 79.6, 1.2, 1.0, INK)


@sprite('tl-decor-gia-cau-doi', 96, 128)
def gia_cau_doi(p: P):
    p.shadow(48, 122, 44, 5)
    for x in (8, 88):
        p.tube((x, 122), (x, 10), 1.8, BAMBOO_D)
        p.tube((x, 122), (x + (6 if x < 48 else -6), 118), 1.2, BAMBOO_D)
    p.tube((4, 12), (92, 12), 1.6, BAMBOO)
    for k, x in enumerate((16, 41, 66)):
        scroll(p, x, 16, 13, 84 - 8 * (k % 2), 161 + k)


@sprite('tl-decor-chum-nuoc', 56, 72)
def chum_nuoc(p: P):
    p.shadow(28, 66, 22, 6)

    def prof(t):
        return 9 + 12 * math.sin(math.pi * min(1, t * 1.05)) ** 0.8 if t < 0.9 else 10
    p.lathe(28, 68, prof, BROWNGLAZE, 44, deco=bands([(0.82, 0.86, '#3a1a0a')]))
    p.lathe(28, 26, lambda t: 11 - 2 * t, DWOOD, 3)
    p.tube((30, 20), (46, 16), 1.0, BAMBOO_D)
    p.blob(26, 21, 5, 3, Mat('#6a4a2a', shine=0.3, rough=14, amb=0.45, diff=0.7))


# ====================================================================== Phố Hàng Trống · Tranh Đông Hồ (archive)
@sprite('tl-prop-gia-tranh', 192, 144)
def gia_tranh(p: P):
    p.shadow(96, 138, 90, 6)
    for x in (8, 182):
        p.box(x, 20, 6, 3, 116, DWOOD, top=DWOOD)
    for y in (18, 74, 128):
        p.box(4, y, 186, 4, 4, DWOOD, top=DWOOD)
    k = 0
    for row, y in enumerate((26, 82)):
        for i in range(6):
            x = 16 + i * 29
            dongho_print(p, x, y + (i % 2) * 2, 24, 34, 171 + k)
            p.line([(x + 12, y - 4), (x + 12, y + (i % 2) * 2)], 0.6, '#2a1a0a')
            k += 1


@sprite('tl-prop-tranh-treo', 192, 96)
def tranh_treo(p: P):
    p.line([(4, 18), (48, 24), (96, 26), (144, 24), (188, 18)], 0.8, '#3a2a1a')
    for i, x in enumerate((14, 52, 90, 128, 164)):
        y = 22 + 4 * math.sin(math.pi * (x - 4) / 184)
        dongho_print(p, x, y + 2, 26, 38, 191 + i)
        p.rect(x + 11, y, x + 15, y + 4, '#6a4a2a')
    p.shadow(96, 92, 86, 3, 0.25)


@sprite('tl-prop-ban-in-tranh', 112, 80)
def ban_in_tranh(p: P):
    p.shadow(56, 74, 52, 6)
    for x in (12, 94):
        p.box(x, 58, 6, 2, 16, DWOOD, top=DWOOD)
    p.box(6, 36, 100, 22, 8, WOOD, top=Mat('#7a4a26', shine=0.15, rough=10, amb=0.42, diff=0.7, tex=tex_wood(3, seed=342, vertical=False)))
    # woodblock + sheet of điệp paper + 4 pigment bowls + broom brush (cái thét)
    p.box(14, 38, 26, 14, 5, Mat('#5a3418', shine=0.2, rough=12, amb=0.42, diff=0.7, tex=tex_wood(2, seed=343)), top=Mat('#2a1810', shine=0.3, rough=16, amb=0.4, diff=0.6))
    for k in range(5):
        p.line([(17 + k * 4.5, 40), (19 + k * 4.5, 50)], 0.8, '#c8281c', 0.8)
    p.poly([(46, 38), (72, 37), (74, 52), (47, 53)], PAPER, n=(0, 0.9, 0.4))
    dongho_print(p, 50, 40, 20, 11, 181)
    for k, c in enumerate(('#c8281c', '#e0b040', '#2e7a3a', '#1c1410')):
        x = 82 + (k % 2) * 12
        y = 44 + (k // 2) * 8
        p.lathe(x, y + 3, lambda t: 5 - t, CLAY, 4, top_open=True)
        p.ell(x, y - 1.2, 3.8, 1.2, c)
    p.tube((30, 60), (52, 56), 1.2, BAMBOO_D)
    p.blob(54, 55, 4, 2.2, Mat('#8a6a3a', amb=0.5, diff=0.6, tex=tex_noise(0.3, 1, 344)))


@sprite('tl-decor-chong-giay', 96, 72)
def chong_giay(p: P):
    p.shadow(48, 66, 44, 6)
    p.box(6, 48, 84, 8, 8, DWOOD, top=DWOOD)
    for k in range(6):
        p.box(10 + k * 0.6, 42 - k * 4, 74, 6, 4, Mat('#efe0b4', shine=0.3, rough=20, amb=0.6, diff=0.5, tex=tex_noise(0.2, 1, 345 + k)))
    p.line([(30, 20), (30, 50)], 1.2, '#7a5a2a')
    p.line([(66, 20), (66, 50)], 1.2, '#7a5a2a')
    for k in range(3):
        p.tube((14 + k * 4, 14 - k * 3), (82 + k * 2, 14 - k * 3), 3, PAPER)


@sprite('tl-decor-chum-mau', 56, 72)
def chum_mau(p: P):
    p.shadow(28, 66, 24, 6)
    p.lathe(22, 66, lambda t: 9 + 8 * math.sin(math.pi * min(1, t * 1.05)) if t < 0.88 else 9, TERRA, 36, top_open=True)
    p.ell(22, 30, 8, 2.6, '#c8281c')
    p.lathe(42, 68, lambda t: 6 + 4 * math.sin(math.pi * t) if t < 0.85 else 5, CLAY, 20, top_open=True)
    p.ell(42, 48.5, 4.6, 1.5, '#2e7a3a')
    p.lathe(36, 58 + 10, lambda t: 4.5, CLAY, 6, top_open=True)
    p.ell(36, 61.5, 4, 1.3, '#e0b040')


# ====================================================================== Bếp Tết · Nồi bánh chưng (storage)
@sprite('tl-prop-noi-banh-chung', 128, 128)
def noi_banh_chung(p: P):
    p.shadow(64, 120, 60, 8)
    # three-brick hearth (kiềng) + logs + fire
    for x in (26, 102, 64):
        p.box(x - 8, 92 if x != 64 else 86, 16, 6, 18, CLAY, top=CLAY)
    for a, b in (((8, 116), (52, 100)), ((120, 116), (76, 100)), ((40, 118), (70, 104))):
        p.tube(a, b, 3.6, BARK)
        p.blob(b[0], b[1], 2.6, 2.6, Mat('#ff7a2a', amb=0.9, diff=0.2))
    for k in range(7):
        x = 40 + k * 8
        h = 14 + 8 * math.sin(k * 1.9) ** 2
        p.poly([(x - 5, 106), (x + 5, 106), (x + 1, 106 - h), (x - 1, 106 - h * 0.7)], Mat('#ff8a2a', amb=1.0, diff=0.2), n=(0, 0, 1), grad=-0.6)
        p.poly([(x - 2.5, 106), (x + 2.5, 106), (x, 106 - h * 0.6)], Mat('#ffd76a', amb=1.0, diff=0.2), n=(0, 0, 1))
    # big blackened pot
    p.lathe(64, 92, lambda t: 34 + 5 * math.sin(math.pi * t) if t < 0.9 else 36, Mat('#2c2826', shine=0.45, rough=20, amb=0.36, diff=0.75, tex=tex_noise(0.2, 3, 346)), 50,
            top_open=True, deco=bands([(0.86, 0.9, '#5a4a3a')]))
    p.ring(28, 60, 3, 5, 1.2, IRON)
    p.ring(100, 60, 3, 5, 1.2, IRON)
    p.ell(64, 41, 32, 9, '#1a1614')
    for k, x in enumerate((48, 64, 80)):  # bánh peeking out of the water
        banh_chung(p, x, 46 - (k % 2) * 2, 0.75)
    p.ell(64, 44, 30, 6, '#7aa0a0', 0.25, blur=1.5)
    p.glow(64, 100, 34, '#ff8a2a', 0.65)
    for k in range(3):
        p.smoke(52 + k * 12, 36, 34, 140 + k, 0.24)


@sprite('tl-prop-mam-la-dong', 112, 96)
def mam_la_dong(p: P):
    p.shadow(56, 90, 52, 7)
    p.poly([(4, 60), (108, 60), (110, 78), (2, 78)], Mat('#d6bd84', amb=0.55, diff=0.5, tex=tex_noise(0.12, 2, 347)), n=(0, 0.9, 0.4))
    p.line([(4, 60), (108, 60), (110, 78), (2, 78), (4, 60)], 1.2, '#7a5a2a')
    p.box(6, 78, 100, 2, 6, DWOOD, top=DWOOD)
    # stacks of lá dong
    for s in range(2):
        for k in range(6):
            cx, cy = 22 + s * 18, 66 - k * 1.8
            p.poly([(cx - 12, cy), (cx - 4, cy - 5), (cx + 12, cy - 3), (cx + 4, cy + 3)], DONG, n=(0.1 * (k % 2), 0.8, 0.5))
            p.line([(cx - 11, cy - 0.5), (cx + 11, cy - 2.5)], 0.4, '#8ab85a', 0.7)
    # bowls: gạo nếp, đỗ xanh, thịt
    for x, fill in ((62, RICE), (84, MUNG)):
        p.lathe(x, 70, lambda t: 9 - 3 * (1 - t), PORC, 7, top_open=True, deco=blue_white)
        p.blob(x, 63, 8, 3, fill, flat=0.5)
    p.lathe(98, 76, lambda t: 9 - 1.5 * t, PORC, 2)
    p.box(92, 68, 12, 5, 3, PORK, top=Mat('#f5e8dc', shine=0.3, rough=12, amb=0.6, diff=0.5))
    # square wooden mould + bundle of lạt strings
    p.box(40, 70, 18, 8, 6, WOOD, top=Mat('#3a2010', amb=0.4, diff=0.6))
    for k in range(4):
        p.line([(60 + k, 82), (84 + k * 2, 78)], 0.6, '#e8dfa0')
    banh_chung(p, 22, 88, 0.85)


@sprite('tl-prop-dong-cui', 96, 80)
def dong_cui(p: P):
    p.shadow(48, 74, 44, 6)
    rs = np.random.default_rng(151)
    rows = [(70, 7), (60, 6), (50, 5), (41, 3)]
    for y, n in rows:
        for k in range(n):
            x = 48 + (k - (n - 1) / 2) * 11 + rs.uniform(-1, 1)
            p.tube((x - 2, y), (x + 3, y - 3), 5, BARK, r1=4.6)
            p.blob(x + 3, y - 3, 4, 4.4, Mat('#c8965a', amb=0.55, diff=0.6, tex=tex_noise(0.2, 1, 152 + k)))
            p.ring(x + 3, y - 3, 2, 2.2, 0.3, Mat('#8a5a2a'))
    p.tube((70, 76), (86, 50), 1.4, DWOOD)
    p.poly([(84, 50), (92, 46), (94, 54), (86, 56)], IRON)


@sprite('tl-decor-cay-dao', 192, 208)
def cay_dao(p: P):
    p.shadow(96, 198, 78, 14, 0.32, 0.9)
    br = [((96, 200), (92, 150), 7, 5.5), ((92, 150), (66, 108), 5.5, 3.6), ((92, 150), (122, 100), 5, 3.4),
          ((66, 108), (40, 78), 3.6, 2), ((66, 108), (80, 64), 3.4, 2), ((122, 100), (150, 72), 3.4, 2), ((122, 100), (112, 56), 3, 1.8),
          ((92, 150), (100, 92), 4, 2.6), ((100, 92), (96, 40), 2.6, 1.4)]
    for a, b, r0, r1 in br:
        p.tube(a, b, r0, Mat('#3e2a22', shine=0.1, rough=8, amb=0.42, diff=0.7, tex=tex_noise(0.3, 2, 153)), r1=r1)
    for i, (a, b, r0, r1) in enumerate(br[3:]):
        mx, my = b
        blossom_branch(p, [b, (mx + (i % 3 - 1) * 14, my - 16), (mx + (i % 2 * 2 - 1) * 20, my - 28)], 1.6, 160 + i, 2.2)
        blossom_branch(p, [((a[0] + b[0]) / 2, (a[1] + b[1]) / 2), (mx + (1 - i % 3) * 18, my + 6)], 1.2, 170 + i, 1.8)
    for x, y in ((58, 98), (132, 92), (104, 76), (80, 120)):  # red envelopes
        p.line([(x, y - 6), (x, y)], 0.5, '#e0b048')
        p.rect(x - 3, y, x + 3, y + 8, '#d02a1c')
        p.rect(x - 1.4, y + 2.5, x + 1.4, y + 4.5, '#e8b84c')


@sprite('tl-prop-neu-nho', 64, 160)
def neu_nho(p: P):
    p.shadow(32, 152, 24, 6)
    p.blob(32, 150, 14, 5, Mat('#4a3426', amb=0.45, diff=0.6, tex=tex_noise(0.3, 2, 354)), flat=0.4)
    lime_mark(p, 32, 150, 20, 6)
    neu(p, 30, 148, 30, 0.95, 8)
    # basket of lime powder
    p.lathe(50, 152, lambda t: 8 - 2 * (1 - t), BAMBOO, 8, top_open=True, deco=lambda u, t: (hexc('#6a5424'), (np.abs(np.sin(u * 14 + t * 6)) < 0.25) * 0.6))
    p.blob(50, 143.5, 6, 2.2, LIME, flat=0.5)


# ====================================================================== Hồ Gươm backdrop pieces (outside the walkable rooms)
@sprite('tl-decor-thap-rua', 192, 192)
def thap_rua(p: P):
    water_patch(p, 96, 172, 94, 18, 181)
    for k in range(9):  # reflection of lit windows
        x = 70 + k * 7
        p.line([(x, 162), (x + 1, 186)], 1.2, '#ffb45a', 0.18 + 0.12 * (k % 2))
    rs = np.random.default_rng(182)
    for _ in range(30):  # islet
        x, y = rs.uniform(30, 162), rs.uniform(150, 166)
        p.blob(x, y, rs.uniform(6, 14), rs.uniform(3, 6), LEAF2 if rs.random() < 0.7 else GSTONE, flat=0.6)
    for x in (40, 150):
        for _ in range(16):
            p.blob(x + rs.uniform(-12, 12), 132 + rs.uniform(-12, 10), 5, 4, LEAF if rs.random() < 0.5 else LEAF2)
        p.tube((x, 156), (x, 140), 2, BARK)
    tiers = [(80, 156, 40), (60, 112, 30), (40, 76, 24)]
    for i, (w, yb, h) in enumerate(tiers):
        x = 96 - w / 2
        p.box(x, yb - h, w, 4, h - 4, LIMEWALL, top=LIMEWALL)
        moss = lib.value_noise(p.L.h, p.L.w, 3.0, 183 + i) > 0.78
        p.paint(moss * lib.rect_mask(p.L.w, p.L.h, x * SS, (yb - h) * SS, (x + w) * SS, yb * SS), '#4c6a3a', 0.45)
        n = 3 if i < 2 else 1
        for k in range(n):
            ax = x + w * (k + 0.5) / n
            p.rect(ax - 4, yb - h + 12, ax + 4, yb - 6, '#2a1a10')
            p.ell(ax, yb - h + 12, 4, 4, '#2a1a10')
            p.rect(ax - 3, yb - h + 13, ax + 3, yb - 7, '#ffbf62', 0.9)
            p.ell(ax, yb - h + 13, 3, 3, '#ffbf62', 0.9)
            p.glow(ax, yb - h + 18, 8, '#ff9a40', 0.4)
        roof(p, 96, yb - h + 2, w / 2 + 8, 8, ROOF, 5, ridge=False)
    roof(p, 96, 54, 22, 12, ROOF, 6)
    p.lathe(96, 42, lambda t: 3 * (1 - t) + 0.6, GOLD, 10)


# ====================================================================== build + pack
def build(keys=None):
    imgs = {}
    for key, (w, h, fn) in REG.items():
        path = src('props', f'{key}.png')
        if keys and key not in keys and os.path.exists(path):
            imgs[key] = Image.open(path).convert('RGBA')
            continue
        p = P(w, h)
        fn(p)
        im = p.image()
        im.save(path, optimize=True)
        imgs[key] = im
        print('painted', key, w, h)
    return imgs


if __name__ == '__main__':
    keys = set(sys.argv[1:]) or None
    pack_atlas(build(keys), 'tl-decor-0', 'tools/paint/tl_props.py')
