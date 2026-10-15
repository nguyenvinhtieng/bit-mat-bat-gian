"""
Painted (raster, per-pixel shaded) props + room decor for the Cố đô Huế map.
  python3 tools/paint/props.py [name ...]
Writes assets/maps/co-do-hue/props/<key>.png (source) and packs
apps/web/public/assets/maps/co-do-hue/atlas/hue-decor-0.{webp,json} (Phaser hash atlas).
Sprites are anchored bottom-centre (feet), painted at 4x and downsampled. No text is baked in.
"""
from __future__ import annotations

import json
import math
import os
import sys

import numpy as np
from PIL import Image

sys.path.insert(0, os.path.dirname(__file__))
import lib  # noqa: E402
from lib import M, Layer, Mat, hexc, tex_noise, tex_wood, tex_stone  # noqa: E402

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '../..'))
SS = 4
REG = {}


def sprite(key, w, h):
    def deco(fn):
        REG[key] = (w, h, fn)
        return fn
    return deco


class P:
    """1x-coordinate painting API over a 4x Layer."""

    def __init__(self, w, h):
        self.w, self.h = w, h
        self.L = Layer(w * SS, h * SS)

    # scaled wrappers
    def shadow(self, cx, cy, rx, ry, op=0.4, soft=0.7):
        lib.shadow_ellipse(self.L, cx * SS, cy * SS, rx * SS, ry * SS, op, soft)

    def lathe(self, cx, yb, prof, mat, height, **kw):
        if 'deco' in kw and kw['deco'] is not None:
            pass
        return lib.lathe(self.L, cx * SS, yb * SS, lambda t: prof(t) * SS, mat, height * SS, **kw)

    def box(self, x, y, w, h, depth, mat, top=None, bevel=0.6):
        lib.box(self.L, x * SS, y * SS, w * SS, h * SS, depth * SS, mat, top_mat=top, bevel=bevel * SS)

    def blob(self, cx, cy, rx, ry, mat, flat=1.0, alpha=1.0):
        lib.blob(self.L, cx * SS, cy * SS, rx * SS, ry * SS, mat, flat, alpha)

    def tube(self, p0, p1, r, mat, r1=None, alpha=1.0, caps=True):
        lib.tube(self.L, (p0[0] * SS, p0[1] * SS), (p1[0] * SS, p1[1] * SS), r * SS, mat, None if r1 is None else r1 * SS, alpha, caps)

    def ring(self, cx, cy, rx, ry, th, mat, rot=0.0, **kw):
        lib.ring(self.L, cx * SS, cy * SS, rx * SS, ry * SS, th * SS, mat, rot, **kw)

    def poly(self, pts, mat, n=(-0.2, 0.3, 0.9), grad=0.2, alpha=1.0, blur=0.0):
        lib.polyshade(self.L, [(x * SS, y * SS) for x, y in pts], mat, n, grad, alpha, blur * SS)

    def paint(self, mask, color, op=1.0):
        lib.paint(self.L, mask, color, op)

    def rect(self, x0, y0, x1, y1, color, op=1.0, r=0.0):
        self.paint(lib.rect_mask(self.L.w, self.L.h, x0 * SS, y0 * SS, x1 * SS, y1 * SS, r * SS), color, op)

    def ell(self, cx, cy, rx, ry, color, op=1.0, blur=0.0):
        self.paint(lib.ellipse_mask(self.L.w, self.L.h, cx * SS, cy * SS, rx * SS, ry * SS, blur * SS if blur else 0.0), color, op)

    def line(self, pts, width, color, op=1.0, blur=0.0):
        self.paint(lib.line_mask(self.L.w, self.L.h, [(x * SS, y * SS) for x, y in pts], width * SS, blur * SS), color, op)

    def glow(self, cx, cy, r, color, strength=0.6):
        lib.glow(self.L, cx * SS, cy * SS, r * SS, color, strength)

    def smoke(self, x, y, hgt, seed=1, alpha=0.3):
        lib.smoke(self.L, x * SS, y * SS, hgt * SS, seed, alpha, 2.2 * SS)

    def image(self):
        return self.L.image((self.w, self.h))


def bands(spec):
    """deco for lathe: list of (t0, t1, colorhex) bands"""
    cols = [(a, b, hexc(c)) for a, b, c in spec]

    def f(u, t):
        for a, b, c in cols:
            if a <= t <= b:
                return c, np.ones_like(u) * 0.95
        return None, 0
    return f


# ====================================================================== materials (extra)
LACQ = M['lacquer']
GOLD = M['gold']
BRONZE = M['bronze']
WOOD = Mat('#8a5228', shine=0.15, rough=14, amb=0.42, diff=0.72, tex=tex_wood(scale=3.2, seed=31))
DWOOD = Mat('#4a2812', shine=0.22, rough=18, amb=0.42, diff=0.72, tex=tex_wood(scale=3.2, seed=32, dark='#1a0b04'))
STONE = M['stone']
GSTONE = Mat('#8e8b80', shine=0.06, rough=8, amb=0.45, diff=0.66, tex=tex_stone(33, 6, 0.25))
PAPER = M['paper']
YSILK = M['silk_yellow']
RSILK = M['silk_red']
PORC = M['porcelain']
JADE = Mat('#2f6e58', shine=0.6, rough=40, amb=0.4, diff=0.7, tex=tex_noise(0.12, 10, 34))
NAVY = Mat('#1c2a44', shine=0.5, rough=30, amb=0.4, diff=0.7, tex=tex_noise(0.1, 8, 35))
LEAF = M['leaf']
LEAF2 = Mat('#2c5424', shine=0.25, rough=14, amb=0.38, diff=0.8, tex=tex_noise(0.25, 3, 36, '#5c8a34'))
BARK = Mat('#6b5a4a', shine=0.05, rough=6, amb=0.42, diff=0.7, tex=tex_noise(0.35, 2, 37))
SOIL = M['soil']
IRON = M['iron']
BRASS = Mat('#c9963e', shine=0.8, rough=22, amb=0.38, diff=0.85, tex=lib.tex_gold(38), spec_col='#fff0c0')
CREAM = Mat('#efe3c4', shine=0.08, rough=8, amb=0.52, diff=0.55, tex=tex_noise(0.06, 3, 39))
INK = Mat('#1a1410', shine=0.4, rough=30, amb=0.4, diff=0.6)
CELADON = Mat('#7fa38a', shine=0.65, rough=44, amb=0.45, diff=0.65, tex=tex_noise(0.08, 6, 40))
BROWNGLAZE = Mat('#6a3a1c', shine=0.6, rough=40, amb=0.4, diff=0.7, tex=tex_noise(0.12, 5, 41))
WHITE = Mat('#f4f1ea', shine=0.2, rough=12, amb=0.6, diff=0.5)
FLOWER = Mat('#fbf4e2', shine=0.2, rough=10, amb=0.6, diff=0.5)


