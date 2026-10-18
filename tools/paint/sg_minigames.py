"""
Sài Gòn station medallions + HUD icons (painted, offline, no baked text, no brand logos).
  uv run -q --no-project --with numpy --with scipy --with pillow python tools/paint/sg_minigames.py [name ...]
Writes assets/maps/sai-gon/{minigames,stations}/<name>.png,
       apps/web/public/assets/maps/sai-gon/minigames/<name>.webp  (sg-ui-*)
       apps/web/public/assets/maps/sai-gon/atlas/sg-stations-0.{webp,json}  (task-marker + sg-station-*)
The mini-games themselves are SVG/CSS, so there is no raster sg-mg-* art.
"""
from __future__ import annotations

import math
import os
import sys

from PIL import Image

sys.path.insert(0, os.path.dirname(__file__))
from lib import Mat, tex_noise  # noqa: E402
from props import P, WHITE  # noqa: E402
from sg_common import pack_atlas, pub, src  # noqa: E402

REG = {}  # name -> (w, h, kind, fn)   kind: mg | station


def art(name, w, h, kind='mg'):
    def deco(fn):
        REG[name] = (w, h, kind, fn)
        return fn
    return deco


def m(col, shine=0.25, rough=14, amb=0.5, diff=0.65, tex=None, spec=None):
    kw = {'spec_col': spec} if spec else {}
    return Mat(col, shine=shine, rough=rough, amb=amb, diff=diff, tex=tex, **kw)


STEEL = m('#b9c0c8', 0.85, 44, 0.42, 0.8, tex_noise(0.04, 6, 501), '#ffffff')
DSTEEL = m('#6c737c', 0.7, 36, 0.4, 0.8, tex_noise(0.05, 6, 502))
CRAB = m('#00b14f', 0.55, 30, 0.5, 0.7, tex_noise(0.04, 3, 503))
CRAB_D = m('#007a37', 0.5, 28, 0.45, 0.7)
STOOL = m('#d8342c', 0.55, 30, 0.5, 0.7, tex_noise(0.04, 3, 504))
RUBBER = m('#1f2126', 0.3, 16, 0.4, 0.6, tex_noise(0.08, 2, 505))
RICE = m('#f6f1e4', 0.12, 8, 0.62, 0.5, tex_noise(0.22, 1, 506))
PORK = m('#9a4a22', 0.5, 26, 0.45, 0.72, tex_noise(0.25, 2, 507))
YOLK = m('#f2a81c', 0.7, 36, 0.5, 0.7)
CUKE = m('#5e9a3a', 0.45, 24, 0.48, 0.7)
GLASS = m('#d6e4ea', 0.95, 70, 0.55, 0.35, spec='#ffffff')
PAPER = m('#f3ecd8', 0.06, 6, 0.6, 0.5, tex_noise(0.06, 3, 508))
ENVR = m('#d4281c', 0.45, 24, 0.5, 0.7, tex_noise(0.05, 3, 509))
GOLDF = m('#e8b23a', 0.85, 30, 0.45, 0.85, spec='#fff2c0')
BLUEP = m('#2f6fb5', 0.5, 26, 0.48, 0.7)
YELLP = m('#e8b21e', 0.5, 26, 0.5, 0.7)
FUEL = m('#e88a1a', 0.85, 50, 0.5, 0.55, spec='#fff2c0')
BASIN = m('#2f7fd0', 0.6, 32, 0.5, 0.7, tex_noise(0.03, 3, 510))
CLOUD = m('#9aa4b4', 0.12, 8, 0.55, 0.6, tex_noise(0.08, 2, 511))
CLOUD_D = m('#6a7486', 0.12, 8, 0.5, 0.6)
NOTE_G = m('#5c8e6e', 0.2, 10, 0.55, 0.6, tex_noise(0.1, 4, 512))
NOTE_B = m('#3e78a8', 0.25, 12, 0.55, 0.6, tex_noise(0.1, 4, 513))
NOTE_P = m('#c46a8c', 0.25, 12, 0.55, 0.6, tex_noise(0.1, 4, 514))
LEDGER = m('#2a4a7a', 0.35, 20, 0.45, 0.7, tex_noise(0.08, 3, 515))
SODIUM = '#ffb04a'
VOLT = '#fff2c0'


