"""
Thăng Long mini-game art, station medallions and HUD icons (painted, offline, no baked text).
  python3 tools/paint/tl_minigames.py [name ...]
Writes assets/maps/thang-long/{minigames,stations}/<name>.png,
       apps/web/public/assets/maps/thang-long/minigames/<name>.webp  (tl-mg-*, tl-ui-*)
       apps/web/public/assets/maps/thang-long/atlas/tl-stations-0.{webp,json}  (task-marker + tl-station-*)
Đông Hồ: tl-mg-tranh-{do,vang,xanh,den} are pixel-aligned transparent layers of one 320x400 print
(print order do -> vang -> xanh -> den); tl-mg-van-* are the matching (mirrored) woodblocks.
"""
from __future__ import annotations

import math
import os
import sys

import numpy as np
from PIL import Image
from scipy import ndimage

sys.path.insert(0, os.path.dirname(__file__))
import lib  # noqa: E402
from lib import M, Mat, hexc, tex_noise, tex_wood  # noqa: E402
from props import BRASS, BRONZE, DWOOD, GOLD, INK, LACQ, LEAF, LEAF2, P, PORC, RSILK, SS, WOOD, bands  # noqa: E402
import tl_props as TP  # noqa: E402
from tl_props import (BAMBOO, BAMBOO_D, BANANA, BANHCHUNG, CUSTARD, DONG, KUMQ, LIME, MUNG, PERSIM, POMELO, PORK, PUPPET,  # noqa: E402
                      REDP, RICE, SKIN, TERRA, abstract_strokes, arc_tube, banh_chung, lantern, neu, water_patch)
from tl_common import pack_atlas, pub, src  # noqa: E402

REG = {}  # name -> (w, h, kind, fn)   kind: mg | station | flat (fn returns PIL image)


def art(name, w, h, kind='mg'):
    def deco(fn):
        REG[name] = (w, h, kind, fn)
        return fn
    return deco


def m(col, shine=0.25, rough=14, amb=0.5, diff=0.65, tex=None, spec=None):
    kw = {'spec_col': spec} if spec else {}
    return Mat(col, shine=shine, rough=rough, amb=amb, diff=diff, tex=tex, **kw)


IVORY = m('#efe6cc', 0.3, 18, 0.58, 0.5, tex_noise(0.05, 3, 401))
BLACKC = m('#1e1a1c', 0.35, 24, 0.42, 0.62, tex_noise(0.06, 3, 402))
NAVYS = m('#1f2c4a', 0.3, 18, 0.45, 0.65, tex_noise(0.08, 2, 403))
BROWNS = m('#5a2e1c', 0.25, 16, 0.45, 0.65, tex_noise(0.08, 2, 404))
HAIR = m('#141012', 0.3, 20, 0.4, 0.6)
BEARD = m('#e8e4dc', 0.1, 8, 0.6, 0.5, tex_noise(0.2, 1, 405))
QUY = m('#2a1e34', 0.35, 20, 0.42, 0.7, tex_noise(0.15, 3, 406))
QUY_D = m('#160e1e', 0.3, 18, 0.4, 0.7, tex_noise(0.15, 3, 407))
HORN = m('#cfc2a0', 0.4, 22, 0.5, 0.6, tex_noise(0.1, 2, 408))
DUA = m('#6a4a22', 0.2, 10, 0.45, 0.7, tex_noise(0.4, 1, 409))
DUAG = m('#5f8a2e', 0.4, 22, 0.48, 0.7)
PAPAYA = m('#e98a2a', 0.5, 26, 0.5, 0.7, tex_noise(0.06, 3, 410))
PAPAYAG = m('#7aa83a', 0.5, 26, 0.48, 0.7)
MANGO = m('#f1c13a', 0.55, 28, 0.5, 0.7, tex_noise(0.05, 4, 411))
FIG = m('#7ea444', 0.45, 24, 0.48, 0.7, tex_noise(0.12, 2, 412))
BUDDHA = m('#e6c234', 0.45, 24, 0.5, 0.68, tex_noise(0.08, 2, 413))
STONEINK = m('#2a2a2e', 0.5, 30, 0.4, 0.7, tex_noise(0.12, 3, 414))
REDLAC = M['lacquer']
VOLT = '#fff2c0'


# ====================================================================== station medallions (128) + marker
def medallion(p: P, inner='#5a1410', glow='#a8301e'):
    p.shadow(64, 70, 58, 56, 0.35, 0.8)
    p.blob(64, 64, 60, 60, GOLD, flat=0.35)
    p.ell(64, 64, 51, 51, '#6a4a14')
    p.ell(64, 64, 49, 49, inner)
    p.ell(60, 56, 42, 38, glow, 0.55, blur=14)
    p.ring(64, 64, 49.5, 49.5, 0.9, GOLD)
    for k in range(8):  # small studs on the rim
        a = k / 8 * 2 * math.pi + math.pi / 8
        p.blob(64 + math.cos(a) * 55, 64 + math.sin(a) * 55, 1.8, 1.8, BRASS)


def station(name, inner='#5a1410', glow='#a8301e'):
    def deco(fn):
        def full(p: P):
            medallion(p, inner, glow)
            fn(p)
        REG[name] = (128, 128, 'station', full)
        return fn
    return deco


@art('task-marker', 64, 64, 'station')
def task_marker(p: P):
    p.glow(32, 32, 30, '#ffb04a', 0.45)
    p.ring(32, 32, 26, 26, 2.2, GOLD)
    p.ring(32, 32, 22, 22, 0.8, m('#d4321c', 0.4, 20, 0.6, 0.6))
    for k in range(4):
        a = k * math.pi / 2 - math.pi / 2
        x, y = 32 + math.cos(a) * 26, 32 + math.sin(a) * 26
        p.poly([(x, y - 4.5), (x + 3, y), (x, y + 4.5), (x - 3, y)], GOLD, n=(-0.3, -0.3, 0.9))
        p.glow(x, y, 5, VOLT, 0.5)


@station('tl-station-banh-chung')
def st_banh_chung(p: P):
    for a, c in ((-0.5, LEAF), (0.4, DONG), (1.2, LEAF2)):
        cx, cy = 64 + math.cos(a + 2.2) * 18, 66 + math.sin(a + 2.2) * 12
        p.poly([(cx - 22, cy + 4), (cx, cy - 8), (cx + 22, cy + 2), (cx, cy + 12)], c, n=(0.1, -0.2, 1), grad=0.2)
    banh_chung(p, 64, 92, 2.2)


@station('tl-station-dong-ho')
def st_dong_ho(p: P):
    TP.dongho_print(p, 36, 30, 56, 68, 1)


@station('tl-station-cho-chu')
def st_cho_chu(p: P):
    p.poly([(30, 40), (86, 34), (92, 92), (36, 98)], REDP, n=(-0.1, 0.1, 1), grad=0.15)
    p.line([(48, 52), (70, 50)], 4, '#1a0c08')
    p.line([(60, 44), (58, 86)], 4, '#1a0c08')
    p.line([(48, 70), (54, 78)], 3.2, '#1a0c08')
    p.line([(74, 64), (68, 80)], 3.2, '#1a0c08')
    p.tube((98, 22), (74, 74), 3.0, BAMBOO)
    p.tube((74, 74), (68, 88), 3.6, INK, r1=0.8)
    p.ring(98, 22, 2.5, 2.5, 0.6, m('#d4321c'))


@station('tl-station-cay-neu')
def st_cay_neu(p: P):
    neu(p, 60, 108, 26, 1.25, 3)


@station('tl-station-cau-doi')
def st_cau_doi(p: P):
    for x in (34, 74):
        TP.scroll(p, x, 26, 20, 76, x)


@station('tl-station-ngu-qua')
def st_ngu_qua(p: P):
    TP.fruit_tray(p, 64, 78, 1.35, 3)


@station('tl-station-ca-tru')
def st_ca_tru(p: P):
    drum_side(p, 58, 70, 1.0)
    p.tube((80, 30), (100, 92), 2.0, BAMBOO_D, r1=1.4)
    p.tube((92, 30), (92, 92), 2.0, BAMBOO_D, r1=1.4)


@station('tl-station-roi-nuoc', inner='#0e2430', glow='#1c4a52')
def st_roi_nuoc(p: P):
    water_patch(p, 64, 92, 44, 12, 4)
    teu(p, 64, 92, 0.42)


@station('tl-station-voi', inner='#141c38', glow='#2a3a6a')
def st_voi(p: P):
    p.ell(64, 70, 36, 26, '#e8ead8', 0.25, blur=6)
    TP.lime_mark(p, 64, 72, 32, 20)
    p.lathe(64, 66, lambda t: 16 - 6 * (1 - t) ** 2, TERRA, 16, top_open=True)
    p.ell(64, 50.5, 13.5, 4.2, '#f4f4ea')


