"""
Painted props + room decor for the Sài Gòn map (Hụi Sài Gòn · Hẻm 42, đêm mưa).
  uv run -q --no-project --with numpy --with scipy --with pillow python tools/paint/sg_props.py [key ...]
Writes assets/maps/sai-gon/props/<key>.png (source) and packs
apps/web/public/assets/maps/sai-gon/atlas/sg-decor-0.{webp,json} (Phaser hash atlas).
Same pipeline as props.py (4x supersampled, bottom-centre anchor, no text or brand logos baked in).
"""
from __future__ import annotations

import math
import os
import sys

import numpy as np
from PIL import Image

sys.path.insert(0, os.path.dirname(__file__))
from lib import Mat, hexc, tex_noise, tex_stone, tex_wood  # noqa: E402
from props import CREAM, DWOOD, IRON, LEAF, LEAF2, P, WHITE, WOOD  # noqa: E402
from sg_common import pack_atlas, src  # noqa: E402

REG = {}


def sprite(key, w, h):
    def deco(fn):
        REG[key] = (w, h, fn)
        return fn
    return deco


def m(col, shine=0.25, rough=14, amb=0.5, diff=0.65, tex=None, spec=None):
    kw = {'spec_col': spec} if spec else {}
    return Mat(col, shine=shine, rough=rough, amb=amb, diff=diff, tex=tex, **kw)


# ====================================================================== materials
STEEL = m('#b9c0c8', 0.85, 44, 0.42, 0.8, tex_noise(0.04, 6, 601), '#ffffff')
DSTEEL = m('#6c737c', 0.7, 36, 0.4, 0.8, tex_noise(0.05, 6, 602))
ALU = m('#c8ccd0', 0.7, 30, 0.48, 0.7, tex_noise(0.06, 4, 603))
CRAB = m('#00b14f', 0.55, 30, 0.5, 0.7, tex_noise(0.04, 3, 604))
CRAB_D = m('#007a37', 0.5, 28, 0.45, 0.7)
STOOL_R = m('#d8342c', 0.55, 30, 0.52, 0.68, tex_noise(0.04, 3, 605))
STOOL_B = m('#2f7fd0', 0.55, 30, 0.52, 0.68, tex_noise(0.04, 3, 606))
RUBBER = m('#1f2126', 0.3, 16, 0.4, 0.6, tex_noise(0.08, 2, 607))
SEAT = m('#2b2420', 0.45, 24, 0.4, 0.65, tex_noise(0.06, 3, 608))
CONC = m('#9a9790', 0.06, 8, 0.48, 0.64, tex_stone(609, 4, 0.25))
CONC_D = m('#6e6b66', 0.06, 8, 0.45, 0.64, tex_stone(610, 4, 0.25))
GLASS = m('#cfe2ea', 0.95, 70, 0.55, 0.35, spec='#ffffff')
PORK = m('#9a4a22', 0.5, 26, 0.45, 0.72, tex_noise(0.25, 2, 611))
BREAD = m('#d89a48', 0.45, 22, 0.52, 0.7, tex_noise(0.18, 2, 612))
CANE = m('#7a9a3a', 0.4, 20, 0.45, 0.7, tex_wood(1.2, seed=613, dark='#3e5a1a'))
CANE_P = m('#5a2e4a', 0.45, 22, 0.42, 0.7, tex_wood(1.2, seed=614, dark='#2a0e22'))
FUEL = m('#e88a1a', 0.85, 50, 0.5, 0.55, spec='#fff2c0')
YELLP = m('#e8b21e', 0.5, 26, 0.5, 0.7)
REDLAC = m('#b8261c', 0.55, 30, 0.45, 0.7, tex_noise(0.05, 3, 615))
TERRA = m('#a8583a', 0.15, 10, 0.45, 0.66, tex_noise(0.12, 2, 616))
BLOOM = m('#d42a8a', 0.25, 12, 0.6, 0.55, tex_noise(0.2, 2, 617))
BLOOM2 = m('#ee5aa8', 0.25, 12, 0.62, 0.55, tex_noise(0.2, 2, 618))
CARD = m('#b88a52', 0.08, 6, 0.5, 0.62, tex_noise(0.12, 3, 619))
FOAM = m('#f2f2ee', 0.08, 6, 0.6, 0.5, tex_noise(0.1, 2, 620))
TIN = m('#8a9098', 0.6, 30, 0.42, 0.7, tex_noise(0.1, 3, 621))
TILE = m('#3e86b8', 0.7, 40, 0.48, 0.65, tex_noise(0.05, 3, 622))
MINT = m('#8ec9b4', 0.12, 8, 0.52, 0.62, tex_noise(0.08, 3, 623))
SKIN = m('#e8c49a', 0.45, 26, 0.55, 0.6)
PLASTIC_O = m('#e8662a', 0.6, 32, 0.5, 0.65)
PLASTIC_W = m('#f2f0ea', 0.5, 28, 0.58, 0.55)
SODIUM = '#ffb04a'
VOLT = '#fff2c0'
BIKE_COLS = ['#d8342c', '#2f6fb5', '#e8e6de', '#2b2d31', '#e2a227', '#7a4fb5', '#8a8f96']


def stripe_mat(col):
    return m(col, 0.4, 20, 0.5, 0.65, tex_noise(0.05, 3, sum(map(ord, col))))


# ====================================================================== helpers
def stool(p: P, cx, yb, mat=STOOL_R, s=1.0):
    """Ghế nhựa thấp: flared plastic stool with the square cut-outs."""
    p.shadow(cx, yb, 15 * s, 4.5 * s, 0.35)
    p.lathe(cx, yb, lambda t: (14 - 3.5 * t) * s, mat, 22 * s, ry_ratio=0.34)
    p.rect(cx - 5 * s, yb - 15 * s, cx + 5 * s, yb - 5 * s, '#140808', 0.42, r=1.5 * s)
    p.ell(cx, yb - 25 * s, 4.5 * s, 1.5 * s, '#140808', 0.4)


def scooter(p: P, cx, yb, s=1.0, body=CRAB, facing=-1, helmet=None, box=None, trim=None):
    """Side-on step-through scooter; (cx, yb) = ground under the middle. facing -1 = front to the left."""
    X = lambda u: cx + facing * -u * s  # noqa: E731  (u > 0 is towards the front)
    Y = lambda v: yb - v * s  # noqa: E731
    pt = lambda u, v: (X(u), Y(v))  # noqa: E731
    trim = trim or m('#3a3d42', 0.5, 26, 0.42, 0.7)
    p.shadow(cx, yb - 1, 38 * s, 5 * s, 0.42)
    for u in (25, -23):
        p.ring(X(u), Y(9.5), 8.6 * s, 8.6 * s, 3.4 * s, RUBBER)
        p.blob(X(u), Y(9.5), 4.2 * s, 4.2 * s, ALU, flat=0.4)
        p.ell(X(u), Y(9.5), 1.4 * s, 1.4 * s, '#2a2d33')
    p.tube(pt(-23, 9.5), pt(-4, 13), 1.8 * s, DSTEEL)  # swing arm / exhaust
    p.tube(pt(-30, 12), pt(-8, 12), 2.2 * s, m('#4a4d52', 0.8, 40))
    # rear cowl, floorboard, leg shield, front mudguard
    p.poly([pt(-36, 16), pt(-32, 30), pt(-6, 33), pt(9, 27), pt(8, 15), pt(-6, 13)], body, n=(-0.15, 0.55, 0.8), grad=0.32)
    p.line([pt(-33, 24), pt(-8, 27), pt(6, 23)], 1.0 * s, '#ffffff', 0.22)
    p.poly([pt(8, 12), pt(18, 12), pt(18, 16.5), pt(8, 16.5)], trim)
    p.poly([pt(16, 12), pt(24, 13), pt(28, 22), pt(24, 46), pt(17, 47), pt(14, 22)], body, n=(-0.45, 0.3, 0.85), grad=0.2)
    p.poly([pt(17, 18), pt(33, 18.5), pt(35, 14), pt(18, 13)], body, n=(0, 0.8, 0.6))
    p.tube(pt(25, 9.5), pt(21, 46), 1.5 * s, DSTEEL)
    # headset, bars, lamp, mirror
    p.poly([pt(15, 44), pt(27, 44), pt(28, 52), pt(14, 51)], body, n=(-0.2, 0.6, 0.8))
    p.tube(pt(10, 51), pt(30, 52), 1.8 * s, RUBBER)
    p.blob(X(27.5), Y(47), 3.2 * s, 2.8 * s, m('#fff2c0', 0.9, 40, 0.85, 0.3))
    p.glow(X(29), Y(47), 7 * s, VOLT, 0.35)
    p.tube(pt(12, 52), pt(10, 60), 0.7 * s, DSTEEL)
    p.blob(X(10), Y(61), 2.6 * s, 1.8 * s, m('#1a1c20', 0.9, 50))
    # seat + tail light
    p.poly([pt(-33, 31), pt(-3, 35.5), pt(7, 33), pt(-31, 28.5)], SEAT, n=(0, 0.85, 0.5))
    p.ell(X(-36), Y(23), 2.2 * s, 1.6 * s, '#ff3a2a')
    p.glow(X(-37), Y(23), 4 * s, '#ff3a2a', 0.3)
    if box is not None:  # delivery box on a rack
        p.box(X(-14) - 13 * s, Y(56), 26 * s, 6 * s, 18 * s, box)
        p.rect(X(-14) - 13 * s, Y(46), X(-14) + 13 * s, Y(44.5), '#ffffff', 0.25)
    if helmet is not None:
        hx = X(-14)
        p.blob(hx, Y(41), 9 * s, 7.5 * s, helmet, flat=0.7)
        p.poly([(hx + facing * 9 * s, Y(40)), (hx + facing * 1 * s, Y(39.5)), (hx + facing * 2 * s, Y(36)), (hx + facing * 9.5 * s, Y(36.5))],
               m('#1a2028', 0.9, 50, 0.4, 0.6))
        p.ell(hx - facing * 2 * s, Y(45), 4 * s, 1.6 * s, '#ffffff', 0.4, blur=1)