# ====================================================================== station medallions (128) + marker
def medallion(p: P, inner='#13202c', glow='#c26a1c'):
    """Enamel street-sign disc: brushed steel rim, bolts, a sodium-lamp glow on dark enamel."""
    p.shadow(64, 70, 58, 56, 0.35, 0.8)
    p.blob(64, 64, 60, 60, STEEL, flat=0.35)
    p.ell(64, 64, 51, 51, '#2a3036')
    p.ell(64, 64, 49, 49, inner)
    p.ell(58, 54, 42, 36, glow, 0.5, blur=14)
    p.ring(64, 64, 49.5, 49.5, 0.9, CRAB)
    for k in range(4):  # rivets at the four corners of a sign mount
        a = k / 4 * 2 * math.pi + math.pi / 4
        p.blob(64 + math.cos(a) * 55, 64 + math.sin(a) * 55, 2.2, 2.2, DSTEEL)


def station(name, inner='#13202c', glow='#c26a1c'):
    def deco(fn):
        def full(p: P):
            medallion(p, inner, glow)
            fn(p)
        REG[name] = (128, 128, 'station', full)
        return fn
    return deco


@art('task-marker', 64, 64, 'station')
def task_marker(p: P):
    p.glow(32, 32, 30, SODIUM, 0.45)
    p.ring(32, 32, 26, 26, 2.2, STEEL)
    p.ring(32, 32, 22, 22, 0.9, CRAB)
    for k in range(4):
        a = k * math.pi / 2 - math.pi / 2
        x, y = 32 + math.cos(a) * 26, 32 + math.sin(a) * 26
        p.poly([(x, y - 4.5), (x + 3, y), (x, y + 4.5), (x - 3, y)], YELLP, n=(-0.3, -0.3, 0.9))
        p.glow(x, y, 5, VOLT, 0.5)


# ---------------------------------------------------------------- shared painters
def pin(p: P, cx, cy, r, mat=STOOL):
    """Location pin: round head, pointed tail, white eye. (cx, cy) = head centre."""
    p.shadow(cx, cy + r * 2.3, r * 0.7, r * 0.22, 0.4)
    p.poly([(cx - r * 0.86, cy + r * 0.5), (cx + r * 0.86, cy + r * 0.5), (cx, cy + r * 2.25)], mat, n=(-0.2, 0.1, 1), grad=0.3)
    p.blob(cx, cy, r, r, mat, flat=0.6)
    p.blob(cx, cy, r * 0.4, r * 0.4, WHITE, flat=0.5)
    p.ell(cx - r * 0.38, cy - r * 0.42, r * 0.22, r * 0.14, '#ffffff', 0.7, blur=1)


def scooter(p: P, x, yb, s=1.0, body=CRAB, trim=CRAB_D, helmet=True):
    """Side-on step-through scooter facing left. (x, yb) = rear wheel ground contact."""
    fx = x - 54 * s
    p.shadow(x - 27 * s, yb, 36 * s, 4 * s, 0.4)
    for wx in (fx, x):
        p.ring(wx, yb - 9 * s, 8.5 * s, 8.5 * s, 3.2 * s, RUBBER)
        p.blob(wx, yb - 9 * s, 4 * s, 4 * s, STEEL, flat=0.4)
    # body: rear cowl, floorboard, leg shield
    p.poly([(x - 30 * s, yb - 14 * s), (x + 8 * s, yb - 16 * s), (x + 12 * s, yb - 26 * s), (x - 4 * s, yb - 32 * s),
            (x - 32 * s, yb - 28 * s)], body, n=(-0.1, 0.4, 0.9), grad=0.3)
    p.poly([(fx + 6 * s, yb - 14 * s), (x - 28 * s, yb - 14 * s), (x - 28 * s, yb - 18 * s), (fx + 8 * s, yb - 19 * s)], trim)
    p.poly([(fx + 2 * s, yb - 14 * s), (fx + 10 * s, yb - 18 * s), (fx + 16 * s, yb - 44 * s), (fx + 8 * s, yb - 46 * s),
            (fx - 2 * s, yb - 22 * s)], body, n=(-0.4, 0.2, 0.9), grad=0.2)
    p.tube((fx + 3 * s, yb - 9 * s), (fx + 12 * s, yb - 46 * s), 1.6 * s, DSTEEL)
    p.tube((fx + 4 * s, yb - 48 * s), (fx + 20 * s, yb - 50 * s), 2.0 * s, RUBBER)
    p.blob(fx + 9 * s, yb - 44 * s, 3.2 * s, 2.6 * s, m('#fff2c0', 0.9, 40, 0.8, 0.3))
    p.glow(fx + 4 * s, yb - 43 * s, 8 * s, VOLT, 0.45)
    # seat + taillight
    p.poly([(x - 32 * s, yb - 30 * s), (x - 2 * s, yb - 34 * s), (x + 8 * s, yb - 31 * s), (x - 30 * s, yb - 27 * s)], RUBBER,
           n=(0, 0.8, 0.6))
    p.ell(x + 11 * s, yb - 26 * s, 2.2 * s, 1.8 * s, '#ff3a2a')
    if helmet:
        p.blob(x - 14 * s, yb - 38 * s, 9 * s, 7 * s, body, flat=0.7)
        p.poly([(x - 22 * s, yb - 37 * s), (x - 12 * s, yb - 36 * s), (x - 13 * s, yb - 33 * s), (x - 23 * s, yb - 34 * s)],
               m('#1a2028', 0.9, 50, 0.4, 0.6))


