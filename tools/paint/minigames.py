"""
Painted (raster, per-pixel shaded) art for the 9 mini-games — replaces the flat vector versions,
keeping file names, sizes and hit-geometry so the UI code stays the same.
  python3 tools/paint/minigames.py [name ...]
Writes assets/maps/co-do-hue/minigames/<name>.png + apps/web/public/.../minigames/<name>.webp
Text is never baked in (glyphs, labels and names are HTML overlays).
"""
from __future__ import annotations

import math
import os
import sys

import numpy as np
from PIL import Image

sys.path.insert(0, os.path.dirname(__file__))
import lib  # noqa: E402
from lib import M, Mat, hexc, tex_noise, tex_wood, tex_stone  # noqa: E402
import props as PR  # noqa: E402
from props import P, SS, LACQ, GOLD, BRONZE, DWOOD, PORC, CREAM, JADE, BARK, blue_white  # noqa: E402

ROOT = PR.ROOT
SRC = os.path.join(ROOT, 'assets/maps/co-do-hue/minigames')
PUB = os.path.join(ROOT, 'apps/web/public/assets/maps/co-do-hue/minigames')
REG = {}


def art(name, w, h):
    def deco(fn):
        REG[name] = (w, h, fn)
        return fn
    return deco


GATE_X = [0.1, 0.27, 0.5, 0.73, 0.9]
GATE_W = [0.07, 0.08, 0.11, 0.08, 0.07]
YROOF = Mat('#e7b33a', shine=0.6, rough=30, amb=0.45, diff=0.75, tex=tex_noise(0.12, 2, 62))
BRICK = Mat('#b49a74', shine=0.05, rough=8, amb=0.5, diff=0.6, tex=tex_stone(61, 4, 0.25))
PAPERM = Mat('#efe2c0', shine=0.02, rough=4, amb=0.62, diff=0.42, tex=tex_noise(0.07, 3, 81))
SILK = Mat('#efe4c8', shine=0.02, rough=4, amb=0.64, diff=0.4, tex=tex_noise(0.05, 2, 82))
INKM = Mat('#2a2622', shine=0.05, rough=6, amb=0.6, diff=0.4)


def roof(p, y, x0, x1, hgt, curl=18):
    pts = [(x0 - curl, y + 4), (x0 - curl * 0.45, y), (x0 + 16, y - hgt), (x1 - 16, y - hgt), (x1 + curl * 0.45, y), (x1 + curl, y + 4), (x1 + 6, y + 10), (x0 - 6, y + 10)]
    p.poly(pts, YROOF, n=(-0.2, 0.7, 0.7), grad=0.35)
    L = p.L
    mk = lib.poly_mask(L.w, L.h, [(a * SS, b * SS) for a, b in pts])
    xx = np.mgrid[0:L.h, 0:L.w][1].astype(np.float32) / SS
    L.rgb = L.rgb * (1 - mk[..., None] * 0.22 * ((np.sin(xx * 1.4) * 0.5 + 0.5) ** 3)[..., None])
    p.line([(x0 + 14, y - hgt), (x1 - 14, y - hgt)], 3, '#8a5a14')
    for ex in (x0 - curl, x1 + curl):
        p.blob(ex, y + 2, 3.4, 2.6, GOLD)


