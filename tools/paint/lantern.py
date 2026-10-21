"""
Hand-held oil lamp (đèn dầu) every living player carries in the dark + its warm light pool.
  python3 tools/paint/lantern.py
Writes apps/web/public/assets/maps/common/characters/lantern.webp (+ lantern-glow.webp) and PNG sources in assets/maps/common/characters/.
Painted at 4x then downsampled; per-pixel shading like the other paint tools.
"""
import os
import sys

import numpy as np
from PIL import Image

sys.path.insert(0, os.path.dirname(__file__))
from lib import hexc, value_noise  # noqa: E402

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '../..'))
PUB = os.path.join(ROOT, 'apps/web/public/assets/maps/common/characters')
SRC = os.path.join(ROOT, 'assets/maps/common/characters')
os.makedirs(PUB, exist_ok=True)
os.makedirs(SRC, exist_ok=True)

K = 4  # supersample
W, H = 24 * K, 40 * K  # final 24x40; handle ring at top-centre = the hand grip
YY, XX = np.mgrid[0:H, 0:W].astype(np.float32)
CX = W / 2


def sstep(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0, 1)
    return t * t * (3 - 2 * t)


def ellipse(cx, cy, rx, ry, soft=1.2):
    d = np.sqrt(((XX - cx) / rx) ** 2 + ((YY - cy) / ry) ** 2)
    return 1 - sstep(1 - soft / max(rx, ry), 1, d)


def band(y0, y1, half_w):
    """vertical solid of revolution: |x-CX| <= half_w(y) between y0..y1 (half_w: array over YY)"""
    inside = (YY >= y0) & (YY <= y1)
    edge = 1 - sstep(half_w - 1.2, half_w + 0.6, np.abs(XX - CX))
    return np.where(inside, edge, 0).astype(np.float32)


rgb = np.zeros((H, W, 3), np.float32)
a = np.zeros((H, W), np.float32)


def put(mask, col, op=1.0):
    global rgb, a
    m = np.clip(mask * op, 0, 1)
    col = np.broadcast_to(np.asarray(col, np.float32), (H, W, 3)) if np.ndim(col) == 1 else col
    rgb = rgb * (1 - m[..., None]) + col * m[..., None]
    a = a + m * (1 - a)


def cyl_shade(base, half_w, light=0.55):
    """round-body shading: lit from the flame side (centre-left), dark rims"""
    u = np.clip((XX - CX) / np.maximum(half_w, 1), -1, 1)
    nz = np.sqrt(np.clip(1 - u * u, 0, 1))
    lam = np.clip(nz * 0.75 + (-u) * 0.25, 0, 1)
    spec = sstep(0.82, 0.98, nz * 0.6 + (-u + 0.35) * 0.5) * light
    col = np.asarray(base, np.float32)
    return np.clip(col * (0.35 + 0.8 * lam)[..., None] + spec[..., None] * np.array([1, 0.92, 0.7]), 0, 1)


brass, brass_dark, iron = hexc('#b7863a'), hexc('#5a3a16'), hexc('#2b1d14')
grain = value_noise(H, W, 6 * K, seed=7)

# --- wire bail: arc from the collar up to a small hand ring
bail_r_out, bail_r_in = 9.5 * K, 8.3 * K
d = np.sqrt((XX - CX) ** 2 + ((YY - 15 * K) * 1.15) ** 2)
bail = (sstep(bail_r_in - 1, bail_r_in, d) - sstep(bail_r_out, bail_r_out + 1, d)) * (YY < 15 * K) * (YY > 3 * K)
put(bail, iron)
hook = ellipse(CX, 3.2 * K, 2.4 * K, 2.4 * K) - ellipse(CX, 3.2 * K, 1.3 * K, 1.3 * K)
put(np.clip(hook, 0, 1), iron)

# --- top cap (perforated chimney cap)
hw_cap = np.full_like(YY, 3.2 * K) + (YY - 9 * K) * 0.35
put(band(8 * K, 12 * K, hw_cap), cyl_shade(brass, hw_cap))
for i in (-1.6, 0, 1.6):
    put(ellipse(CX + i * K, 10.2 * K, 0.45 * K, 0.6 * K), brass_dark * 0.5)
collar = ellipse(CX, 12.2 * K, 5.6 * K, 1.3 * K)
put(collar, cyl_shade(brass * 0.9, np.full_like(YY, 5.6 * K)))

