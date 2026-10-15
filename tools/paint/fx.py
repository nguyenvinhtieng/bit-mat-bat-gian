"""
Painted FX sprite strips (8 frames x 256 px) + particle / overlay textures for kill, shield, report, witness.
  python3 tools/paint/fx.py
Writes apps/web/public/assets/common/ui/fx/<name>.webp (strips + singles) and PNG sources in assets/common/ui/fx/.
Everything is computed per pixel (glows, ink bristles, metal lattice) — no vector shapes.
"""
import math
import os
import sys

import numpy as np
from PIL import Image

sys.path.insert(0, os.path.dirname(__file__))
from lib import fbm, hexc, value_noise  # noqa: E402

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '../..'))
PUB = os.path.join(ROOT, 'apps/web/public/assets/common/ui/fx')
SRC = os.path.join(ROOT, 'assets/common/ui/fx')
os.makedirs(PUB, exist_ok=True)
os.makedirs(SRC, exist_ok=True)
N, S = 8, 256
YY, XX = np.mgrid[0:S, 0:S].astype(np.float32)
CX = CY = S / 2


def compose(layers):
    """layers: list of (rgb(3,), alpha(S,S)) added 'screen'-like -> RGBA"""
    rgb = np.zeros((S, S, 3), np.float32)
    a = np.zeros((S, S), np.float32)
    for col, al in layers:
        col = np.broadcast_to(np.asarray(col, np.float32), (S, S, 3)) if np.ndim(col) == 1 else col
        al = np.clip(al, 0, 1)
        rgb = rgb * (1 - al[..., None]) + col * al[..., None]
        a = a + al * (1 - a)
    return rgb, a


def add_glow(rgb, a, col, al):
    al = np.clip(al, 0, 1)
    rgb = np.clip(rgb + np.asarray(col) * al[..., None], 0, 1)
    a = np.clip(a + al * (1 - a) * 0.85, 0, 1)
    return rgb, a


def to_img(rgb, a):
    return Image.fromarray((np.dstack([np.clip(rgb, 0, 1), np.clip(a, 0, 1)]) * 255 + 0.5).astype(np.uint8), 'RGBA')


def strip(name, frames):
    im = Image.new('RGBA', (S * N, S))
    for i, f in enumerate(frames):
        im.alpha_composite(f, (i * S, 0))
    im.save(os.path.join(SRC, name + '.png'), optimize=True)
    im.save(os.path.join(PUB, name + '.webp'), 'WEBP', quality=90, method=6)
    print('fx', name)


def single(name, im):
    im.save(os.path.join(SRC, name + '.png'), optimize=True)
    im.save(os.path.join(PUB, name + '.webp'), 'WEBP', quality=90, method=6)
    print('fx', name, im.size)


BRISTLE = value_noise(S, S * 4, 1.5, 11)  # streaks sampled along stroke direction


# ---------------------------------------------------------------- kill: ink-blade crescent
def ink_arc(t, ox, oy, R, a0, a1, wmax=36):
    dx, dy = XX - ox, YY - oy
    r = np.sqrt(dx * dx + dy * dy)
    ang = np.arctan2(dy, dx)
    lo, hi = min(a0, a1), max(a0, a1)
    sweep = min(1.0, max(0.0, t) / 0.4)
    head = a0 + (a1 - a0) * sweep
    u = np.clip((ang - a0) / (a1 - a0), 0, 1)
    on = (ang >= min(a0, head)) & (ang <= max(a0, head)) & (t > 0)
    width = wmax * np.clip(np.sin(np.pi * u), 0, 1) ** 0.6 + 2
    d = np.abs(r - R)
    bri = BRISTLE[(YY.astype(int)) % S, ((u * 4 * S).astype(int)) % (S * 4)]
    age = np.clip(np.abs(head - ang) / 1.0, 0, 1)
    core = np.clip(1 - d / (width * 0.32 + 1e-3), 0, 1) * on * (1 - age)
    body = np.clip(1 - d / (width + 1e-3), 0, 1) * on * (0.6 + 0.55 * bri) * (1 - 0.4 * age)
    return body, core, (ox + math.cos(head) * R, oy + math.sin(head) * R), age