@station('tl-station-phao', inner='#141c38', glow='#2a3a6a')
def st_phao(p: P):
    firecracker_string(p, 64, 24, 92, 1.0, 7)


# ====================================================================== shared painters
def firecracker_string(p: P, cx, y0, y1, s=1.0, seed=1):
    rs = np.random.default_rng(seed)
    p.tube((cx, y0 - 4 * s), (cx, y1), 1.0 * s, m('#3a2a1a'))
    n = int((y1 - y0) / (7 * s))
    for i in range(n):
        y = y0 + i * (y1 - y0) / n
        for side in (-1, 1):
            a = side * (0.7 + 0.2 * rs.random())
            x0 = cx + side * 1.5 * s
            x1 = cx + math.sin(a) * 14 * s
            y2 = y + math.cos(a) * 5 * s
            p.tube((x0, y + 2 * s), (x1, y2), 2.6 * s, REDP)
            p.ell(x1, y2, 2.2 * s, 2.4 * s, '#e8c060')
    p.poly([(cx - 9 * s, y1), (cx + 9 * s, y1), (cx, y1 + 16 * s)], REDP)
    p.line([(cx - 5 * s, y1 + 4 * s), (cx + 5 * s, y1 + 4 * s)], 1.2 * s, '#e8c060')


def drum_side(p: P, cx, cy, s=1.0):
    """Trống chầu seen from the side (barrel drum on a small stand)."""
    for sx in (-1, 1):
        p.tube((cx + sx * 16 * s, cy + 18 * s), (cx + sx * 24 * s, cy + 32 * s), 2.2 * s, DWOOD)
    p.lathe(cx, cy + 22 * s, lambda t: (21 + 5 * math.sin(math.pi * t)) * s, REDLAC, 40 * s, ry_ratio=0.32,
            deco=bands([(0.06, 0.1, '#e0b048'), (0.9, 0.94, '#e0b048')]))
    p.ell(cx, cy - 18 * s, 21 * s, 6.8 * s, '#d8c49a')
    p.ell(cx, cy - 18 * s, 13 * s, 4.2 * s, '#c8b088', 0.8)
    for k in range(12):
        a = k / 12 * 2 * math.pi
        p.ell(cx + math.cos(a) * 21 * s, cy - 18 * s + math.sin(a) * 6.8 * s, 0.9 * s, 0.9 * s, '#e0b048')


def teu(p: P, cx, yb, s=1.0):
    """Chú Tễu water puppet, waist-up, (cx, yb) = waterline."""
    # body + red bib
    p.blob(cx, yb - 60 * s, 46 * s, 64 * s, PUPPET, flat=0.6)
    p.poly([(cx - 30 * s, yb - 96 * s), (cx + 30 * s, yb - 96 * s), (cx + 36 * s, yb - 30 * s), (cx, yb - 8 * s), (cx - 36 * s, yb - 30 * s)],
           m('#c8281c', 0.45, 26, 0.5, 0.7), n=(-0.2, 0.1, 1), grad=0.25)
    p.ring(cx, yb - 66 * s, 22 * s, 18 * s, 1.6 * s, GOLD)
    p.ell(cx, yb - 50 * s, 3 * s, 3 * s, '#e8b048')
    # arms
    p.tube((cx - 40 * s, yb - 100 * s), (cx - 70 * s, yb - 140 * s), 10 * s, PUPPET, r1=8 * s)
    p.blob(cx - 72 * s, yb - 146 * s, 10 * s, 10 * s, SKIN)
    p.tube((cx + 40 * s, yb - 100 * s), (cx + 62 * s, yb - 70 * s), 10 * s, PUPPET, r1=8 * s)
    p.blob(cx + 64 * s, yb - 66 * s, 10 * s, 10 * s, SKIN)
    # head
    hy = yb - 150 * s
    p.blob(cx, hy, 36 * s, 34 * s, SKIN)
    p.blob(cx, hy - 34 * s, 7 * s, 6 * s, HAIR)  # trái đào tuft
    p.line([(cx - 3 * s, hy - 38 * s), (cx + 4 * s, hy - 44 * s)], 2 * s, '#141012')
    for sx in (-1, 1):
        p.ell(cx + sx * 13 * s, hy - 4 * s, 4.6 * s, 3 * s, '#1a1210')
        p.ell(cx + sx * 12 * s, hy - 5 * s, 1.4 * s, 1.2 * s, '#ffffff')
        p.line([(cx + sx * 7 * s, hy - 13 * s), (cx + sx * 19 * s, hy - 14 * s)], 2.2 * s, '#1a1210')
        p.ell(cx + sx * 22 * s, hy + 8 * s, 6 * s, 4 * s, '#e88a7a', 0.6, blur=2 * s)
    p.line([(cx - 12 * s, hy + 12 * s), (cx - 4 * s, hy + 18 * s), (cx + 4 * s, hy + 18 * s), (cx + 12 * s, hy + 12 * s)], 3 * s, '#8a2a1c')


def quy_figure(p: P, cx, yb, s=1.0, seed=3):
    """Quỷ: horned shadow spirit with ember eyes and ragged robe (folk-print stylised, not gory)."""
    rs = np.random.default_rng(seed)
    p.shadow(cx, yb, 40 * s, 8 * s, 0.4)
    pts = [(cx - 18 * s, yb - 120 * s), (cx + 18 * s, yb - 120 * s), (cx + 34 * s, yb - 60 * s)]
    for k in range(9):  # ragged hem
        f = k / 8
        pts.append((cx + (44 - 88 * f) * s, yb - (4 + 12 * (k % 2) + rs.uniform(0, 4)) * s))
    pts.append((cx - 34 * s, yb - 60 * s))
    p.poly(pts, QUY, n=(-0.3, 0.2, 0.9), grad=0.35)
    for sx in (-1, 1):  # clawed arms
        p.tube((cx + sx * 22 * s, yb - 100 * s), (cx + sx * 44 * s, yb - 66 * s), 6 * s, QUY_D, r1=4 * s)
        for k in range(3):
            p.tube((cx + sx * 44 * s, yb - 66 * s), (cx + sx * (48 + 3 * k) * s, yb - (56 - 4 * k) * s), 1.6 * s, HORN, r1=0.5 * s)
    hy = yb - 132 * s
    p.blob(cx, hy, 22 * s, 24 * s, QUY_D)
    for sx in (-1, 1):
        p.tube((cx + sx * 12 * s, hy - 16 * s), (cx + sx * 26 * s, hy - 40 * s), 4.5 * s, HORN, r1=0.8 * s)
        p.ell(cx + sx * 8 * s, hy - 2 * s, 5 * s, 3.2 * s, '#ff3a1c')
        p.glow(cx + sx * 8 * s, hy - 2 * s, 9 * s, '#ff5a2a', 0.6)
        p.ell(cx + sx * 8 * s, hy - 2 * s, 1.8 * s, 1.4 * s, VOLT)
    p.line([(cx - 10 * s, hy + 12 * s), (cx + 10 * s, hy + 12 * s)], 2 * s, '#0a0608')
    for k in range(4):
        x = cx - 7 * s + k * 4.6 * s
        p.poly([(x - 1.4 * s, hy + 11 * s), (x + 1.4 * s, hy + 11 * s), (x, hy + 16 * s)], HORN)
    p.smoke(cx, yb - 20 * s, 60 * s, seed, 0.2)


# ====================================================================== Bánh chưng
@art('tl-mg-la-dong', 160, 160)
def la_dong(p: P):
    """One dong leaf, top-down, tip up-right."""
    pts = []
    for i in range(41):
        t = i / 40
        w = 34 * math.sin(math.pi * t) ** 0.8
        pts.append((80 - 58 + 116 * t, 80 - w))
    for i in range(40, -1, -1):
        t = i / 40
        w = 34 * math.sin(math.pi * t) ** 0.8
        pts.append((80 - 58 + 116 * t, 80 + w))
    rot = [(80 + (x - 80) * math.cos(-0.6) - (y - 80) * math.sin(-0.6), 80 + (x - 80) * math.sin(-0.6) + (y - 80) * math.cos(-0.6)) for x, y in pts]
    p.shadow(82, 86, 60, 40, 0.25)
    p.poly(rot, DONG, n=(-0.2, -0.2, 1), grad=0.25)
    c, s_ = math.cos(-0.6), math.sin(-0.6)
    R = lambda x, y: (80 + (x - 80) * c - (y - 80) * s_, 80 + (x - 80) * s_ + (y - 80) * c)  # noqa: E731
    p.line([R(14, 80), R(138, 80)], 2.2, '#a8c87a', 0.9)
    for k in range(1, 12):
        x = 22 + k * 10
        for sd in (-1, 1):
            p.line([R(x, 80), R(x + 12, 80 + sd * 26 * math.sin(math.pi * (x - 22) / 116) ** 0.8)], 0.8, '#7aa85a', 0.6)
    p.line([R(14, 80), R(2, 80)], 3, '#6a8a3a')