def banknote(p: P, x, y, w, h, mat, depth=2.5):
    """A banded wad of notes seen in 3/4: box + paper edges + elastic band."""
    p.box(x, y, w, h, depth, mat)
    for k in range(3):
        p.line([(x + 1, y + h + depth * (k + 1) / 4), (x + w - 1, y + h + depth * (k + 1) / 4)], 0.5, '#f4f0e0', 0.6)
    p.ell(x + w * 0.5, y + h * 0.5, h * 0.32, h * 0.32, '#ffffff', 0.18)  # portrait medallion, blank
    p.rect(x + w * 0.62, y - 0.5, x + w * 0.72, y + h + depth, '#b8862a', 0.9)


# ---------------------------------------------------------------- stations
@station('sg-station-chi-duong')
def st_chi_duong(p: P):
    # folded alley map: three panels, a red route, then the pin
    panels = [[(26, 52), (52, 44), (54, 94), (28, 100)], [(52, 44), (78, 52), (78, 102), (54, 94)],
              [(78, 52), (104, 44), (102, 94), (78, 102)]]
    for k, pts in enumerate(panels):
        p.poly(pts, PAPER, n=(-0.3 if k % 2 else 0.3, 0.2, 1), grad=0.25)
    for pts in ([(30, 64), (52, 58)], [(56, 60), (76, 66)], [(80, 66), (100, 60)], [(36, 84), (100, 76)], [(64, 50), (66, 98)]):
        p.line(pts, 2.2, '#c9c2ae')
    p.line([(34, 90), (48, 78), (64, 82), (72, 66)], 2.4, '#d4281c', 0.9)
    pin(p, 72, 46, 13)


@station('sg-station-com-tam')
def st_com_tam(p: P):
    p.shadow(64, 80, 42, 16, 0.4)
    p.blob(64, 74, 44, 22, WHITE, flat=0.25)
    p.ell(64, 72, 36, 16, '#e8e6e0')
    p.blob(52, 70, 18, 11, RICE, flat=0.6)  # tấm mound
    for k in range(26):
        a, r = k * 2.4, 3 + (k * 7 % 13)
        p.ell(52 + math.cos(a) * r, 68 + math.sin(a) * r * 0.55, 1.1, 0.7, '#ffffff', 0.8)
    p.ell(52, 63, 6, 1.4, '#7aa83a', 0.8)  # mỡ hành
    for dx in (-3, 1, 4):
        p.ell(50 + dx, 64, 1.0, 0.7, '#3e7a28')
    # sườn nướng: glazed chop with grill bars
    pork = [(64, 66), (84, 58), (96, 64), (92, 78), (72, 82), (64, 76)]
    p.poly(pork, PORK, n=(-0.1, 0.4, 0.9), grad=0.3)
    for k in range(4):
        p.line([(70 + k * 6, 80), (78 + k * 6, 60)], 1.4, '#3a160a', 0.75)
    p.line([(64, 66), (84, 58), (96, 64)], 1.2, '#e09a5a', 0.6)
    # trứng ốp la + cucumber
    p.ell(40, 82, 11, 6, '#fbf8ee')
    p.blob(41, 81, 4.2, 3.2, YOLK, flat=0.7)
    for k in range(3):
        p.blob(80 + k * 6, 86 - k, 4, 2.4, CUKE, flat=0.5)
        p.ell(80 + k * 6, 86 - k, 2.4, 1.3, '#d8ecb0')