def kill_frame(t, rs):
    fade = 1.0 if t < 0.5 else max(0.0, 1 - (t - 0.5) / 0.45)
    b1, c1, h1, g1 = ink_arc(t * 1.2, 20.0, 250.0, 200.0, -1.62, -0.12)
    b2, c2, h2, g2 = ink_arc(t * 1.2 - 0.22, 236.0, 250.0, 200.0, -1.52, -3.02, 30)
    body = np.maximum(b1, b2) * fade
    core = np.maximum(c1, c2) * fade
    age = np.minimum(g1, g2)
    ink = hexc('#5a0805') * (1 - 0.3 * age)[..., None] + hexc('#c01d10') * (1 - age)[..., None] * 0.7
    rgb, a = compose([(ink, body), (hexc('#ff4a2e'), core), (hexc('#fff6e0'), core ** 2 * (t < 0.55))])
    for (hx, hy), tt0 in ((h1, 0.0), (h2, 0.18)):
        if tt0 < t < tt0 + 0.42:
            g = np.exp(-(((XX - hx) ** 2 + (YY - hy) ** 2) / (2 * 20 ** 2)))
            rgb, a = add_glow(rgb, a, hexc('#ffb080'), g * 0.9)
    # impact flash at centre
    if 0.25 < t < 0.7:
        k = 1 - abs(t - 0.4) / 0.3
        g = np.exp(-(((XX - CX) ** 2 + (YY - CY) ** 2) / (2 * (30 + 40 * t) ** 2)))
        rgb, a = add_glow(rgb, a, hexc('#ff6040'), g * k * 0.8)
        cross = (np.exp(-((XX - CX) ** 2) / 8) * np.exp(-((YY - CY) ** 2) / 2600) + np.exp(-((YY - CY) ** 2) / 8) * np.exp(-((XX - CX) ** 2) / 2600)) * k
        rgb, a = add_glow(rgb, a, hexc('#fff0d0'), cross)
    # ink droplets flung outward
    if t > 0.3:
        tt = (t - 0.3) / 0.7
        for k in range(26):
            ang0 = rs[k, 0] * 2 * math.pi
            sp = 40 + rs[k, 1] * 90
            px = CX + math.cos(ang0) * sp * tt
            py = CY + math.sin(ang0) * sp * tt + 60 * tt * tt
            rr = (2.0 + rs[k, 2] * 4.5) * (1 - 0.6 * tt)
            m = np.clip(rr - np.sqrt((XX - px) ** 2 + (YY - py) ** 2) + 0.8, 0, 1)
            rgb, a = compose_over(rgb, a, hexc('#8a0f08'), m * (1 - tt ** 2))
    # red mist
    if t > 0.35:
        tt = (t - 0.35) / 0.65
        mist = fbm(S, S, 20, 3, 19 + int(t * 10)) * np.exp(-(((XX - CX) ** 2 + (YY - CY) ** 2) / (2 * (40 + 50 * tt) ** 2)))
        rgb, a = compose_over(rgb, a, hexc('#7a0a06'), mist * 0.55 * (1 - tt))
    return to_img(rgb, a)


def compose_over(rgb, a, col, al):
    al = np.clip(al, 0, 1)
    rgb = rgb * (1 - al[..., None]) + np.asarray(col) * al[..., None]
    a = a + al * (1 - a)
    return rgb, a