def blue_white(u, t):
    """Huế blue-and-white (đồ sứ ký kiểu) painted pattern: bands + cloud/flower blobs."""
    blue = hexc('#23408a')
    a = np.zeros_like(u)
    for t0, t1 in ((0.04, 0.07), (0.78, 0.8), (0.9, 0.93)):
        if t0 <= t <= t1:
            return blue, np.ones_like(u) * 0.9
    if 0.12 < t < 0.74:
        k = np.sin(u * 31 + t * 9) * np.sin(u * 17 - t * 23 + 1.3) + 0.35 * np.sin(t * 40 + u * 5)
        a = np.clip((k - 0.35) * 3, 0, 1) * 0.9
        return blue, a
    if 0.8 < t < 0.9:
        k = np.abs(np.sin(u * 40))
        return blue, (k > 0.7) * 0.8
    return None, 0


# ====================================================================== existing props, repainted
@sprite('hue-prop-co-le', 96, 192)
def co_le(p: P):
    p.shadow(48, 184, 26, 7)
    p.box(34, 172, 28, 10, 8, STONE, top=STONE)
    p.tube((44, 176), (44, 16), 3.2, LACQ)
    for y in (40, 100, 160):
        p.tube((44, y), (44, y + 3), 3.8, GOLD)
    p.blob(44, 12, 6, 6, GOLD)
    p.tube((44, 24), (90, 24), 2.0, GOLD)
    # banner with folds (yellow silk, red border, red sun)
    import numpy as _np
    pts = [(47, 26), (89, 26), (89, 116), (79, 106), (68, 120), (58, 106), (47, 118)]
    p.poly(pts, YSILK, n=(-0.1, 0.1, 1), grad=0.1)
    L = p.L
    yy, xx = np.mgrid[0:L.h, 0:L.w].astype(np.float32)
    mk = lib.poly_mask(L.w, L.h, [(x * SS, y * SS) for x, y in pts])
    folds = np.sin(xx / SS * 0.55) * 0.5 + 0.5
    L.rgb = L.rgb * (1 - mk[..., None] * 0.28 * (1 - folds[..., None]))
    inner = lib.poly_mask(L.w, L.h, [(x * SS, y * SS) for x, y in [(52, 31), (84, 31), (84, 104), (79, 99), (68, 112), (58, 99), (52, 108)]])
    border = np.clip(mk - inner, 0, 1)
    p.paint(border, '#b5221a', 0.95)
    p.ell(68, 62, 11, 11, '#c42a1a')
    p.ell(68, 62, 13.5, 13.5, '#c42a1a', 0.35)
    for k in range(12):
        a = k / 12 * 2 * math.pi
        p.line([(68 + math.cos(a) * 14, 62 + math.sin(a) * 14), (68 + math.cos(a) * 19, 62 + math.sin(a) * 19)], 1.6, '#c42a1a', 0.85)
    L.rgb = L.rgb * (1 - mk[..., None] * 0.18 * (1 - folds[..., None]))
    for x in (52, 68, 84):
        p.line([(x, 112), (x, 128)], 1.4, '#d4a03c')
        p.blob(x, 129, 2, 3, GOLD)


@sprite('hue-prop-chuong-ngu-phung', 144, 160)
def chuong(p: P):
    p.shadow(72, 150, 62, 9)
    for x in (16, 116):
        p.box(x - 2, 140, 16, 8, 6, STONE, top=STONE)
        p.box(x + 1, 26, 10, 3, 116, LACQ, top=LACQ)
    # beam with upturned ends
    p.poly([(4, 22), (14, 26), (130, 26), (140, 22), (138, 30), (128, 34), (16, 34), (6, 30)], LACQ, n=(-0.1, 0.4, 0.9))
    p.poly([(14, 20), (130, 20), (132, 26), (12, 26)], GOLD, n=(-0.2, 0.9, 0.4))
    p.rect(30, 26, 114, 27.2, '#e0b048')
    # bell
    p.tube((72, 34), (72, 46), 3, BRONZE)
    p.ring(72, 40, 6, 4, 1.6, BRONZE)

    def prof(t):
        if t > 0.94:
            return 10
        x = 1 - t
        return 18 + 14 * x ** 2.2 + 4 * (t < 0.07)
    deco = bands([(0.1, 0.13, '#5a3a18'), (0.45, 0.48, '#5a3a18'), (0.7, 0.72, '#6a4a20')])
    p.lathe(72, 128, prof, BRONZE, 78, deco=deco)
    p.blob(72, 112, 6, 5, M['bronze_dark'])  # striking boss


@sprite('hue-prop-an-ban-lich', 192, 128)
def an_ban_lich(p: P):
    p.shadow(96, 116, 90, 10)
    p.box(10, 52, 172, 30, 34, LACQ, top=Mat('#a4241a', shine=0.7, rough=50, amb=0.36, diff=0.8, tex=lib.tex_lacquer(42)))
    p.rect(10, 82, 182, 84, '#e0b048')
    p.rect(10, 112, 182, 114, '#c08a2a')
    # yellow silk drape
    pts = [(40, 82), (152, 82), (148, 108), (128, 104), (112, 110), (96, 104), (80, 110), (64, 104), (44, 108)]
    p.poly(pts, YSILK, n=(0, 0, 1), grad=0.25)
    L = p.L
    yy, xx = np.mgrid[0:L.h, 0:L.w].astype(np.float32)
    mk = lib.poly_mask(L.w, L.h, [(x * SS, y * SS) for x, y in pts])
    folds = np.sin(xx / SS * 0.4) * 0.5 + 0.5
    L.rgb = L.rgb * (1 - mk[..., None] * 0.3 * (1 - folds[..., None])) + mk[..., None] * 0.08 * folds[..., None] ** 4
    p.ell(96, 94, 9, 8, '#c42a1a', 0.9)
    p.ring(96, 94, 11, 10, 0.5, GOLD)
    # calendar books (yellow covers, red spines) stacked
    for i, (x, y, n) in enumerate(((30, 50, 4), (62, 52, 3), (128, 50, 2))):
        for k in range(n):
            yy = y - k * 6
            p.box(x, yy - 10, 30, 12, 5, Mat('#e9b83a', shine=0.2, rough=10, amb=0.5, diff=0.6), top=Mat('#f0c64a', shine=0.2, rough=10, amb=0.5, diff=0.6))
            p.rect(x, yy + 1.5, x + 4, yy + 7, '#a5261f')
    # seal box
    p.box(150, 38, 22, 14, 12, LACQ, top=LACQ)
    p.rect(150, 51, 172, 52.5, '#e0b048')
    p.blob(161, 44, 4, 2.5, GOLD)
    # censer + smoke
    p.lathe(100, 60, lambda t: 9 - 3 * t if t < 0.8 else 8, BRONZE, 14, top_open=True)
    p.smoke(100, 46, 36, 3, 0.28)
    for x in (18, 174):
        p.tube((x, 58), (x, 40), 2.4, RSILK)
        p.glow(x, 37, 9, '#ffb04a', 0.8)
        p.blob(x, 37, 1.6, 2.6, Mat('#fff2a8', amb=1.1, diff=0.2))