@art('tl-mg-khuon', 220, 220)
def khuon(p: P):
    """Square wooden bánh chưng mould, top-down, open centre (inner 150x150 at 35..185)."""
    p.shadow(112, 116, 104, 104, 0.35)
    for (x0, y0, x1, y1) in ((14, 14, 206, 35), (14, 185, 206, 206), (14, 35, 35, 185), (185, 35, 206, 185)):
        p.paint(lib.rect_mask(p.L.w, p.L.h, x0 * SS, y0 * SS, x1 * SS, y1 * SS, 1 * SS), WOOD.base if hasattr(WOOD, 'base') else '#8a5228')
    p.poly([(14, 14), (206, 14), (206, 35), (14, 35)], WOOD, n=(0, -0.3, 1), grad=0.1)
    p.poly([(14, 185), (206, 185), (206, 206), (14, 206)], WOOD, n=(0, 0.3, 1), grad=0.1)
    p.poly([(14, 35), (35, 35), (35, 185), (14, 185)], m('#7a4620', 0.15, 12, 0.42, 0.7, tex_wood(3.2, seed=33, vertical=True)), n=(-0.3, 0, 1))
    p.poly([(185, 35), (206, 35), (206, 185), (185, 185)], m('#7a4620', 0.15, 12, 0.42, 0.7, tex_wood(3.2, seed=34, vertical=True)), n=(0.3, 0, 1))
    p.line([(35, 35), (185, 35), (185, 185), (35, 185), (35, 35)], 1.6, '#2a1608')
    p.line([(14, 14), (206, 14), (206, 206), (14, 206), (14, 14)], 1.2, '#3a2010')
    for x, y in ((24, 24), (196, 24), (24, 196), (196, 196)):
        p.blob(x, y, 3, 3, IRONISH)


IRONISH = m('#4a4440', 0.5, 26, 0.4, 0.7)


def bowl(p: P, cx, cy, r, fill_fn):
    p.shadow(cx + 3, cy + r * 0.62, r * 1.02, r * 0.3, 0.35)
    p.lathe(cx, cy + r * 0.6, lambda t: r * (0.55 + 0.45 * math.sin(math.pi * 0.5 * t)), PORC, r * 0.62, top_open=True,
            deco=lambda u, t: (hexc('#2d4f8a'), ((np.abs(t - 0.82) < 0.05) | (np.abs(t - 0.2) < 0.03)) * 0.9))
    p.ell(cx, cy, r * 0.96, r * 0.31, '#e8ecf0')
    fill_fn(cx, cy, r)


@art('tl-mg-gao', 128, 128)
def gao(p: P):
    def fill(cx, cy, r):
        p.blob(cx, cy - 2, r * 0.9, r * 0.32, RICE, flat=0.5)
        rs = np.random.default_rng(5)
        for _ in range(140):
            a, d = rs.uniform(0, 2 * math.pi), rs.random() ** 0.5
            x, y = cx + math.cos(a) * d * r * 0.85, cy - 3 + math.sin(a) * d * r * 0.28
            p.line([(x - 1.2, y), (x + 1.2, y + rs.uniform(-0.6, 0.6))], 1.1, '#fffdf4' if rs.random() < 0.6 else '#d9d4c2')
    bowl(p, 64, 56, 52, fill)


@art('tl-mg-do', 128, 128)
def do_xanh(p: P):
    def fill(cx, cy, r):
        p.blob(cx, cy - 2, r * 0.9, r * 0.32, MUNG, flat=0.5)
        rs = np.random.default_rng(6)
        for _ in range(110):
            a, d = rs.uniform(0, 2 * math.pi), rs.random() ** 0.5
            x, y = cx + math.cos(a) * d * r * 0.85, cy - 3 + math.sin(a) * d * r * 0.28
            p.ell(x, y, 1.6, 1.2, '#f4cc52' if rs.random() < 0.6 else '#c99a2a')
    bowl(p, 64, 56, 52, fill)


@art('tl-mg-thit', 128, 128)
def thit(p: P):
    p.shadow(66, 82, 56, 18, 0.35)
    p.lathe(64, 82, lambda t: 54 - 6 * t, PORC, 6, cap_mat=PORC, deco=lambda u, t: (hexc('#2d4f8a'), (t > 0.7) * 0.9))
    for k, (x, y) in enumerate(((44, 62), (66, 58), (86, 64), (56, 72), (78, 74))):
        # pork belly slab: skin / fat / lean layers
        p.box(x - 15, y - 9, 30, 9, 8, PORK, top=m('#f3c4b0', 0.3, 14, 0.58, 0.55, tex_noise(0.1, 2, 420 + k)))
        p.line([(x - 15, y + 2), (x + 15, y + 2)], 2.4, '#f6efe4')
        p.line([(x - 15, y + 5), (x + 15, y + 5)], 1.4, '#b8584a')
        p.ell(x + 2, y - 13, 1.6, 0.8, '#c8a080', 0.7)  # pepper
        p.ell(x - 6, y - 15, 1.2, 0.7, '#3a2a20', 0.8)


@art('tl-mg-lat', 280, 32)
def lat(p: P):
    """Bamboo tie strip (lạt giang), horizontal."""
    pts = [(8 + 264 * i / 30, 16 + 3 * math.sin(i / 30 * math.pi * 2)) for i in range(31)]
    for a, b in zip(pts, pts[1:]):
        p.tube(a, b, 3.6, m('#d8c690', 0.3, 18, 0.55, 0.6, tex_noise(0.08, 2, 421)))
    p.line(pts, 0.8, '#a89a60', 0.6)


@art('tl-mg-banh-chung', 220, 220)
def banh_chung_top(p: P):
    """Finished bánh chưng, top-down (square, dong-leaf wrap, 2x2 lạt cross)."""
    p.shadow(114, 118, 96, 96, 0.4)
    p.poly([(20, 22), (198, 20), (200, 198), (22, 200)], BANHCHUNG, n=(-0.15, -0.15, 1), grad=0.3, blur=1.5)
    p.ell(96, 92, 70, 66, '#ffffff', 0.08, blur=24)
    p.paint(lib.rect_mask(p.L.w, p.L.h, 22 * SS, 22 * SS, 198 * SS, 198 * SS, 14 * SS) * (1 - lib.rect_mask(p.L.w, p.L.h, 24 * SS, 24 * SS, 196 * SS, 196 * SS, 12 * SS)), '#2e5a1e')
    rs = np.random.default_rng(7)
    for _ in range(40):  # leaf veins
        x, y = rs.uniform(30, 190), rs.uniform(30, 190)
        a = rs.choice([0, math.pi / 2]) + rs.normal(0, 0.05)
        p.line([(x, y), (x + math.cos(a) * 30, y + math.sin(a) * 30)], 0.8, '#7aa85a', 0.45)
    for f in (0.36, 0.64):
        v = 22 + 176 * f
        for horiz in (True, False):
            pts = [(22, v), (198, v)] if horiz else [(v, 22), (v, 198)]
            p.line(pts, 5, '#c9b67a')
            p.line(pts, 1.2, '#efe2b0', 0.8)
    p.ell(110, 110, 70, 70, '#ffffff', 0.06, blur=20)


# ====================================================================== Đông Hồ (aligned layers 320x400)
DH_W, DH_H = 320, 400
DH_COLS = {'do': '#c4281c', 'vang': '#e4b23a', 'xanh': '#2e7a42', 'den': '#1c1612'}