# ---------------------------------------------------------------- shield: golden lattice dome
def shield_frame(t, rs):
    rgb = np.zeros((S, S, 3), np.float32)
    a = np.zeros((S, S), np.float32)
    dx, dy = XX - CX, YY - CY
    r = np.sqrt(dx * dx + dy * dy)
    grow = min(1.0, t / 0.28)
    R = 96 * (0.55 + 0.45 * (1 - (1 - grow) ** 3))
    fade = 1.0 if t < 0.6 else max(0.0, 1 - (t - 0.6) / 0.4)
    inside = np.clip(R - r, 0, 1)
    # hex lattice (bagua-like) on a sphere: warp coords by sphere bulge
    z = np.sqrt(np.clip(1 - (r / max(R, 1)) ** 2, 0, 1))
    u = dx / (0.6 + 0.4 * z) / 16
    v = dy / (0.6 + 0.4 * z) / 16
    q = (u * 2 / 3)
    rr_ = (-u / 3 + math.sqrt(3) / 3 * v)
    # hex distance
    cx_ = np.round(q)
    cy_ = np.round(rr_)
    fx, fy = q - cx_, rr_ - cy_
    hexd = np.maximum(np.abs(fx), np.maximum(np.abs(fy), np.abs(fx + fy)))
    lines = np.clip(1 - (0.5 - hexd) / 0.07, 0, 1)
    fres = (1 - z) ** 2  # rim brighter
    film = inside * (0.18 + 0.55 * fres) * fade
    rgb, a = compose_over(rgb, a, hexc('#ffcf5a'), film)
    rgb, a = add_glow(rgb, a, hexc('#fff0b0'), lines * inside * (0.35 + 0.65 * fres) * fade)
    # bright rim
    rim = np.exp(-((r - R) ** 2) / (2 * 3.5 ** 2)) * fade
    rgb, a = add_glow(rgb, a, hexc('#fff6d0'), rim)
    # impact flash at the block point (left side) + ripple
    if t < 0.55:
        k = 1 - t / 0.55
        px, py = CX - R * 0.8, CY - R * 0.2
        g = np.exp(-(((XX - px) ** 2 + (YY - py) ** 2) / (2 * 26 ** 2))) * k
        rgb, a = add_glow(rgb, a, hexc('#ffffff'), g)
        rip = np.exp(-((np.sqrt((XX - px) ** 2 + (YY - py) ** 2) - 120 * t) ** 2) / 30) * inside * k
        rgb, a = add_glow(rgb, a, hexc('#ffe28a'), rip)
    # outer shockwave ring
    ring_r = 60 + 150 * t
    ring = np.exp(-((r - ring_r) ** 2) / (2 * (3 + 6 * t) ** 2)) * (1 - t) * 0.8
    rgb, a = add_glow(rgb, a, hexc('#ffd36a'), ring)
    # golden sparks
    for k in range(20):
        ang0 = rs[k, 0] * 2 * math.pi
        sp = 60 + rs[k, 1] * 80
        d0 = R * 0.9 + sp * t
        px, py = CX + math.cos(ang0) * d0, CY + math.sin(ang0) * d0
        ln = 10 * (1 - t) + 2
        tx, ty = math.cos(ang0), math.sin(ang0)
        along = (XX - px) * tx + (YY - py) * ty
        perp = -(XX - px) * ty + (YY - py) * tx
        m = np.exp(-(perp ** 2) / 1.6) * np.clip(1 - np.abs(along) / ln, 0, 1) * (1 - t) * (t > 0.08)
        rgb, a = add_glow(rgb, a, hexc('#fff2b0'), m)
    return to_img(rgb, a)


# ---------------------------------------------------------------- report: alarm shockwave + "!"
def bang_mark(scale=1.0, cx=CX, cy=CY):
    """exclamation mark distance mask (symbol, not text)"""
    bar = np.clip(1 - np.maximum(np.abs(XX - cx) - 9 * scale * (1 - (YY - (cy - 52 * scale)) / (120 * scale)) , 0) / 1.5, 0, 1)
    bar = bar * ((YY > cy - 52 * scale) & (YY < cy + 18 * scale))
    dot = np.clip(10 * scale - np.sqrt((XX - cx) ** 2 + (YY - (cy + 38 * scale)) ** 2) + 0.8, 0, 1)
    return np.clip(bar + dot, 0, 1)