@station('sg-station-tieng-rao')
def st_tieng_rao(p: P):
    # handheld megaphone (loa rao) pointing right, with sound arcs
    p.shadow(58, 96, 30, 6, 0.35)
    p.poly([(44, 56), (82, 38), (82, 90), (44, 72)], STOOL, n=(-0.1, 0.5, 0.85), grad=0.3)
    p.ell(82, 64, 7, 26, '#5a1410')
    p.ring(82, 64, 7, 26, 1.4, WHITE)
    p.box(30, 54, 16, 18, 4, WHITE)
    p.tube((40, 74), (36, 96), 4.2, RUBBER)
    p.tube((44, 80), (46, 86), 1.4, YELLP)
    for k in range(3):
        r = 10 + k * 7
        pts = [(86 + r * math.cos(a), 64 + r * math.sin(a)) for a in [i / 10 * 1.4 - 0.7 for i in range(11)]]
        p.line(pts, 2.2, VOLT, 0.85 - k * 0.2)


@station('sg-station-ca-phe-phin', inner='#1a120e', glow='#a85a24')
def st_ca_phe_phin(p: P):
    # glass: condensed milk at the bottom, coffee dripping above
    p.shadow(64, 104, 22, 6, 0.4)
    p.lathe(64, 104, lambda t: 16 + 3 * t, GLASS, 38, top_open=True)
    p.rect(50, 82, 78, 100, '#3a1c0c', 0.85, r=3)
    p.rect(50, 92, 78, 101, '#efe0bc', 0.9, r=3)
    p.rect(49, 70, 79, 101, '#d6e4ea', 0.22, r=3)
    p.line([(54, 72), (54, 98)], 2, '#ffffff', 0.45)
    # phin sitting on the rim
    p.lathe(64, 66, lambda t: 21 if t < 0.12 else 14 + 2 * t, STEEL, 24, top_open=True)
    p.ell(64, 41, 15, 4.2, '#2a1c14')
    p.blob(64, 38, 10, 3.2, STEEL, flat=0.5)
    p.blob(64, 34, 2.6, 2.2, DSTEEL)
    p.tube((64, 67), (64, 80), 1.0, m('#3a1c0c'), r1=0.6)
    p.blob(64, 82, 1.6, 2.2, m('#3a1c0c', 0.9, 50))
    p.smoke(64, 32, 18, 7, 0.25)


@station('sg-station-khui-hui', inner='#2a0c0a', glow='#c23a1c')
def st_khui_hui(p: P):
    for k, a in enumerate((-0.42, -0.14, 0.14, 0.42)):
        cx, cy = 64 + math.sin(a) * 20, 70 - math.cos(a) * 4
        ca, sa = math.cos(a), math.sin(a)
        corners = [(-15, -22), (15, -22), (15, 22), (-15, 22)]
        pts = [(cx + u * ca - v * sa, cy + u * sa + v * ca) for u, v in corners]
        p.poly(pts, ENVR, n=(sa * 0.4, 0.2, 1), grad=0.2)
        flap = [(-15, -22), (15, -22), (0, -8)]
        p.poly([(cx + u * ca - v * sa, cy + u * sa + v * ca) for u, v in flap], m('#b01e14', 0.4, 22), n=(0, 0.6, 0.8))
        band = [(-15, 8), (15, 8), (15, 12), (-15, 12)]
        p.poly([(cx + u * ca - v * sa, cy + u * sa + v * ca) for u, v in band], GOLDF, n=(0, 0.3, 1))
    p.blob(64, 60, 4.5, 4.5, GOLDF, flat=0.5)
    p.glow(64, 60, 14, VOLT, 0.4)