def _dh_masks():
    """Lợn đàn-style pig print: returns {layer: mask float (H,W)} at 1x."""
    yy, xx = np.mgrid[0:DH_H, 0:DH_W].astype(np.float32)

    def ell(cx, cy, rx, ry):
        return (((xx - cx) / rx) ** 2 + ((yy - cy) / ry) ** 2) < 1

    def rect(x0, y0, x1, y1):
        return (xx >= x0) & (xx < x1) & (yy >= y0) & (yy < y1)

    frame_o = rect(10, 10, 310, 390) & ~rect(20, 20, 300, 380)
    body = ell(160, 210, 112, 74)
    head = ell(66, 196, 44, 40)
    snout = ell(30, 214, 18, 14)
    legs = rect(82, 260, 104, 318) | rect(124, 268, 146, 322) | rect(186, 268, 208, 322) | rect(226, 260, 248, 318)
    pig = body | head | snout | legs
    ear = ell(80, 158, 14, 22)
    tail = (np.abs(np.sqrt((xx - 280) ** 2 + (yy - 184) ** 2) - 12) < 3) & (xx > 270)
    # yin-yang swirls on the body (the classic Đông Hồ âm-dương mark)
    sw1 = ell(130, 200, 30, 30) & ~ell(130, 186, 15, 15) | (ell(130, 214, 15, 15))
    sw1 = ell(130, 200, 30, 30) & ((xx < 130) & ~ell(130, 186, 15, 15) | ell(130, 214, 15, 15))
    sw2 = ell(212, 214, 24, 24) & ((xx > 212) & ~ell(212, 226, 12, 12) | ell(212, 202, 12, 12))
    ring1 = ell(130, 200, 32, 32) & ~ell(130, 200, 29, 29)
    ring2 = ell(212, 214, 26, 26) & ~ell(212, 214, 23, 23)
    # ground grass + lotus leaves (xanh), sky cloud (vang)
    grass = (yy > 330) & (yy < 374) & (np.sin(xx * 0.35) * 8 + 352 < yy) & rect(22, 0, 298, 400)
    leaf1 = ell(262, 70, 30, 20) & ~(np.abs(yy - 70) < 1.5)
    leaf2 = ell(52, 66, 24, 16)
    cloud = (ell(150, 66, 40, 18) | ell(184, 58, 26, 16) | ell(122, 60, 24, 14)) & rect(20, 20, 300, 380)
    band_v = (rect(20, 20, 300, 30) | rect(20, 370, 300, 380))
    eye = ell(64, 186, 5, 4)
    mouth = (np.abs(yy - 228) < 1.8) & (xx > 18) & (xx < 50)
    nost = ell(24, 212, 3, 3) | ell(34, 212, 3, 3)

    do = (ear | ell(160, 246, 60, 12) & body | ell(100, 230, 10, 8) | ell(232, 184, 8, 6)) & ~(ring1 | ring2)
    do = do | (leaf1 & ell(262, 70, 12, 8))
    vang = (sw1 | sw2 | cloud | band_v | ell(48, 222, 8, 6))
    xanh = grass | leaf1 & ~do | leaf2 | (ell(160, 156, 50, 8) & body)
    # black key-line: body outline, swirls rings, eye, mouth, legs, tail, frame
    edge = np.zeros_like(pig)
    dist = ndimage.distance_transform_edt(pig)
    edge = (dist > 0) & (dist < 4.5)
    hoof = rect(82, 306, 104, 318) | rect(124, 310, 146, 322) | rect(186, 310, 208, 322) | rect(226, 306, 248, 318)
    den = edge | ring1 | ring2 | eye | mouth | nost | tail | frame_o | hoof | ((np.abs(xx - 104) < 2) & ell(104, 196, 3, 50) & head)
    den = den | ((np.abs(yy - 70) < 1.5) & leaf1) | (np.abs(np.sqrt((xx - 52) ** 2 + (yy - 66) ** 2) - 9) < 1.4) & leaf2
    den = den | ((np.abs(yy - 340 - np.sin(xx * 0.5) * 4) < 1.2) & rect(24, 0, 296, 400))
    return {'do': do, 'vang': vang & ~den, 'xanh': xanh & ~den & ~do, 'den': den}


def _ink(mask, col, seed):
    """Woodblock ink: slight bleed, paper-grain dropouts."""
    a = ndimage.gaussian_filter(mask.astype(np.float32), 0.7)
    drop = lib.value_noise(DH_H, DH_W, 1.2, seed)
    a = np.clip(a * (0.82 + 0.18 * (drop > 0.2)) * (0.9 + 0.1 * lib.fbm(DH_H, DH_W, 30, 3, seed + 1)), 0, 1)
    rgb = np.broadcast_to(hexc(col), (DH_H, DH_W, 3)) * (0.92 + 0.12 * lib.fbm(DH_H, DH_W, 6, 2, seed + 2))[..., None]
    return np.dstack([rgb, a])


def _to_im(arr):
    return Image.fromarray((np.clip(arr, 0, 1) * 255 + 0.5).astype(np.uint8), 'RGBA' if arr.shape[2] == 4 else 'RGB')


def _diep():
    yy, xx = np.mgrid[0:DH_H, 0:DH_W].astype(np.float32)
    base = hexc('#efe0b6') * (0.92 + 0.1 * lib.fbm(DH_H, DH_W, 40, 4, 431))[..., None]
    fib = lib.value_noise(DH_H, DH_W, 1.0, 432)
    base = base * (0.97 + 0.05 * fib)[..., None]
    sh = (lib.value_noise(DH_H, DH_W, 2.0, 433) > 0.82) * (0.5 + 0.5 * np.sin(xx * 0.4 + yy * 0.3))
    base = base + sh[..., None] * 0.08 * hexc('#fff6e0')  # sò điệp shimmer
    edge = np.minimum(np.minimum(xx, DH_W - 1 - xx), np.minimum(yy, DH_H - 1 - yy))
    base = base * (0.86 + 0.14 * np.clip(edge / 10, 0, 1))[..., None]
    return np.dstack([base, np.ones((DH_H, DH_W), np.float32)])


@art('tl-mg-giay-diep', DH_W, DH_H, 'flat')
def giay_diep():
    return _to_im(_diep())


def _layer_fn(key, seed):
    def f():
        return _to_im(_ink(_dh_masks()[key], DH_COLS[key], seed))
    return f


for _i, _k in enumerate(DH_COLS):
    REG[f'tl-mg-tranh-{_k}'] = (DH_W, DH_H, 'flat', _layer_fn(_k, 440 + _i * 5))


@art('tl-mg-tranh-full', DH_W, DH_H, 'flat')
def tranh_full():
    out = _diep()
    for i, k in enumerate(DH_COLS):
        lay = _ink(_dh_masks()[k], DH_COLS[k], 440 + i * 5)
        a = lay[..., 3:4]
        out[..., :3] = out[..., :3] * (1 - a) + lay[..., :3] * a * 0.98
    return _to_im(out)


def _van(key):
    """160x160 woodblock carved with the (mirrored) layer, ink-stained relief."""
    def f():
        S = 160
        mk = Image.fromarray((_dh_masks()[key] * 255).astype(np.uint8)).transpose(Image.FLIP_LEFT_RIGHT)
        mk = np.asarray(mk.resize((112, 140), Image.LANCZOS), np.float32) / 255
        relief = np.zeros((S, S), np.float32)
        relief[10:150, 24:136] = mk
        yy, xx = np.mgrid[0:S, 0:S].astype(np.float32)
        blk = (xx > 8) & (xx < 152) & (yy > 4) & (yy < 156)
        n = lib.fbm(S, S, 6, 3, 451)
        grain = np.sin(xx * 0.08 + n * 6 + yy * 0.01) * 0.5 + 0.5
        col = mix3(hexc('#5a3418'), hexc('#a8703a'), (0.4 + 0.4 * grain + 0.2 * n)[..., None])
        # relief shading: raised surface lit from top-left, carved ground darker
        hgt = ndimage.gaussian_filter(relief, 1.0)
        gy, gx = np.gradient(hgt)
        shade = 1 + 2.2 * (-gx - gy)
        col = col * np.where(relief[..., None] > 0.5, 1.0, 0.62) * shade[..., None]
        ink = hexc(DH_COLS[key])
        col = np.where((relief > 0.5)[..., None], col * 0.35 + ink * 0.65, col)
        edge = np.minimum(np.minimum(xx - 8, 152 - xx), np.minimum(yy - 4, 156 - yy))
        col = col * (0.75 + 0.25 * np.clip(edge / 6, 0, 1))[..., None]
        a = blk.astype(np.float32)
        out = np.zeros((S, S, 4), np.float32)
        out[..., :3] = col
        out[..., 3] = a
        # drop shadow
        sh = ndimage.gaussian_filter(np.roll(np.roll(a, 4, 0), 3, 1), 3) * 0.45
        out[..., :3] = np.where(a[..., None] > 0, out[..., :3], 0)
        out[..., 3] = np.maximum(a, sh)
        return _to_im(out)
    return f


def mix3(a, b, t):
    return a * (1 - t) + b * t


for _k in DH_COLS:
    REG[f'tl-mg-van-{_k}'] = (160, 160, 'flat', _van(_k))


