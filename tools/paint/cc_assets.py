"""
Cuốc Cuối art (map `game`): station icons + package sprite (atlas stations-0) and the 640x400 task cards.
  uv run -q --no-project --with numpy --with pillow python tools/paint/cc_assets.py [icons|cards]
Writes PNG sources under assets/maps/game/{stations,cards} and webp/atlas under apps/web/public/assets/maps/game.
Everything is drawn from shapes (supersampled), no external art.
"""
from __future__ import annotations

import json
import math
import os
import random
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '../..'))
SRC = os.path.join(ROOT, 'assets/maps/game')
PUB = os.path.join(ROOT, 'apps/web/public/assets/maps/game')
FONT = '/System/Library/Fonts/Supplemental/Arial Bold.ttf'
FONT_BLACK = '/System/Library/Fonts/Supplemental/Arial Black.ttf'

TASKS = ['receive_package', 'check_seal', 'decode_address', 'plan_route', 'prepare_bike', 'pack_disguise', 'confirm_recipient', 'handoff_package']

CRAB = (47, 174, 91)
CRAB_D = (24, 112, 58)
CARD = (201, 146, 84)
CARD_L = (229, 182, 118)
CARD_D = (150, 100, 52)
TAPE = (236, 226, 196)
PAPER = (244, 240, 228)
INK = (40, 36, 34)
RED = (214, 52, 44)
BLUE = (64, 140, 214)
STEEL = (170, 176, 184)


def path(base, *p):
    f = os.path.join(base, *p)
    os.makedirs(os.path.dirname(f), exist_ok=True)
    return f


def font(sz, black=False):
    try:
        return ImageFont.truetype(FONT_BLACK if black else FONT, int(sz))
    except OSError:
        return ImageFont.load_default(int(sz))