@station('sg-station-do-xang')
def st_do_xang(p: P):
    # chai xăng lẻ on a stool-red crate + funnel
    p.box(34, 86, 60, 10, 10, STOOL)
    for bx, h in ((48, 46), (78, 40)):
        p.lathe(bx, 88, lambda t, h=h: 9 if t < 0.62 else (9 - (t - 0.62) / 0.38 * 6.2), GLASS, h)
        p.rect(bx - 8, 88 - h * 0.58, bx + 8, 87, '#e88a1a', 0.75, r=2)
        p.line([(bx - 5, 88 - h * 0.55), (bx - 5, 85)], 1.6, '#fff2c0', 0.5)
        p.blob(bx, 88 - h - 2, 3, 2.2, STOOL)
    # funnel above the left bottle
    p.poly([(36, 28), (60, 28), (51, 40), (45, 40)], STEEL, n=(-0.2, 0.3, 0.9), grad=0.3)
    p.ell(48, 28, 12, 3, '#3a3d42')
    p.tube((48, 40), (48, 46), 2, DSTEEL, r1=1.2)
    p.blob(68, 24, 2.4, 3.4, FUEL, flat=0.6)  # a drip


@station('sg-station-va-vo', inner='#0e2236', glow='#2a6a9a')
def st_va_vo(p: P):
    p.shadow(64, 96, 44, 10, 0.4)
    p.lathe(64, 98, lambda t: 34 + 8 * t, BASIN, 22, top_open=True)
    p.ell(64, 75, 37, 9, '#5aa8d8')
    p.ell(56, 73, 18, 3, '#bde4f8', 0.5, blur=2)
    p.ring(64, 72, 26, 9, 5.2, RUBBER, back_only=True)
    p.ell(64, 75, 37, 9, '#5aa8d8', 0.55)
    p.ring(64, 72, 26, 9, 5.2, RUBBER, front_only=True)
    for k, (bx, by, r) in enumerate(((84, 64, 3.4), (90, 56, 2.4), (86, 48, 1.8), (78, 58, 1.6))):
        p.ring(bx, by, r, r, 0.5, GLASS)
        p.ell(bx - r * 0.35, by - r * 0.35, r * 0.3, r * 0.3, '#ffffff', 0.8)


@station('sg-station-so-hui', inner='#141c2c', glow='#4a5a8a')
def st_so_hui(p: P):
    p.shadow(64, 96, 42, 8, 0.4)
    p.poly([(22, 92), (64, 98), (106, 92), (100, 44), (64, 50), (28, 44)], LEDGER, n=(0, 0.4, 0.9))
    p.poly([(28, 42), (62, 48), (62, 94), (26, 88)], PAPER, n=(0.3, 0.2, 1), grad=0.2)
    p.poly([(66, 48), (100, 42), (102, 88), (66, 94)], PAPER, n=(-0.3, 0.2, 1), grad=0.2)
    for k in range(6):
        y = 54 + k * 6.4
        p.line([(31, y - 1.2 + k * 0.1), (59, y + 3.6)], 0.8, '#7a8aa8', 0.8)
        p.line([(69, y + 3.6), (98, y - 1.2)], 0.8, '#7a8aa8', 0.8)
    for k in range(4):  # ticked names, no glyphs
        y = 58 + k * 6.4
        p.line([(34, y), (40, y + 2), (46, y - 3)], 1.2, '#2a8a4a')
        p.line([(72, y + 2.6), (88, y)], 1.6, '#3a2a2a', 0.7)
    p.line([(64, 50), (64, 96)], 1.4, '#3a2a1a', 0.5)
    p.tube((96, 24), (76, 76), 2.6, BLUEP)
    p.tube((76, 76), (73, 84), 2.6, STEEL, r1=0.6)


@station('sg-station-dem-tien', inner='#13241c', glow='#4a8a5a')
def st_dem_tien(p: P):
    p.shadow(64, 98, 42, 9, 0.4)
    stacks = [(30, 70, NOTE_B), (62, 72, NOTE_P), (40, 54, NOTE_G), (70, 52, NOTE_B), (52, 38, NOTE_G)]
    for x, y, mat in stacks:
        banknote(p, x, y, 34, 16, mat, depth=8)
    p.poly([(82, 92), (104, 84), (106, 88), (84, 96)], NOTE_P, n=(0, 0.3, 1))  # a loose note


@station('sg-station-xep-xe')
def st_xep_xe(p: P):
    # parking bay lines + scooter
    for x in (24, 104):
        p.line([(x, 96), (x - 4, 104)], 2.4, '#e8c23a', 0.8)
    p.line([(22, 99), (106, 99)], 2.4, '#e8c23a', 0.8)
    scooter(p, 94, 96, 1.12, helmet=True)