# ====================================================================== Cho chữ
@art('tl-mg-giay-do', 300, 400, 'flat')
def giay_do():
    H, W = 400, 300
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    base = hexc('#c3241a') * (0.88 + 0.14 * lib.fbm(H, W, 50, 4, 461))[..., None]
    base = base * (0.97 + 0.05 * lib.value_noise(H, W, 1, 462))[..., None]
    fl = (lib.value_noise(H, W, 1.6, 463) > 0.93) & (lib.value_noise(H, W, 7, 464) > 0.5)
    base = np.where(fl[..., None], hexc('#e8b84c'), base)  # gold flecks (giấy hồng điều)
    edge = np.minimum(np.minimum(xx, W - 1 - xx), np.minimum(yy, H - 1 - yy))
    base = base * (0.8 + 0.2 * np.clip(edge / 12, 0, 1))[..., None]
    a = (edge >= 0).astype(np.float32)
    return _to_im(np.dstack([base, a]))


@art('tl-mg-but-long', 64, 320)
def but_long(p: P):
    p.tube((32, 8), (32, 236), 6.5, BAMBOO, r1=6)
    for y in (40, 120, 200):
        p.line([(25.5, y), (38.5, y)], 1.2, '#5a4818')
    p.tube((32, 236), (32, 248), 7.4, m('#2a1a10', 0.5, 30, 0.4, 0.7))
    p.poly([(25, 248), (39, 248), (37, 280), (32, 312), (27, 280)], m('#1a1410', 0.3, 18, 0.45, 0.6, tex_noise(0.3, 1, 465)), n=(-0.4, 0.1, 0.9), grad=0.2)
    p.line([(28, 254), (31, 300)], 0.6, '#5a4a3a', 0.6)
    p.ring(32, 6, 2.6, 2.6, 0.8, m('#d4321c'))
    p.line([(32, 8), (32, 2)], 0.6, '#d4321c')


@art('tl-mg-nghien-muc', 180, 130)
def nghien_muc(p: P):
    p.shadow(92, 108, 80, 18, 0.4)
    p.box(16, 34, 148, 64, 18, STONEINK, top=m('#3a3a40', 0.55, 34, 0.42, 0.7, tex_noise(0.08, 3, 466)))
    p.ell(70, 64, 42, 22, '#121014')
    p.ell(70, 64, 38, 19, '#08070a')
    p.ell(60, 58, 14, 5, '#5a5a70', 0.5, blur=3)  # wet sheen
    p.ell(134, 62, 18, 14, '#1c1c22')
    p.box(118, 46, 30, 12, 10, INK, top=m('#2a2622', 0.4, 26, 0.45, 0.6))
    p.line([(122, 52), (142, 52)], 1, '#c9a24a', 0.7)


@art('tl-mg-ong-do', 260, 320)
def ong_do(p: P):
    """Ông đồ seated cross-legged on a mat, dark áo the, khăn xếp, white beard, brush in hand."""
    p.shadow(130, 300, 116, 18, 0.4)
    p.poly([(14, 304), (246, 304), (236, 284), (24, 284)], m('#c9b07a', 0.1, 8, 0.55, 0.55, tex_noise(0.2, 2, 470)), n=(0, -0.6, 0.8))
    # crossed legs + robe
    p.blob(130, 266, 100, 30, NAVYS, flat=0.5)
    p.poly([(70, 140), (190, 140), (222, 270), (38, 270)], NAVYS, n=(-0.3, 0.1, 0.9), grad=0.3)
    p.line([(130, 146), (112, 200), (130, 268)], 2, '#0e1424', 0.8)
    for x in (100, 160):
        p.line([(x, 160), (x - 8, 260)], 1.2, '#2e4064', 0.5)
    # sleeves + hands
    p.tube((80, 156), (66, 236), 18, NAVYS, r1=16)
    p.tube((180, 156), (186, 210), 18, NAVYS, r1=16)
    p.blob(70, 240, 12, 10, SKIN)
    p.tube((186, 210), (150, 222), 14, NAVYS, r1=12)
    p.blob(146, 222, 11, 10, SKIN)
    p.tube((150, 214), (176, 172), 2.4, BAMBOO)  # brush
    p.tube((150, 214), (146, 224), 3, INK, r1=0.8)
    # head
    p.blob(130, 104, 30, 34, SKIN)
    p.poly([(112, 110), (148, 110), (142, 168), (130, 186), (118, 168)], BEARD, n=(-0.2, 0.2, 0.9), grad=0.15)
    p.line([(118, 118), (142, 118)], 3, '#efece4')
    for sx in (-1, 1):
        p.line([(130 + sx * 6, 94), (130 + sx * 18, 92)], 2.4, '#e6e2da')
        p.ell(130 + sx * 11, 100, 2.6, 1.4, '#2a1a10')
    # khăn xếp (black pleated turban)
    p.blob(130, 76, 34, 16, BLACKC, flat=0.6)
    for k in range(4):
        p.line([(98 + k * 2, 70 + k * 4), (162 - k * 2, 70 + k * 4)], 1, '#3a3438', 0.8)
    # glasses (round, brass)
    for sx in (-1, 1):
        p.ring(130 + sx * 11, 100, 7, 6, 0.8, BRASS)


# ====================================================================== Cây nêu (top-down)
@art('tl-mg-dat-san', 480, 480, 'flat')
def dat_san():
    S = 480
    yy, xx = np.mgrid[0:S, 0:S].astype(np.float32)
    n = lib.fbm(S, S, 50, 5, 480)
    base = mix3(hexc('#4a3626'), hexc('#7a5c3c'), n[..., None])
    base = base * (0.9 + 0.14 * lib.fbm(S, S, 3, 2, 481))[..., None]
    rs = np.random.default_rng(482)
    for _ in range(60):  # pebbles
        x, y, r = rs.uniform(0, S), rs.uniform(0, S), rs.uniform(2, 5)
        d = ((xx - x) ** 2 + (yy - y) ** 2) / r ** 2
        base = np.where((d < 1)[..., None], hexc('#8a8070') * (0.8 + 0.3 * (1 - d))[..., None], base)
    # brick border
    edge = np.minimum(np.minimum(xx, S - 1 - xx), np.minimum(yy, S - 1 - yy))
    brk = edge < 28
    row = np.floor(edge / 14)
    along = np.where((np.minimum(xx, S - 1 - xx) < np.minimum(yy, S - 1 - yy)), yy, xx)
    tone = TP_hash(np.floor((along + row * 15) / 30), row)
    bcol = mix3(hexc('#7e3422'), hexc('#a85236'), tone[..., None]) * (1 - 0.4 * (((along + row * 15) % 30 < 1.6) | (edge % 14 < 1.4)))[..., None]
    base = np.where(brk[..., None], bcol, base)
    base = base * (1 - 0.3 * np.exp(-np.clip(edge - 28, 0, None) / 10) * (edge >= 28))[..., None]
    # night: cool grade + warm centre where the pole goes
    r = np.sqrt((xx - S / 2) ** 2 + (yy - S / 2) ** 2)
    base = base * (np.array([0.78, 0.82, 1.0]) + 0.25 * np.exp(-(r / 180) ** 2)[..., None] * np.array([0.3, 0.15, 0.0]))
    return _to_im(np.dstack([np.clip(base, 0, 1), np.ones((S, S))]))


def TP_hash(a, b):
    return (np.sin(a * 127.1 + b * 311.7) * 43758.5453) % 1.0


@art('tl-mg-cay-neu', 200, 200)
def cay_neu_top(p: P):
    """Cây nêu from above: bamboo tuft ring, crossbar with hangings, pole tip centre (100,100)."""
    rs = np.random.default_rng(490)
    p.ell(112, 112, 70, 70, '#000000', 0.25, blur=14)
    for _ in range(70):
        a = rs.uniform(0, 2 * math.pi)
        d = rs.uniform(30, 84)
        p.tube((100, 100), (100 + math.cos(a) * d, 100 + math.sin(a) * d), 4.5, LEAF if rs.random() < 0.5 else LEAF2, r1=0.8)
    p.tube((42, 112), (158, 88), 3.2, BAMBOO_D)
    for f, kind in ((0.08, 'khanh'), (0.36, 'cloth'), (0.64, 'bell'), (0.92, 'cloth')):
        x, y = 42 + 116 * f, 112 - 24 * f
        if kind == 'khanh':
            p.poly([(x - 8, y + 2), (x + 8, y - 2), (x + 6, y + 8), (x - 6, y + 10)], TERRA)
        elif kind == 'bell':
            p.blob(x, y + 3, 6, 6, GOLD)
        else:
            p.poly([(x - 4, y), (x + 4, y), (x + 6, y + 18), (x - 2, y + 16)], RSILK)
    p.blob(100, 100, 9, 9, BAMBOO)
    p.ring(100, 100, 6, 6, 1, BAMBOO_D)