def concrete_pole(p: P, cx, yb, hgt, s=1.0, lamp=True, transformer=False, seed=1):
    """Cột điện: tapered concrete pole, crossbars + porcelain insulators, a tangle of cable loops, sodium lamp arm."""
    rs = np.random.default_rng(seed)
    top = yb - hgt
    p.shadow(cx, yb, 12 * s, 4 * s, 0.45)
    p.tube((cx, yb - 2), (cx, top), 6.2 * s, CONC, r1=4.0 * s)
    for k in range(int(hgt / 22)):
        y = yb - 14 - k * 22
        p.line([(cx - 4 * s, y), (cx + 4 * s, y)], 0.7, '#3a3834', 0.35)
    # flyers stuck on the pole (blank paper, no text)
    for k in range(3):
        y = yb - 30 - k * 13 - rs.random() * 4
        col = ['#f4f0e0', '#f8e27a', '#f0b8c8'][k]
        p.rect(cx - 5 * s, y, cx + 4.5 * s, y + 9, col, 0.9)
    for y, hw in ((top + 18, 22 * s), (top + 34, 16 * s)):
        p.box(cx - hw, y - 2, hw * 2, 2.5, 3.5, CONC_D)
        for dx in (-hw + 3, -hw / 2, hw / 2, hw - 3):
            p.blob(cx + dx, y - 4, 2, 2.8, WHITE, flat=0.5)
    # cable loops hanging between the insulators (stays inside the sprite)
    for k in range(7):
        x0 = cx - 22 * s + rs.random() * 10
        x1 = cx + 12 * s + rs.random() * 10
        sag = 10 + rs.random() * 26
        y0 = top + 16 + rs.random() * 20
        pts = [(x0 + (x1 - x0) * i / 12, y0 + sag * math.sin(math.pi * i / 12) + (i / 12) * 6) for i in range(13)]
        p.line(pts, 1.1 + rs.random() * 0.6, '#141416', 0.92)
    for k in range(3):  # a coil bundle
        p.ring(cx + 7 * s, top + 60 + k * 1.5, 6 * s, 4 * s, 0.9, RUBBER)
    if transformer:
        p.box(cx - 13 * s, top + 70, 10 * s, 4, 18, DSTEEL)
        p.lathe(cx - 8 * s, top + 92, lambda t: 6 * s, m('#7a8088', 0.5, 26), 22)
    if lamp:
        p.tube((cx, top + 8), (cx + 22 * s, top + 2), 1.6 * s, DSTEEL)
        p.poly([(cx + 16 * s, top - 2), (cx + 30 * s, top + 1), (cx + 28 * s, top + 6), (cx + 16 * s, top + 4)], DSTEEL, n=(0, 0.8, 0.6))
        p.ell(cx + 23 * s, top + 5.5, 6 * s, 1.8 * s, '#ffd27a')
        p.glow(cx + 23 * s, top + 8, 16 * s, SODIUM, 0.7)


def cart_wheels(p: P, xs, yb, r=9):
    for x in xs:
        p.ring(x, yb - r, r, r, 2.6, RUBBER)
        p.blob(x, yb - r, r * 0.38, r * 0.38, ALU, flat=0.4)
        for k in range(6):
            a = k / 6 * math.pi
            p.line([(x - math.cos(a) * r * 0.8, yb - r - math.sin(a) * r * 0.8), (x + math.cos(a) * r * 0.8, yb - r + math.sin(a) * r * 0.8)], 0.6, '#9aa0a8', 0.8)


def glass_case(p: P, x0, y0, x1, y1, frame=ALU, tint='#cfe2ea'):
    """Glass display cabinet front: tinted pane + frame + diagonal sheen (contents are painted before)."""
    p.rect(x0, y0, x1, y1, tint, 0.18)
    p.line([(x0 + 4, y1 - 3), (x0 + (y1 - y0) * 0.6, y0 + 3)], 2.2, '#ffffff', 0.3)
    p.line([(x0 + 12, y1 - 3), (x0 + 6 + (y1 - y0) * 0.6, y0 + 3)], 1.0, '#ffffff', 0.25)
    for a, b in (((x0, y0), (x1, y0)), ((x0, y1), (x1, y1)), ((x0, y0), (x0, y1)), ((x1, y0), (x1, y1))):
        p.tube(a, b, 1.3, frame)


def bulb(p: P, x, y, r=10, col='#ffe2a0'):
    p.line([(x, y - 9), (x, y - 3)], 0.6, '#1a1a1a')
    p.blob(x, y, 2.4, 2.8, m('#fff6d8', 0.9, 40, 0.95, 0.2))
    p.glow(x, y, r, col, 0.7)


def awning(p: P, x0, x1, y, depth, cols=('#d8342c', '#f2efe6'), n=8):
    """Striped tarp awning seen from the front, scalloped hem."""
    wpx = (x1 - x0) / n
    for i in range(n):
        xa, xb = x0 + i * wpx, x0 + (i + 1) * wpx
        p.poly([(xa, y), (xb, y), (xb + 1, y + depth), (xa + 1, y + depth)], stripe_mat(cols[i % 2]), n=(0, 0.75, 0.65), grad=-0.2)
        p.ell((xa + xb) / 2 + 1, y + depth, wpx / 2, 2.6, cols[i % 2])


def steam(p: P, x, y, hgt, seed):
    p.smoke(x, y, hgt, seed, 0.32)


def jar(p: P, cx, yb, r, h, fill, lid='#d8342c'):
    p.lathe(cx, yb, lambda t: r if t < 0.86 else r * 0.8, GLASS, h)
    p.rect(cx - r + 1, yb - h * 0.75, cx + r - 1, yb - 1, fill, 0.8, r=1.5)
    p.lathe(cx, yb - h + 1, lambda t: r * 0.86, m(lid, 0.5, 26), 3)


def bottle(p: P, cx, yb, h, fill=FUEL, r=5.5):
    p.lathe(cx, yb, lambda t: r if t < 0.6 else r * (1 - (t - 0.6) / 0.4 * 0.7), GLASS, h)
    p.rect(cx - r + 1, yb - h * 0.56, cx + r - 1, yb - 1, '#e88a1a', 0.78, r=1.5)
    p.line([(cx - r * 0.5, yb - h * 0.52), (cx - r * 0.5, yb - 3)], 1.0, '#fff2c0', 0.5)
    p.blob(cx, yb - h - 1, r * 0.4, r * 0.32, STOOL_R)


def tire(p: P, cx, cy, r, th=3.6):
    p.ring(cx, cy, r, r, th, RUBBER)
    p.ring(cx, cy, r - th * 0.3, r - th * 0.3, 0.5, m('#3a3d42', 0.3, 10))


def helmet(p: P, cx, cy, s, mat):
    p.blob(cx, cy, 10 * s, 8 * s, mat, flat=0.7)
    p.poly([(cx - 8 * s, cy + 1 * s), (cx + 6 * s, cy + 2 * s), (cx + 5 * s, cy + 6 * s), (cx - 7 * s, cy + 5 * s)], m('#1a2028', 0.9, 50, 0.4, 0.6))
    p.rect(cx - 10 * s, cy + 5 * s, cx + 10 * s, cy + 6.5 * s, '#2a2d33', 0.8)
    p.ell(cx - 3 * s, cy - 4 * s, 4 * s, 1.8 * s, '#ffffff', 0.45, blur=1)


def bougainvillea(p: P, cx, top, w, seed):
    rs = np.random.default_rng(seed)
    for k in range(5):
        a = -math.pi / 2 + (k - 2) * 0.45
        p.tube((cx, top + w * 0.9), (cx + math.cos(a) * w * 0.7, top + w * 0.9 + math.sin(a) * w * 0.7), 1.2, m('#5a3a22'))
    for k in range(70):
        a, r = rs.random() * 2 * math.pi, w * math.sqrt(rs.random())
        x, y = cx + math.cos(a) * r, top + w * 0.55 + math.sin(a) * r * 0.62
        if rs.random() < 0.35:
            p.blob(x, y, 3.2, 2.2, LEAF2 if rs.random() < 0.5 else LEAF, flat=0.5)
        else:
            p.blob(x, y, 2.6 + rs.random(), 2.2 + rs.random(), BLOOM if rs.random() < 0.6 else BLOOM2, flat=0.6)