def report_frame(t, rs):
    rgb = np.zeros((S, S, 3), np.float32)
    a = np.zeros((S, S), np.float32)
    dx, dy = XX - CX, YY - CY
    r = np.sqrt(dx * dx + dy * dy)
    ang = np.arctan2(dy, dx)
    # speed lines
    rays = (np.abs(np.sin(ang * 14 + 0.6)) ** 30) * np.clip((r - 40) / 40, 0, 1) * np.clip(1 - (r - 60 - 70 * t) / 60, 0, 1) * (1 - t * 0.8)
    rgb, a = add_glow(rgb, a, hexc('#ffd36a'), rays * 0.9)
    for k, delay in enumerate((0.0, 0.18, 0.36)):
        tt = t - delay
        if tt <= 0:
            continue
        rr = 20 + 140 * tt
        ring = np.exp(-((r - rr) ** 2) / (2 * (4 + 5 * tt) ** 2)) * max(0, 1 - tt * 1.3)
        rgb, a = add_glow(rgb, a, hexc('#ff5a3a') if k % 2 == 0 else hexc('#ffc04a'), ring)
    # pulsing core
    g = np.exp(-(r ** 2) / (2 * (36 + 10 * math.sin(t * 12)) ** 2)) * 0.6
    rgb, a = add_glow(rgb, a, hexc('#ff3a20'), g)
    pop = min(1.0, t / 0.2)
    sc = 0.4 + 0.6 * (1 - (1 - pop) ** 3) + 0.08 * math.sin(t * 20) * (t > 0.2)
    m = bang_mark(sc)
    outline = np.clip(np.maximum.reduce([np.roll(np.roll(m, dy_, 0), dx_, 1) for dy_ in (-4, 0, 4) for dx_ in (-4, 0, 4)]) - m, 0, 1)
    rgb, a = compose_over(rgb, a, hexc('#3a0a04'), outline)
    grad = np.clip((YY - (CY - 52)) / 110, 0, 1)[..., None]
    col = hexc('#fff3b0') * (1 - grad) + hexc('#ffb02e') * grad
    rgb, a = compose_over(rgb, a, col, m)
    return to_img(rgb, a)


def witness_frame(t, rs):
    rgb = np.zeros((S, S, 3), np.float32)
    a = np.zeros((S, S), np.float32)
    r = np.sqrt((XX - CX) ** 2 + (YY - CY) ** 2)
    flash = np.exp(-(r ** 2) / (2 * (30 + 80 * t) ** 2)) * max(0, 1 - t * 1.6)
    rgb, a = add_glow(rgb, a, hexc('#ffffff'), flash)
    ang = np.arctan2(YY - CY, XX - CX)
    spikes = (np.abs(np.cos(ang * 6)) ** 40) * np.clip(1 - np.abs(r - 70 - 20 * t) / 30, 0, 1)
    rgb, a = add_glow(rgb, a, hexc('#ff5a3a'), spikes * (1 - t * 0.5))
    sc = 0.5 + 0.5 * min(1, t / 0.25)
    m = bang_mark(sc * 0.8)
    outline = np.clip(np.maximum.reduce([np.roll(np.roll(m, dy_, 0), dx_, 1) for dy_ in (-3, 0, 3) for dx_ in (-3, 0, 3)]) - m, 0, 1)
    rgb, a = compose_over(rgb, a, hexc('#3a0a04'), outline)
    rgb, a = compose_over(rgb, a, hexc('#ffe46a'), m)
    return to_img(rgb, a)