@art('tl-mg-voi-dot', 64, 64)
def voi_dot(p: P):
    rs = np.random.default_rng(491)
    p.ell(32, 32, 22, 22, '#ffffff', 0.18, blur=6)
    p.blob(32, 32, 15, 14, LIME, flat=0.3)
    for _ in range(14):
        a, d = rs.uniform(0, 2 * math.pi), rs.uniform(14, 26)
        r = rs.uniform(1.2, 3.4)
        p.blob(32 + math.cos(a) * d, 32 + math.sin(a) * d, r, r * 0.9, LIME, flat=0.3)


@art('tl-mg-quy', 160, 200)
def quy(p: P):
    quy_figure(p, 80, 192, 1.0, 3)


# ====================================================================== Câu đối
@art('tl-mg-cau-doi', 120, 480)
def cau_doi(p: P):
    """Blank red vertical scroll with wooden rods (characters are HTML overlays)."""
    p.shadow(64, 470, 40, 6, 0.3)
    p.poly([(14, 22), (106, 22), (106, 458), (14, 458)], REDP, n=(-0.1, 0.1, 1), grad=0.12)
    yy = np.mgrid[0:p.L.h, 0:p.L.w][0].astype(np.float32) / SS
    fl = (lib.value_noise(p.L.h, p.L.w, 4, 492) > 0.93) * lib.rect_mask(p.L.w, p.L.h, 16 * SS, 24 * SS, 104 * SS, 456 * SS)
    p.paint(fl, '#e8b84c', 0.85)
    for x in (20, 100):
        p.line([(x, 28), (x, 452)], 1.2, '#e8b84c')
    p.line([(20, 28), (100, 28)], 1.2, '#e8b84c')
    p.line([(20, 452), (100, 452)], 1.2, '#e8b84c')
    for y in (18, 462):
        p.tube((6, y), (114, y), 5, DWOOD)
        for x in (4, 116):
            p.blob(x, y, 5.5, 5.5, GOLD)
    p.line([(30, 18), (60, 2), (90, 18)], 1, '#2a1a0a')


# ====================================================================== Ngũ quả
@art('tl-mg-mam', 360, 200)
def mam(p: P):
    """Empty footed lacquer offering tray (mâm bồng), 3/4 view; fruit sits on the ellipse ~ (180,70) rx150 ry38."""
    p.shadow(184, 186, 120, 12, 0.4)
    p.lathe(180, 184, lambda t: 58 - 20 * math.sin(math.pi * t) ** 0.7 if t < 0.9 else 36, LACQ, 90,
            deco=bands([(0.05, 0.12, '#e0b048'), (0.86, 0.9, '#e0b048')]))
    p.lathe(180, 100, lambda t: 150 - 14 * (1 - t), LACQ, 20, cap_mat=m('#7a1810', 0.5, 36, 0.4, 0.75, tex_noise(0.06, 4, 493)),
            deco=bands([(0.1, 0.25, '#e0b048'), (0.85, 1.0, '#c99a3a')]))
    for k in range(16):  # gold cloud inlay around the rim face
        a = k / 16 * math.pi
        x = 180 + math.cos(a) * 140
        p.ell(x, 96 + math.sin(a) * 4, 4, 2, '#e0b048', 0.8)


def fruit(name):
    return art(f'tl-mg-qua-{name}', 112, 112)


@fruit('chuoi')
def qua_chuoi(p: P):
    p.shadow(58, 98, 44, 8, 0.35)
    for k in range(6):
        a0 = math.pi * (1.05 + 0.055 * k)
        arc_tube(p, 50 + 4 * k, 104 - 2 * k, 56, a0, a0 + 1.05, 6.2, BANANA, 10, 0.75)
    p.tube((14, 70), (24, 92), 7, m('#6a7a2a', 0.2, 10, 0.45, 0.7))
    p.blob(12, 66, 6, 5, m('#3a3a1a'))


@fruit('buoi')
def qua_buoi(p: P):
    p.shadow(58, 100, 42, 8, 0.35)
    p.blob(56, 62, 42, 40, POMELO)
    rs = np.random.default_rng(494)
    for _ in range(60):
        p.ell(rs.uniform(24, 90), rs.uniform(30, 96), 0.7, 0.7, '#8a9a2a', 0.6)
    p.tube((56, 24), (58, 14), 2.2, m('#4a3a1a'))
    p.poly([(58, 16), (80, 4), (90, 10), (68, 20)], LEAF, n=(0.2, -0.3, 1))


@fruit('phat-thu')
def qua_phat_thu(p: P):
    p.shadow(58, 100, 40, 8, 0.35)
    p.blob(56, 50, 22, 20, BUDDHA)
    for k in range(9):
        a = math.pi * (0.1 + 0.8 * k / 8)
        x1, y1 = 56 + math.cos(a) * 40, 56 + math.sin(a) * 44
        p.tube((56 + math.cos(a) * 10, 56 + math.sin(a) * 6), (x1, y1), 6.5, BUDDHA, r1=3.2)
    p.tube((56, 32), (54, 22), 2.6, m('#4a5a1a'))


@fruit('quyt')
def qua_quyt(p: P):
    p.shadow(58, 98, 40, 8, 0.35)
    for x, y, r in ((36, 72, 22), (78, 74, 21), (56, 52, 22)):
        p.blob(x, y, r, r * 0.92, KUMQ)
        p.ell(x - r * 0.3, y - r * 0.35, r * 0.25, r * 0.15, '#fff2c0', 0.5, blur=2)
    p.poly([(56, 32), (78, 22), (84, 30), (64, 36)], LEAF, n=(0.2, -0.3, 1))
    p.poly([(56, 32), (34, 20), (30, 28), (50, 36)], LEAF2, n=(-0.2, -0.3, 1))


@fruit('hong')
def qua_hong(p: P):
    p.shadow(58, 96, 38, 8, 0.35)
    p.blob(56, 64, 38, 32, PERSIM, flat=0.8)
    p.line([(56, 40), (56, 92)], 1, '#b8401a', 0.4)
    for k in range(4):
        a = k / 4 * 2 * math.pi + 0.4
        p.poly([(56, 34), (56 + math.cos(a) * 16, 34 + math.sin(a) * 6 - 2), (56 + math.cos(a + 0.6) * 10, 34 + math.sin(a + 0.6) * 4)], m('#4a6a2a'))
    p.tube((56, 34), (58, 24), 2, m('#3a2a1a'))


@fruit('mang-cau')
def qua_mang_cau(p: P):
    p.shadow(58, 100, 38, 8, 0.35)
    p.blob(56, 60, 36, 40, CUSTARD, flat=0.9)
    for row in range(7):
        for col in range(7):
            x = 30 + col * 9 + (row % 2) * 4.5
            y = 30 + row * 10
            if ((x - 56) / 34) ** 2 + ((y - 60) / 38) ** 2 < 0.85:
                p.ring(x, y, 4, 4.4, 0.5, m('#5a7a34'))
    p.tube((56, 22), (58, 12), 2.2, m('#3a2a1a'))


@fruit('dua')
def qua_dua(p: P):
    p.shadow(58, 100, 42, 9, 0.35)
    p.blob(56, 60, 42, 40, DUAG)
    p.ell(56, 30, 16, 8, '#4a6a22', 0.6, blur=4)
    for k in range(3):
        a = k / 3 * 2 * math.pi
        p.ell(56 + math.cos(a) * 5, 26 + math.sin(a) * 3, 2, 1.6, '#3a2a14')


@fruit('du-du')
def qua_du_du(p: P):
    p.shadow(58, 102, 40, 8, 0.35)
    p.blob(56, 60, 30, 46, PAPAYA)
    p.ell(48, 40, 8, 18, '#7aa83a', 0.5, blur=6)
    for k in range(4):
        p.line([(40 + k * 10, 20), (36 + k * 12, 100)], 1, '#c86a1a', 0.35)
    p.tube((56, 14), (56, 6), 3, m('#5a7a2a'))


@fruit('xoai')
def qua_xoai(p: P):
    p.shadow(58, 100, 42, 8, 0.35)
    p.blob(58, 62, 40, 30, MANGO)
    p.blob(36, 54, 14, 18, MANGO)
    p.ell(70, 50, 14, 8, '#fff6c0', 0.35, blur=4)
    p.ell(30, 70, 10, 10, '#a8b83a', 0.35, blur=5)
    p.tube((30, 38), (24, 30), 2, m('#3a2a1a'))