# ---------------------------------------------------------------- Ngọ Môn (gates line up with GATE_X / GATE_W)
@art('hue-mg-ngo-mon', 720, 300)
def ngo_mon(p: P):
    W, H = 720, 300
    p.shadow(360, 296, 350, 8, 0.35)
    p.box(18, 116, 684, 10, 174, BRICK, top=BRICK)
    L = p.L
    yy, xx = np.mgrid[0:L.h, 0:L.w].astype(np.float32) / SS
    # brick coursing on the wall face
    wall = (yy > 126) & (yy < 298) & (xx > 18) & (xx < 702)
    course = ((yy - 126) % 12 < 0.9) | ((((xx + ((yy - 126) // 12 % 2) * 14) % 28) < 0.9) & (yy > 126))
    lib.paint(L, (wall & course).astype(np.float32) * 0.5, '#6b5a40')
    heights = [86, 102, 120, 102, 86]
    for gx, gw, hh in zip(GATE_X, GATE_W, heights):
        cx, w = gx * W, gw * W
        top = 300 - hh
        r = w / 2
        m = lib.rect_mask(L.w, L.h, (cx - r) * SS, (top + r) * SS, (cx + r) * SS, 300 * SS) + lib.ellipse_mask(L.w, L.h, cx * SS, (top + r) * SS, r * SS, r * SS)
        m = np.clip(m, 0, 1)
        # stone voussoir ring
        ring = np.clip(lib.ellipse_mask(L.w, L.h, cx * SS, (top + r) * SS, (r + 6) * SS, (r + 6) * SS) - lib.ellipse_mask(L.w, L.h, cx * SS, (top + r) * SS, r * SS, r * SS), 0, 1) * (yy < top + r + 1)
        lib.paint(L, ring, '#d8c39a')
        dark = np.clip((yy - top) / hh, 0, 1)
        col = np.dstack([0.09 + 0.05 * dark, 0.06 + 0.03 * dark, 0.04 + 0.02 * dark])
        L.over(col, m)
        # warm light at the end of the tunnel
        g = lib.ellipse_mask(L.w, L.h, cx * SS, (300 - hh * 0.35) * SS, r * 0.6 * SS, hh * 0.3 * SS, blur=r * 0.5 * SS)
        L.rgb = L.rgb + g[..., None] * m[..., None] * hexc('#ffb860') * 0.35
    # balustrade + Lầu Ngũ Phụng
    p.box(70, 104, 580, 8, 12, LACQ, top=GOLD)
    for x in range(96, 640, 34):
        p.tube((x, 104), (x, 62), 3.6, LACQ)
    p.rect(88, 66, 632, 104, '#4a1a10', 0.55)
    for x in range(100, 620, 34):
        p.rect(x + 4, 72, x + 26, 100, '#f2cf7a', 0.32)
    roof(p, 64, 80, 640, 22, 26)
    for x in range(200, 540, 30):
        p.tube((x, 40), (x, 24), 3.0, LACQ)
    p.rect(190, 26, 530, 42, '#4a1a10', 0.5)
    roof(p, 28, 190, 530, 18, 22)
    p.blob(360, 8, 5, 5, GOLD)
    p.box(330, 128, 60, 14, 2, GOLD, top=GOLD)  # name board (text is not baked)


@art('hue-mg-thai-hoa', 720, 150)
def thai_hoa(p: P):
    p.box(30, 120, 660, 6, 24, Mat('#c9b48a', amb=0.5, diff=0.6, tex=tex_stone(63)), top=Mat('#d8c7a0', amb=0.55, diff=0.55))
    for x in range(64, 680, 52):
        p.tube((x, 120), (x, 60), 5, LACQ)
    p.rect(58, 62, 666, 118, '#4a120c', 0.6)
    for x in range(70, 650, 52):
        p.rect(x + 4, 68, x + 44, 116, '#7a1a10', 0.85)
        for k in range(4):
            p.rect(x + 8, 72 + k * 11, x + 40, 72 + k * 11 + 1.2, '#d9a53a', 0.8)
    roof(p, 60, 40, 680, 20, 30)
    p.rect(290, 28, 430, 42, '#7a1610')
    p.rect(292, 30, 428, 40, '#e0b048', 0.25)
    roof(p, 30, 140, 580, 18, 26)


# ---------------------------------------------------------------- Cửu Đỉnh face (cells at 102 + c*96, 112 + r*96, size 84)
@art('hue-mg-dinh-face', 480, 480)
def dinh_face(p: P):
    p.shadow(240, 462, 190, 14, 0.4)
    for x0, x1 in ((120, 104), (360, 376)):
        p.tube((x1, 400), (x0, 466), 12, M['bronze_dark'], r1=9)
    p.lathe(240, 430, lambda t: 150 + 34 * math.sin(math.pi * min(1, 0.15 + t * 0.85)) ** 0.7 if t < 0.9 else 176, BRONZE, 360, top_open=True,
            deco=lambda u, t: (hexc('#5a3a18'), ((abs(t - 0.93) < 0.012) | (abs(t - 0.06) < 0.01)) * np.ones_like(u)))
    p.ring(52, 110, 26, 40, 9, BRONZE)
    p.ring(428, 110, 26, 40, 9, BRONZE)
    # recessed panels for the 9 relief images
    for k in range(9):
        x = 102 + (k % 3) * 96
        y = 112 + (k // 3) * 96
        p.rect(x - 5, y - 5, x + 89, y + 89, '#3a2410', 0.75, r=6)
        p.rect(x - 3, y - 3, x + 87, y + 87, '#c99a4a', 0.35, r=5)
        p.rect(x, y, x + 84, y + 84, '#6a4422', 1.0, r=4)


# ---------------------------------------------------------------- moon phases
@art('hue-mg-moon-0', 128, 128)
def _m0(p):
    moon(p, 0)


def moon(p: P, k):
    L = p.L
    S = L.w
    yy, xx = np.mgrid[0:S, 0:S].astype(np.float32)
    c = S / 2
    R = S * 0.42
    dx, dy = (xx - c) / R, (yy - c) / R
    d2 = dx * dx + dy * dy
    m = np.clip((1 - np.sqrt(d2)) * R + 0.5, 0, 1)
    nz = np.sqrt(np.clip(1 - d2, 0, 1))
    n = lib.fbm(S, S, S / 9, 5, 91)
    maria = lib.smooth(0.5, 0.7, lib.fbm(S, S, S / 4, 4, 92))
    crater = (lib.value_noise(S, S, S / 40, 93) > 0.8).astype(np.float32) * 0.12
    alb = (0.78 + 0.22 * n - 0.22 * maria - crater)[..., None] * hexc('#f2ead2')
    # sun direction from the phase angle: k=0 new (behind), 4 full (front), waxing lit on the right
    a = k / 8 * 2 * math.pi
    sx, sz = math.sin(a), -math.cos(a)
    lit = np.clip(dx * sx + nz * sz, 0, 1) ** 0.8
    earth = 0.13
    col = alb * (earth + (1 - earth) * lit)[..., None]
    rr = np.sqrt(d2)
    halo = np.exp(-np.clip(rr - 1, 0, None) ** 2 / 0.02) * (rr > 1) * (0.35 if k == 4 else 0.18 * (1 - abs(k - 4) / 4) + 0.04)
    L.over(np.broadcast_to(hexc('#fff4c8'), (S, S, 3)), halo)
    L.over(col, m)
    if k == 0:  # new moon: faint rim so players can see it
        rim = np.clip(1 - np.abs(np.sqrt(d2) - 1) * R / 1.6, 0, 1)
        L.over(np.broadcast_to(hexc('#9fb0d8'), (S, S, 3)), rim * 0.55)


for _k in range(1, 8):
    art(f'hue-mg-moon-{_k}', 128, 128)(lambda p, k=_k: moon(p, k))


# ---------------------------------------------------------------- woodblock, paper, calendar page
@art('hue-mg-woodblock', 240, 240)
def woodblock(p: P):
    p.shadow(122, 226, 110, 12, 0.35)
    W = Mat('#b07a44', shine=0.18, rough=14, amb=0.48, diff=0.66, tex=tex_wood(scale=2.6, seed=71, vertical=False, dark='#5a3416'))
    p.box(14, 12, 212, 196, 18, W, top=W, bevel=4)
    p.rect(30, 28, 210, 192, '#6b4020', 0.35, r=3)
    p.rect(34, 32, 206, 188, '#c9965a', 0.35, r=3)


@art('hue-mg-paper', 300, 300)
def paper(p: P):
    L = p.L
    yy0, xx0 = np.mgrid[0:L.h, 0:L.w].astype(np.float32) / SS
    border = np.minimum(np.minimum(xx0 - 12, 288 - xx0), np.minimum(yy0 - 12, 288 - yy0))
    edge = lib.fbm(L.h, L.w, 3 * SS, 3, 83) * 6  # deckled (torn) edge of handmade dó paper
    m = np.clip(border - edge + 1, 0, 1)
    p.shadow(152, 156, 140, 140, 0.25, 0.15)
    yy, xx = np.mgrid[0:L.h, 0:L.w].astype(np.float32)
    fib = lib.value_noise(L.h, L.w * 3, 2.5, 84)[:, ::3]
    col = hexc('#f3e7c8') * (0.92 + 0.08 * lib.fbm(L.h, L.w, 30 * SS, 4, 85))[..., None]
    col = col * (1 - 0.06 * (fib > 0.82))[..., None]
    L.over(col, m)


@art('hue-mg-lich-page', 480, 360)
def lich_page(p: P):
    paper_like(p, 480, 360)
    for (a, b, c, d, w) in ((26, 22, 454, 338, 5), (36, 32, 444, 328, 1.6)):
        p.line([(a, b), (c, b), (c, d), (a, d), (a, b)], w, '#b5221a', 0.9)
    rs = np.random.default_rng(7)
    for i in range(12):
        x = 60 + i * 32
        p.line([(x, 40), (x, 320)], 0.8, '#b5221a', 0.35)
        y = 50
        while y < 310:  # faint, unreadable printed strokes
            ln = rs.uniform(4, 12)
            p.line([(x + 16 + rs.uniform(-4, 4), y), (x + 16 + rs.uniform(-4, 4), y + ln)], 1.6, '#2a2018', 0.28)
            y += ln + rs.uniform(4, 10)


def paper_like(p: P, w, h):
    L = p.L
    p.shadow(w / 2 + 3, h / 2 + 5, w / 2 - 8, h / 2 - 8, 0.25, 0.15)
    m = lib.rect_mask(L.w, L.h, 10 * SS, 8 * SS, (w - 10) * SS, (h - 8) * SS, 3 * SS)
    col = hexc('#f4e9cc') * (0.9 + 0.1 * lib.fbm(L.h, L.w, 40 * SS, 4, 86))[..., None]
    fib = lib.value_noise(L.h, L.w * 3, 2.5, 87)[:, ::3]
    col = col * (1 - 0.05 * (fib > 0.84))[..., None]
    L.over(col, m)


# ---------------------------------------------------------------- seal + impression + stele
@art('hue-mg-an', 140, 140)
def an(p: P):
    p.shadow(70, 132, 56, 10, 0.4)
    p.box(16, 88, 108, 28, 24, JADE, top=Mat('#3f8a6c', shine=0.6, rough=40, amb=0.45, diff=0.7, tex=tex_noise(0.12, 8, 88)))
    p.rect(16, 115.5, 124, 117.5, '#e0b048')
    p.lathe(70, 96, lambda t: 20 - 9 * t if t < 0.55 else 12 + 6 * math.sin((t - 0.55) / 0.45 * math.pi), GOLD, 74)
    p.ring(70, 24, 10, 7, 2.6, GOLD)
    p.line([(84, 40), (100, 76), (96, 104)], 2.6, '#b5221a')
    p.blob(96, 107, 3.6, 5, Mat('#c42a1a', amb=0.5, diff=0.6))


@art('hue-mg-an-dau', 120, 120)
def an_dau(p: P):
    L = p.L
    n = lib.fbm(L.h, L.w, 3 * SS, 3, 89)
    frame = np.clip(lib.rect_mask(L.w, L.h, 14 * SS, 14 * SS, 106 * SS, 106 * SS, 3 * SS) - lib.rect_mask(L.w, L.h, 22 * SS, 22 * SS, 98 * SS, 98 * SS), 0, 1)
    # seal-script-like maze (decorative, unreadable)
    yy, xx = np.mgrid[0:L.h, 0:L.w].astype(np.float32) / SS
    maze = np.zeros_like(xx)
    rs = np.random.default_rng(3)
    for _ in range(14):
        if rs.random() < 0.5:
            y = rs.uniform(30, 90); x0, x1 = sorted(rs.uniform(28, 92, 2))
            maze = np.maximum(maze, ((np.abs(yy - y) < 2.4) & (xx > x0) & (xx < x1)).astype(np.float32))
        else:
            x = rs.uniform(30, 90); y0, y1 = sorted(rs.uniform(28, 92, 2))
            maze = np.maximum(maze, ((np.abs(xx - x) < 2.4) & (yy > y0) & (yy < y1)).astype(np.float32))
    ink = np.clip(frame + maze, 0, 1) * (n > 0.28)
    lib.paint(L, ink * 0.92, '#c42a1a')


@art('hue-mg-pham-son', 96, 120)
def pham_son(p: P):
    p.shadow(48, 112, 32, 7)
    G = Mat('#9a968a', shine=0.06, rough=8, amb=0.46, diff=0.66, tex=tex_stone(64, 5, 0.3))
    p.box(22, 96, 52, 10, 8, G, top=G)
    cx = 48
    p.poly([(cx - 15, 34), (cx - 9, 24), (cx, 21), (cx + 9, 24), (cx + 15, 34), (cx + 15, 98), (cx - 15, 98)], G, n=(-0.2, 0.15, 0.97), grad=0.25)
    p.poly([(cx + 15, 34), (cx + 19, 37), (cx + 19, 99), (cx + 15, 98)], Mat('#6d6a60', amb=0.45, diff=0.5, tex=tex_stone(65)))
    for k in range(2):
        p.line([(cx - 4 + k * 8, 44), (cx - 4 + k * 8, 88)], 1.2, '#4a463c', 0.55)


# ---------------------------------------------------------------- poem plaque, paintings, empty slot (160x200)
def frame(p: P, inner='paper'):
    p.shadow(82, 196, 70, 6, 0.3)
    p.box(6, 4, 148, 4, 186, DWOOD, top=DWOOD, bevel=2)
    p.rect(14, 14, 146, 184, '#d4a03c', 0.9, r=1)
    p.rect(16, 16, 144, 182, '#2a1408', 1.0)
    if inner == 'paper':
        L = p.L
        m = lib.rect_mask(L.w, L.h, 18 * SS, 18 * SS, 142 * SS, 180 * SS)
        col = hexc('#f1e5c6') * (0.9 + 0.1 * lib.fbm(L.h, L.w, 24 * SS, 4, 95))[..., None]
        L.over(col, m)


@art('hue-mg-tho', 160, 200)
def tho(p: P):
    frame(p)
    p.rect(22, 24, 138, 26, '#b5221a', 0.6)
    p.rect(22, 172, 138, 174, '#b5221a', 0.6)
    p.rect(26, 30, 36, 40, '#c42a1a', 0.85)


@art('hue-mg-slot', 160, 200)
def slot(p: P):
    p.box(6, 4, 148, 4, 186, DWOOD, top=DWOOD, bevel=2)
    p.rect(14, 14, 146, 184, '#1a0c05', 1.0)
    L = p.L
    yy = np.mgrid[0:L.h, 0:L.w][0].astype(np.float32) / SS
    lib.paint(L, lib.rect_mask(L.w, L.h, 14 * SS, 14 * SS, 146 * SS, 184 * SS) * np.clip(1 - (yy - 14) / 30, 0, 1) * 0.5, '#000000')
    for (a, b, c, d) in ((24, 24, 136, 24), (136, 24, 136, 174), (136, 174, 24, 174), (24, 174, 24, 24)):
        n = int(math.hypot(c - a, d - b) / 10)
        for k in range(n):
            if k % 2 == 0:
                p.line([(a + (c - a) * k / n, b + (d - b) * k / n), (a + (c - a) * (k + 1) / n, b + (d - b) * (k + 1) / n)], 1.6, '#c9963e', 0.7)


def wash(p: P, mask, color, op):
    p.paint(np.clip(mask, 0, 1), color, op)


def ink_mountains(p: P, base_y, amp, seed, color='#3a3a36', op=0.55, x0=18, x1=142):
    L = p.L
    yy, xx = np.mgrid[0:L.h, 0:L.w].astype(np.float32) / SS
    n = lib.fbm(L.h, L.w, 20 * SS, 4, seed)
    ridge = base_y - amp * np.abs(np.sin((xx - x0) / (x1 - x0) * math.pi * 1.4 + seed)) - n * 10
    m = np.clip((yy - ridge) / 3, 0, 1) * np.clip(1 - (yy - ridge) / 40, 0.25, 1) * ((xx > x0) & (xx < x1) & (yy < 180))
    wash(p, m, color, op)


@art('hue-mg-hoa-nui', 160, 200)
def hoa_nui(p):
    frame(p)
    p.ell(104, 52, 10, 10, '#c42a1a', 0.85)
    ink_mountains(p, 110, 46, 1, '#5a5a52', 0.45)
    ink_mountains(p, 140, 32, 2, '#2e2e2a', 0.65)
    p.line([(26, 160), (134, 160)], 0.8, '#3a3a36', 0.4)


@art('hue-mg-hoa-trang', 160, 200)
def hoa_trang(p):
    frame(p, inner='none')
    L = p.L
    yy = np.mgrid[0:L.h, 0:L.w][0].astype(np.float32) / SS
    sky = np.dstack([0.08 + 0.12 * (yy / 200), 0.11 + 0.12 * (yy / 200), 0.22 + 0.15 * (yy / 200)])
    L.over(sky, lib.rect_mask(L.w, L.h, 18 * SS, 18 * SS, 142 * SS, 180 * SS))
    p.glow(80, 64, 34, '#fff1c0', 0.35)
    p.ell(80, 64, 18, 18, '#f6edcf')
    ink_mountains(p, 140, 28, 4, '#0c1220', 0.8)
    for k in range(5):
        p.line([(40 + k * 4, 150 + k * 6), (120 - k * 4, 150 + k * 6)], 1.0, '#f6edcf', 0.25 - k * 0.04)


@art('hue-mg-hoa-thuyen', 160, 200)
def hoa_thuyen(p):
    frame(p)
    ink_mountains(p, 92, 22, 5, '#7a7a70', 0.35)
    for k in range(6):
        p.line([(24, 130 + k * 8), (136, 130 + k * 8)], 0.8, '#3a5a7a', 0.4)
    p.poly([(52, 128), (110, 128), (100, 140), (60, 140)], Mat('#5a3418', amb=0.5, diff=0.6, tex=tex_wood(1.5, seed=96)), n=(0, 0.2, 1))
    p.line([(80, 128), (80, 84)], 1.6, '#3a2410')
    p.poly([(81, 86), (104, 124), (81, 124)], Mat('#efe4c8', amb=0.6, diff=0.45), n=(-0.3, 0.2, 0.9))
    p.poly([(79, 92), (62, 124), (79, 124)], Mat('#c43a24', amb=0.55, diff=0.5), n=(0.3, 0.2, 0.9))


@art('hue-mg-hoa-truc', 160, 200)
def hoa_truc(p):
    frame(p)
    rs = np.random.default_rng(11)
    for x, lean, w in ((60, -6, 4), (86, 4, 3.4), (110, -2, 2.6)):
        for k in range(6):
            y0 = 178 - k * 26
            p.tube((x + lean * k / 6, y0), (x + lean * (k + 1) / 6, y0 - 24), w, Mat('#3e5a2c', amb=0.5, diff=0.6, tex=tex_noise(0.2, 2, 97)))
            p.line([(x + lean * (k + 1) / 6 - w, y0 - 24), (x + lean * (k + 1) / 6 + w, y0 - 24)], 1.2, '#1e2e14', 0.8)
    for _ in range(22):
        x, y = rs.uniform(40, 130), rs.uniform(30, 120)
        a = rs.uniform(-2.6, -0.4)
        p.line([(x, y), (x + math.cos(a) * 16, y - math.sin(a) * 6 + 6)], 2.4, '#24361a', 0.75)


@art('hue-mg-hoa-mai', 160, 200)
def hoa_mai(p):
    frame(p)
    br = [((30, 176), (62, 118), 4, 3), ((62, 118), (110, 80), 3, 2), ((62, 118), (52, 60), 2.6, 1.6), ((110, 80), (132, 56), 2, 1.2), ((86, 98), (120, 120), 1.8, 1)]
    for a, b, r0, r1 in br:
        p.tube(a, b, r0, BARK, r1=r1)
    rs = np.random.default_rng(13)
    for (x, y) in [(58, 64), (54, 76), (100, 84), (116, 76), (128, 60), (70, 112), (112, 118), (92, 96), (122, 66), (60, 96)]:
        for k in range(5):
            aa = k / 5 * 2 * math.pi + rs.random()
            p.blob(x + math.cos(aa) * 3, y + math.sin(aa) * 3, 2.8, 2.4, Mat('#f2c23a', shine=0.2, rough=10, amb=0.6, diff=0.5))
        p.ell(x, y, 1.2, 1.2, '#b5651d')


@art('hue-mg-hoa-sen', 160, 200)
def hoa_sen(p):
    frame(p)
    for k in range(5):
        p.line([(24, 150 + k * 7), (136, 150 + k * 7)], 0.8, '#5a7a6a', 0.35)
    for (x, y, r) in ((50, 150, 22), (112, 140, 18), (84, 168, 16)):
        p.blob(x, y, r, r * 0.4, Mat('#4a7a3a', shine=0.2, rough=10, amb=0.5, diff=0.6, tex=tex_noise(0.2, 3, 98)), flat=0.4)
    p.line([(80, 150), (78, 100)], 1.8, '#3e5a2c')
    for k, (dx, dy, rx, ry) in enumerate(((0, -12, 6, 14), (-9, -6, 6, 12), (9, -6, 6, 12), (-15, 0, 5, 9), (15, 0, 5, 9))):
        p.blob(78 + dx, 96 + dy, rx, ry, Mat('#e88aa0', shine=0.25, rough=10, amb=0.6, diff=0.5, tex=tex_noise(0.1, 2, 99)))
    p.line([(112, 140), (118, 116)], 1.4, '#3e5a2c')
    p.blob(118, 112, 5, 7, Mat('#d97a90', amb=0.6, diff=0.5))


# ---------------------------------------------------------------- bánh bèo cups (0 empty … 5 finished), 160x120
def cup(p: P, state):
    p.shadow(80, 106, 58, 10, 0.35)
    p.lathe(80, 104, lambda t: 30 + 22 * t ** 0.8, PORC, 40, top_open=True, cap_mat=PORC,
            deco=lambda u, t: (hexc('#23408a'), ((abs(t - 0.86) < 0.03) | (abs(t - 0.12) < 0.03)) * np.ones_like(u)))
    cy, rx, ry = 63, 44, 13.5
    # porcelain inside of the bowl (lit from the upper-left)
    p.ell(80, cy - 2, rx + 2, ry + 1, '#dfe5ee')
    p.ell(84, cy + 1, rx - 6, ry - 3, '#f4f6fa')
    if state >= 1:
        col = '#f4f1e8' if state == 1 else '#fbf8f0'
        p.ell(80, cy, rx, ry, col)
        if state == 1:
            p.ell(70, cy - 3, 16, 3.5, '#ffffff', 0.7)  # wet batter shine
        else:
            p.ell(80, cy + 2, 18, 5, '#e8e1d0', 0.6)  # steamed dimple
    rs = np.random.default_rng(5)
    if state >= 3:
        for _ in range(60):
            a, r = rs.random() * 2 * math.pi, rs.random() ** 0.6
            p.ell(80 + math.cos(a) * r * 30, cy + math.sin(a) * r * 9, 2.2, 1.4, ['#e2702a', '#f08a3a', '#c95a1a'][rs.integers(0, 3)], 0.95)
    if state >= 4:
        for _ in range(9):
            a, r = rs.random() * 2 * math.pi, rs.random() ** 0.6
            p.blob(80 + math.cos(a) * r * 28, cy + math.sin(a) * r * 8, 3.2, 2.4, Mat('#e8b860', shine=0.5, rough=20, amb=0.55, diff=0.6))
        for _ in range(14):
            a, r = rs.random() * 2 * math.pi, rs.random() ** 0.6
            p.ell(80 + math.cos(a) * r * 30, cy + math.sin(a) * r * 9, 1.6, 1.0, '#4f8a2a', 0.95)
    if state >= 5:
        p.ell(80, cy, rx - 2, ry - 1.5, '#d9902a', 0.33)
        p.ell(66, cy - 4, 12, 2.4, '#fff4d0', 0.5)


for _s in range(6):
    art(f'hue-mg-chen-{_s}', 160, 120)(lambda p, s=_s: cup(p, s))


# ---------------------------------------------------------------- cooking steps (112)
@art('hue-mg-step-bot', 112, 112)
def step_bot(p):
    p.shadow(56, 96, 36, 8)
    p.lathe(56, 96, lambda t: 22 + 12 * t ** 0.7, Mat('#e8e0d0', shine=0.5, rough=40, amb=0.5, diff=0.6), 34, top_open=True)
    p.ell(56, 62, 30, 8.5, '#f6f2ea')
    p.tube((60, 64), (88, 22), 2.4, DWOOD)
    p.blob(58, 64, 7, 3, Mat('#6a4020', amb=0.5, diff=0.6))


@art('hue-mg-step-hap', 112, 112)
def step_hap(p):
    p.shadow(56, 100, 42, 8)
    BAM = Mat('#c9a464', shine=0.15, rough=10, amb=0.5, diff=0.65, tex=tex_wood(1.5, seed=101))
    for k in range(3):
        p.lathe(56, 98 - k * 16, lambda t: 38, BAM, 14, deco=lambda u, t: (hexc('#8a6a34'), ((np.abs(np.sin(u * 40)) > 0.94) | (abs(t - 0.5) < 0.06)) * 0.6))
    p.lathe(56, 50, lambda t: 38 * (1 - t) ** 0.5 + 2, BAM, 14)
    p.smoke(46, 30, 26, 2, 0.4)
    p.smoke(66, 30, 22, 4, 0.4)


@art('hue-mg-step-tom', 112, 112)
def step_tom(p):
    p.shadow(56, 92, 44, 9)
    p.lathe(56, 92, lambda t: 40 + 4 * t, PORC, 8, top_open=False, cap_mat=PORC)
    rs = np.random.default_rng(9)
    for _ in range(80):
        a, r = rs.random() * 2 * math.pi, rs.random() ** 0.5
        p.ell(56 + math.cos(a) * r * 28, 72 + math.sin(a) * r * 8, 2.2, 1.4, ['#e2702a', '#f08a3a', '#c95a1a'][rs.integers(0, 3)])


@art('hue-mg-step-mo', 112, 112)
def step_mo(p):
    p.shadow(56, 92, 44, 9)
    p.lathe(56, 92, lambda t: 40 + 4 * t, PORC, 8, top_open=False, cap_mat=PORC)
    rs = np.random.default_rng(10)
    for _ in range(14):
        a, r = rs.random() * 2 * math.pi, rs.random() ** 0.5
        p.blob(56 + math.cos(a) * r * 26, 72 + math.sin(a) * r * 7, 4, 3, Mat('#e8b860', shine=0.6, rough=24, amb=0.55, diff=0.6))
    for _ in range(18):
        a, r = rs.random() * 2 * math.pi, rs.random() ** 0.5
        p.ell(56 + math.cos(a) * r * 28, 72 + math.sin(a) * r * 8, 2, 1.2, '#4f8a2a')


@art('hue-mg-step-mam', 112, 112)
def step_mam(p):
    p.shadow(56, 100, 26, 7)
    p.lathe(56, 100, lambda t: 16 + 8 * math.sin(math.pi * min(1, t * 1.1)) if t < 0.8 else 12 + (t - 0.8) * 20, Mat('#f1ece2', shine=0.6, rough=44, amb=0.5, diff=0.6), 60, top_open=True, deco=blue_white)
    p.ell(56, 41, 13, 4, '#b8701e', 0.85)
    p.ring(82, 66, 8, 13, 2.2, Mat('#f1ece2', shine=0.5, rough=40, amb=0.5, diff=0.6))
    p.poly([(42, 40), (30, 34), (36, 44)], Mat('#f1ece2', amb=0.55, diff=0.55))


# ---------------------------------------------------------------- Nhã nhạc instruments (160)
@art('hue-mg-inst-trong', 160, 160)
def inst_trong(p):
    p.shadow(80, 146, 56, 10)
    deco = lambda u, t: (hexc('#e0b048'), ((np.abs(np.sin(u * 50)) > 0.9) & ((abs(t - 0.1) < 0.05) | (abs(t - 0.9) < 0.05))) * 1.0)  # noqa: E731
    p.lathe(80, 140, lambda t: 50 + 6 * math.sin(math.pi * t), LACQ, 58, cap_mat=Mat('#e2cf9e', shine=0.1, rough=6, amb=0.62, diff=0.45, tex=tex_noise(0.08, 6, 102)), deco=deco)
    p.ell(80, 82, 18, 5, '#c43a24', 0.6)
    p.tube((60, 74), (112, 52), 2.2, DWOOD)
    p.blob(112, 52, 3.4, 3.4, M['silk_red'])


@art('hue-mg-inst-senh', 160, 160)
def inst_senh(p):
    p.shadow(80, 146, 50, 8)
    W = Mat('#8a4a22', shine=0.35, rough=26, amb=0.45, diff=0.7, tex=tex_wood(2.0, seed=103))
    for (x0, x1, ang) in ((50, 40, 0.18), (106, 116, -0.18)):
        pts = [(x0 - 9, 140), (x0 + 9, 140), (x1 + 9, 22), (x1 - 9, 22)]
        p.poly(pts, W, n=(-0.2 if x0 < 80 else 0.2, 0.2, 0.95), grad=0.2)
        for k in range(3):
            y = 42 + k * 26
            xc = x1 + (x0 - x1) * (y - 22) / 118
            p.blob(xc, y, 5, 5, GOLD, flat=0.5)
            p.rect(xc - 1.4, y - 1.4, xc + 1.4, y + 1.4, '#3a2410')
    p.line([(46, 20), (76, 8), (110, 20)], 1.6, '#b5221a')


@art('hue-mg-inst-nguyet', 160, 160)
def inst_nguyet(p):
    p.shadow(70, 148, 46, 8)
    W = Mat('#a0602e', shine=0.45, rough=30, amb=0.45, diff=0.7, tex=tex_wood(2.2, seed=104))
    p.tube((80, 92), (122, 10), 5, DWOOD, r1=4)
    for k in range(8):
        f = 0.2 + k * 0.09
        x, y = 80 + 42 * f, 92 - 82 * f
        p.tube((x - 5, y - 2.5), (x + 5, y + 2.5), 1.0, Mat('#e8dcc0', amb=0.6, diff=0.5))
    p.blob(68, 110, 42, 40, W, flat=0.35)
    p.ring(68, 110, 42, 40, 1.2, Mat('#3a1f0e', amb=0.6, diff=0.4))
    p.ell(68, 122, 10, 4, '#3a1f0e', 0.9)
    p.rect(52, 132, 84, 136, '#2a1408')
    for dx in (-1.2, 1.2):
        p.line([(68 + dx * 6, 134), (122 + dx, 12)], 0.5, '#f3e6c0', 0.9)
    for (x, y) in ((116, 14), (128, 20), (112, 24), (124, 30)):
        p.tube((x, y), (x + (6 if x > 120 else -6), y), 1.6, DWOOD)


@art('hue-mg-inst-sao', 160, 160)
def inst_sao(p):
    p.shadow(80, 120, 64, 7)
    BAM = Mat('#d6b06a', shine=0.45, rough=28, amb=0.48, diff=0.7, tex=tex_noise(0.12, 3, 105))
    p.tube((14, 112), (148, 46), 7, BAM)
    for f in (0.08, 0.5, 0.94):
        x, y = 14 + 134 * f, 112 - 66 * f
        p.tube((x - 1.2, y + 0.6), (x + 1.2, y - 0.6), 7.6, Mat('#8a6a34', amb=0.5, diff=0.6))
    for k in range(7):
        f = 0.3 + k * 0.08
        p.ell(14 + 134 * f, 112 - 66 * f - 2, 2.4, 2.0, '#2a1a0a')
    p.line([(148, 46), (152, 70)], 1.6, '#b5221a')
    p.blob(152, 74, 2.6, 4, M['silk_red'])


# ---------------------------------------------------------------- Cửu Đỉnh relief motifs (bronze emboss of the old silhouettes)
MOTIFS = ['mat-troi', 'may', 'nui', 'song', 'thuyen', 'voi', 'ho', 'chim', 'ca', 'hoa', 'sung', 'cay']


def relief(name):
    old = os.path.join(SRC, f'hue-mg-motif-{name}.png')
    srcim = Image.open(old).convert('RGBA') if os.path.exists(old) else Image.open(os.path.join(PUB, f'hue-mg-motif-{name}.webp')).convert('RGBA')
    S = 112 * SS
    a = np.asarray(srcim.resize((S, S), Image.LANCZOS)).astype(np.float32) / 255
    # design mask: the old icon drew a plate + a darker/lighter figure; take strong-alpha pixels that differ from the plate colour
    solid = a[..., 3] > 0.5
    plate = np.median(a[..., :3][solid], axis=0) if solid.any() else np.array([0.5, 0.5, 0.5])
    dist = np.sqrt(((a[..., :3] - plate) ** 2).sum(-1))
    fig = np.clip((dist - 0.04) * 6, 0, 1) * (a[..., 3] > 0.3)
    if solid.mean() < 0.6:  # icon drawn as a figure on transparency (no plate): the alpha IS the figure
        fig = a[..., 3]
    yy, xx = np.mgrid[0:S, 0:S].astype(np.float32)
    inside = ((xx > 4 * SS) & (xx < S - 4 * SS) & (yy > 4 * SS) & (yy < S - 4 * SS)).astype(np.float32)
    fig = fig * inside
    hgt = lib.blur(fig, 2.2 * SS) * 1.0 + lib.blur(fig, 0.6 * SS) * 0.4
    gy, gx = np.gradient(hgt * 26)
    nx, ny, nz = -gx, gy, np.ones_like(gx)
    nrm = np.sqrt(nx * nx + ny * ny + nz * nz)
    mat = Mat('#8a5a2b', shine=0.7, rough=24, amb=0.38, diff=0.85, tex=lib.tex_patina(106), spec_col='#ffd9a0')
    col = lib.shade(mat, nx / nrm, ny / nrm, nz / nrm, xx / S, 1 - yy / S)
    # polished high points, dark patina in recesses
    col = col * (0.75 + 0.45 * np.clip(hgt, 0, 1))[..., None]
    L = lib.Layer(S, S)
    L.over(col, inside)
    return L.image((112, 112))


def build(names=None):
    os.makedirs(SRC, exist_ok=True)
    os.makedirs(PUB, exist_ok=True)
    for name, (w, h, fn) in REG.items():
        if names and name not in names:
            continue
        p = P(w, h)
        fn(p)
        im = p.image()
        im.save(os.path.join(SRC, f'{name}.png'), optimize=True)
        im.save(os.path.join(PUB, f'{name}.webp'), 'WEBP', quality=88, method=6)
        print('mg', name)
    for m in MOTIFS:
        name = f'hue-mg-motif-{m}'
        if names and name not in names:
            continue
        backup = os.path.join(SRC, f'{name}.vector.png')
        cur = os.path.join(SRC, f'{name}.png')
        if not os.path.exists(backup) and os.path.exists(cur):
            os.replace(cur, backup)  # keep the original silhouette as the emboss source
        srcfile = backup if os.path.exists(backup) else cur
        global relief_src
        im = relief_from(srcfile, m)
        im.save(cur, optimize=True)
        im.save(os.path.join(PUB, f'{name}.webp'), 'WEBP', quality=88, method=6)
        print('mg', name)


def relief_from(path, name):
    global SRC
    tmp = os.path.join(SRC, f'hue-mg-motif-{name}.png')
    if path != tmp:
        Image.open(path).save(tmp)
    return relief(name)


if __name__ == '__main__':
    build(set(sys.argv[1:]) or None)