@sprite('hue-prop-den-cung-dinh', 64, 128)
def den(p: P):
    p.glow(32, 62, 30, '#ff9a40', 0.55)
    p.shadow(32, 121, 15, 5)
    p.lathe(32, 122, lambda t: 11 - 5 * t, STONE, 8)
    p.tube((32, 116), (32, 26), 2.3, DWOOD)
    p.tube((32, 26), (32, 22), 3.2, GOLD)
    p.blob(32, 20, 3, 3, GOLD)
    p.tube((24, 30), (40, 30), 1.4, DWOOD)
    p.line([(32, 30), (32, 38)], 1, '#2a1a0a')
    p.lathe(32, 86, lambda t: 3 + 12 * math.sin(math.pi * min(1, max(0, t))) ** 0.8, Mat('#d0321c', shine=0.25, rough=10, amb=0.7, diff=0.5, tex=tex_noise(0.08, 3, 43)), 46,
            deco=lambda u, t: (hexc('#8a1810'), (np.abs(np.sin(u * 18)) < 0.12) * 0.7))
    p.lathe(32, 44, lambda t: 6, GOLD, 4)
    p.lathe(32, 90, lambda t: 6, GOLD, 4)
    p.glow(32, 64, 14, '#ffd27a', 0.5)
    p.line([(32, 90), (32, 104)], 2, '#e3a33a')
    p.blob(32, 105, 2.2, 3, GOLD)


@sprite('hue-prop-trong-nha-nhac', 144, 128)
def trong(p: P):
    p.shadow(72, 118, 60, 9)
    # stand legs
    for a, b in (((28, 118), (48, 70)), ((116, 118), (96, 70)), ((44, 120), (56, 72)), ((100, 120), (88, 72))):
        p.tube(a, b, 3.2, DWOOD)
    p.tube((40, 84), (104, 84), 2.4, DWOOD)
    deco = lambda u, t: (hexc('#e0b048'), ((np.abs(np.sin(u * 50)) > 0.9) & ((abs(t - 0.12) < 0.05) | (abs(t - 0.88) < 0.05))) * 1.0)  # noqa: E731
    p.lathe(72, 96, lambda t: 40 + 5 * math.sin(math.pi * t), LACQ, 44, cap_mat=Mat('#e2cf9e', shine=0.1, rough=6, amb=0.62, diff=0.45, tex=tex_noise(0.08, 6, 44)), deco=deco)
    p.ring(72, 52, 33, 10.5, 0.9, Mat('#b8392a', amb=0.6, diff=0.5))
    p.ell(72, 52, 12, 4, '#c43a24', 0.6)
    p.tube((54, 44), (96, 30), 1.8, DWOOD)
    p.tube((60, 50), (104, 40), 1.8, DWOOD)
    p.blob(96, 30, 2.6, 2.6, RSILK)
    p.blob(104, 40, 2.6, 2.6, RSILK)


@sprite('hue-prop-bien-khanh', 96, 128)
def bien_khanh(p: P):
    p.shadow(48, 120, 42, 7)
    for x in (14, 82):
        p.box(x - 7, 112, 14, 8, 5, STONE, top=STONE)
        p.box(x - 3, 22, 6, 2, 92, LACQ, top=LACQ)
    p.poly([(4, 18), (92, 18), (90, 26), (6, 26)], LACQ, n=(-0.1, 0.5, 0.9))
    p.poly([(2, 14), (94, 14), (92, 18), (4, 18)], GOLD, n=(-0.2, 0.9, 0.4))
    for x in (34, 62):
        p.line([(x, 26), (x, 46)], 1.0, '#2a1a0a')
    p.poly([(18, 50), (48, 40), (78, 50), (76, 60), (48, 52), (20, 60)], JADE, n=(-0.25, 0.25, 0.94), grad=0.3)
    p.poly([(18, 60), (48, 52), (78, 60), (78, 63), (48, 55), (18, 63)], Mat('#1c4a3a', amb=0.5, diff=0.5))
    p.tube((68, 96), (82, 70), 1.4, DWOOD)
    p.blob(82, 69, 4, 3, Mat('#c9b088', amb=0.5, diff=0.6))


@sprite('hue-prop-hon-thien-nghi', 96, 128)
def armillary(p: P):
    p.shadow(48, 120, 30, 7)
    p.lathe(48, 122, lambda t: 20 - 6 * t, STONE, 10)
    p.lathe(48, 112, lambda t: 6 + 4 * (t < 0.15) + 3 * (t > 0.85), BRONZE, 30)
    cx, cy = 48, 56
    p.ring(cx, cy, 34, 34, 1.8, BRONZE, back_only=True)
    p.ring(cx, cy, 34, 12, 1.6, BRASS, rot=0.35, back_only=True)
    p.ring(cx, cy, 12, 34, 1.4, BRASS, rot=0.2, back_only=True)
    p.blob(cx, cy, 8, 8, Mat('#3a6aa0', shine=0.6, rough=30, amb=0.4, diff=0.8))
    p.tube((cx - 34, cy + 16), (cx + 34, cy - 16), 1.2, BRASS)
    p.ring(cx, cy, 34, 34, 1.8, BRONZE, front_only=True)
    p.ring(cx, cy, 34, 12, 1.6, BRASS, rot=0.35, front_only=True)
    p.ring(cx, cy, 12, 34, 1.4, BRASS, rot=0.2, front_only=True)
    p.ring(cx, cy + 8, 38, 9, 2.0, BRONZE)
    p.blob(cx, cy - 36, 3.5, 3.5, GOLD)