@fruit('sung')
def qua_sung(p: P):
    p.shadow(58, 100, 42, 8, 0.35)
    p.tube((14, 30), (100, 40), 3, m('#5a4a30', 0.1, 6, 0.45, 0.7))
    rs = np.random.default_rng(495)
    for k in range(9):
        x = 20 + k * 9 + rs.uniform(-3, 3)
        y = 48 + (k % 3) * 14 + rs.uniform(-3, 3)
        p.tube((x, 36), (x, y - 8), 1.2, m('#5a4a30'))
        p.blob(x, y, 10, 11, FIG)
        p.ell(x - 3, y - 4, 3, 2, '#e0f0a0', 0.4, blur=1)
    for x in (24, 70):
        p.poly([(x, 34), (x + 22, 14), (x + 30, 24), (x + 8, 40)], LEAF, n=(0.2, -0.3, 1))


# ====================================================================== Ca trù
@art('tl-mg-trong-chau', 220, 220)
def trong_chau(p: P):
    """Trống chầu 3/4 view: drumhead centre (110, 70) rx 74 ry 24 (the hit zone) + crossed dùi."""
    p.shadow(112, 206, 90, 12, 0.4)
    for sx in (-1, 1):
        p.tube((110 + sx * 60, 160), (110 + sx * 82, 204), 6, DWOOD)
    p.lathe(110, 186, lambda t: 70 + 12 * math.sin(math.pi * t), REDLAC, 116,
            deco=lambda u, t: (hexc('#e0b048'), ((np.abs(t - 0.08) < 0.025) | (np.abs(t - 0.92) < 0.025) | ((np.abs(np.sin(u * 7)) < 0.06) & (t > 0.35) & (t < 0.65))) * 0.95))
    p.ell(110, 70, 74, 24, '#d8c49a')
    p.ell(110, 70, 48, 15, '#c8b088', 0.7, blur=4)
    p.ell(104, 66, 30, 8, '#efe0b8', 0.5, blur=6)
    for k in range(28):
        a = k / 28 * 2 * math.pi
        p.ell(110 + math.cos(a) * 73, 70 + math.sin(a) * 23.5, 1.8, 1.4, BRASS.base if hasattr(BRASS, 'base') else '#c9963e')
    p.tube((60, 30), (150, 4), 3.4, BAMBOO_D, r1=2.6)
    p.blob(150, 4, 4.6, 4.6, DWOOD)


@art('tl-mg-dan-day', 120, 380)
def dan_day(p: P):
    """Đàn đáy: long-necked trapezoid lute, vertical; body bottom, 3 strings."""
    p.shadow(62, 368, 46, 6, 0.35)
    p.poly([(26, 264), (94, 264), (104, 362), (16, 362)], WOOD, n=(-0.2, 0.1, 1), grad=0.25)
    p.poly([(30, 268), (90, 268), (99, 358), (21, 358)], m('#a86a34', 0.35, 20, 0.45, 0.7, tex_wood(3.0, seed=496)), n=(-0.1, 0.1, 1))
    p.ell(60, 330, 14, 8, '#2a1608')
    p.box(50, 20, 20, 250, 6, DWOOD)
    for k in range(10):  # tall frets
        y = 60 + k * 20
        p.line([(48, y), (72, y)], 2.6, '#e8d8a8')
    p.poly([(46, 4), (74, 4), (78, 24), (42, 24)], DWOOD, n=(0, -0.3, 1))
    for sx in (-1, 0, 1):
        p.blob(60 + sx * 13, 14, 3, 3, IVORY)
        p.line([(60 + sx * 6, 20), (60 + sx * 9, 346)], 0.6, '#f4ecd0', 0.9)
    p.box(44, 344, 32, 4, 3, IVORY)


@art('tl-mg-phach', 200, 130)
def phach(p: P):
    """Bàn phách (bamboo block) + two dùi phách."""
    p.shadow(100, 110, 84, 12, 0.4)
    p.box(24, 64, 152, 30, 20, BAMBOO, top=m('#c4a85a', 0.35, 20, 0.5, 0.65, tex_wood(2.0, seed=497)))
    for x in (60, 120):
        p.line([(x, 64), (x, 94)], 1.2, '#6a5424', 0.8)
    p.tube((30, 46), (150, 20), 3.4, BAMBOO_D)
    p.tube((40, 54), (164, 40), 3.4, BAMBOO_D)
    p.blob(150, 20, 3.6, 3.6, BAMBOO_D)


@art('tl-mg-dao-nuong', 240, 320)
def dao_nuong(p: P):
    """Đào nương (ca trù singer) seated on a mat, áo dài nâu, khăn vấn, phách in front."""
    p.shadow(120, 302, 110, 16, 0.4)
    p.poly([(10, 306), (230, 306), (220, 286), (20, 286)], m('#c9b07a', 0.1, 8, 0.55, 0.55, tex_noise(0.2, 2, 498)), n=(0, -0.6, 0.8))
    AO = m('#6a2a1c', 0.3, 18, 0.45, 0.66, tex_noise(0.08, 2, 499))
    p.blob(120, 270, 94, 26, AO, flat=0.5)
    p.poly([(84, 140), (156, 140), (190, 274), (50, 274)], AO, n=(-0.3, 0.1, 0.9), grad=0.3)
    p.poly([(116, 144), (124, 144), (128, 186), (112, 186)], m('#e8d8a8'), n=(0, 0, 1))
    p.tube((92, 156), (84, 234), 13, AO, r1=11)
    p.tube((148, 156), (156, 234), 13, AO, r1=11)
    p.box(66, 236, 108, 18, 10, BAMBOO)  # phách block on lap
    for x in (84, 156):
        p.blob(x, 236, 9, 8, SKIN)
    p.tube((156, 232), (192, 214), 2.4, BAMBOO_D)
    p.tube((84, 232), (60, 214), 2.4, BAMBOO_D)
    p.blob(120, 108, 24, 28, SKIN)
    p.tube((112, 130), (128, 130), 7, SKIN)
    for sx in (-1, 1):
        p.line([(120 + sx * 6, 100), (120 + sx * 16, 99)], 1.6, '#2a1a10')
        p.ell(120 + sx * 10, 106, 2.4, 1.2, '#1a1210')
        p.ell(120 + sx * 15, 118, 5, 3, '#e88a7a', 0.45, blur=2)
    p.ell(120, 124, 4, 1.6, '#b8302a')
    p.blob(120, 84, 30, 14, BLACKC, flat=0.6)  # khăn vấn
    for k in range(3):
        p.line([(92 + k * 2, 82 + k * 4), (148 - k * 2, 80 + k * 4)], 1, '#3a3438', 0.8)
    for sx in (-1, 1):
        p.ell(120 + sx * 23, 114, 2, 3, '#e8c060')


# ====================================================================== Rối nước
@art('tl-mg-thuy-dinh', 720, 320)
def thuy_dinh(p: P):
    """Thủy đình facade over water: red pillars, bamboo-blind stage (y 150-262), curved double roof."""
    p.ell(360, 300, 340, 22, '#000000', 0.25, blur=10)
    # stone base on the water
    p.box(70, 262, 580, 30, 10, m('#8e8c7c', 0.06, 8, 0.45, 0.65, lib.tex_stone(500, 6, 0.25)))
    # blinds (mành) – the puppets appear in front of this
    p.poly([(96, 150), (624, 150), (624, 262), (96, 262)], BAMBOO, n=(0, 0, 1), grad=0.25)
    yy = np.mgrid[0:p.L.h, 0:p.L.w][0].astype(np.float32) / SS
    bl = ((yy % 3) < 0.9) * lib.rect_mask(p.L.w, p.L.h, 96 * SS, 150 * SS, 624 * SS, 262 * SS)
    p.paint(bl, '#5a4418', 0.6)
    for x in (192, 288, 432, 528):
        p.line([(x, 150), (x, 262)], 1.2, '#7a1a12')
    for x in (96, 216, 360, 504, 624):  # red pillars
        p.tube((x, 140), (x, 262), 8, REDLAC)
        p.box(x - 12, 258, 24, 6, 4, m('#8e8c7c'))
    p.box(84, 132, 552, 14, 6, REDLAC)
    abstract_strokes(p, 300, 134, 420, 144, 501, '#e8c060', False, 6, 1.4)
    # double roof
    TP.roof(p, 360, 128, 330, 40, TP.ROOF, 18)
    p.box(140, 76, 440, 10, 4, REDLAC)
    TP.roof(p, 360, 78, 250, 46, TP.ROOF, 16)
    for x, s in ((96, 0.6), (624, 0.6), (216, 0.5), (504, 0.5)):
        lantern(p, x, 168, s)