def main():
    rs = np.random.default_rng(4).random((40, 3))
    strip('fx-kill-slash', [kill_frame(i / (N - 1), rs) for i in range(N)])
    strip('fx-shield-block', [shield_frame(i / (N - 1), rs) for i in range(N)])
    strip('fx-report-burst', [report_frame(i / (N - 1), rs) for i in range(N)])
    strip('fx-witness', [witness_frame(i / (N - 1), rs) for i in range(N)])
    # --- singles
    # spark particle
    s = 64
    yy, xx = np.mgrid[0:s, 0:s].astype(np.float32)
    r = np.sqrt((xx - 32) ** 2 + (yy - 32) ** 2)
    g = np.exp(-(r ** 2) / (2 * 6 ** 2)) + 0.5 * np.exp(-(r ** 2) / (2 * 16 ** 2))
    single('spark', Image.fromarray((np.dstack([np.ones((s, s)), np.ones((s, s)) * 0.95, np.ones((s, s)) * 0.85, np.clip(g, 0, 1)]) * 255).astype(np.uint8), 'RGBA'))
    # ink drop particle
    rr = np.sqrt((xx - 32) ** 2 + ((yy - 32) * 1.1) ** 2)
    m = np.clip(18 - rr + fbm(s, s, 6, 2, 3) * 8 - 4, 0, 1)
    single('ink-drop', Image.fromarray((np.dstack([np.full((s, s), 0.5), np.full((s, s), 0.04), np.full((s, s), 0.03), m]) * 255).astype(np.uint8), 'RGBA'))
    # red ink splatter decal (stays under a body)
    s = 256
    yy, xx = np.mgrid[0:s, 0:s].astype(np.float32)
    r = np.sqrt((xx - 128) ** 2 + ((yy - 128) * 1.7) ** 2)
    ang = np.arctan2(yy - 128, xx - 128)
    edge = 52 + 18 * np.sin(ang * 7) + 12 * np.sin(ang * 13 + 1) + fbm(s, s, 12, 3, 8) * 30
    m = np.clip((edge - r) / 2, 0, 1)
    rs2 = np.random.default_rng(9)
    for _ in range(24):
        a0 = rs2.random() * 2 * math.pi
        d = 70 + rs2.random() * 50
        px, py = 128 + math.cos(a0) * d, 128 + math.sin(a0) * d / 1.7
        m = np.maximum(m, np.clip(3 + rs2.random() * 6 - np.sqrt((xx - px) ** 2 + ((yy - py) * 1.7) ** 2), 0, 1))
    shade_ = 0.55 + 0.45 * fbm(s, s, 8, 3, 10)
    col = np.dstack([0.42 * shade_, 0.03 * shade_, 0.02 * shade_])
    single('ink-splat', Image.fromarray((np.dstack([col, m * 0.85]) * 255).astype(np.uint8), 'RGBA'))
    # brush stroke banner for cinematic titles (black ink)
    w, h = 1024, 220
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    n = value_noise(h, w * 2, 2.0, 5)[:, ::2]
    top = 40 + 18 * np.sin(xx / w * math.pi * 1.3) + fbm(h, w, 40, 3, 6) * 20
    bot = 180 - 14 * np.sin(xx / w * math.pi * 1.1 + 0.4) - fbm(h, w, 40, 3, 7) * 20
    left = np.clip(xx / 60, 0, 1) ** 0.6
    right = np.clip((w - xx) / 140, 0, 1) * (0.6 + 0.4 * n)
    m = np.clip((yy - top) / 3, 0, 1) * np.clip((bot - yy) / 3, 0, 1) * left * np.clip(right * 1.6, 0, 1)
    m = m * (0.82 + 0.18 * (n > 0.25)) * (1 - 0.35 * (np.sin(yy * 0.9 + n * 3) > 0.92))
    single('brush-stroke', Image.fromarray((np.dstack([np.full((h, w), 0.06), np.full((h, w), 0.03), np.full((h, w), 0.02), np.clip(m, 0, 1) * 0.92]) * 255).astype(np.uint8), 'RGBA'))


if __name__ == '__main__':
    main()