def blank_flyers(p: P, x0, x1, y0, y1, seed, n=4):
    rs = np.random.default_rng(seed)
    for _ in range(n):
        x = x0 + rs.random() * (x1 - x0 - 8)
        y = y0 + rs.random() * (y1 - y0 - 10)
        col = ['#f4f0e0', '#f8e27a', '#f0b8c8', '#bfe0f0'][int(rs.integers(0, 4))]
        p.rect(x, y, x + 8 + rs.random() * 4, y + 10 + rs.random() * 3, col, 0.88)
        p.line([(x + 2, y + 3), (x + 7, y + 3)], 0.6, '#5a5a5a', 0.5)


# ====================================================================== đầu hẻm
@sprite('sg-prop-courtyard-ban-inox', 128, 88)
def courtyard_ban_inox(p: P):
    """Bàn inox họp hụi: steel table, iced-tea glasses, the hụi notebook, a stack of red envelopes."""
    p.shadow(64, 82, 54, 9, 0.45)
    for x in (16, 112):
        p.tube((x, 50), (x, 82), 2, STEEL)
    p.box(10, 34, 108, 22, 6, STEEL, top=m('#d6dbe0', 0.9, 50, 0.45, 0.75, tex_noise(0.03, 8, 640), '#ffffff'))
    p.line([(14, 38), (112, 38)], 0.8, '#ffffff', 0.4)
    for k, x in enumerate((26, 44, 86, 102)):
        p.lathe(x, 50 - (k % 2) * 6, lambda t: 4.4 + 0.8 * t, GLASS, 12, top_open=True)
        p.rect(x - 3.6, 42 - (k % 2) * 6, x + 3.6, 49 - (k % 2) * 6, '#c8862a', 0.7)
    p.poly([(56, 38), (78, 36), (80, 48), (58, 50)], m('#2a4a7a', 0.3, 18), n=(0, 0.8, 0.6))
    p.poly([(58, 39), (77, 37.5), (78, 46), (60, 47.5)], m('#f3ecd8', 0.06, 6, 0.62, 0.5), n=(0, 0.8, 0.6))
    for k in range(3):
        p.line([(61, 41 + k * 2.2), (75, 40 + k * 2.2)], 0.5, '#7a8aa8', 0.8)
    for k in range(4):
        p.poly([(36 + k, 47 - k * 1.6), (50 + k, 46 - k * 1.6), (51 + k, 52 - k * 1.6), (37 + k, 53 - k * 1.6)], REDLAC, n=(0, 0.6, 0.8))
    p.rect(40, 46, 44, 49, '#e8b23a', 0.9)


@sprite('sg-prop-courtyard-xe-crab-hang', 208, 112)
def courtyard_xe_crab_hang(p: P):
    """Hàng xe ôm công nghệ đậu chờ cuốc: three bikes nose-in, green helmets on the seats."""
    specs = [(48, 78, CRAB, CRAB), (110, 84, m(BIKE_COLS[2], 0.55, 30, 0.5, 0.7), CRAB), (164, 104, CRAB, PLASTIC_W)]
    for cx, yb, body, hel in specs:
        scooter(p, cx, yb, 1.18, body, facing=-1, helmet=hel)


@sprite('sg-prop-courtyard-cot-dien', 96, 288)
def courtyard_cot_dien(p: P):
    concrete_pole(p, 40, 284, 270, 1.0, lamp=True, transformer=True, seed=11)


# ====================================================================== dãy quán ăn
@sprite('sg-prop-exhibition-bang-hieu', 208, 96)
def exhibition_bang_hieu(p: P):
    """Shop sign on the wall: icon-only panel (bowl, plate, glass), neon outline, bulbs. No text."""
    p.box(8, 8, 192, 4, 68, m('#1e2a3a', 0.3, 16, 0.45, 0.65))
    p.rect(14, 16, 194, 76, '#f2c230')
    p.rect(14, 60, 194, 76, '#d8342c')
    for cx, kind in ((50, 'bowl'), (104, 'plate'), (158, 'glass')):
        p.ell(cx, 38, 20, 18, '#ffffff', 0.85)
        if kind == 'bowl':
            p.poly([(cx - 12, 36), (cx + 12, 36), (cx + 7, 46), (cx - 7, 46)], m('#2f6fb5', 0.6, 30))
            for k in range(3):
                p.line([(cx - 6 + k * 6, 33), (cx - 4 + k * 6, 26), (cx - 6 + k * 6, 21)], 1.2, '#9aa0a8', 0.8)
        elif kind == 'plate':
            p.ell(cx, 41, 14, 5, '#e8e6e0')
            p.blob(cx - 4, 38, 7, 4, m('#f6f1e4', 0.1, 8, 0.62, 0.5), flat=0.6)
            p.poly([(cx, 36), (cx + 10, 34), (cx + 12, 40), (cx + 2, 42)], PORK)
        else:
            p.poly([(cx - 7, 26), (cx + 7, 26), (cx + 5, 48), (cx - 5, 48)], m('#c8862a', 0.8, 40))
            p.rect(cx - 5, 40, cx + 5, 48, '#efe0bc', 0.9)
        p.ring(cx, 38, 20, 18, 0.9, m('#2a2d33'))
    for k in range(9):  # blank lines where the address/phone would be painted
        p.rect(22 + k * 20, 66, 34 + k * 20, 69, '#ffffff', 0.55)
    # neon tube frame + glow
    neon = [(12, 14), (196, 14), (196, 78), (12, 78), (12, 14)]
    p.line(neon, 4, '#ff4aa8', 0.35, blur=3)
    p.line(neon, 1.6, '#ffd0ea')
    for x in (30, 104, 178):
        bulb(p, x, 88, 9)


@sprite('sg-prop-exhibition-xe-com-tam', 160, 144)
def exhibition_xe_com_tam(p: P):
    """Xe cơm tấm: steel cart, glass case of grilled chops, charcoal grill smoking at the side, a bare bulb."""
    p.shadow(80, 138, 70, 9, 0.45)
    cart_wheels(p, (30, 118), 140, 11)
    p.box(14, 70, 124, 14, 38, STEEL, top=m('#d6dbe0', 0.9, 50, 0.45, 0.75))
    p.rect(20, 92, 132, 116, '#d8342c', 0.9, r=2)
    p.rect(20, 96, 132, 99, '#f2c230', 0.9)
    # display case contents: stacked chops, bì, chả
    for k in range(5):
        x = 30 + k * 15
        p.poly([(x, 66), (x + 14, 62), (x + 16, 68), (x + 2, 72)], PORK, n=(0, 0.7, 0.7))
        p.line([(x + 4, 70), (x + 8, 63)], 0.8, '#3a160a', 0.7)
    p.blob(108, 64, 10, 5, m('#f1d8a0', 0.3, 14, 0.55, 0.6, tex_noise(0.3, 1, 641)), flat=0.5)
    p.box(92, 52, 24, 6, 6, m('#e8b860', 0.4, 20, 0.55, 0.62))
    glass_case(p, 20, 34, 124, 72)
    p.box(18, 28, 108, 6, 2, ALU)
    # charcoal grill on a bracket at the right
    p.box(124, 62, 28, 8, 12, m('#3a3a3c', 0.4, 20))
    for k in range(6):
        p.line([(126 + k * 4.6, 62), (126 + k * 4.6, 70)], 0.8, '#8a8f96')
    p.glow(138, 70, 12, '#ff6a1c', 0.65)
    for k in range(3):
        p.poly([(128 + k * 8, 64), (136 + k * 8, 62), (137 + k * 8, 66), (129 + k * 8, 68)], PORK, n=(0, 0.8, 0.6))
    steam(p, 138, 60, 50, 642)
    p.tube((22, 28), (22, 8), 1.2, DSTEEL)
    p.tube((22, 8), (64, 8), 1.2, DSTEEL)
    bulb(p, 64, 18, 16)