# ====================================================================== HUD icons (64)
@art('sg-ui-dong-ho', 64, 64)
def ui_dong_ho(p: P):
    """Plastic wall clock (red rim, white face), ticks, two hands."""
    p.shadow(33, 35, 28, 28, 0.35)
    p.blob(32, 32, 29, 29, STOOL, flat=0.4)
    p.ell(32, 32, 24, 24, '#f6f4ee')
    p.ell(32, 32, 24, 24, '#c8c4b8', 0.35, blur=6)
    for k in range(12):
        a = k / 12 * 2 * math.pi - math.pi / 2
        r0 = 18 if k % 3 else 15
        p.line([(32 + math.cos(a) * r0, 32 + math.sin(a) * r0), (32 + math.cos(a) * 22, 32 + math.sin(a) * 22)],
               2.2 if k % 3 == 0 else 1.0, '#2a2d33')
    p.line([(32, 32), (32 + 10 * math.cos(-2.3), 32 + 10 * math.sin(-2.3))], 2.8, '#1a1c20')
    p.line([(32, 32), (32 + 17 * math.cos(-0.9), 32 + 17 * math.sin(-0.9))], 1.8, '#1a1c20')
    p.line([(32, 32), (32 + 18 * math.cos(1.7), 32 + 18 * math.sin(1.7))], 0.9, '#d8342c')
    p.blob(32, 32, 2.4, 2.4, DSTEEL)
    p.ell(24, 20, 9, 4, '#ffffff', 0.35, blur=2)


@art('sg-ui-xe-crab', 64, 64)
def ui_xe_crab(p: P):
    scooter(p, 54, 54, 0.82, helmet=False)


@art('sg-ui-tuong-trinh', 64, 64)
def ui_tuong_trinh(p: P):
    """Bản tường trình: ruled statement sheet on a clipboard, with a green helmet leaning on it."""
    p.shadow(30, 58, 22, 4, 0.35)
    p.box(10, 8, 38, 48, 2, m('#8a5a2e', 0.2, 12, 0.45, 0.7, tex_noise(0.2, 2, 520)))
    p.rect(14, 12, 44, 54, '#f6f1e2', r=1)
    p.box(22, 5, 14, 5, 2, STEEL)
    for k in range(7):
        y = 20 + k * 4.6
        p.line([(17, y), (41 - (k == 6) * 12, y)], 0.9, '#7a8aa8', 0.9)
    p.line([(30, 48), (34, 45), (38, 49), (42, 46)], 1.2, '#1a2a5a')  # signature squiggle
    p.blob(48, 48, 13, 11, CRAB, flat=0.7)
    p.poly([(38, 47), (52, 47), (51, 52), (39, 53)], m('#1a2028', 0.9, 50, 0.4, 0.6))
    p.ell(44, 41, 5, 2.4, '#ffffff', 0.45, blur=1)


@art('sg-ui-may-mua', 64, 64)
def ui_may_mua(p: P):
    """Afternoon downpour: heavy cloud with slanted rain."""
    for k in range(9):
        x = 14 + k * 5
        p.line([(x, 38 + (k % 2) * 3), (x - 6, 58 + (k % 3) * 2)], 1.4, '#7ac0f0', 0.85)
    for cx, cy, r in ((20, 30, 11), (34, 22, 15), (48, 30, 11)):
        p.blob(cx, cy, r, r * 0.9, CLOUD, flat=0.6)
    p.blob(32, 34, 22, 7, CLOUD_D, flat=0.4)
    p.ell(30, 16, 8, 3, '#ffffff', 0.35, blur=2)


@art('sg-ui-ghim-dinh-vi', 64, 64)
def ui_ghim_dinh_vi(p: P):
    p.glow(32, 24, 22, '#ff6a4a', 0.25)
    pin(p, 32, 22, 15)


def build(names=None):
    stations = {}
    for name, (w, h, kind, fn) in REG.items():
        is_st = kind == 'station'
        if names and name not in names:
            if is_st and os.path.exists(src('stations', f'{name}.png')):
                stations[name] = Image.open(src('stations', f'{name}.png')).convert('RGBA')
            continue
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
        pack_atlas(stations, 'sg-stations-0', 'tools/paint/sg_minigames.py')


if __name__ == '__main__':
    build(set(sys.argv[1:]) or None)