def cabinet(p: P, x, y, w, h, depth, rows=3, seed=1, kind='scrolls'):
    rs = np.random.default_rng(seed)
    p.box(x, y, w, h, depth, DWOOD, top=DWOOD)
    fy0 = y + h
    inner_top, inner_bot = fy0 + 5, fy0 + depth - 6
    rh = (inner_bot - inner_top) / rows
    for r in range(rows):
        yt = inner_top + r * rh + 1.5
        yb = inner_top + (r + 1) * rh - 1.5
        p.rect(x + 5, yt, x + w - 5, yb, '#1a0d05')
        p.rect(x + 5, yb - 1.5, x + w - 5, yb, '#2c1a0c', 0.9)
        cx = x + 8
        while cx < x + w - 10:
            k = rs.random()
            if kind == 'books' or k < 0.35:
                # bundle of books (imperial yellow / brown covers), standing
                n = int(rs.integers(3, 7))
                for i in range(n):
                    bw = 2.8 + rs.random() * 1.2
                    bh = (yb - yt) * (0.6 + rs.random() * 0.35)
                    col = ['#d9a33a', '#8a4a1c', '#a5261f', '#5a3a1a', '#c9b37a'][int(rs.integers(0, 5))]
                    p.poly([(cx, yb - bh), (cx + bw, yb - bh), (cx + bw, yb), (cx, yb)], Mat(col, shine=0.15, rough=10, amb=0.5, diff=0.65, tex=tex_noise(0.08, 2, int(rs.integers(1, 99)))), n=(-0.3, 0.1, 0.95), grad=0.25)
                    cx += bw + 0.4
                cx += 2
            elif k < 0.8:
                # stacked scrolls seen end-on
                n = int(rs.integers(2, 5))
                rr = min(3.6, (yb - yt) / 4.2)
                for i in range(n):
                    px = cx + rr + (i % 2) * rr * 1.9
                    py = yb - rr - (i // 2) * rr * 1.8
                    p.blob(px, py, rr, rr, CREAM, flat=0.4)
                    p.ell(px, py, rr * 0.35, rr * 0.35, '#7a5a3a', 0.8)
                    if rs.random() < 0.5:
                        p.rect(px - rr, py - 0.6, px + rr, py + 0.6, '#b02a1c', 0.9)
                cx += rr * 4.2 + 2
            else:
                bw = 12 + rs.random() * 6
                bh = min((yb - yt) * 0.7, 10)
                p.box(cx, yb - bh - 2, bw, 2, bh, LACQ, top=LACQ)
                p.rect(cx, yb - bh / 2, cx + bw, yb - bh / 2 + 0.8, '#e0b048')
                cx += bw + 3
    p.rect(x, fy0, x + w, fy0 + 1.2, '#7a4a24')


@sprite('hue-prop-ke-chau-ban', 192, 128)
def ke_chau_ban(p: P):
    p.shadow(96, 120, 92, 7)
    cabinet(p, 8, 14, 176, 10, 100, rows=3, seed=4)
    p.poly([(4, 10), (188, 10), (186, 15), (6, 15)], DWOOD, n=(-0.1, 0.9, 0.4))
    p.rect(8, 15, 184, 16.4, '#d4a03c')


@sprite('hue-prop-dinh-dong', 112, 128)
def dinh(p: P):
    p.shadow(56, 120, 46, 8)
    for x0, x1 in ((30, 36), (82, 76), (56, 56)):
        p.tube((x1, 98), (x0, 122), 4.0, M['bronze_dark'], r1=3.0)
    deco = bands([(0.18, 0.24, '#6a4a22'), (0.62, 0.66, '#6a4a22')])
    p.lathe(56, 108, lambda t: 30 + 12 * math.sin(math.pi * min(1, t * 1.2)) if t < 0.85 else 30, BRONZE, 52, deco=deco)
    # relief band (cloud & dragon-ish bosses)
    for k in range(5):
        a = (k + 0.5) / 5 * math.pi
        x = 56 - math.cos(a) * 38
        p.blob(x, 84 + math.sin(a) * 4, 3.2, 2.6, M['bronze_dark'])
    # handles
    p.ring(18, 54, 6, 8, 1.8, BRONZE)
    p.ring(94, 54, 6, 8, 1.8, BRONZE)
    # lid
    p.lathe(56, 60, lambda t: 32 * (1 - t) ** 0.6 + 2, BRONZE, 16)
    p.blob(56, 42, 5, 4, GOLD)


@sprite('hue-prop-hoanh-phi', 192, 112)
def hoanh_phi(p: P):
    p.shadow(96, 100, 88, 4, 0.3)
    p.box(6, 20, 180, 4, 74, LACQ, top=GOLD)
    p.rect(12, 30, 180, 88, '#1c0a06')
    p.rect(14, 32, 178, 86, '#7a1610')
    L = p.L
    m_outer = lib.rect_mask(L.w, L.h, 9 * SS, 27 * SS, 183 * SS, 91 * SS) - lib.rect_mask(L.w, L.h, 13 * SS, 31 * SS, 179 * SS, 87 * SS)
    lib.paint(L, np.clip(m_outer, 0, 1), '#e3b24c')
    # abstract gilded calligraphy strokes (not readable text): 4 glyph-like clusters
    rs = np.random.default_rng(9)
    for g in range(4):
        gx = 38 + g * 39
        for _ in range(7):
            x0, y0 = gx + rs.uniform(-10, 10), 46 + rs.uniform(-6, 26)
            if rs.random() < 0.55:
                pts = [(x0, y0), (x0 + rs.uniform(6, 16) * rs.choice([-1, 1]), y0 + rs.uniform(-2, 2))]
            else:
                pts = [(x0, y0), (x0 + rs.uniform(-3, 3), y0 + rs.uniform(6, 16))]
            p.line(pts, 2.2, '#f0c860')
    # carved corner scrolls
    for cx, cy in ((16, 34), (176, 34), (16, 84), (176, 84)):
        p.ring(cx, cy, 5, 5, 0.9, GOLD)


@sprite('hue-prop-bia-pham-son', 96, 112)
def bia(p: P):
    p.shadow(48, 104, 44, 7)
    for cx in (28, 68):
        p.box(cx - 15, 92, 30, 8, 7, GSTONE, top=GSTONE)
        top = [(cx - 10, 34), (cx - 6, 26), (cx, 24), (cx + 6, 26), (cx + 10, 34)]
        p.poly(top + [(cx + 10, 94), (cx - 10, 94)], GSTONE, n=(-0.2, 0.15, 0.97), grad=0.25)
        p.poly([(cx + 10, 34), (cx + 13, 36), (cx + 13, 95), (cx + 10, 94)], Mat('#6d6a60', amb=0.45, diff=0.5, tex=tex_stone(45)))
        for k in range(3):
            p.line([(cx - 5 + k * 5, 42), (cx - 5 + k * 5, 84)], 1.0, '#4a463c', 0.55)
        p.ell(cx, 34, 3.5, 3.5, '#4a463c', 0.5)


def bonsai(p: P, cx, top, size=1.0, seed=3):
    rs = np.random.default_rng(seed)
    p.tube((cx, top + 26 * size), (cx - 6 * size, top + 12 * size), 3.2 * size, BARK, r1=2.4 * size)
    p.tube((cx - 6 * size, top + 12 * size), (cx + 4 * size, top + 2 * size), 2.4 * size, BARK, r1=1.6 * size)
    p.tube((cx - 4 * size, top + 14 * size), (cx - 16 * size, top + 8 * size), 1.6 * size, BARK, r1=1.0 * size)
    for (ox, oy, r) in ((4, 0, 12), (-16, 6, 9), (12, 10, 8), (-4, -6, 9)):
        for _ in range(int(14 * size)):
            a = rs.random() * 2 * math.pi
            d = rs.random() ** 0.6 * r * size
            p.blob(cx + ox * size + math.cos(a) * d, top + oy * size + math.sin(a) * d * 0.6, 2.6 * size, 2.0 * size, LEAF if rs.random() < 0.6 else LEAF2)


@sprite('hue-prop-chau-kieng', 64, 96)
def chau_kieng(p: P):
    p.shadow(32, 90, 22, 6)
    p.lathe(32, 92, lambda t: 13 + 7 * t if t < 0.85 else 21, PORC, 26, top_open=True, cap_mat=PORC, deco=blue_white)
    p.ell(32, 66.5, 17, 4.6, '#3a2618')
    bonsai(p, 32, 34, 1.0, 5)


@sprite('hue-prop-ban-khac', 112, 96)
def ban_khac(p: P):
    p.shadow(56, 88, 52, 7)
    for x in (14, 94):
        p.box(x, 62, 6, 2, 26, DWOOD, top=DWOOD)
    p.box(8, 40, 96, 26, 8, WOOD, top=WOOD)
    p.box(26, 38, 44, 18, 6, DWOOD, top=Mat('#5a3418', shine=0.1, rough=6, amb=0.48, diff=0.6, tex=tex_wood(2.0, seed=46, dark='#1a0b04')))
    rs = np.random.default_rng(3)
    for _ in range(26):  # carved relief texture on the woodblock
        x, y = rs.uniform(30, 66), rs.uniform(40, 54)
        p.line([(x, y), (x + rs.uniform(-3, 3), y + rs.uniform(-2, 2))], 0.8, '#1a0b04', 0.8)
    for i, x in enumerate((78, 84, 90)):
        p.tube((x, 42), (x + 4, 58), 0.9, IRON)
        p.tube((x, 42), (x - 1, 46), 1.6, DWOOD)
    for _ in range(18):
        p.ell(rs.uniform(14, 98), rs.uniform(44, 62), 1.2, 0.6, '#d9b07a', 0.9)
    p.box(12, 44, 12, 14, 1, PAPER, top=PAPER)


@sprite('hue-prop-tuong-tho', 160, 96)
def tuong_tho(p: P):
    p.box(6, 6, 148, 3, 82, DWOOD, top=DWOOD)
    p.rect(12, 14, 148, 82, '#ece0bf')
    L = p.L
    sub = lib.rect_mask(L.w, L.h, 14 * SS, 16 * SS, 84 * SS, 80 * SS)
    yy, xx = np.mgrid[0:L.h, 0:L.w].astype(np.float32) / SS
    n = lib.fbm(L.h, L.w, 40, 4, 47)
    ridge1 = 52 + 10 * np.sin(xx * 0.12 + 1) + 8 * n
    ridge2 = 62 + 6 * np.sin(xx * 0.2) + 6 * n
    ink = np.clip((yy - ridge1) / 10, 0, 1) * 0.35 + np.clip((yy - ridge2) / 6, 0, 1) * 0.45
    lib.paint(L, sub * np.clip(ink, 0, 1), '#2a2620')
    p.ell(66, 32, 6, 6, '#b5221a', 0.85)  # red sun
    rs = np.random.default_rng(12)
    for c in range(5):
        x = 96 + c * 10
        y = 22
        while y < 74:
            ln = rs.uniform(3, 7)
            p.line([(x + rs.uniform(-2, 2), y), (x + rs.uniform(-2, 2), y + ln)], 1.4, '#2a2620', 0.85)
            y += ln + rs.uniform(1.5, 4)
    p.rect(138, 66, 144, 72, '#b5221a', 0.9)
    p.rect(12, 14, 148, 15.4, '#d4a03c')
    p.rect(12, 80.6, 148, 82, '#d4a03c')


@sprite('hue-prop-ban-in-lich', 144, 80)
def ban_in(p: P):
    p.shadow(72, 72, 68, 7)
    for x in (12, 126):
        p.box(x, 50, 6, 2, 22, DWOOD, top=DWOOD)
    p.box(6, 26, 132, 26, 8, WOOD, top=WOOD)
    for i in range(6):
        p.box(18, 32 - i * 1.6, 34, 16, 1.6, PAPER, top=PAPER)
    p.box(60, 30, 30, 16, 4, Mat('#141010', shine=0.5, rough=40, amb=0.35, diff=0.6), top=Mat('#141010', shine=0.7, rough=50, amb=0.35, diff=0.6))
    p.tube((98, 36), (124, 34), 2.6, DWOOD)
    p.tube((94, 36), (98, 36), 1.2, DWOOD)
    p.tube((124, 34), (128, 34), 1.2, DWOOD)
    p.box(100, 40, 26, 9, 1.2, PAPER, top=Mat('#efe2c2', amb=0.55, diff=0.5, tex=tex_noise(0.05, 3, 48)))
    for k in range(4):
        p.line([(104, 42 + k * 1.8), (122, 42 + k * 1.8)], 0.6, '#3a2a1a', 0.7)


@sprite('hue-prop-mam-banh-beo', 80, 64)
def banh_beo(p: P):
    p.shadow(40, 56, 34, 7)
    p.lathe(40, 58, lambda t: 32 - 2 * t, LACQ, 6)
    p.ell(40, 51, 29, 9, '#7a1610', 0.5)
    pos = [(40, 50), (24, 49), (56, 49), (32, 44), (48, 44), (18, 54), (62, 54), (30, 56), (50, 56)]
    for x, y in sorted(pos, key=lambda q: q[1]):
        p.lathe(x, y + 3, lambda t: 5.4 - 1.5 * (1 - t), PORC, 3, top_open=False, cap_mat=WHITE)
        p.ell(x, y - 0.2, 4.0, 1.5, '#fbf6ea')
        p.ell(x, y - 0.6, 1.4, 0.8, '#e2702a')
        p.ell(x + 1.6, y + 0.2, 0.6, 0.4, '#5b8a2a')


@sprite('hue-prop-hop-an', 64, 56)
def hop_an(p: P):
    p.shadow(32, 50, 26, 5)
    p.box(10, 26, 44, 14, 14, LACQ, top=LACQ)
    p.box(13, 18, 38, 10, 9, LACQ, top=Mat('#b0281c', shine=0.75, rough=50, amb=0.36, diff=0.8))
    for y in (27.5, 40):
        p.rect(10, y, 54, y + 1.2, '#e0b048')
    p.blob(32, 23, 5, 3, GOLD)
    p.rect(30, 30, 34, 36, '#e0b048')


# ====================================================================== new room decor
def dragon_deco(u, t):
    k = np.sin(u * 2 * math.pi * 1.0 + t * 26) * 0.5 + 0.5
    scales = np.abs(np.sin(u * 60 + t * 140)) > 0.6
    body = (np.abs(k - 0.5) < 0.16)
    gold = hexc('#e2b04a')
    a = body * (0.95 - 0.25 * scales)
    for t0 in (0.02, 0.97):
        if abs(t - t0) < 0.02:
            return gold, np.ones_like(u)
    return gold, a


@sprite('hue-decor-cot-rong', 64, 176)
def cot_rong(p: P):
    p.shadow(32, 168, 26, 7)
    p.lathe(32, 170, lambda t: 19 - 4 * t if t < 0.6 else 15 - 6 * (t - 0.6), STONE, 12)
    p.lathe(32, 160, lambda t: 12.5 - 1.2 * t, LACQ, 158, deco=dragon_deco)


@sprite('hue-decor-cot-son', 64, 176)
def cot_son(p: P):
    p.shadow(32, 168, 26, 7)
    p.lathe(32, 170, lambda t: 19 - 4 * t if t < 0.6 else 15 - 6 * (t - 0.6), STONE, 12)
    p.lathe(32, 160, lambda t: 12 - 1.0 * t, LACQ, 158, deco=bands([(0.02, 0.05, '#e2b04a'), (0.94, 0.98, '#e2b04a'), (0.5, 0.515, '#c9963e')]))


@sprite('hue-decor-ngai-vang', 160, 128)
def ngai(p: P):
    p.shadow(80, 120, 76, 9)
    # two-step dais
    p.box(6, 92, 148, 14, 14, LACQ, top=Mat('#8f1d16', shine=0.4, rough=30, amb=0.4, diff=0.75))
    p.rect(6, 106, 154, 107.2, '#e0b048')
    p.box(22, 78, 116, 14, 10, LACQ, top=Mat('#a4241a', shine=0.5, rough=40, amb=0.4, diff=0.75))
    p.rect(22, 92, 138, 93.2, '#e0b048')
    GL = Mat('#d9a53a', shine=0.95, rough=24, amb=0.4, diff=0.85, tex=lib.tex_gold(49), spec_col='#fff1c0')
    # backrest
    p.poly([(46, 30), (58, 18), (80, 14), (102, 18), (114, 30), (114, 70), (46, 70)], GL, n=(-0.15, 0.2, 0.97), grad=0.3)
    p.poly([(54, 34), (64, 26), (80, 23), (96, 26), (106, 34), (106, 66), (54, 66)], LACQ, n=(-0.1, 0.2, 0.97), grad=0.2)
    p.blob(80, 44, 9, 9, GL)
    p.ring(80, 44, 13, 13, 1.0, GL)
    # seat + yellow cushion
    p.box(44, 64, 72, 12, 14, GL, top=GL)
    p.blob(80, 69, 30, 6, YSILK, flat=0.5)
    # arm rests with dragon-head finials
    for x in (40, 112):
        p.box(x, 50, 8, 18, 22, GL, top=GL)
        p.blob(x + 4, 48, 5.5, 4.5, GL)
        p.blob(x + 4 + (2 if x > 80 else -2), 46, 1.4, 1.4, Mat('#a8231a', shine=0.8, rough=40))


@sprite('hue-decor-hac-dong', 64, 128)
def hac(p: P):
    p.shadow(32, 120, 22, 6)
    # turtle
    p.blob(32, 112, 19, 9, BRONZE, flat=0.7)
    for k in range(6):
        p.ring(24 + (k % 3) * 8, 109 + (k // 3) * 5, 3.2, 2.0, 0.5, M['bronze_dark'])
    p.blob(52, 112, 5, 4, BRONZE)
    # crane legs
    p.tube((28, 106), (30, 72), 1.4, M['bronze_dark'])
    p.tube((36, 106), (34, 72), 1.4, M['bronze_dark'])
    # body
    p.blob(32, 64, 12, 10, BRONZE)
    p.poly([(22, 60), (12, 74), (26, 70)], BRONZE, n=(-0.4, 0.2, 0.9))  # tail feathers
    # neck (S-curve) + head + beak
    pts = [(36, 58), (40, 46), (36, 34), (38, 24), (42, 18)]
    for a, b in zip(pts, pts[1:]):
        p.tube(a, b, 2.4, BRONZE)
    p.blob(43, 16, 4, 3.6, BRONZE)
    p.poly([(46, 15), (60, 8), (47, 18)], M['bronze_dark'], n=(0, 0.5, 0.8))
    p.blob(42, 13, 1.6, 1.0, Mat('#a8231a', shine=0.6, rough=30))


@sprite('hue-decor-lu-huong', 80, 96)
def lu_huong(p: P):
    p.shadow(40, 88, 30, 6)
    for x0, x1 in ((24, 28), (56, 52), (40, 40)):
        p.tube((x1, 74), (x0, 90), 3.2, M['bronze_dark'], r1=2.4)
    p.lathe(40, 82, lambda t: 18 + 8 * math.sin(math.pi * min(1, t * 1.1)), BRONZE, 26, deco=bands([(0.7, 0.76, '#6a4a22')]))
    p.ring(12, 58, 4, 6, 1.4, BRONZE)
    p.ring(68, 58, 4, 6, 1.4, BRONZE)
    p.lathe(40, 58, lambda t: 20 * (1 - t) ** 0.7 + 3, BRONZE, 12)
    p.blob(40, 44, 5, 5, GOLD)
    p.smoke(40, 40, 38, 5, 0.32)


@sprite('hue-decor-binh-su', 48, 96)
def binh_su(p: P):
    p.shadow(24, 90, 15, 5)

    def prof(t):
        if t < 0.05:
            return 9
        if t < 0.62:
            return 9 + 8 * math.sin(math.pi * (t - 0.05) / 0.62)
        if t < 0.88:
            return 6 + 2 * (t - 0.62) / 0.26
        return 8.5
    p.lathe(24, 92, prof, PORC, 82, top_open=True, deco=blue_white)


@sprite('hue-decor-truong-ky', 112, 64)
def truong_ky(p: P):
    p.shadow(56, 58, 52, 6)
    for x in (10, 96):
        p.box(x, 40, 6, 2, 18, DWOOD, top=DWOOD)
    p.box(6, 22, 100, 18, 8, DWOOD, top=Mat('#5a3016', shine=0.35, rough=30, amb=0.42, diff=0.72, tex=tex_wood(3.0, seed=50, vertical=False, dark='#1a0b04')))
    p.poly([(16, 38), (96, 38), (90, 46), (22, 46)], DWOOD, n=(-0.1, -0.1, 1), grad=0.3)
    for x in (30, 56, 82):
        p.blob(x, 28, 10, 4, Mat('#7a1a3a', shine=0.2, rough=10, amb=0.5, diff=0.65, tex=tex_noise(0.08, 2, 51)), flat=0.5)


@sprite('hue-decor-dan-tranh', 96, 80)
def dan_tranh(p: P):
    p.shadow(48, 72, 44, 6)
    for x in (16, 78):
        p.box(x, 52, 4, 2, 20, DWOOD, top=DWOOD)
    p.box(10, 46, 76, 8, 5, DWOOD, top=DWOOD)
    board = [(8, 40), (88, 30), (90, 38), (10, 50)]
    p.poly(board, Mat('#a06a3a', shine=0.4, rough=30, amb=0.45, diff=0.7, tex=tex_wood(2.5, seed=52, vertical=False)), n=(-0.1, 0.8, 0.6))
    p.poly([(10, 50), (90, 38), (90, 41), (10, 53)], DWOOD, n=(0, 0, 1))
    for k in range(9):
        f = (k + 0.5) / 9
        y0 = 41.5 + (48.5 - 41.5) * f
        y1 = 31.5 + (37 - 31.5) * f
        p.line([(12, y0), (86, y1)], 0.35, '#f3e6c0', 0.9)
        bx = 30 + ((k * 37) % 40)
        by = y0 + (y1 - y0) * (bx - 12) / 74
        p.blob(bx, by - 0.6, 1.2, 0.9, CREAM)


@sprite('hue-decor-ke-sach', 112, 128)
def ke_sach(p: P):
    p.shadow(56, 121, 52, 6)
    cabinet(p, 8, 24, 96, 10, 90, rows=3, seed=8, kind='mixed')
    p.poly([(4, 20), (108, 20), (106, 25), (6, 25)], DWOOD, n=(-0.1, 0.9, 0.4))
    p.lathe(28, 24, lambda t: 5 + 3 * math.sin(math.pi * t) if t < 0.8 else 3, CELADON, 16)
    p.box(66, 14, 26, 8, 4, LACQ, top=LACQ)


@sprite('hue-decor-kinh-thien-van', 64, 112)
def kinh(p: P):
    p.shadow(32, 106, 22, 5)
    for a in ((14, 106), (50, 106), (34, 98)):
        p.tube((32, 62), a, 1.5, DWOOD)
    p.blob(32, 62, 3.4, 3.4, BRASS)
    p.tube((10, 76), (56, 24), 4.6, BRASS, r1=3.4)
    for f in (0.12, 0.5, 0.86):
        x, y = 10 + 46 * f, 76 - 52 * f
        p.tube((x - 1, y + 1.1), (x + 1, y - 1.1), 5.0 - 1.4 * f, Mat('#6a4a1c', shine=0.5, rough=30))
    p.blob(10, 76, 3.0, 3.0, INK)


@sprite('hue-decor-thien-cau', 80, 112)
def thien_cau(p: P):
    p.shadow(40, 106, 26, 6)
    for a, b in (((24, 106), (34, 80)), ((56, 106), (46, 80)), ((34, 108), (38, 80)), ((46, 108), (42, 80))):
        p.tube(a, b, 1.8, DWOOD)
    p.lathe(40, 82, lambda t: 6 + 10 * t, DWOOD, 8)
    p.ring(40, 52, 26, 26, 1.3, BRASS, rot=0.25, back_only=True)
    cx, cy = 40, 52
    p.blob(cx, cy, 22, 22, NAVY)
    rs = np.random.default_rng(14)
    stars = []
    for _ in range(26):
        a = rs.random() * 2 * math.pi
        d = rs.random() ** 0.7 * 19
        stars.append((cx + math.cos(a) * d, cy + math.sin(a) * d))
        p.ell(stars[-1][0], stars[-1][1], 0.8, 0.8, '#ffe29a')
    for a, b in zip(stars[:6], stars[1:7]):
        p.line([a, b], 0.35, '#d9b060', 0.7)
    p.ring(cx, cy, 22, 7, 0.8, BRASS, rot=-0.3)
    p.ring(40, 52, 26, 26, 1.3, BRASS, rot=0.25, front_only=True)


@sprite('hue-decor-nhat-quy', 80, 80)
def nhat_quy(p: P):
    p.shadow(40, 74, 30, 6)
    p.lathe(40, 76, lambda t: 14 - 5 * math.sin(math.pi * t) + 4 * (t < 0.15), GSTONE, 26)
    p.lathe(40, 52, lambda t: 30, GSTONE, 5, cap_mat=Mat('#b6b1a3', shine=0.1, rough=8, amb=0.5, diff=0.6, tex=tex_stone(53)))
    for k in range(12):
        a = math.pi + k / 11 * math.pi
        p.line([(40 + math.cos(a) * 12, 46 + math.sin(a) * 4), (40 + math.cos(a) * 26, 46 + math.sin(a) * 8.6)], 0.6, '#4a463c', 0.8)
    p.poly([(40, 46), (40, 32), (52, 46)], BRONZE, n=(-0.5, 0.3, 0.8))
    p.ring(40, 46, 26, 8.6, 0.5, Mat('#4a463c', amb=0.6, diff=0.3))


@sprite('hue-decor-an-thu', 112, 80)
def an_thu(p: P):
    p.shadow(56, 72, 52, 6)
    for x in (10, 96):
        p.box(x, 50, 6, 2, 22, DWOOD, top=DWOOD)
    p.poly([(4, 26), (14, 30), (98, 30), (108, 26), (106, 32), (96, 34), (16, 34), (6, 32)], DWOOD, n=(-0.1, 0.9, 0.4))
    p.box(8, 30, 96, 20, 6, DWOOD, top=Mat('#3a1f0e', shine=0.45, rough=40, amb=0.4, diff=0.72, tex=tex_wood(3.0, seed=54, vertical=False, dark='#120804')))
    p.box(18, 32, 38, 13, 0.8, PAPER, top=Mat('#f1e6c8', amb=0.6, diff=0.45, tex=tex_noise(0.04, 3, 55)))
    rs = np.random.default_rng(6)
    for c in range(5):
        x = 50 - c * 6
        y = 34
        while y < 43:
            ln = rs.uniform(1.5, 3.5)
            p.line([(x, y), (x, y + ln)], 0.9, '#1a1410', 0.85)
            y += ln + 1.2
    p.box(62, 34, 12, 8, 2, Mat('#2a2a2c', shine=0.5, rough=30, amb=0.4, diff=0.6), top=Mat('#2a2a2c', shine=0.6, rough=40, amb=0.4, diff=0.6))
    p.ell(68, 37, 3, 1.6, '#0a0a0a')
    p.lathe(86, 44, lambda t: 5, PORC, 12, top_open=True, deco=blue_white)
    for dx, h in ((-2, 12), (0, 16), (2, 13)):
        p.tube((86 + dx, 33), (86 + dx * 2.2, 33 - h), 0.8, Mat('#7a5a2a', amb=0.5, diff=0.6))
    p.tube((60, 46), (78, 44), 0.9, DWOOD)


@sprite('hue-decor-ruong', 96, 72)
def ruong(p: P):
    p.shadow(48, 66, 44, 6)
    p.box(8, 22, 80, 18, 26, LACQ, top=Mat('#a4241a', shine=0.65, rough=46, amb=0.38, diff=0.8))
    for x in (8, 84):
        p.rect(x, 40, x + 4, 66, '#c9963e')
    p.rect(8, 40, 88, 41.6, '#e0b048')
    p.rect(8, 64, 88, 66, '#c9963e')
    p.rect(42, 44, 54, 56, '#d9a53a')
    p.ell(48, 50, 2, 2.6, '#2a1a0a')
    for x in (12, 84):
        p.rect(x, 22, x + 2, 40, '#c9963e', 0.8)


@sprite('hue-decor-chum-cuon', 64, 80)
def chum_cuon(p: P):
    p.shadow(32, 74, 22, 6)
    # scrolls behind the rim
    for (x0, y0), (x1, y1) in (((22, 46), (16, 20)), ((32, 44), (34, 14)), ((40, 46), (48, 22)), ((28, 46), (24, 24))):
        p.tube((x0, y0), (x1, y1), 3.2, CREAM)
        p.blob(x1, y1, 3.2, 2.4, Mat('#c9b88e', amb=0.5, diff=0.6))
        p.ell(x1, y1, 1.2, 0.9, '#7a5a3a')
        p.tube((x0 + (x1 - x0) * 0.6 - 2, y0 + (y1 - y0) * 0.6), (x0 + (x1 - x0) * 0.6 + 2, y0 + (y1 - y0) * 0.6), 1.0, RSILK)
    p.lathe(32, 76, lambda t: 12 + 9 * math.sin(math.pi * min(1, t * 1.15)) if t < 0.86 else 13, BROWNGLAZE, 32, top_open=True)


@sprite('hue-decor-den-da', 64, 112)
def den_da(p: P):
    p.glow(32, 54, 26, '#ff9a40', 0.5)
    p.shadow(32, 106, 20, 6)
    p.lathe(32, 108, lambda t: 16 - 6 * t, GSTONE, 10)
    p.lathe(32, 98, lambda t: 6 + 2 * (t < 0.1), GSTONE, 30)
    p.box(18, 60, 28, 8, 4, GSTONE, top=GSTONE)
    p.box(20, 44, 24, 6, 18, GSTONE, top=GSTONE)
    p.rect(26, 52, 38, 62, '#ffb34a')
    p.glow(32, 57, 9, '#ffd27a', 0.7)
    p.rect(31.4, 52, 32.6, 62, '#5a4a30')
    p.poly([(10, 46), (32, 30), (54, 46), (50, 50), (14, 50)], GSTONE, n=(-0.3, 0.7, 0.6), grad=0.3)
    p.poly([(14, 50), (50, 50), (48, 52), (16, 52)], Mat('#55524a', amb=0.5, diff=0.4))
    p.blob(32, 28, 3.4, 4, GSTONE)


@sprite('hue-decor-vac-dong', 96, 88)
def vac(p: P):
    p.shadow(48, 80, 42, 8)
    for x0 in (20, 76, 36, 60):
        p.tube((x0, 70), (x0 + (4 if x0 < 48 else -4), 82), 3.4, M['bronze_dark'], r1=2.6)
    p.lathe(48, 76, lambda t: 26 + 14 * math.sin(math.pi * min(1, 0.25 + t * 0.75)) ** 0.8, BRONZE, 40, top_open=True,
            deco=bands([(0.66, 0.72, '#6a4a22'), (0.9, 0.95, '#6a4a22')]))
    p.ring(8, 36, 5, 7, 1.6, BRONZE)
    p.ring(88, 36, 5, 7, 1.6, BRONZE)
    p.ell(48, 34, 30, 7, '#2a3a2a', 0.5)


@sprite('hue-decor-cay-dai', 192, 208)
def cay_dai(p: P):
    p.shadow(96, 198, 78, 16, 0.32, 0.9)
    br = [((96, 200), (92, 150), 7, 5.5), ((92, 150), (70, 110), 5.5, 4), ((92, 150), (118, 104), 5.2, 3.6),
          ((70, 110), (48, 80), 4, 2.6), ((70, 110), (84, 70), 3.6, 2.4), ((118, 104), (142, 76), 3.6, 2.4), ((118, 104), (110, 64), 3.2, 2.2),
          ((92, 150), (100, 96), 4.2, 3)]
    for a, b, r0, r1 in br:
        p.tube(a, b, r0, BARK, r1=r1)
    rs = np.random.default_rng(21)
    clusters = [(48, 72, 30), (84, 58, 30), (142, 68, 30), (110, 52, 28), (100, 88, 30), (66, 98, 22), (128, 96, 24)]
    DARKL = Mat('#1f3d1a', shine=0.15, rough=10, amb=0.4, diff=0.7, tex=tex_noise(0.2, 3, 56))
    for layer, (mat_a, mat_b, n, rad, lift) in enumerate(((DARKL, DARKL, 26, 1.0, 6), (LEAF2, LEAF, 34, 0.85, 0), (LEAF, LEAF, 18, 0.6, -5))):
        for cx, cy, r in clusters:
            for _ in range(n):
                a = rs.random() * 2 * math.pi
                d = rs.random() ** 0.6 * r * rad
                x, y = cx + math.cos(a) * d, cy + math.sin(a) * d * 0.68 + lift
                rr = 4.2 + rs.random() * 3.2
                p.blob(x, y, rr, rr * 0.72, mat_a if rs.random() < 0.5 else mat_b)
    for cx, cy, r in clusters:
        for _ in range(7):
            a = rs.random() * 2 * math.pi
            d = rs.random() ** 0.8 * r * 0.8
            x, y = cx + math.cos(a) * d, cy + math.sin(a) * d * 0.6 - 4
            for k in range(5):
                aa = k / 5 * 2 * math.pi + rs.random()
                p.blob(x + math.cos(aa) * 2.2, y + math.sin(aa) * 1.8, 2.0, 1.5, FLOWER)
            p.ell(x, y, 1.0, 1.0, '#f2c23a')


# ====================================================================== build + pack
def build(keys=None):
    out_dir = os.path.join(ROOT, 'assets/maps/co-do-hue/props')
    os.makedirs(out_dir, exist_ok=True)
    imgs = {}
    for key, (w, h, fn) in REG.items():
        path = os.path.join(out_dir, f'{key}.png')
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


def pack(imgs):
    """Shelf-pack into one atlas (<= 2048 wide)."""
    items = sorted(imgs.items(), key=lambda kv: -kv[1].height)
    maxw = 2048
    x = y = rowh = 0
    pos = {}
    for k, im in items:
        if x + im.width > maxw:
            x, y = 0, y + rowh + 2
            rowh = 0
        pos[k] = (x, y)
        x += im.width + 2
        rowh = max(rowh, im.height)
    W, H = maxw, y + rowh
    atlas = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    frames = {}
    for k, im in items:
        px, py = pos[k]
        atlas.alpha_composite(im, (px, py))
        frames[k] = {'frame': {'x': px, 'y': py, 'w': im.width, 'h': im.height}, 'rotated': False, 'trimmed': False,
                     'spriteSourceSize': {'x': 0, 'y': 0, 'w': im.width, 'h': im.height}, 'sourceSize': {'w': im.width, 'h': im.height}}
    pub = os.path.join(ROOT, 'apps/web/public/assets/maps/co-do-hue/atlas')
    os.makedirs(pub, exist_ok=True)
    atlas.save(os.path.join(pub, 'hue-decor-0.webp'), 'WEBP', quality=90, method=6)
    json.dump({'frames': frames, 'meta': {'app': 'tools/paint/props.py', 'image': 'hue-decor-0.webp', 'format': 'RGBA8888', 'size': {'w': W, 'h': H}, 'scale': '1'}},
              open(os.path.join(pub, 'hue-decor-0.json'), 'w'), indent=1)
    print('atlas', W, H, os.path.getsize(os.path.join(pub, 'hue-decor-0.webp')) // 1024, 'KB')
    return atlas, frames


if __name__ == '__main__':
    keys = set(sys.argv[1:]) or None
    imgs = build(keys)
    pack(imgs)