@sprite('sg-prop-exhibition-xe-banh-mi', 128, 136)
def exhibition_xe_banh_mi(p: P):
    """Xe bánh mì: glass cabinet of baguettes, pâté tins, ham rolls, pickles jar; yellow front panel."""
    p.shadow(64, 130, 56, 8, 0.45)
    cart_wheels(p, (24, 104), 132, 10)
    p.box(10, 72, 108, 12, 34, m('#e8e6e0', 0.4, 20, 0.55, 0.62), top=STEEL)
    p.rect(16, 92, 112, 112, '#f2c230', 0.95, r=2)
    for x in (40, 64, 88):
        p.ell(x, 102, 6, 5, '#ffffff', 0.8)
        p.blob(x, 102, 4.5, 2.2, BREAD, flat=0.6)
    rs = np.random.default_rng(643)
    for k in range(9):
        x = 20 + (k % 5) * 16 + rs.random() * 4
        y = 64 - (k // 5) * 10
        p.blob(x + 6, y, 9, 3.6, BREAD, flat=0.65)
        for j in range(3):
            p.line([(x + 1 + j * 4, y - 1), (x + 4 + j * 4, y - 3)], 0.7, '#a06a28', 0.8)
    for x in (96, 106):
        p.lathe(x, 70, lambda t: 4, m('#c8ccd0', 0.8, 40), 6)
    p.blob(98, 56, 6, 3, m('#e8a890', 0.4, 20, 0.55, 0.6), flat=0.6)
    jar(p, 104, 52, 5, 14, '#e8822a')
    glass_case(p, 14, 30, 114, 74, frame=ALU, tint='#f8f0c8')
    p.box(12, 24, 104, 6, 2, YELLP)
    bulb(p, 64, 14, 15)


@sprite('sg-prop-exhibition-xe-hu-tieu', 128, 144)
def exhibition_xe_hu_tieu(p: P):
    """Xe hủ tiếu gõ: wooden cart, big steaming broth pot, bowls stacked, noodles hanging, the wooden clappers."""
    p.shadow(64, 138, 56, 8, 0.45)
    cart_wheels(p, (22, 106), 140, 11)
    p.box(10, 80, 108, 12, 34, WOOD, top=DWOOD)
    p.rect(16, 96, 112, 120, '#2f6fb5', 0.85, r=2)
    for k in range(4):
        p.rect(22 + k * 23, 100, 38 + k * 23, 116, '#ffffff', 0.12, r=1)
    p.lathe(36, 84, lambda t: 19 if t < 0.94 else 20, ALU, 30, top_open=True)
    p.ell(36, 55, 17, 5, '#8a5a2a')
    p.ell(30, 54, 7, 1.6, '#ffe2a0', 0.4)
    steam(p, 36, 52, 46, 644)
    p.ring(36, 55, 17.5, 5.4, 0.8, ALU)
    for k in range(4):
        p.lathe(80, 86 - k * 4.5, lambda t: 9 + 2 * t, m('#f2f0ea', 0.6, 30, 0.6, 0.5), 4.5)
    p.lathe(100, 86, lambda t: 8, GLASS, 18, top_open=True)
    for k in range(5):
        p.line([(97 + k * 1.4, 68), (97 + k * 1.4, 80)], 0.8, '#d8b878', 0.9)
    # glass upper with hanging noodles + herbs
    for k in range(6):
        x = 58 + k * 7
        p.line([(x, 34), (x - 1, 48), (x + 1, 56)], 1.6, '#f4ecd0', 0.95)
    p.blob(108, 62, 7, 4, LEAF, flat=0.5)
    glass_case(p, 54, 30, 116, 64)
    p.box(8, 24, 112, 6, 2, DWOOD)
    p.tube((116, 108), (126, 96), 1.6, m('#d4a050'))
    p.tube((118, 112), (127, 104), 1.6, m('#d4a050'))
    bulb(p, 30, 14, 15)


@sprite('sg-prop-exhibition-xe-nuoc-mia', 128, 136)
def exhibition_xe_nuoc_mia(p: P):
    """Xe nước mía: steel press with rollers and crank wheel, a bundle of cane, kumquats, ice box."""
    p.shadow(64, 130, 56, 8, 0.45)
    cart_wheels(p, (22, 106), 132, 10)
    p.box(10, 74, 108, 12, 32, STEEL, top=m('#d6dbe0', 0.9, 50, 0.45, 0.75))
    p.rect(16, 92, 112, 112, '#3e8a4a', 0.9, r=2)
    p.box(28, 46, 44, 12, 20, STEEL)
    for y in (52, 60):
        p.tube((32, y), (68, y), 3, ALU)
    p.ring(80, 54, 14, 14, 2.2, DSTEEL)
    p.tube((80, 54), (92, 44), 1.4, DSTEEL)
    p.blob(92, 44, 2.6, 2.6, RUBBER)
    p.blob(50, 82, 6, 2, m('#c8d070', 0.6, 30, 0.6, 0.5), flat=0.4)
    for k in range(9):  # cane bundle leaning at the left
        x = 14 + k * 2.6
        mat = CANE_P if k % 3 == 0 else CANE
        p.tube((x, 80), (x + 10, 8 + k), 1.7, mat)
        for j in range(4):
            y = 70 - j * 16 + k
            p.line([(x + (80 - y) / 72 * 10 - 1.6, y), (x + (80 - y) / 72 * 10 + 1.6, y)], 0.6, '#2a3a12', 0.7)
    p.box(92, 62, 24, 8, 12, FOAM)
    for k in range(5):
        p.blob(98 + (k % 3) * 6, 60 - (k // 3) * 4, 2.4, 2.4, m('#f39a1c', 0.65, 34))
    bulb(p, 64, 16, 15)


# ====================================================================== hẻm chính / tiệm vá xe
@sprite('sg-prop-corridor-cot-dien', 96, 288)
def corridor_cot_dien(p: P):
    concrete_pole(p, 40, 284, 268, 1.0, lamp=True, transformer=False, seed=12)


@sprite('sg-prop-editing-cot-dien', 96, 272)
def editing_cot_dien(p: P):
    concrete_pole(p, 40, 268, 252, 1.0, lamp=True, transformer=True, seed=13)


@sprite('sg-prop-editing-thau-va-xe', 128, 88)
def editing_thau_va_xe(p: P):
    """Tiệm vá xe: blue basin with an inner tube, a red tool box, hand pump, patches."""
    p.shadow(64, 82, 56, 8, 0.45)
    p.lathe(44, 80, lambda t: 26 + 6 * t, m('#2f7fd0', 0.6, 32, 0.5, 0.7), 18, top_open=True)
    p.ell(44, 62, 29, 7, '#5aa8d8')
    p.ring(44, 60, 20, 6.5, 3.8, RUBBER, back_only=True)
    p.ell(44, 62, 29, 7, '#5aa8d8', 0.5)
    p.ring(44, 60, 20, 6.5, 3.8, RUBBER, front_only=True)
    for x, y in ((62, 56), (66, 52), (60, 50)):
        p.ring(x, y, 1.6, 1.6, 0.4, GLASS)
    p.box(80, 56, 34, 10, 16, REDLAC, top=m('#c8342a', 0.5, 26))
    p.tube((88, 56), (106, 56), 1.4, DSTEEL)
    p.rect(84, 64, 110, 66, '#2a2d33', 0.6)
    for k, col in enumerate(('#8a8f96', '#d8b23a', '#5a5d62')):
        p.tube((84 + k * 8, 54), (90 + k * 8, 44), 1.1, m(col, 0.8, 40))
    p.tube((118, 84), (118, 46), 2.2, m('#d8342c', 0.5, 26))
    p.tube((112, 46), (124, 46), 1.6, RUBBER)
    p.ell(118, 84, 7, 2.4, '#2a2d33')
    p.line([(118, 70), (110, 80), (100, 82)], 1.2, '#1a1c20')
    for k in range(3):
        p.rect(14 + k * 7, 78, 19 + k * 7, 82, '#3a2a1a', 0.85, r=1)


@sprite('sg-prop-editing-ke-xang', 96, 120)
def editing_ke_xang(p: P):
    """Kệ xăng lẻ: iron rack of glass bottles of fuel, funnel and hose on top."""
    p.shadow(48, 114, 40, 7, 0.45)
    for x in (12, 84):
        p.tube((x, 114), (x, 30), 1.6, DSTEEL)
    for y in (74, 112):
        p.box(10, y - 6, 76, 6, 3, m('#5a5d62', 0.5, 24))
    for k in range(6):
        bottle(p, 18 + k * 12, 68, 28)
    for k in range(5):
        bottle(p, 22 + k * 13, 106, 26)
    p.box(10, 26, 76, 6, 3, m('#5a5d62', 0.5, 24))
    p.poly([(30, 4), (54, 4), (45, 18), (39, 18)], STEEL, n=(-0.2, 0.3, 0.9), grad=0.3)
    p.ell(42, 4, 12, 3, '#3a3d42')
    p.tube((42, 18), (42, 26), 2, DSTEEL, r1=1.2)
    p.ring(70, 18, 8, 3, 1.4, m('#d8342c', 0.4, 20))


@sprite('sg-decor-ban-tho-ong-dia', 72, 88)
def ban_tho_ong_dia(p: P):
    """Bàn thờ Ông Địa – Thần Tài on the floor: red lacquer box, two seated figures, incense, red lamp."""
    p.shadow(36, 84, 32, 6, 0.45)
    p.box(6, 50, 60, 10, 24, REDLAC, top=m('#c8342a', 0.5, 26))
    p.rect(10, 64, 62, 80, '#7a1410', 0.6, r=2)
    for k in range(4):
        p.line([(14 + k * 14, 66), (14 + k * 14, 78)], 1.2, '#e8b23a', 0.6)
    p.box(4, 18, 64, 4, 34, m('#9a1e16', 0.5, 26))
    p.rect(8, 22, 64, 50, '#5a0e0a', 0.9)
    p.glow(36, 38, 30, '#ff4a2a', 0.5)
    # Ông Địa (big belly, laughing) + Thần Tài (with ingot), no faces drawn in detail
    p.blob(24, 44, 10, 8, m('#e8c49a', 0.45, 26, 0.6, 0.55), flat=0.6)
    p.blob(24, 31, 6.5, 6.5, SKIN, flat=0.6)
    p.line([(21, 32), (27, 32)], 0.8, '#5a2a1a')
    p.blob(48, 42, 8, 9, m('#c8281c', 0.5, 26), flat=0.6)
    p.blob(48, 30, 5.5, 5.5, SKIN, flat=0.6)
    p.poly([(43, 26), (53, 26), (51, 22), (45, 22)], m('#1a1410', 0.5, 26))
    p.blob(48, 40, 3.6, 2, m('#e8b23a', 0.9, 40), flat=0.6)
    p.lathe(36, 58, lambda t: 6, m('#e8b23a', 0.8, 40), 6)
    for k in range(3):
        p.line([(33 + k * 3, 52), (32 + k * 4, 40)], 0.8, '#8a3a1a')
        p.ell(32 + k * 4, 40, 0.8, 0.8, '#ff6a2a')
    p.smoke(36, 38, 24, 645, 0.22)
    for x in (12, 60):
        p.blob(x, 26, 3, 4, m('#ff3a2a', 0.8, 40, 0.9, 0.3), flat=0.6)
        p.glow(x, 26, 6, '#ff4a2a', 0.6)
    for k in range(3):
        p.blob(28 + k * 8, 55, 3.4, 3.4, m(['#f39a1c', '#e8c53c', '#d8342c'][k], 0.6, 30), flat=0.6)


@sprite('sg-decor-lop-treo', 64, 104)
def lop_treo(p: P):
    """Lốp xe treo: used tyres hung on a post."""
    p.shadow(32, 100, 22, 5, 0.4)
    p.tube((32, 100), (32, 10), 2.6, DWOOD)
    p.tube((26, 14), (40, 14), 1.4, IRON)
    for k, (dx, y, r) in enumerate(((-2, 36, 20), (3, 52, 17), (-1, 72, 22))):
        tire(p, 32 + dx, y, r, 4.2 - k * 0.2)
    p.tube((32, 14), (32, 18), 1, IRON)


@sprite('sg-decor-binh-xang', 40, 56)
def binh_xang(p: P):
    p.shadow(20, 52, 15, 4, 0.4)
    p.box(6, 16, 26, 8, 28, STOOL_R, top=m('#c8342a', 0.55, 30))
    p.ring(16, 12, 6, 3, 1.6, STOOL_R)
    p.tube((28, 16), (33, 8), 2.2, m('#e8b23a', 0.6, 30))
    p.rect(9, 30, 29, 34, '#ffffff', 0.25)


@sprite('sg-decor-can-nuoc', 48, 64)
def can_nuoc(p: P):
    p.shadow(24, 60, 18, 4, 0.4)
    p.box(8, 16, 30, 10, 34, m('#2f7fd0', 0.55, 30, 0.5, 0.65), top=m('#3a8ad8', 0.55, 30))
    p.ring(18, 13, 6, 3, 1.8, m('#2f7fd0', 0.55, 30))
    p.blob(32, 18, 3, 2, m('#f2f0ea', 0.5, 26))
    for k in range(3):
        p.line([(10, 32 + k * 8), (36, 32 + k * 8)], 0.8, '#1a4a8a', 0.5)
    p.ell(14, 32, 3, 10, '#ffffff', 0.18, blur=2)


# ====================================================================== quán cà phê cóc
@sprite('sg-prop-coordination-quay-ca-phe', 160, 120)
def quay_ca_phe(p: P):
    """Quầy pha phin: tiled counter, row of dripping phins on glasses, kettle, condensed-milk tins, ice tub."""
    p.shadow(80, 114, 72, 8, 0.45)
    p.box(8, 54, 144, 18, 42, TILE, top=m('#d6dbe0', 0.8, 40, 0.48, 0.7))
    for k in range(13):
        p.line([(8 + k * 12, 72), (8 + k * 12, 114)], 0.7, '#ffffff', 0.45)
    for k in range(4):
        p.line([(8, 72 + k * 10.5), (152, 72 + k * 10.5)], 0.7, '#ffffff', 0.45)
    for k in range(5):
        x = 24 + k * 15
        p.lathe(x, 70, lambda t: 4.2 + 0.6 * t, GLASS, 11, top_open=True)
        p.rect(x - 3.6, 64, x + 3.6, 69, '#3a1c0c', 0.85)
        p.rect(x - 3.6, 67, x + 3.6, 69.5, '#efe0bc', 0.9)
        p.lathe(x, 59, lambda t: 5.8 if t < 0.15 else 4.4, STEEL, 9, top_open=True)
        p.blob(x, 49, 2.6, 1.2, STEEL, flat=0.5)
    p.lathe(112, 70, lambda t: 9 - 3 * t if t < 0.8 else 4, ALU, 22)
    p.tube((120, 60), (128, 52), 1.6, ALU, r1=1.0)
    p.ring(112, 48, 5, 2, 1, RUBBER)
    steam(p, 128, 50, 26, 646)
    for k in range(3):
        p.lathe(136 + (k % 2) * 7, 70 - (k // 2) * 9, lambda t: 3.6, m('#e8e2d0', 0.7, 36), 8)
        p.rect(132.4 + (k % 2) * 7, 64 - (k // 2) * 9, 139.6 + (k % 2) * 7, 66 - (k // 2) * 9, '#2f6fb5', 0.85)
    # back shelf + a glass jar of sugar
    jar(p, 98, 56, 6, 14, '#f4efe2', '#2f6fb5')


@sprite('sg-prop-coordination-ban-ghe-nhua', 120, 88)
def ban_ghe_nhua(p: P):
    """Bàn nhựa thấp + three red stools, two glasses of cà phê sữa đá and a tea pot."""
    stool(p, 22, 66, STOOL_R, 0.95)
    stool(p, 98, 66, STOOL_R, 0.95)
    p.shadow(60, 82, 34, 7, 0.4)
    for x in (34, 86):
        p.tube((x, 58), (x, 82), 2, m('#2a5a9a', 0.5, 26))
    p.box(28, 40, 64, 18, 6, STOOL_B, top=m('#3a8ad8', 0.6, 30))
    for x, full in ((44, True), (76, False)):
        p.lathe(x, 52, lambda t: 4.4 + 0.8 * t, GLASS, 12, top_open=True)
        p.rect(x - 3.6, 44, x + 3.6, 51, '#3a1c0c' if full else '#c8862a', 0.8)
        p.rect(x - 3.6, 48, x + 3.6, 51.5, '#efe0bc', 0.85)
        p.tube((x + 1, 44), (x + 4, 34), 0.7, m('#f2f0ea'))
    p.lathe(60, 54, lambda t: 6 - 2 * t, PLASTIC_W, 9)
    stool(p, 60, 88, STOOL_R, 0.95)


@sprite('sg-prop-coordination-binh-tra-da', 64, 96)
def prop_binh_tra_da(p: P):
    """Bình trà đá on a stool, plastic cups stacked beside."""
    stool(p, 30, 94, STOOL_B, 1.1)
    p.lathe(30, 66, lambda t: 11 if t < 0.85 else 9, PLASTIC_O, 30)
    p.lathe(30, 37, lambda t: 9, PLASTIC_W, 5)
    p.tube((18, 56), (14, 58), 1.6, PLASTIC_W)
    p.line([(22, 46), (38, 46)], 1.2, '#ffffff', 0.35)
    for k in range(5):
        p.lathe(52, 70 - k * 3, lambda t: 4 + t, m('#e8e2d0', 0.6, 30, 0.6, 0.45), 4)


@sprite('sg-decor-binh-tra-da', 48, 64)
def decor_binh_tra_da(p: P):
    p.shadow(24, 60, 16, 4, 0.4)
    p.lathe(24, 60, lambda t: 13 if t < 0.85 else 11, m('#d8342c', 0.6, 32), 36)
    p.lathe(24, 25, lambda t: 11, PLASTIC_W, 6)
    p.tube((11, 50), (6, 52), 1.6, PLASTIC_W)
    p.ell(18, 40, 2.5, 9, '#ffffff', 0.25, blur=1.5)


@sprite('sg-decor-ban-inox', 80, 64)
def decor_ban_inox(p: P):
    p.shadow(40, 60, 34, 6, 0.4)
    for x in (12, 68):
        p.tube((x, 34), (x, 60), 1.6, STEEL)
    p.box(6, 22, 68, 14, 5, STEEL, top=m('#d6dbe0', 0.9, 50, 0.45, 0.75))
    p.line([(10, 25), (70, 25)], 0.7, '#ffffff', 0.4)
    p.lathe(30, 32, lambda t: 4, GLASS, 10, top_open=True)
    p.rect(26.5, 25, 33.5, 31, '#c8862a', 0.7)


@sprite('sg-decor-du-che', 136, 160)
def du_che(p: P):
    """Big street umbrella (dù che nắng) over the stall: striped canopy, steel pole on a concrete foot."""
    p.shadow(68, 156, 20, 5, 0.4)
    p.lathe(68, 156, lambda t: 9 - 3 * t, CONC, 7)
    p.tube((68, 152), (68, 40), 1.8, STEEL)
    cx, cy, rx, ry, apex = 68, 54, 64, 20, 18
    n = 12
    for i in range(n):
        a0, a1 = i / n * 2 * math.pi, (i + 1) / n * 2 * math.pi
        if math.sin((a0 + a1) / 2) < -0.2:
            continue
        p0 = (cx + math.cos(a0) * rx, cy + math.sin(a0) * ry)
        p1 = (cx + math.cos(a1) * rx, cy + math.sin(a1) * ry)
        col = '#2f6fb5' if i % 2 else '#f2efe6'
        p.poly([(cx, apex), p0, p1], stripe_mat(col), n=(math.cos((a0 + a1) / 2) * 0.4, 0.6, 0.7), grad=-0.25)
        p.ell((p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2 + 1.5, abs(p1[0] - p0[0]) / 2 + 1, 2.4, col)
    p.blob(cx, apex, 3, 2.4, STEEL)


@sprite('sg-decor-long-chim', 48, 120)
def long_chim(p: P):
    """Lồng chim chào mào hanging from a stand."""
    p.shadow(24, 116, 14, 4, 0.4)
    p.lathe(24, 116, lambda t: 8 - 3 * t, DWOOD, 5)
    p.tube((24, 112), (24, 8), 1.4, DWOOD)
    p.tube((24, 8), (36, 8), 1.1, DWOOD)
    p.line([(36, 8), (36, 18)], 0.6, '#2a1a0a')
    bars = m('#c8a060', 0.4, 20, 0.5, 0.65, tex_wood(1.5, seed=647))
    p.lathe(36, 60, lambda t: 2 + 10 * math.sin(math.pi * (0.5 + 0.5 * t)) if t > 0.05 else 12, bars, 40,
            deco=lambda u, t: (hexc('#2a1a0a'), (np.abs(np.sin(u * 9)) > 0.25) * 0.85 * (t > 0.08)))
    p.blob(34, 50, 4, 3, m('#7a5a3a', 0.4, 20), flat=0.6)
    p.blob(31, 47, 2.2, 2, m('#2a2a2a', 0.4, 20), flat=0.6)
    p.ell(33, 51, 1.3, 1, '#d8342c')
    p.ell(36, 60, 12, 3, '#3a2a1a', 0.8)


# ====================================================================== gác lửng nhà trọ
@sprite('sg-prop-archive-tu-so', 104, 152)
def archive_tu_so(p: P):
    """Tủ gỗ kính: ledgers and folders behind glass doors, a radio and thermos on top."""
    p.shadow(52, 148, 46, 7, 0.45)
    p.box(8, 40, 88, 14, 96, DWOOD, top=WOOD)
    rs = np.random.default_rng(648)
    for r in range(3):
        y0, y1 = 60 + r * 28, 84 + r * 28
        p.rect(14, y0, 90, y1, '#1a0d05')
        x = 16
        while x < 86:
            bw = 3 + rs.random() * 3
            bh = (y1 - y0) * (0.65 + rs.random() * 0.3)
            col = ['#2a4a7a', '#d8342c', '#e8b23a', '#3e8a4a', '#f2efe6', '#7a4fb5'][int(rs.integers(0, 6))]
            p.poly([(x, y1 - bh), (x + bw, y1 - bh), (x + bw, y1), (x, y1)], m(col, 0.2, 10, 0.5, 0.65), n=(-0.3, 0.1, 0.95))
            x += bw + 0.5
    glass_case(p, 13, 58, 51, 140, frame=m('#6a3a1a', 0.3, 16))
    glass_case(p, 53, 58, 91, 140, frame=m('#6a3a1a', 0.3, 16))
    p.blob(50, 100, 1.4, 1.4, m('#e8b23a', 0.9, 40))
    p.blob(56, 100, 1.4, 1.4, m('#e8b23a', 0.9, 40))
    p.box(18, 28, 36, 8, 14, m('#5a3a22', 0.4, 20))
    p.ell(26, 44, 5, 5, '#2a1a10', 0.85)
    p.rect(34, 40, 50, 46, '#c8b88a', 0.85)
    p.tube((22, 28), (48, 22), 0.8, DSTEEL)
    p.lathe(74, 50, lambda t: 6 if t < 0.85 else 4, m('#d8342c', 0.6, 30), 26)
    p.lathe(74, 25, lambda t: 4.5, PLASTIC_W, 4)


@sprite('sg-prop-archive-ban-dem-tien', 136, 96)
def archive_ban_dem_tien(p: P):
    """Wall shelf over the counting table: tear-off calendar block, cash tin, rubber bands on a nail, a fluorescent tube."""
    p.box(10, 54, 116, 8, 6, WOOD, top=m('#a86a34', 0.2, 12, 0.5, 0.7, tex_wood(3, seed=649)))
    for x in (20, 116):
        p.poly([(x - 3, 66), (x + 3, 66), (x, 80)], DWOOD)
    # lịch bloc: red header board + white pad (blank)
    p.box(18, 8, 34, 2, 14, m('#c8281c', 0.4, 20))
    p.rect(22, 12, 48, 18, '#e8b23a', 0.6)
    p.rect(22, 24, 48, 52, '#f6f2e6')
    p.rect(26, 30, 44, 42, '#d8342c', 0.18)
    p.ell(35, 36, 7, 6, '#d8342c', 0.55)
    p.rect(22, 50, 48, 52, '#c8c0aa', 0.7)
    # cash tin + banded notes
    p.box(62, 38, 30, 10, 8, m('#3e7a5a', 0.6, 30))
    p.rect(64, 44, 90, 46, '#e8b23a', 0.8)
    for k, col in enumerate(('#5c8e6e', '#3e78a8', '#c46a8c')):
        p.box(98, 44 - k * 4, 20, 6, 3, m(col, 0.2, 10, 0.55, 0.6))
        p.rect(106, 44 - k * 4, 108, 53 - k * 4, '#b8862a', 0.9)
    p.blob(112, 18, 1.4, 1.4, IRON)
    for k in range(4):
        p.ring(112, 24 + k * 1.2, 4 - k * 0.4, 5.5, 0.5, m(['#e8b23a', '#d8342c', '#3e8a4a', '#2f6fb5'][k], 0.4, 20))
    p.tube((60, 4), (100, 4), 1.6, m('#f4fbff', 0.9, 40, 0.95, 0.2))
    p.glow(80, 6, 20, '#d8f0ff', 0.4)


@sprite('sg-prop-archive-nem', 136, 72)
def archive_nem(p: P):
    """Nệm mỏng trên sàn gác: floral sheet, pillow, folded blanket, a phone charging."""
    p.shadow(68, 66, 62, 7, 0.4)
    floral = m('#e8d0d8', 0.08, 6, 0.6, 0.5, tex_noise(0.1, 3, 650))
    p.box(8, 20, 120, 34, 8, floral)
    rs = np.random.default_rng(651)
    for _ in range(26):
        x, y = 12 + rs.random() * 112, 22 + rs.random() * 30
        p.ell(x, y, 2.2, 1.4, ['#d8342c', '#2f6fb5', '#3e8a4a'][int(rs.integers(0, 3))], 0.5)
    p.blob(26, 32, 14, 8, m('#f2efe6', 0.1, 8, 0.6, 0.5), flat=0.6)
    p.box(78, 26, 40, 22, 5, m('#2f7fd0', 0.1, 8, 0.52, 0.6, tex_noise(0.12, 2, 652)))
    for k in range(3):
        p.line([(80, 33 + k * 6), (116, 33 + k * 6)], 0.8, '#1a4a8a', 0.5)
    p.box(48, 38, 10, 14, 1.5, m('#1a1c20', 0.9, 50))
    p.rect(49.5, 39.5, 56.5, 50, '#5a8ad8', 0.75)
    p.line([(53, 52), (60, 62), (70, 64)], 0.6, '#f2f0ea')


@sprite('sg-decor-thung-giay', 64, 64)
def thung_giay(p: P):
    p.shadow(32, 60, 26, 5, 0.4)
    p.box(6, 30, 40, 12, 18, CARD)
    p.rect(24, 30, 28, 60, '#d8c8a0', 0.7)
    p.box(16, 10, 34, 10, 16, m('#c8986a', 0.08, 6, 0.5, 0.62, tex_noise(0.12, 3, 653)))
    p.rect(31, 10, 35, 36, '#d8c8a0', 0.7)
    p.rect(20, 28, 30, 33, '#ffffff', 0.5)


@sprite('sg-decor-quat-may', 48, 88)
def quat_may(p: P):
    """Quạt đứng: round base, pole, caged blue blades."""
    p.shadow(24, 84, 14, 4, 0.4)
    p.lathe(24, 84, lambda t: 12 - 6 * t, PLASTIC_W, 5)
    p.tube((24, 80), (24, 34), 1.6, ALU)
    p.blob(24, 30, 5, 4, PLASTIC_W)
    p.ell(24, 24, 18, 18, '#2a2d33', 0.25)
    for k in range(3):
        a = k / 3 * 2 * math.pi + 0.4
        p.poly([(24, 24), (24 + math.cos(a) * 16, 24 + math.sin(a) * 16), (24 + math.cos(a + 0.8) * 14, 24 + math.sin(a + 0.8) * 14)],
               m('#5aa8d8', 0.4, 20, 0.6, 0.5), n=(0, 0, 1), alpha=0.85)
    p.ring(24, 24, 18, 18, 1.1, ALU)
    for k in range(8):
        a = k / 8 * 2 * math.pi
        p.line([(24, 24), (24 + math.cos(a) * 18, 24 + math.sin(a) * 18)], 0.5, '#c8ccd0', 0.7)
    p.blob(24, 24, 3.2, 3.2, m('#2f6fb5', 0.5, 26))


@sprite('sg-decor-chau-bong-giay', 72, 120)
def chau_bong_giay(p: P):
    p.shadow(36, 116, 22, 5, 0.4)
    p.lathe(36, 116, lambda t: 16 + 4 * t, TERRA, 22)
    p.ell(36, 94, 18.5, 5, '#3a2416')
    for x0, x1, y1 in ((32, 22, 30), (38, 46, 22), (36, 34, 48)):  # woody trunks up out of the soil
        p.tube((x0, 95), (x1, y1), 1.8, m('#5a3a22'), r1=1.0)
    bougainvillea(p, 36, 4, 26, 654)
    bougainvillea(p, 34, 36, 24, 655)


@sprite('sg-decor-cot-chung-cu', 56, 200)
def cot_chung_cu(p: P):
    """Cột chung cư cũ: square concrete column, water stains, blank flyers, a power socket."""
    p.shadow(28, 196, 22, 5, 0.45)
    p.box(10, 4, 36, 10, 182, CONC)
    for k in range(4):
        x = 14 + k * 9
        p.line([(x, 20), (x + 1, 60 + k * 18)], 2.2, '#5a5850', 0.25, blur=1.5)
    blank_flyers(p, 12, 44, 90, 160, 655, 6)
    p.rect(10, 170, 46, 196, '#d8c8a0', 0.35)
    p.rect(10, 170, 46, 172, '#c8342a', 0.7)
    p.box(32, 122, 8, 2, 8, PLASTIC_W)


@sprite('sg-decor-cot-dien', 80, 248)
def decor_cot_dien(p: P):
    concrete_pole(p, 32, 244, 230, 0.9, lamp=True, transformer=False, seed=14)


@sprite('sg-decor-ghe-nhua-do', 40, 48)
def ghe_do(p: P):
    stool(p, 20, 44, STOOL_R, 1.0)
    stool(p, 20, 38, STOOL_R, 1.0)  # stacked pair


@sprite('sg-decor-ghe-nhua-xanh', 40, 48)
def ghe_xanh(p: P):
    stool(p, 20, 44, STOOL_B, 1.0)
    stool(p, 20, 38, STOOL_B, 1.0)


@sprite('sg-decor-thung-da', 64, 64)
def thung_da(p: P):
    """Thùng đá xốp: styrofoam ice box, lid ajar, ice and a few bottles."""
    p.shadow(32, 60, 26, 5, 0.4)
    p.box(8, 22, 48, 16, 22, FOAM)
    p.rect(12, 26, 52, 36, '#d8ecf4', 0.9)
    for k in range(7):
        p.blob(15 + k * 5.6, 31 + (k % 2) * 2, 2.6, 2.2, GLASS, flat=0.5)
    p.lathe(22, 30, lambda t: 2.6, m('#3e8a4a', 0.8, 40), 12)
    p.lathe(42, 31, lambda t: 2.6, m('#8a3a1a', 0.8, 40), 11)
    p.poly([(10, 22), (56, 22), (60, 12), (14, 10)], FOAM, n=(0, 0.6, 0.8))
    for k in range(5):
        p.ell(14 + k * 9, 52, 1.2, 1.6, '#bde4f8', 0.6)


@sprite('sg-decor-xe-banh-trang', 104, 104)
def xe_banh_trang(p: P):
    """Xe bánh tráng trộn: small glass-top cart, jars of toppings, bagged portions."""
    p.shadow(52, 98, 44, 7, 0.45)
    cart_wheels(p, (22, 84), 100, 8)
    p.box(10, 54, 84, 10, 24, m('#e8e6e0', 0.4, 20, 0.55, 0.62), top=STEEL)
    p.rect(16, 68, 88, 82, '#e8662a', 0.85, r=2)
    for k, col in enumerate(('#e8822a', '#3e8a4a', '#f4efe2', '#c8342a', '#e8c53c')):
        jar(p, 20 + k * 15, 56, 6, 16, col, ['#d8342c', '#2f6fb5'][k % 2])
    for k in range(4):
        p.blob(26 + k * 16, 30, 7, 5, m('#f8f4ea', 0.6, 30, 0.6, 0.45), flat=0.5, alpha=0.85)
        p.ell(26 + k * 16, 30, 4, 2.4, '#e8822a', 0.6)
    glass_case(p, 12, 20, 92, 40)
    bulb(p, 52, 8, 12)


# ====================================================================== bãi giữ xe
@sprite('sg-prop-storage-xe-may-xep', 176, 112)
def storage_xe_may_xep(p: P):
    """Xe máy xếp sát rạt: two rows packed nose-to-tail."""
    scooter(p, 70, 74, 1.12, m(BIKE_COLS[1], 0.55, 30, 0.5, 0.7), facing=1)
    scooter(p, 120, 80, 1.12, CRAB, facing=1, helmet=CRAB)
    scooter(p, 60, 106, 1.18, m(BIKE_COLS[0], 0.55, 30, 0.5, 0.7), facing=-1)
    scooter(p, 118, 110, 1.18, m(BIKE_COLS[3], 0.55, 30, 0.5, 0.7), facing=-1, helmet=PLASTIC_W)


@sprite('sg-prop-storage-xe-may', 128, 96)
def storage_xe_may(p: P):
    scooter(p, 64, 90, 1.35, m(BIKE_COLS[2], 0.55, 30, 0.5, 0.7), facing=-1, helmet=m('#e2a227', 0.6, 32))


@sprite('sg-decor-xe-crab', 120, 96)
def decor_xe_crab(p: P):
    """Xe ôm công nghệ with a plain green delivery box (no logo)."""
    scooter(p, 60, 90, 1.25, CRAB, facing=-1, box=CRAB_D)


# ---- body: the CRAB bike left on its stand, the victim's helmet on the seat.
# sg-body-tint is that helmet alone in white; the game multiplies it by the victim's colour.
BODY_HEL = m('#f4f4f0', 0.75, 40, 0.62, 0.55, spec='#ffffff')


def body_helmet(p: P, x0, s):
    """Shared by base + tint: the tint layer sits on top, so the dark visor/strap must be in it too (multiply keeps them dark)."""
    hx, hy = x0 - 14 * s, 92 - 41 * s
    p.blob(hx, hy, 9.5 * s, 7.8 * s, BODY_HEL, flat=0.7)
    p.rect(hx - 9.5 * s, hy + 3.6 * s, hx + 9.5 * s, hy + 5 * s, '#c8c8c4', 0.9)  # rim
    p.poly([(hx + 9 * s, hy + 1 * s), (hx + 1 * s, hy + 1.5 * s), (hx + 2 * s, hy + 5 * s), (hx + 9.5 * s, hy + 4.5 * s)], m('#1a2028', 0.9, 50, 0.4, 0.6))
    p.line([(hx - 4 * s, hy + 5 * s), (hx - 6 * s, hy + 11 * s), (hx - 2 * s, hy + 13 * s)], 0.9, '#2a2d33', 0.9)  # chin strap dangling
    p.ell(hx - 2 * s, hy - 4 * s, 3.6 * s, 1.5 * s, '#ffffff', 0.5, blur=1)


@sprite('sg-body', 120, 96)
def body_bike(p: P):
    s, cx = 1.25, 60
    scooter(p, cx, 92, s, CRAB, facing=-1)
    p.tube((cx - 4, 92 - 12 * s), (cx - 9, 92), 1.2 * s, DSTEEL)  # side stand, kicked down
    p.ell(cx - 9, 92, 2 * s, 0.8 * s, '#2a2d33')
    body_helmet(p, cx, s)


@sprite('sg-body-tint', 120, 96)
def body_tint(p: P):
    body_helmet(p, 60, 1.25)


@sprite('sg-decor-non-bao-hiem', 56, 48)
def non_bao_hiem(p: P):
    p.shadow(28, 44, 24, 4, 0.4)
    helmet(p, 18, 34, 1.0, CRAB)
    helmet(p, 38, 30, 1.0, PLASTIC_W)


@sprite('sg-prop-storage-day-phoi', 176, 120)
def day_phoi(p: P):
    """Dây phơi đồ: two poles, a sagging wire, shirts and an áo bà ba on hangers."""
    for x in (10, 166):
        p.shadow(x, 116, 6, 2, 0.4)
        p.tube((x, 116), (x, 16), 1.6, DSTEEL)
    wire = lambda x: 18 + 10 * math.sin(math.pi * (x - 10) / 156)  # noqa: E731
    p.line([(x, wire(x)) for x in range(10, 167, 6)], 0.8, '#2a2d33')
    cols = ['#f2efe6', '#2f6fb5', '#d8342c', '#7a4fb5', '#e2a227', '#3e8a4a']
    for k, x in enumerate((34, 60, 86, 112, 138)):
        y = wire(x)
        col = stripe_mat(cols[k])
        p.line([(x - 6, y + 4), (x, y), (x + 6, y + 4)], 0.8, '#8a8f96')
        if k == 2:  # áo bà ba: long, with side slits
            p.poly([(x - 11, y + 4), (x + 11, y + 4), (x + 12, y + 46), (x - 12, y + 46)], col, n=(0, 0.2, 1), grad=0.3)
        elif k == 4:  # shorts
            p.poly([(x - 10, y + 4), (x + 10, y + 4), (x + 11, y + 24), (x + 2, y + 24), (x, y + 14), (x - 2, y + 24), (x - 11, y + 24)], col)
        else:
            p.poly([(x - 16, y + 6), (x - 8, y + 3), (x + 8, y + 3), (x + 16, y + 6), (x + 12, y + 14), (x + 9, y + 12),
                    (x + 9, y + 36), (x - 9, y + 36), (x - 9, y + 12), (x - 12, y + 14)], col, n=(0, 0.2, 1), grad=0.3)
        p.ell(x, y + 5, 3, 1.4, '#000000', 0.25)
    for k in range(6):
        p.ell(34 + k * 26, 113, 5, 1.4, '#5aa8d8', 0.22, blur=1)  # drip puddles


@sprite('sg-prop-storage-ao-mua', 96, 120)
def ao_mua(p: P):
    """Áo mưa treo: a coat stand with two translucent ponchos dripping."""
    p.shadow(48, 116, 22, 5, 0.4)
    p.lathe(48, 116, lambda t: 12 - 5 * t, DSTEEL, 5)
    p.tube((48, 112), (48, 10), 1.6, DSTEEL)
    for dx in (-14, 14):
        p.tube((48, 14), (48 + dx, 8), 1.0, DSTEEL)
    for dx, col in ((-12, '#4aa0e0'), (13, '#f2c230')):
        x = 48 + dx
        poncho = m(col, 0.85, 50, 0.6, 0.5, spec='#ffffff')
        p.poly([(x - 6, 12), (x + 6, 12), (x + 20, 92), (x + 2, 96), (x - 18, 92)], poncho, n=(dx / 40, 0.2, 1), grad=0.25, alpha=0.82)
        p.blob(x, 14, 7, 5, poncho, flat=0.6, alpha=0.85)
        for k in range(3):
            p.line([(x - 8 + k * 8, 30), (x - 12 + k * 12, 90)], 0.8, '#ffffff', 0.25)
        p.ell(x, 108, 7, 1.8, '#5aa8d8', 0.25, blur=1)


# ====================================================================== hẻm life (signs are drawn in-game, see GameScene.buildStreetSigns)
@sprite('sg-decor-dong-rac', 120, 84)
def dong_rac(p: P):
    """Đống rác right under the "Cấm đổ rác" sign: knotted black bags, a blue bag, styrofoam box, cans, a banana peel."""
    p.shadow(60, 78, 54, 7, 0.45)
    p.ell(60, 79, 52, 5, '#3a2a1a', 0.35, blur=2)  # seep stain
    BAG = m('#1c1d20', 0.8, 40, 0.42, 0.7, tex_noise(0.12, 3, 701), '#9aa4b0')
    BAG_B = m('#2f6fd0', 0.75, 36, 0.5, 0.65, tex_noise(0.1, 3, 702), '#ffffff')
    p.box(70, 50, 34, 14, 14, FOAM)
    p.rect(72, 50, 102, 52, '#d8d8d2', 0.8)
    def bag(cx, cy, rx, ry, mat, seed):
        # lumpy knotted bag: a few overlapping squashed blobs + a floppy tied neck
        rng = np.random.default_rng(seed)
        for k in range(4):
            dx, dy = rng.uniform(-0.35, 0.35) * rx, rng.uniform(-0.15, 0.3) * ry
            p.blob(cx + dx, cy + dy, rx * rng.uniform(0.55, 0.75), ry * rng.uniform(0.5, 0.7), mat, flat=0.55)
        p.poly([(cx - 3, cy - ry * 0.6), (cx + 3, cy - ry * 0.6), (cx + 9, cy - ry * 0.95), (cx + 2, cy - ry * 0.8), (cx - 8, cy - ry * 1.0)], mat)
        for k in range(3):  # creases
            x = cx - rx * 0.4 + k * rx * 0.35
            p.line([(x, cy - ry * 0.3), (x + 3, cy + ry * 0.25)], 0.9, '#000000', 0.35)
        p.line([(cx - rx * 0.45, cy - ry * 0.35), (cx - rx * 0.15, cy - ry * 0.55)], 1.4, '#ffffff', 0.3)

    for i, (cx, cy, rx, ry, mat) in enumerate(((34, 60, 26, 18, BAG), (62, 54, 22, 20, BAG), (88, 46, 18, 14, BAG_B), (20, 72, 15, 9, BAG))):
        bag(cx, cy, rx, ry, mat, 710 + i)
    for x, y, col in ((96, 72, '#d8342c'), (106, 76, '#c8ccd0'), (48, 76, '#2f8a3a')):  # cans
        p.box(x - 4, y - 5, 8, 6, 3, stripe_mat(col))
    p.poly([(10, 78), (16, 72), (20, 74), (16, 78)], YELLP)  # banana peel
    p.poly([(16, 78), (22, 76), (26, 79)], YELLP)
    p.line([(64, 30), (70, 22), (66, 16)], 1.0, '#c8d070', 0.5, blur=1)  # stink fumes
    p.line([(78, 26), (84, 18), (80, 10)], 1.0, '#c8d070', 0.4, blur=1)


@sprite('sg-decor-o-ga', 96, 40)
def o_ga(p: P):
    """Ổ gà: a broken asphalt crater with a rain puddle reflecting the sodium lamps. Floor decal (placed with wall=True so it never covers a player)."""
    rng = np.random.default_rng(704)
    rim = [(48 + math.cos(a) * 42 * rng.uniform(0.82, 1.0), 20 + math.sin(a) * 15 * rng.uniform(0.75, 1.0)) for a in np.linspace(0, 2 * math.pi, 15, endpoint=False)]
    hole = [(48 + (x - 48) * 0.8, 20 + (y - 20) * 0.78) for x, y in rim]
    p.poly(rim, m('#3a3836', 0.08, 6, 0.42, 0.6, tex_stone(703, 3, 0.35)), n=(0, 0.6, 0.8))
    p.poly(hole, m('#1c1c1e', 0.1, 8, 0.4, 0.6, tex_stone(705, 3, 0.3)), n=(0, -0.5, 0.8))
    for x, y in rim[::3]:  # crumbled edge cracks
        p.line([(x, y), (x + (x - 48) * 0.18, y + (y - 20) * 0.25)], 0.8, '#121214', 0.7)
    p.ell(50, 21, 28, 8, '#2a4a64', 0.85, blur=1)  # puddle
    p.ell(44, 19, 14, 3, SODIUM, 0.45, blur=2)
    p.line([(30, 22), (70, 22)], 0.6, '#ffffff', 0.25)
    for x, y in ((8, 30), (88, 31), (84, 8), (14, 11), (60, 37)):  # loose gravel
        p.ell(x, y, 1.8, 1.1, '#5e5c58', 0.9)


# ====================================================================== backdrop
@sprite('sg-decor-nha-ong', 192, 232)
def nha_ong(p: P):
    """Nhà ống backdrop: narrow pastel tube house, balconies with plants and laundry, tin roof + water tank."""
    p.shadow(96, 228, 92, 6, 0.4)
    wall = m('#e8b8a0', 0.06, 6, 0.5, 0.62, tex_stone(656, 4, 0.18))
    p.box(14, 30, 164, 8, 190, wall)
    for k in range(4):
        p.line([(30 + k * 40, 40), (34 + k * 38, 220)], 3, '#7a5a4a', 0.12, blur=2)
    # roof + tank
    p.poly([(8, 34), (184, 34), (176, 16), (16, 16)], TIN, n=(0, 0.8, 0.6))
    for k in range(18):
        p.line([(18 + k * 9.4, 17), (12 + k * 9.6, 33)], 0.8, '#5a6068', 0.6)
    p.lathe(146, 22, lambda t: 12, STEEL, 20)
    for fl, y in enumerate((48, 106)):
        # window pair + balcony
        for x in (40, 104):
            p.rect(x, y, x + 46, y + 34, '#1a2430')
            p.rect(x + 2, y + 2, x + 44, y + 32, '#ffd27a', 0.55)
            p.glow(x + 23, y + 18, 26, '#ffc870', 0.35)
            for k in range(6):
                p.line([(x + 4 + k * 7.6, y), (x + 4 + k * 7.6, y + 34)], 1, '#2a2d33')
        p.box(20, y + 38, 152, 6, 4, CONC)
        for k in range(20):
            p.line([(24 + k * 7.6, y + 28), (24 + k * 7.6, y + 38)], 1, '#3a3d42')
        p.tube((22, y + 28), (170, y + 28), 1, DSTEEL)
        bougainvillea(p, 34 + fl * 120, y + 4, 14, 657 + fl)
        for k, col in enumerate(('#2f6fb5', '#d8342c', '#f2efe6')):
            x = 110 + k * 16
            p.poly([(x - 6, y + 28), (x + 6, y + 28), (x + 7, y + 44), (x - 7, y + 44)], stripe_mat(col))
    # ground floor: rolling shutter half up, warm light leaking
    p.rect(30, 164, 162, 222, '#1a1a1c')
    p.rect(32, 196, 160, 222, '#ffd27a', 0.6)
    p.glow(96, 214, 50, '#ffc870', 0.45)
    for k in range(12):
        p.rect(30, 164 + k * 2.8, 162, 165.4 + k * 2.8, '#8a9098', 0.9)
    p.rect(30, 162, 162, 166, '#5a6068')
    p.rect(150, 150, 166, 160, '#2f6fb5', 0.9, r=1)  # house-number plate, blank
    p.box(34, 216, 22, 4, 4, STOOL_R)


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
    pack_atlas(build(keys), 'sg-decor-0', 'tools/paint/sg_props.py')