@art('tl-mg-mat-nuoc', 720, 140, 'flat')
def mat_nuoc():
    H, W = 140, 720
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    n = lib.fbm(H, W, 40, 4, 510)
    rip = np.sin(xx * 0.04 + np.sin(yy * 0.3 + n * 5) * 1.4 + yy * 0.6) * 0.5 + 0.5
    col = mix3(hexc('#0a1f26'), hexc('#1c4a52'), (0.35 * n + 0.3 * rip)[..., None])
    col = col * (0.75 + 0.3 * (1 - yy / H))[..., None]
    for x0, c in ((96, '#ff9a40'), (216, '#ff8a3a'), (504, '#ff8a3a'), (624, '#ff9a40')):  # lantern reflections
        wav = xx - x0 + np.sin(yy * 0.5 + x0) * 3
        col = col + (np.exp(-(wav ** 2) / 30) * (np.sin(yy * 1.2) > -0.4) * (1 - yy / H))[..., None] * hexc(c) * 0.5
    hi = (rip > 0.94) & (lib.value_noise(H, W, 6, 511) > 0.5)
    col = np.where(hi[..., None], mix3(col, hexc('#9fd0d0'), 0.4), col)
    a = np.clip(yy / 6, 0, 1)  # soft top edge
    return _to_im(np.dstack([np.clip(col, 0, 1), a]))


@art('tl-mg-chu-teu', 140, 220)
def chu_teu(p: P):
    teu(p, 70, 216, 0.62)


@art('tl-mg-sao', 360, 48)
def sao(p: P):
    """Sào điều khiển: bamboo puppet pole (horizontal), handle left, joint right."""
    p.tube((10, 26), (330, 22), 5, BAMBOO, r1=4)
    for x in (60, 130, 200, 270):
        p.line([(x, 20), (x, 30)], 1.2, '#5a4818')
    p.tube((6, 26), (40, 26), 6.4, m('#3a2614', 0.3, 16, 0.42, 0.7))
    p.blob(338, 22, 8, 8, DWOOD)
    p.line([(338, 22), (352, 6)], 2, '#e0c890')


# ====================================================================== HUD icons
@art('tl-ui-dong-ho', 64, 64)
def ui_dong_ho(p: P):
    """Countdown clock face to giờ Tý: lacquer rim, 12 tick marks (Tý at top in red), single hand."""
    p.shadow(33, 35, 28, 28, 0.35)
    p.blob(32, 32, 29, 29, GOLD, flat=0.4)
    p.ell(32, 32, 24, 24, '#f1e4c0')
    p.ell(32, 32, 24, 24, '#c8b088', 0.4, blur=6)
    for k in range(12):
        a = k / 12 * 2 * math.pi - math.pi / 2
        r0 = 17 if k else 15
        p.line([(32 + math.cos(a) * r0, 32 + math.sin(a) * r0), (32 + math.cos(a) * 22, 32 + math.sin(a) * 22)], 2.4 if k == 0 else 1.2, '#c8281c' if k == 0 else '#3a2a1a')
    p.line([(32, 32), (32 + 12 * math.cos(-2.0), 32 + 12 * math.sin(-2.0))], 2.4, '#1a1210')
    p.blob(32, 32, 2.6, 2.6, LACQ)


@art('tl-ui-quy', 256, 256)
def ui_quy(p: P):
    """Quỷ portrait (traitor reveal): horned mask in smoke, ember eyes."""
    p.glow(128, 140, 120, '#3a1a4a', 0.6)
    p.smoke(128, 250, 200, 9, 0.35)
    p.blob(128, 220, 100, 50, QUY, flat=0.5)
    p.blob(128, 130, 70, 80, QUY_D)
    for sx in (-1, 1):
        pts = [(128 + sx * 40, 70), (128 + sx * 70, 30), (128 + sx * 92, 14), (128 + sx * 80, 40), (128 + sx * 56, 86)]
        for a, b in zip(pts, pts[1:]):
            p.tube(a, b, 10 * (1 - pts.index(a) / 5) + 2, HORN, r1=10 * (1 - pts.index(b) / 5) + 1.4)
        p.poly([(128 + sx * 14, 112), (128 + sx * 48, 104), (128 + sx * 42, 126), (128 + sx * 16, 128)], m('#0a060c'), n=(0, 0, 1))
        p.ell(128 + sx * 30, 117, 12, 7, '#ff3a1c')
        p.glow(128 + sx * 30, 117, 24, '#ff5a2a', 0.7)
        p.ell(128 + sx * 30, 117, 4, 3.4, VOLT)
        p.line([(128 + sx * 10, 96), (128 + sx * 52, 88)], 4, '#0a060c')
    p.poly([(96, 168), (160, 168), (150, 188), (106, 188)], m('#0a060c'), n=(0, 0, 1))
    for k in range(6):
        x = 100 + k * 11
        up = k % 2 == 0
        p.poly([(x, 168), (x + 8, 168), (x + 4, 182 if up else 176)], HORN)
    p.ell(128, 150, 6, 4, '#0a060c', 0.8)


@art('tl-ui-phao', 64, 64)
def ui_phao(p: P):
    for k, (x, a) in enumerate(((22, -0.3), (34, 0.05), (46, 0.35))):
        x0, y0 = x, 50
        x1, y1 = x + math.sin(a) * 30, 50 - math.cos(a) * 30
        p.tube((x0, y0), (x1, y1), 5.2, REDP)
        p.ell(x1, y1, 4.6, 2.2, '#e8c060')
        p.line([(x1, y1), (x1 + 3, y1 - 6)], 1, '#3a2a1a')
    p.glow(52, 10, 8, '#ffcf5a', 0.8)
    for k in range(6):
        a = k / 6 * 2 * math.pi
        p.line([(52, 10), (52 + math.cos(a) * 7, 10 + math.sin(a) * 7)], 1, VOLT)


@art('tl-ui-voi', 64, 64)
def ui_voi(p: P):
    p.shadow(32, 52, 24, 6, 0.35)
    p.lathe(32, 52, lambda t: 22 - 8 * (1 - t) ** 2, TERRA, 22, top_open=True)
    p.ell(32, 30, 19.5, 6, '#f4f4ea')
    p.ell(28, 29, 8, 2, '#ffffff', 0.7, blur=1)
    p.tube((44, 10), (34, 30), 2.2, BAMBOO)


@art('tl-ui-rua-vang', 64, 64)
def ui_rua_vang(p: P):
    """Golden turtle (Kim Quy), top-down."""
    for sx in (-1, 1):
        for sy in (-1, 1):
            p.blob(32 + sx * 18, 34 + sy * 12, 6, 4.4, GOLD)
    p.blob(32, 12, 6, 7, GOLD)
    p.tube((32, 54), (32, 60), 2.4, GOLD, r1=0.8)
    p.blob(32, 34, 20, 22, GOLD, flat=0.6)
    for k in range(6):
        a = k / 6 * 2 * math.pi
        p.line([(32 + math.cos(a) * 8, 34 + math.sin(a) * 8), (32 + math.cos(a) * 18, 34 + math.sin(a) * 19)], 1, '#8a5a14', 0.8)
    p.ring(32, 34, 8, 8, 0.6, m('#8a5a14'))
    for sx in (-1, 1):
        p.ell(32 + sx * 2.6, 9, 1, 1, '#2a1a0a')


@art('tl-ui-guom', 64, 64)
def ui_guom(p: P):
    """Thuận Thiên sword, diagonal."""
    STEEL = m('#c9d2d8', 0.9, 40, 0.45, 0.7, spec='#ffffff')
    p.poly([(16, 50), (52, 8), (56, 6), (55, 11), (19, 53)], STEEL, n=(-0.3, -0.3, 0.9), grad=0.3)
    p.line([(18, 51), (54, 8)], 0.6, '#ffffff', 0.7)
    p.tube((10, 42), (24, 58), 2.6, GOLD)
    p.tube((6, 60), (16, 50), 3, m('#6a1a12', 0.3, 18, 0.45, 0.7))
    p.blob(5, 61, 3, 3, GOLD)


# ====================================================================== build
def build(names=None):
    stations = {}
    for name, (w, h, kind, fn) in REG.items():
        is_st = kind == 'station'
        if names and name not in names:
            if is_st and os.path.exists(src('stations', f'{name}.png')):
                stations[name] = Image.open(src('stations', f'{name}.png')).convert('RGBA')
            continue
        if kind == 'flat':
            im = fn()
        else:
            p = P(w, h)
            fn(p)
            im = p.image()
        assert im.size == (w, h), (name, im.size)
        if is_st:
            im.save(src('stations', f'{name}.png'), optimize=True)
            stations[name] = im
        else:
            im.save(src('minigames', f'{name}.png'), optimize=True)
            im.save(pub('minigames', f'{name}.webp'), 'WEBP', quality=88, method=6)
        print('painted', name, w, h)
    if not names or any(REG[n][2] == 'station' for n in names if n in REG):
        pack_atlas(stations, 'tl-stations-0', 'tools/paint/tl_minigames.py')


if __name__ == '__main__':
    build(set(sys.argv[1:]) or None)