# --- glass chimney (bulbous), warm interior glow
gy0, gy1 = 12.8 * K, 27 * K
t = np.clip((YY - gy0) / (gy1 - gy0), 0, 1)
hw_glass = (3.6 + 3.4 * np.clip(np.sin(np.pi * np.clip(t * 1.05, 0, 1)), 0, 1) ** 0.9) * K
glass = band(gy0, gy1, hw_glass)
# interior: hot core fading to amber at the glass rim
r_in = np.sqrt(((XX - CX) / (hw_glass + 1e-3)) ** 2 + ((YY - 21.5 * K) / (7 * K)) ** 2)
inner = np.stack([np.full_like(r_in, 1.0), 0.86 - 0.35 * r_in, 0.45 - 0.4 * r_in], -1)
put(glass, np.clip(inner, 0, 1), 0.92)
# rim tint + glass highlight streak (left)
rim = glass * sstep(0.6, 1.0, np.abs(XX - CX) / (hw_glass + 1e-3))
put(rim, hexc('#b8541a'), 0.55)
streak = glass * ellipse(CX - 3.4 * K, 19 * K, 0.8 * K, 4.2 * K)
put(streak, np.array([1, 0.98, 0.9]), 0.8)

# --- flame + wick
flame = ellipse(CX, 21.4 * K, 1.5 * K, 3.4 * K) * sstep(17.6 * K, 19.6 * K, YY + np.abs(XX - CX) * 0.9)
put(flame, np.array([1, 0.97, 0.78]))
core = ellipse(CX, 22.6 * K, 0.7 * K, 1.6 * K)
put(core, np.array([1, 1, 0.97]))
put(ellipse(CX, 24.8 * K, 1.0 * K, 0.6 * K), iron, 0.9)  # wick holder

# --- burner ring + oil font (squat brass reservoir)
put(ellipse(CX, 27.4 * K, 5.0 * K, 1.2 * K), cyl_shade(brass * 0.85, np.full_like(YY, 5 * K)))
fy0, fy1 = 28 * K, 36 * K
tf = np.clip((YY - fy0) / (fy1 - fy0), 0, 1)
hw_font = (4.2 + 3.6 * np.clip(np.sin(np.pi * (0.25 + 0.75 * tf)), 0, 1) ** 0.7) * K
font = band(fy0, fy1, hw_font)
fcol = cyl_shade(brass, hw_font) * (0.92 + 0.12 * grain)[..., None]
# oil level window: darker amber band
fcol = np.where(((YY > 31 * K) & (YY < 33 * K))[..., None], fcol * np.array([0.85, 0.6, 0.35]) + np.array([0.12, 0.05, 0]), fcol)
put(font, np.clip(fcol, 0, 1))
put(ellipse(CX, 36.4 * K, 6.4 * K, 1.4 * K), cyl_shade(brass_dark * 1.2, np.full_like(YY, 6.4 * K)))  # foot

# --- dark outline so it reads on any floor
from PIL import ImageFilter  # noqa: E402

alpha_img = Image.fromarray((np.clip(a, 0, 1) * 255).astype(np.uint8))
grown = np.asarray(alpha_img.filter(ImageFilter.MaxFilter(2 * K + 1)), np.float32) / 255
o = np.clip(grown - a, 0, 1) * 0.9
# rgb is premultiplied over black (put() blends from zero); slip the outline in behind
rgb = rgb + hexc('#1a0e08') * (o * (1 - a))[..., None]
a = a + o * (1 - a)

big = Image.fromarray((np.dstack([np.clip(rgb / np.maximum(a, 1e-4)[..., None], 0, 1), a]) * 255 + 0.5).astype(np.uint8))
lamp = big.resize((W // K * 2, H // K * 2), Image.LANCZOS)  # keep 2x for crisp zoom
lamp.save(os.path.join(SRC, 'lantern.png'), optimize=True)
lamp.save(os.path.join(PUB, 'lantern.webp'), 'WEBP', quality=92, method=6)
print('lantern', lamp.size)

# --- light pool: soft warm radial falloff (drawn additively in game)
S = 256
yy, xx = np.mgrid[0:S, 0:S].astype(np.float32)
r = np.sqrt((xx - S / 2) ** 2 + (yy - S / 2) ** 2) / (S / 2)
fall = np.clip(1 - r, 0, 1) ** 2.2
hot = np.clip(1 - r * 3.2, 0, 1) ** 2
col = np.stack([np.ones_like(r), 0.62 + 0.3 * hot, 0.28 + 0.5 * hot], -1)
glow = Image.fromarray((np.dstack([col, fall]) * 255 + 0.5).astype(np.uint8))
glow.save(os.path.join(SRC, 'lantern-glow.png'), optimize=True)
glow.save(os.path.join(PUB, 'lantern-glow.webp'), 'WEBP', quality=90, method=6)
print('lantern-glow', glow.size)