def mix(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


def lit(c, k):
    return mix(c, (255, 255, 255), k) if k > 0 else mix(c, (0, 0, 0), -k)


class Pen:
    """Unit-space painter: coords in [-1,1] around (cx,cy) scaled by s, on a supersampled RGBA layer."""

    def __init__(self, im: Image.Image, cx, cy, s):
        self.im, self.cx, self.cy, self.s = im, cx, cy, s

    def P(self, x, y):
        return (self.cx + x * self.s, self.cy + y * self.s)

    def _mask(self, kind, pts, **kw):
        m = Image.new('L', self.im.size, 0)
        d = ImageDraw.Draw(m)
        if kind == 'poly':
            d.polygon([self.P(*p) for p in pts], fill=255)
        elif kind == 'rect':
            (x0, y0), (x1, y1) = self.P(*pts[0]), self.P(*pts[1])
            d.rounded_rectangle([x0, y0, x1, y1], radius=kw.get('r', 0) * self.s, fill=255)
        elif kind == 'ell':
            (x0, y0), (x1, y1) = self.P(*pts[0]), self.P(*pts[1])
            d.ellipse([x0, y0, x1, y1], fill=255)
        elif kind == 'line':
            d.line([self.P(*p) for p in pts], fill=255, width=max(1, int(kw.get('w', 0.03) * self.s)), joint='curve')
            if kw.get('caps', True):
                r = kw.get('w', 0.03) * self.s / 2
                for p in (pts[0], pts[-1]):
                    x, y = self.P(*p)
                    d.ellipse([x - r, y - r, x + r, y + r], fill=255)
        elif kind == 'arc':
            (x0, y0), (x1, y1) = self.P(*pts[0]), self.P(*pts[1])
            d.arc([x0, y0, x1, y1], kw['a0'], kw['a1'], fill=255, width=max(1, int(kw.get('w', 0.03) * self.s)))
        return m

    def fill(self, kind, pts, top, bot=None, alpha=1.0, outline=None, ow=0.025, **kw):
        m = self._mask(kind, pts, **kw)
        box = m.getbbox()
        if not box:
            return
        bot = bot or top
        h = self.im.size[1]
        t = np.clip((np.arange(h) - box[1]) / max(1, box[3] - box[1]), 0, 1)[:, None]
        col = np.array(top)[None, None, :] * (1 - t[..., None]) + np.array(bot)[None, None, :] * t[..., None]
        col = np.broadcast_to(col, (h, self.im.size[0], 3)).astype(np.uint8)
        a = (np.asarray(m, dtype=np.float32) * alpha).astype(np.uint8)
        layer = Image.fromarray(np.dstack([col, a]))
        if outline is not None:
            self.outline(kind, pts, outline, ow, **kw)
        self.im.alpha_composite(layer)

    def outline(self, kind, pts, col, ow=0.025, **kw):
        m = self._mask(kind, pts, **kw)
        grow = max(3, int(ow * self.s) | 1)
        m = m.filter(ImageFilter.MaxFilter(grow))
        layer = Image.new('RGBA', self.im.size, col + (0,))
        layer.putalpha(m)
        self.im.alpha_composite(layer)

    def line(self, pts, col, w=0.03, alpha=1.0, caps=True):
        self.fill('line', pts, col, alpha=alpha, w=w, caps=caps)

    def arc(self, box, a0, a1, col, w=0.03):
        self.fill('arc', box, col, w=w, a0=a0, a1=a1)

    def text(self, x, y, s, size, col, black=False, anchor='mm'):
        d = ImageDraw.Draw(self.im)
        d.text(self.P(x, y), s, font=font(size * self.s, black and s.isascii()), fill=col + (255,), anchor=anchor)

    def shadow(self, x0, y0, x1, y1, a=0.35, blur=0.06):
        m = self._mask('ell', [(x0, y0), (x1, y1)]).filter(ImageFilter.GaussianBlur(blur * self.s))
        layer = Image.new('RGBA', self.im.size, (0, 0, 0, 0))
        layer.putalpha(m.point(lambda v: int(v * a)))
        self.im.alpha_composite(layer)


# ---------------------------------------------------------------- shared subjects

def box3d(p: Pen, x, y, w, h, d, base=CARD, tape=True, sticker=True, label=None):
    """Cardboard box: front face (x..x+w, y..y+h) with a side and top receding up-right by d."""
    k = d * 0.55
    p.shadow(x - 0.05, y + h - 0.06, x + w + d + 0.06, y + h + 0.1, a=0.45)
    p.fill('poly', [(x + w, y), (x + w + d, y - k), (x + w + d, y + h - k), (x + w, y + h)], lit(base, -0.22), lit(base, -0.35), outline=lit(base, -0.6))
    p.fill('poly', [(x, y), (x + d, y - k), (x + w + d, y - k), (x + w, y)], lit(base, 0.22), lit(base, 0.1), outline=lit(base, -0.6))
    p.fill('rect', [(x, y), (x + w, y + h)], lit(base, 0.05), lit(base, -0.12), outline=lit(base, -0.6))
    if tape:
        tw = w * 0.16
        cx = x + w / 2
        p.fill('poly', [(cx - tw / 2, y), (cx - tw / 2 + d, y - k), (cx + tw / 2 + d, y - k), (cx + tw / 2, y)], TAPE, alpha=0.95)
        p.fill('rect', [(cx - tw / 2, y), (cx + tw / 2, y + h * 0.42)], TAPE, lit(TAPE, -0.08), alpha=0.92)
    if sticker:
        sx, sy = x + w * 0.1, y + h * 0.5
        p.fill('rect', [(sx, sy), (sx + w * 0.3, sy + h * 0.3)], CRAB, CRAB_D, r=0.02)
        p.fill('ell', [(sx + w * 0.07, sy + h * 0.07), (sx + w * 0.23, sy + h * 0.23)], (250, 250, 240))
    if label:
        lx, ly = x + w * 0.52, y + h * 0.52
        p.fill('rect', [(lx, ly), (lx + w * 0.4, ly + h * 0.34)], PAPER, lit(PAPER, -0.08), r=0.015)
        for i in range(3):
            p.line([(lx + w * 0.05, ly + h * (0.09 + i * 0.09)), (lx + w * (0.34 - 0.08 * (i == 2)), ly + h * (0.09 + i * 0.09))], INK, w=h * 0.035, caps=False)


def phone(p: Pen, x, y, w, h, screen=(26, 34, 46)):
    p.shadow(x - 0.02, y + h - 0.04, x + w + 0.06, y + h + 0.08, a=0.4)
    p.fill('rect', [(x, y), (x + w, y + h)], (60, 66, 78), (28, 30, 38), r=w * 0.16, outline=(14, 14, 18))
    p.fill('rect', [(x + w * 0.07, y + h * 0.06), (x + w * 0.93, y + h * 0.94)], screen, lit(screen, -0.3), r=w * 0.09)
    p.fill('rect', [(x + w * 0.38, y + h * 0.025), (x + w * 0.62, y + h * 0.045)], (10, 10, 12), r=0.01)


def bubble(p: Pen, x, y, w, h, col, tail=-1):
    p.fill('rect', [(x, y), (x + w, y + h)], col, lit(col, -0.1), r=h * 0.4)
    tx = x + (0.12 * w if tail < 0 else 0.88 * w)
    p.fill('poly', [(tx - 0.03, y + h * 0.7), (tx + 0.03, y + h * 0.7), (tx - 0.06 * -tail, y + h * 1.35)], lit(col, -0.1))


def check(p: Pen, x, y, r, col=CRAB):
    p.fill('ell', [(x - r, y - r), (x + r, y + r)], lit(col, 0.15), lit(col, -0.15), outline=lit(col, -0.5))
    p.line([(x - r * 0.45, y), (x - r * 0.1, y + r * 0.38), (x + r * 0.5, y - r * 0.35)], (255, 255, 255), w=r * 0.28)


def pin(p: Pen, x, y, r, col=RED):
    p.fill('poly', [(x - r * 0.82, y - r * 0.5), (x, y + r * 1.4), (x + r * 0.82, y - r * 0.5)], lit(col, -0.1), lit(col, -0.35))
    p.fill('ell', [(x - r, y - r * 1.6), (x + r, y + r * 0.4)], lit(col, 0.2), lit(col, -0.1))
    p.fill('ell', [(x - r * 0.38, y - r * 0.98), (x + r * 0.38, y - r * 0.22)], (255, 250, 240))


# one subject per task, drawn in unit space (fits roughly in [-0.8,0.8])

def s_receive_package(p: Pen):
    box3d(p, -0.62, -0.18, 0.88, 0.7, 0.34, sticker=False, label=False)
    # receipt slip with 3 codes, pinned on the box
    p.shadow(-0.5, 0.4, 0.42, 0.62, a=0.25)
    p.fill('poly', [(-0.42, -0.62), (0.16, -0.7), (0.26, 0.24), (-0.32, 0.32)], PAPER, lit(PAPER, -0.1), outline=(120, 110, 96), ow=0.02)
    for i, (code, c) in enumerate([('U9B', INK), ('T9C', INK), ('S6R', INK)]):
        yy = -0.46 + i * 0.22
        p.fill('rect', [(-0.3 + i * 0.012, yy - 0.06), (-0.22 + i * 0.012, yy + 0.06)], CRAB)
        p.text(0.0 + i * 0.012, yy - 0.01 * i, code, 0.15, c, black=True)
    p.line([(-0.12, -0.72), (-0.08, -0.62)], RED, w=0.06)
    p.fill('ell', [(-0.17, -0.8), (-0.05, -0.68)], lit(RED, 0.2), RED)


def s_check_seal(p: Pen):
    box3d(p, -0.7, -0.05, 1.0, 0.62, 0.4, tape=False, sticker=False)
    # torn stamp pieces on the box front, the last one rotated
    for i, (g, rot) in enumerate([('C', 0), ('R', 0), ('A', 0), ('B', 35)]):
        cx, cy = -0.58 + i * 0.25, 0.26
        im = Image.new('RGBA', (int(p.s * 0.6), int(p.s * 0.6)), (0, 0, 0, 0))
        q = Pen(im, im.size[0] / 2, im.size[1] / 2, p.s)
        q.fill('rect', [(-0.1, -0.12), (0.1, 0.12)], (240, 214, 206), (226, 190, 178), r=0.02, outline=RED, ow=0.018)
        q.text(0, 0, g, 0.15, RED, black=True)
        im = im.rotate(rot, resample=Image.BICUBIC)
        x, y = p.P(cx, cy)
        p.im.alpha_composite(im, (int(x - im.size[0] / 2), int(y - im.size[1] / 2)))
    # magnifier
    p.line([(0.42, -0.08), (0.74, 0.3)], (80, 50, 30), w=0.1)
    p.fill('ell', [(0.04, -0.62), (0.56, -0.1)], (190, 220, 235), (140, 180, 200), alpha=0.5, outline=(150, 156, 166), ow=0.06)
    p.arc([(0.1, -0.56), (0.5, -0.16)], 200, 260, (255, 255, 255), w=0.035)


def s_decode_address(p: Pen):
    phone(p, -0.62, -0.78, 0.68, 1.42)
    bubble(p, -0.54, -0.6, 0.42, 0.14, (226, 232, 240), -1)
    bubble(p, -0.4, -0.38, 0.4, 0.14, (122, 214, 150), 1)
    bubble(p, -0.54, -0.16, 0.48, 0.14, (226, 232, 240), -1)
    bubble(p, -0.54, 0.06, 0.34, 0.14, (226, 232, 240), -1)
    for yy, x1 in [(-0.53, -0.2), (-0.31, -0.06), (-0.09, -0.12), (0.13, -0.26)]:
        p.line([(-0.48 + (0.12 if yy == -0.31 else 0), yy), (x1, yy)], (70, 74, 84), w=0.025)
    # address card + pin
    p.shadow(0.0, 0.42, 0.8, 0.62, a=0.3)
    p.fill('poly', [(0.02, -0.1), (0.74, -0.18), (0.8, 0.46), (0.08, 0.54)], PAPER, lit(PAPER, -0.1), outline=(120, 110, 96), ow=0.02)
    p.text(0.4, 0.04, '42/7', 0.17, INK, black=True)
    for i in range(3):
        p.line([(0.16 + i * 0.006, 0.2 + i * 0.09), (0.66 - 0.1 * (i == 2) + i * 0.006, 0.19 + i * 0.09)], (90, 86, 80), w=0.025)
    pin(p, 0.62, -0.32, 0.12)


def s_plan_route(p: Pen):
    p.shadow(-0.82, 0.48, 0.82, 0.72, a=0.35)
    p.fill('rect', [(-0.78, -0.6), (0.78, 0.6)], (232, 226, 206), (210, 202, 180), r=0.05, outline=(90, 72, 50), ow=0.03)
    n, m = 7, 5
    cw, ch = 1.4 / n, 1.08 / m
    rnd = random.Random(42)
    flood = {(5, 3), (0, 3), (0, 4), (4, 0), (6, 3), (2, 4), (3, 0), (1, 1), (6, 0), (1, 2)}
    dead = {(4, 1), (2, 2), (2, 3), (4, 3), (1, 3)}
    for j in range(m):
        for i in range(n):
            x0, y0 = -0.7 + i * cw, -0.54 + j * ch
            if (i, j) in flood:
                p.fill('rect', [(x0 + 0.01, y0 + 0.01), (x0 + cw - 0.01, y0 + ch - 0.01)], (120, 180, 230), (70, 130, 200), r=0.03)
                p.arc([(x0 + 0.05, y0 + 0.06), (x0 + cw - 0.05, y0 + ch - 0.05)], 200, 330, (220, 240, 255), w=0.018)
            elif (i, j) in dead:
                p.fill('rect', [(x0 + 0.01, y0 + 0.01), (x0 + cw - 0.01, y0 + ch - 0.01)], (90, 84, 78), (70, 64, 60), r=0.03)
                p.line([(x0 + 0.05, y0 + 0.05), (x0 + cw - 0.05, y0 + ch - 0.05)], (220, 70, 60), w=0.03)
                p.line([(x0 + cw - 0.05, y0 + 0.05), (x0 + 0.05, y0 + ch - 0.05)], (220, 70, 60), w=0.03)
            else:
                p.fill('rect', [(x0 + 0.01, y0 + 0.01), (x0 + cw - 0.01, y0 + ch - 0.01)], (246, 242, 228), (236, 230, 212), r=0.03)
            _ = rnd
    route = [(0, 1), (0, 0), (1, 0), (2, 0), (2, 1), (3, 1), (3, 2), (4, 2), (5, 2), (5, 1), (6, 1)]
    pts = [(-0.7 + (i + 0.5) * cw, -0.54 + (j + 0.5) * ch) for i, j in route]
    p.line(pts, (20, 80, 40), w=0.09)
    p.line(pts, CRAB, w=0.055)
    for (i, j) in [(1, 0), (4, 2)]:
        x, y = -0.7 + (i + 0.5) * cw, -0.54 + (j + 0.5) * ch
        p.fill('ell', [(x - 0.055, y - 0.055), (x + 0.055, y + 0.055)], (255, 214, 80), (230, 160, 30), outline=(110, 70, 10), ow=0.02)
    sx, sy = pts[0]
    p.fill('ell', [(sx - 0.06, sy - 0.06), (sx + 0.06, sy + 0.06)], (255, 255, 255), outline=(40, 40, 40), ow=0.02)
    ex, ey = pts[-1]
    p.line([(ex - 0.04, ey + 0.08), (ex - 0.04, ey - 0.2)], (60, 50, 40), w=0.03)
    p.fill('poly', [(ex - 0.04, ey - 0.2), (ex + 0.14, ey - 0.14), (ex - 0.04, ey - 0.07)], RED, lit(RED, -0.2))


def s_prepare_bike(p: Pen):
    # tyre
    p.shadow(-0.72, 0.5, 0.36, 0.72, a=0.4)
    p.fill('ell', [(-0.72, -0.42), (0.3, 0.6)], (52, 52, 56), (24, 24, 28))
    for a in range(0, 360, 20):
        r0, r1 = 0.49, 0.43
        ca, sa = math.cos(math.radians(a)), math.sin(math.radians(a))
        p.line([(-0.21 + ca * r1, 0.09 + sa * r1), (-0.21 + ca * r0, 0.09 + sa * r0)], (80, 80, 86), w=0.03, caps=False)
    p.fill('ell', [(-0.48, -0.18), (0.06, 0.36)], (200, 206, 214), (130, 136, 146), outline=(70, 72, 80))
    p.fill('ell', [(-0.29, 0.01), (-0.13, 0.17)], (90, 94, 102))
    for a in range(0, 360, 60):
        ca, sa = math.cos(math.radians(a)), math.sin(math.radians(a))
        p.line([(-0.21 + ca * 0.09, 0.09 + sa * 0.09), (-0.21 + ca * 0.25, 0.09 + sa * 0.25)], (150, 156, 166), w=0.035)
    # gauge with green band
    gx, gy, gr = 0.4, -0.3, 0.34
    p.line([(gx - 0.1, gy + 0.3), (-0.0, 0.4), (-0.12, 0.42)], (30, 30, 32), w=0.05)
    p.fill('ell', [(gx - gr, gy - gr), (gx + gr, gy + gr)], (220, 224, 230), (150, 156, 166), outline=(60, 62, 70), ow=0.03)
    p.fill('ell', [(gx - gr * 0.84, gy - gr * 0.84), (gx + gr * 0.84, gy + gr * 0.84)], (252, 250, 244), (230, 228, 220))
    box = [(gx - gr * 0.7, gy - gr * 0.7), (gx + gr * 0.7, gy + gr * 0.7)]
    p.arc(box, 150, 240, (220, 90, 70), w=0.06)
    p.arc(box, 240, 300, CRAB, w=0.06)
    p.arc(box, 300, 390, (230, 180, 60), w=0.06)
    a = math.radians(270)
    p.line([(gx, gy), (gx + math.cos(a) * gr * 0.62, gy + math.sin(a) * gr * 0.62)], INK, w=0.035)
    p.fill('ell', [(gx - 0.04, gy - 0.04), (gx + 0.04, gy + 0.04)], INK)
    p.text(gx, gy + 0.16, 'PSI', 0.08, INK, black=True)
    # numbered straps
    for i, n in enumerate(['1', '2', '3']):
        x = 0.18 + i * 0.2
        p.fill('rect', [(x, 0.18), (x + 0.12, 0.66)], (230, 120, 40), (180, 80, 20), r=0.03, outline=(110, 50, 10), ow=0.015)
        p.fill('rect', [(x - 0.01, 0.3), (x + 0.13, 0.38)], STEEL, (120, 126, 134), r=0.01)
        p.text(x + 0.06, 0.52, n, 0.1, (255, 245, 230), black=True)


def s_pack_disguise(p: Pen):
    box3d(p, -0.7, -0.1, 0.96, 0.68, 0.36, base=(214, 170, 96), tape=False, sticker=False)
    # fish-sauce brand + "Sách cũ" label slapped on
    p.fill('rect', [(-0.62, -0.02), (-0.08, 0.2)], (190, 40, 36), (150, 26, 24), r=0.02)
    p.text(-0.35, 0.09, 'NƯỚC MẮM', 0.08, (255, 226, 120), black=True)
    p.fill('poly', [(-0.6, 0.27), (0.12, 0.24), (0.14, 0.48), (-0.58, 0.51)], PAPER, lit(PAPER, -0.08), outline=(120, 110, 96), ow=0.015)
    p.text(-0.23, 0.38, 'Sách cũ', 0.12, INK, black=False)
    # layers peeking out of the open top: raincoat, carton, newspaper
    for i, (c, c2) in enumerate([((60, 120, 210), (40, 90, 170)), ((190, 150, 96), (160, 120, 70)), ((226, 222, 210), (196, 190, 176))]):
        yy = -0.18 - i * 0.12
        p.fill('poly', [(-0.62 + i * 0.03, yy), (0.18 + i * 0.03, yy - 0.06), (0.5, yy - 0.2), (-0.3 + i * 0.03, yy - 0.12)], c, c2, outline=lit(c2, -0.4), ow=0.012)
    for k in range(4):
        p.line([(-0.2 + k * 0.12, -0.5 - k * 0.012), (-0.12 + k * 0.12, -0.52 - k * 0.012)], (90, 90, 90), w=0.015)
    # tape dispenser
    p.fill('ell', [(0.38, 0.12), (0.76, 0.5)], (230, 90, 60), (180, 50, 30), outline=(90, 30, 20), ow=0.02)
    p.fill('ell', [(0.49, 0.23), (0.65, 0.39)], TAPE, lit(TAPE, -0.2))


def s_confirm_recipient(p: Pen):
    phone(p, -0.36, -0.8, 0.72, 1.5, screen=(22, 60, 44))
    p.fill('ell', [(-0.16, -0.58), (0.16, -0.26)], (210, 214, 222), (160, 166, 176))
    p.fill('ell', [(-0.08, -0.53), (0.08, -0.37)], (110, 116, 126))
    p.fill('poly', [(-0.14, -0.28), (0.14, -0.28), (0.1, -0.36), (-0.1, -0.36)], (110, 116, 126))
    p.text(0, -0.14, 'Anh Tư', 0.1, (240, 245, 240), black=True)
    p.fill('rect', [(-0.26, -0.04), (0.26, 0.14)], (12, 30, 22), r=0.04, outline=(80, 200, 130), ow=0.012)
    p.text(0, 0.05, '•••• 4721', 0.09, (150, 255, 190), black=True)
    p.text(0, 0.26, '“không biết gì hết”', 0.055, (210, 230, 216))
    p.fill('ell', [(-0.24, 0.42), (-0.06, 0.6)], (230, 70, 60), (190, 40, 30))
    p.fill('ell', [(0.06, 0.42), (0.24, 0.6)], (80, 210, 120), (40, 160, 80))
    for i in range(3):
        p.arc([(0.3 - i * 0.0, -0.66 - i * 0.08), (0.5 + i * 0.12, -0.4 + i * 0.04)], 280, 350, (240, 220, 120), w=0.03)
    check(p, 0.52, 0.32, 0.16)


def s_handoff_package(p: Pen):
    box3d(p, -0.74, -0.06, 0.74, 0.58, 0.3)
    # keypad terminal
    p.shadow(0.06, 0.52, 0.8, 0.7, a=0.35)
    p.fill('rect', [(0.08, -0.6), (0.74, 0.6)], (70, 76, 88), (36, 40, 48), r=0.07, outline=(16, 16, 20), ow=0.02)
    p.fill('rect', [(0.15, -0.52), (0.67, -0.3)], (20, 46, 30), (10, 30, 18), r=0.03)
    p.text(0.41, -0.41, '4 7 2 1', 0.11, (150, 255, 190), black=True)
    for r in range(3):
        for c in range(3):
            x, y = 0.18 + c * 0.17, -0.2 + r * 0.17
            p.fill('rect', [(x, y), (x + 0.13, y + 0.13)], (200, 204, 212), (150, 156, 166), r=0.025)
            p.text(x + 0.065, y + 0.065, str(r * 3 + c + 1), 0.07, INK, black=True)
    p.fill('rect', [(0.18, 0.31), (0.64, 0.44)], CRAB, CRAB_D, r=0.025)
    p.text(0.41, 0.375, 'OK', 0.08, (255, 255, 255), black=True)
    check(p, -0.12, -0.36, 0.17)
    # five stars
    for i in range(5):
        cx, cy, r = -0.7 + i * 0.14, -0.62, 0.06
        pts = [(cx + math.cos(math.radians(-90 + k * 36)) * (r if k % 2 == 0 else r * 0.45),
                cy + math.sin(math.radians(-90 + k * 36)) * (r if k % 2 == 0 else r * 0.45)) for k in range(10)]
        p.fill('poly', pts, (255, 220, 80), (240, 170, 30))


SUBJECT = {t: globals()[f's_{t}'] for t in TASKS}


# ---------------------------------------------------------------- station icons

SS = 4  # supersampling


def bezel(size=128):
    """Metal ring, dark warm disc, thin green inner ring — matches the old station plates."""
    S = size * SS
    im = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    p = Pen(im, S / 2, S / 2, S / 2)
    p.fill('ell', [(-0.98, -0.98), (0.98, 0.98)], (236, 238, 242), (110, 114, 122))
    p.fill('ell', [(-0.9, -0.9), (0.9, 0.9)], (120, 124, 132), (220, 222, 228))
    p.fill('ell', [(-0.83, -0.83), (0.83, 0.83)], (86, 52, 34), (40, 22, 16))
    g = np.zeros((S, S), np.float32)
    yy, xx = np.mgrid[0:S, 0:S]
    r = np.hypot(xx - S / 2, yy - S * 0.42) / (S * 0.42)
    g = np.clip(1 - r, 0, 1) ** 1.5 * 70
    glow = Image.fromarray(np.dstack([np.full((S, S), 255, np.uint8), np.full((S, S), 170, np.uint8), np.full((S, S), 90, np.uint8), g.astype(np.uint8)]))
    mask = p._mask('ell', [(-0.83, -0.83), (0.83, 0.83)])
    glow.putalpha(Image.fromarray(np.minimum(np.asarray(glow.getchannel('A')), np.asarray(mask))))
    im.alpha_composite(glow)
    p.arc([(-0.84, -0.84), (0.84, 0.84)], 0, 360, (40, 180, 90), w=0.025)
    return im, p


def icon(task):
    im, p = bezel()
    inner = Image.new('RGBA', im.size, (0, 0, 0, 0))
    SUBJECT[task](Pen(inner, im.size[0] / 2, im.size[1] / 2 + im.size[1] * 0.02, im.size[0] / 2 * 0.68))
    mask = p._mask('ell', [(-0.82, -0.82), (0.82, 0.82)])
    inner.putalpha(Image.fromarray(np.minimum(np.asarray(inner.getchannel('A')), np.asarray(mask))))
    im.alpha_composite(inner)
    return im.resize((128, 128), Image.LANCZOS)


def package_sprite():
    """The 50-million box on the map (anchor: bottom-centre), ~64x64."""
    S = 64 * SS
    im = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    box3d(Pen(im, S / 2, S / 2, S / 2), -0.72, -0.28, 1.1, 0.98, 0.34, label=True)
    return im.resize((64, 64), Image.LANCZOS)


def pack_atlas(imgs: dict, name: str, pad=2, q=92):
    x = 0
    H = max(im.height for im in imgs.values())
    frames = {}
    for k, im in imgs.items():
        frames[k] = {'frame': {'x': x, 'y': 0, 'w': im.width, 'h': im.height}, 'rotated': False, 'trimmed': False,
                     'spriteSourceSize': {'x': 0, 'y': 0, 'w': im.width, 'h': im.height}, 'sourceSize': {'w': im.width, 'h': im.height}}
        x += im.width + pad
    W = x - pad
    atlas = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    for k, im in imgs.items():
        atlas.alpha_composite(im, (frames[k]['frame']['x'], 0))
    atlas.save(path(PUB, 'atlas', f'{name}.webp'), 'WEBP', quality=q, method=6)
    json.dump({'frames': frames, 'meta': {'app': 'tools/paint/cc_assets.py', 'image': f'{name}.webp', 'format': 'RGBA8888', 'size': {'w': W, 'h': H}, 'scale': '1'}},
              open(path(PUB, 'atlas', f'{name}.json'), 'w'), indent=1)
    print('atlas', name, W, H)


def icons():
    imgs = {}
    for t in TASKS:
        key = 'station-' + t.replace('_', '-')
        imgs[key] = icon(t)
        imgs[key].save(path(SRC, 'stations', key + '.png'), optimize=True)
    pkg = package_sprite()
    pkg.save(path(SRC, 'stations', 'package.png'), optimize=True)
    imgs['package'] = pkg
    imgs['task-marker'] = Image.open(os.path.join(SRC, 'stations', 'task-marker.png')).convert('RGBA')
    pack_atlas(imgs, 'stations-0')


# ---------------------------------------------------------------- cards

# night palette per area: (sky top, sky bottom, light colours)
MOOD = {
    'archive': ((24, 18, 14), (58, 40, 26), [(255, 190, 110), (255, 220, 150), (120, 220, 150)]),
    'coordination': ((12, 24, 28), (30, 54, 56), [(120, 230, 210), (255, 210, 120), (255, 120, 90)]),
    'editing': ((26, 18, 12), (60, 36, 20), [(255, 150, 70), (255, 220, 140), (120, 180, 255)]),
    'artifact_storage': ((10, 16, 30), (24, 40, 66), [(110, 170, 255), (255, 210, 120), (130, 240, 170)]),
    'corridor': ((20, 12, 28), (46, 26, 52), [(220, 120, 255), (255, 200, 120), (110, 230, 160)]),
}
AREA = {'receive_package': 'archive', 'check_seal': 'archive', 'pack_disguise': 'archive', 'decode_address': 'coordination',
        'confirm_recipient': 'coordination', 'prepare_bike': 'editing', 'plan_route': 'artifact_storage', 'handoff_package': 'corridor'}


def card_bg(task, W=640, H=400):
    top, bot, lights = MOOD[AREA[task]]
    rnd = random.Random(task)
    t = np.linspace(0, 1, H)[:, None, None]
    rgb = np.array(top)[None, None] * (1 - t) + np.array(bot)[None, None] * t
    rgb = np.broadcast_to(rgb, (H, W, 3)).copy()
    # bokeh
    yy, xx = np.mgrid[0:H, 0:W]
    for _ in range(26):
        cx, cy, r = rnd.uniform(0, W), rnd.uniform(0, H * 0.75), rnd.uniform(8, 34)
        col = np.array(rnd.choice(lights), np.float32)
        d = np.hypot(xx - cx, yy - cy) / r
        a = (np.clip(1.15 - d, 0, 1) ** 0.8 * rnd.uniform(0.12, 0.35))[..., None]
        rgb = rgb * (1 - a) + col * a
    # street-light glow + wet ground sheen
    gx = rnd.uniform(W * 0.6, W * 0.9)
    d = np.hypot(xx - gx, (yy + 40) * 1.4) / (W * 0.5)
    rgb += (np.clip(1 - d, 0, 1) ** 2 * 60)[..., None] * np.array(lights[0]) / 255
    ground = np.clip((yy - H * 0.72) / (H * 0.28), 0, 1)[..., None]
    rgb = rgb * (1 - ground * 0.5) + np.array([14, 14, 18]) * ground * 0.5
    im = Image.fromarray(np.clip(rgb, 0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.5)).convert('RGBA')
    # rain streaks
    d = ImageDraw.Draw(im)
    for _ in range(140):
        x, y = rnd.uniform(0, W), rnd.uniform(0, H)
        d.line([(x, y), (x - 3, y + rnd.uniform(8, 16))], fill=(220, 230, 255, rnd.randint(30, 70)), width=1)
    return im


def card(task, W=640, H=400):
    bg = card_bg(task, W, H)
    S = SS
    layer = Image.new('RGBA', (W * S, H * S), (0, 0, 0, 0))
    SUBJECT[task](Pen(layer, W * S * 0.5, H * S * 0.52, H * S * 0.52))
    layer = layer.resize((W, H), Image.LANCZOS)
    # rim light: soft coloured halo behind the subject
    halo = layer.getchannel('A').filter(ImageFilter.GaussianBlur(14))
    glow = Image.new('RGBA', (W, H), MOOD[AREA[task]][2][0] + (0,))
    glow.putalpha(halo.point(lambda v: int(v * 0.55)))
    bg.alpha_composite(glow)
    bg.alpha_composite(layer)
    # vignette
    yy, xx = np.mgrid[0:H, 0:W]
    v = np.clip(np.hypot((xx - W / 2) / (W * 0.62), (yy - H / 2) / (H * 0.62)) - 0.55, 0, 1) * 1.4
    vig = Image.fromarray(np.dstack([np.zeros((H, W, 3), np.uint8), (np.clip(v, 0, 1) * 200).astype(np.uint8)]))
    bg.alpha_composite(vig)
    rgb = bg.convert('RGB')
    rgb.save(path(SRC, 'cards', f'card-{task}.png'), optimize=True)
    rgb.save(path(PUB, 'cards', f'card-{task}.webp'), 'WEBP', quality=88, method=6)
    print('card', task)


if __name__ == '__main__':
    what = set(sys.argv[1:]) or {'icons', 'cards'}
    if 'icons' in what:
        icons()
    if 'cards' in what:
        for t in TASKS:
            card(t)
