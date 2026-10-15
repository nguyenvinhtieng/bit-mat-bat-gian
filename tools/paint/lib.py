"""
Procedural raster painter for The Hidden Truth (Cố đô Huế).

No vector outlines: everything is shaded per pixel (diffuse + specular + ambient occlusion),
textured with fractal noise (wood grain, stone speckle, bronze patina, lacquer gloss) and
composited with soft shadows. Sprites are painted at SS x resolution and downsampled.

Light comes from the upper-left, slightly toward the viewer (top-down 3/4 view).
"""
from __future__ import annotations

import math
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from scipy import ndimage

RNG = np.random.default_rng(7)
LIGHT = np.array([-0.55, 0.62, 0.56])
LIGHT = LIGHT / np.linalg.norm(LIGHT)
VIEW = np.array([0.0, 0.25, 1.0])
VIEW = VIEW / np.linalg.norm(VIEW)
HALF = (LIGHT + VIEW) / np.linalg.norm(LIGHT + VIEW)


# ------------------------------------------------------------------ colour helpers
def hexc(h: str) -> np.ndarray:
    h = h.lstrip('#')
    return np.array([int(h[i:i + 2], 16) for i in (0, 2, 4)], dtype=np.float32) / 255.0


def mix(a, b, t):
    return a + (b - a) * t


def smooth(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0 + 1e-9), 0, 1)
    return t * t * (3 - 2 * t)


# ------------------------------------------------------------------ noise
def value_noise(h: int, w: int, cell: float, seed: int | None = None) -> np.ndarray:
    """Smooth value noise in [0,1] with feature size ~cell px (tileable not required)."""
    rng = np.random.default_rng(seed) if seed is not None else RNG
    gh, gw = int(math.ceil(h / cell)) + 3, int(math.ceil(w / cell)) + 3
    g = rng.random((gh, gw)).astype(np.float32)
    z = ndimage.zoom(g, cell, order=3, mode='wrap')
    return np.clip(z[:h, :w], 0, 1)


def fbm(h, w, cell=64, octaves=5, seed=None, gain=0.5):
    rng = np.random.default_rng(seed) if seed is not None else RNG
    out = np.zeros((h, w), np.float32)
    amp, tot = 1.0, 0.0
    c = cell
    for _ in range(octaves):
        out += amp * value_noise(h, w, max(1.0, c), int(rng.integers(1 << 30)))
        tot += amp
        amp *= gain
        c /= 2
    return out / tot


def tileable_fbm(h, w, cell=32, octaves=4, seed=None):
    """fbm that wraps on both axes (for repeating textures)."""
    rng = np.random.default_rng(seed)
    out = np.zeros((h, w), np.float32)
    amp, tot = 1.0, 0.0
    for o in range(octaves):
        c = max(2, int(round(cell / (2 ** o))))
        gh, gw = max(2, h // c), max(2, w // c)
        g = rng.random((gh, gw)).astype(np.float32)
        z = ndimage.zoom(np.pad(g, 3, mode='wrap'), (h / gh, w / gw), order=3)
        oy, ox = int(3 * h / gh), int(3 * w / gw)
        out += amp * z[oy:oy + h, ox:ox + w]
        tot += amp
        amp *= 0.5
    return np.clip(out / tot, 0, 1)


# ------------------------------------------------------------------ layer canvas
class Layer:
    """Premultiplied-free RGBA float canvas."""

    def __init__(self, w, h):
        self.w, self.h = w, h
        self.rgb = np.zeros((h, w, 3), np.float32)
        self.a = np.zeros((h, w), np.float32)

    def over(self, rgb, alpha, x0=0, y0=0):
        """Composite rgb (h,w,3) with alpha (h,w) at offset."""
        h, w = alpha.shape
        xa, ya = max(0, x0), max(0, y0)
        xb, yb = min(self.w, x0 + w), min(self.h, y0 + h)
        if xa >= xb or ya >= yb:
            return
        sa = alpha[ya - y0:yb - y0, xa - x0:xb - x0]
        sr = rgb[ya - y0:yb - y0, xa - x0:xb - x0] if rgb.ndim == 3 else np.broadcast_to(rgb, (yb - ya, xb - xa, 3))
        da = self.a[ya:yb, xa:xb]
        out_a = sa + da * (1 - sa)
        num = sr * sa[..., None] + self.rgb[ya:yb, xa:xb] * (da * (1 - sa))[..., None]
        self.rgb[ya:yb, xa:xb] = np.where(out_a[..., None] > 1e-6, num / np.maximum(out_a, 1e-6)[..., None], 0)
        self.a[ya:yb, xa:xb] = out_a

    def fill(self, mask, color):
        col = color if isinstance(color, np.ndarray) and color.ndim == 3 else np.broadcast_to(np.asarray(color, np.float32), (self.h, self.w, 3))
        self.over(col, mask)

    def image(self, size=None) -> Image.Image:
        arr = np.dstack([np.clip(self.rgb, 0, 1), np.clip(self.a, 0, 1)])
        im = Image.fromarray((arr * 255 + 0.5).astype(np.uint8), 'RGBA')
        if size:
            # premultiply for correct downsampling
            pm = arr.copy()
            pm[..., :3] *= pm[..., 3:4]
            im = Image.fromarray((pm * 255 + 0.5).astype(np.uint8), 'RGBA').resize(size, Image.LANCZOS)
            a = np.asarray(im).astype(np.float32) / 255
            rgb = np.where(a[..., 3:4] > 1e-4, a[..., :3] / np.maximum(a[..., 3:4], 1e-4), 0)
            im = Image.fromarray((np.dstack([np.clip(rgb, 0, 1), a[..., 3]]) * 255 + 0.5).astype(np.uint8), 'RGBA')
        return im


# ------------------------------------------------------------------ masks
def poly_mask(w, h, pts, blur=0.0):
    im = Image.new('L', (w, h), 0)
    ImageDraw.Draw(im).polygon([(float(x), float(y)) for x, y in pts], fill=255)
    if blur:
        im = im.filter(ImageFilter.GaussianBlur(blur))
    return np.asarray(im).astype(np.float32) / 255


def ellipse_mask(w, h, cx, cy, rx, ry, blur=0.0):
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    d = ((xx + 0.5 - cx) / max(rx, 1e-3)) ** 2 + ((yy + 0.5 - cy) / max(ry, 1e-3)) ** 2
    if blur:
        r = 1.0 / max(1.0, min(rx, ry)) * blur
        return np.clip((1 + r - np.sqrt(d)) / (2 * r), 0, 1)
    edge = 1.0 / max(1.0, min(rx, ry))
    return np.clip((1 - np.sqrt(d)) / edge + 0.5, 0, 1)


def rect_mask(w, h, x0, y0, x1, y1, r=0.0):
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32) + 0.5
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    hx, hy = (x1 - x0) / 2, (y1 - y0) / 2
    qx = np.abs(xx - cx) - hx + r
    qy = np.abs(yy - cy) - hy + r
    d = np.sqrt(np.maximum(qx, 0) ** 2 + np.maximum(qy, 0) ** 2) + np.minimum(np.maximum(qx, qy), 0) - r
    return np.clip(0.5 - d, 0, 1)


def line_mask(w, h, pts, width, blur=0.0):
    im = Image.new('L', (w, h), 0)
    ImageDraw.Draw(im).line([(float(x), float(y)) for x, y in pts], fill=255, width=max(1, int(round(width))), joint='curve')
    if blur:
        im = im.filter(ImageFilter.GaussianBlur(blur))
    return np.asarray(im).astype(np.float32) / 255


def blur(a, s):
    if s <= 0:
        return a
    return ndimage.gaussian_filter(a, s)


# ------------------------------------------------------------------ materials
class Mat:
    """Surface description. tex(h,w,u,v) -> rgb or None."""

    def __init__(self, base, shine=0.0, rough=24.0, amb=0.42, diff=0.75, tex=None, spec_col=None, dark=None):
        self.base = hexc(base) if isinstance(base, str) else np.asarray(base, np.float32)
        self.shine = shine
        self.rough = rough
        self.amb = amb
        self.diff = diff
        self.tex = tex
        self.spec_col = hexc(spec_col) if isinstance(spec_col, str) else (np.ones(3, np.float32) if spec_col is None else spec_col)
        self.dark = hexc(dark) if isinstance(dark, str) else dark


_TEXCACHE: dict = {}


def sample_tex(mat: 'Mat', u, v):
    """Texture is generated once per material (TEX x TEX) and sampled in uv space -> no per-call noise seams."""
    T = getattr(mat, '_texmap', None)  # cached on the object (id() reuse would hand out stale textures)
    if T is None:
        T = mat.tex(TEX, TEX, None, None, np.broadcast_to(mat.base, (TEX, TEX, 3)).copy()).astype(np.float32)
        mat._texmap = T
    uu = np.clip(np.asarray(u, np.float32), 0, 1) * (TEX - 1)
    vv = np.clip(1 - np.asarray(v, np.float32), 0, 1) * (TEX - 1)
    out = np.empty(uu.shape + (3,), np.float32)
    for c in range(3):
        out[..., c] = ndimage.map_coordinates(T[..., c], [vv, uu], order=1, mode='nearest')
    return out


TEX = 384


def shade(mat: Mat, nx, ny, nz, u=None, v=None, ao=None):
    """nx,ny,nz normals (ny up). returns rgb. u,v in [0,1] select the texture point."""
    h, w = nx.shape
    if mat.tex is not None and u is not None and v is not None:
        base = sample_tex(mat, np.broadcast_to(u, (h, w)), np.broadcast_to(v, (h, w)))
    else:
        base = np.broadcast_to(mat.base, (h, w, 3)).copy()
    d = np.clip(nx * LIGHT[0] + ny * LIGHT[1] + nz * LIGHT[2], 0, 1)
    s = np.clip(nx * HALF[0] + ny * HALF[1] + nz * HALF[2], 0, 1) ** mat.rough
    lit = mat.amb + mat.diff * d
    if mat.dark is not None:
        col = mix(np.broadcast_to(mat.dark, (h, w, 3)) * 0.0 + mat.dark, base, np.clip(lit, 0, 1)[..., None]) * (0.55 + 0.6 * np.clip(lit, 0, 1.2))[..., None]
    else:
        col = base * lit[..., None]
    col = col + mat.shine * s[..., None] * mat.spec_col
    if ao is not None:
        col = col * ao[..., None]
    return col


# --- textures
def tex_wood(scale=1.0, ring=0.5, seed=1, vertical=True, contrast=0.35, dark='#3a1d0c'):
    dk = hexc(dark)

    def f(h, w, u, v, base):
        n = fbm(h, w, 24 * scale, 4, seed)
        yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
        a = xx if vertical else yy
        b = yy if vertical else xx
        g = np.sin((a / (5.5 * scale)) + n * 9 + np.sin(b / (40 * scale)) * ring * 2) * 0.5 + 0.5
        g = g ** 2.2
        fine = value_noise(h, w, 1.5 * scale, seed + 3)
        t = np.clip(g * contrast + (fine - 0.5) * 0.12, 0, 1)
        return mix(base, base * 0.5 + dk * 0.5, t[..., None])

    return f


def tex_noise(amount=0.12, cell=6, seed=2, tint=None):
    tc = hexc(tint) if tint else None

    def f(h, w, u, v, base):
        n = fbm(h, w, cell, 3, seed) - 0.5
        out = base * (1 + n[..., None] * amount * 2)
        if tc is not None:
            m = smooth(0.55, 0.8, fbm(h, w, cell * 3, 3, seed + 9))
            out = mix(out, tc, m[..., None] * 0.6)
        return out

    return f


def tex_patina(seed=3):
    """Bronze: warm metal + green verdigris in noisy blotches."""
    verd = hexc('#4f8f78')

    def f(h, w, u, v, base):
        n = fbm(h, w, 10, 4, seed)
        m = smooth(0.58, 0.75, n)
        speck = value_noise(h, w, 1.2, seed + 1)
        out = base * (0.85 + 0.3 * speck[..., None])
        return mix(out, verd, m[..., None] * 0.55)

    return f


def tex_stone(seed=4, cell=5, amount=0.2):
    def f(h, w, u, v, base):
        n = fbm(h, w, cell, 4, seed)
        sp = (value_noise(h, w, 1.0, seed + 2) > 0.82).astype(np.float32) * 0.08
        return base * (1 + (n[..., None] - 0.5) * amount * 2) - sp[..., None]

    return f


def tex_lacquer(seed=5):
    def f(h, w, u, v, base):
        n = fbm(h, w, 30, 3, seed) - 0.5
        return base * (1 + n[..., None] * 0.12)

    return f


def tex_gold(seed=6):
    def f(h, w, u, v, base):
        n = fbm(h, w, 4, 3, seed) - 0.5
        return base * (1 + n[..., None] * 0.25)

    return f


# Material library (Huế palette)
M = {
    'lacquer': Mat('#9e1f17', shine=0.55, rough=40, amb=0.35, diff=0.8, tex=tex_lacquer()),
    'lacquer_dark': Mat('#6a130e', shine=0.45, rough=36, amb=0.35, diff=0.8, tex=tex_lacquer(8)),
    'gold': Mat('#d9a53a', shine=0.9, rough=18, amb=0.38, diff=0.85, tex=tex_gold(), spec_col='#fff1c0'),
    'bronze': Mat('#8a5a2b', shine=0.55, rough=22, amb=0.36, diff=0.85, tex=tex_patina(), spec_col='#ffd9a0'),
    'bronze_dark': Mat('#5b3a1c', shine=0.4, rough=20, amb=0.36, diff=0.8, tex=tex_patina(11)),
    'wood': Mat('#8a5228', shine=0.12, rough=12, amb=0.42, diff=0.7, tex=tex_wood()),
    'darkwood': Mat('#4f2c16', shine=0.18, rough=16, amb=0.42, diff=0.7, tex=tex_wood(seed=4, dark='#1e0d05')),
    'stone': Mat('#a9a196', shine=0.05, rough=8, amb=0.45, diff=0.65, tex=tex_stone()),
    'stone_dark': Mat('#6f6a62', shine=0.05, rough=8, amb=0.45, diff=0.65, tex=tex_stone(9)),
    'paper': Mat('#efe2c2', shine=0.03, rough=6, amb=0.55, diff=0.5, tex=tex_noise(0.06, 3, 12)),
    'porcelain': Mat('#f1f3f6', shine=0.7, rough=50, amb=0.5, diff=0.55, spec_col='#ffffff'),
    'jade': Mat('#3f8f6e', shine=0.5, rough=40, amb=0.4, diff=0.7, tex=tex_noise(0.15, 8, 13)),
    'silk_red': Mat('#c3301f', shine=0.15, rough=8, amb=0.45, diff=0.7, tex=tex_noise(0.08, 2, 14)),
    'silk_yellow': Mat('#e8b52e', shine=0.15, rough=8, amb=0.45, diff=0.7, tex=tex_noise(0.08, 2, 15)),
    'leaf': Mat('#3d6b2e', shine=0.2, rough=14, amb=0.4, diff=0.75, tex=tex_noise(0.25, 3, 16, '#6a8f3a')),
    'skin': Mat('#e9d7b3', shine=0.1, rough=8, amb=0.5, diff=0.6),
    'iron': Mat('#3b3b3e', shine=0.5, rough=30, amb=0.35, diff=0.7, tex=tex_noise(0.15, 2, 17)),
    'soil': Mat('#4a3020', shine=0.0, rough=4, amb=0.45, diff=0.6, tex=tex_noise(0.3, 2, 18)),
}


# ------------------------------------------------------------------ solids
def lathe(L: Layer, cx, y_bottom, profile, mat: Mat, height, top_open=False, cap_mat=None, ry_ratio=0.32, deco=None, ao_strength=0.35):
    """Surface of revolution in 3/4 view.
    profile(t) -> radius px, t in [0,1] (0 = bottom, 1 = top). `height` px on screen.
    deco(theta, t) -> (rgb or None, alpha) optional painted pattern on the surface.
    """
    H = int(height)
    ts = np.linspace(0, 1, max(H * 2, 2))
    rs = np.array([profile(t) for t in ts], np.float32)
    rmax = float(rs.max())
    w = int(math.ceil(rmax * 2 + 6))
    ry_max = rmax * ry_ratio
    hh = int(math.ceil(H + ry_max * 2 + 6))
    x0 = int(round(cx - w / 2))
    top_y = y_bottom - H - ry_max - 3
    yy, xx = np.mgrid[0:hh, 0:w].astype(np.float32)
    X = xx + 0.5 - w / 2
    rgb = np.zeros((hh, w, 3), np.float32)
    alpha = np.zeros((hh, w), np.float32)
    # draw slices bottom -> top (front half visible); later slices overwrite (painter's order from back)
    drdt = np.gradient(rs, ts)
    for i in range(len(ts)):
        t = ts[i]
        r = rs[i]
        if r <= 0.3:
            continue
        sy = (y_bottom - top_y) - t * H  # screen y of slice centre (relative to layer)
        ry = r * ry_ratio
        # front arc only: y = sy + ry * sin(phi), x = r cos(phi) for phi in [0, pi]
        row0 = int(math.floor(sy - 1))
        row1 = int(math.ceil(sy + ry + 1))
        row0 = max(row0, 0)
        row1 = min(row1, hh - 1)
        if row1 < row0:
            continue
        sl = slice(row0, row1 + 1)
        Xs = X[sl]
        Ys = yy[sl] + 0.5
        inside = np.abs(Xs) <= r
        cosphi = np.clip(Xs / max(r, 1e-3), -1, 1)
        sinphi = np.sqrt(1 - cosphi ** 2)
        ytarget = sy + ry * sinphi
        band = np.clip(1.4 - np.abs(Ys - ytarget), 0, 1) * inside
        edge = np.clip((r - np.abs(Xs)) * 1.2, 0, 1)
        band = band * edge
        if band.max() <= 0:
            continue
        nx = cosphi
        nz = sinphi
        ny = np.full_like(nx, float(np.clip(-drdt[i] / max(H, 1), -3, 3)))
        nrm = np.sqrt(nx ** 2 + ny ** 2 + nz ** 2) + 1e-6
        u = (np.arccos(cosphi) / math.pi)
        col = shade(mat, nx / nrm, ny / nrm, nz / nrm, u, np.full_like(u, t))
        if deco is not None:
            dc, da = deco(u, t)
            if dc is not None:
                col = mix(col, dc * (0.6 + 0.5 * np.clip((nx * LIGHT[0] + nz * LIGHT[2]) / nrm + 0.4, 0, 1))[..., None], (da * 1.0)[..., None] if np.ndim(da) else da)
        a = band
        alpha_sl = alpha[sl]
        rgb[sl] = rgb[sl] * (1 - a[..., None]) + col * a[..., None]
        alpha[sl] = alpha_sl + a * (1 - alpha_sl)
    # fill holes between slices (vertical gaps) via max filter on alpha
    alpha = np.clip(alpha, 0, 1)
    # top cap
    rtop = float(rs[-1])
    if rtop > 0.5:
        sy = (y_bottom - top_y) - H
        m = ellipse_mask(w, hh, w / 2, sy, rtop, rtop * ry_ratio)
        cm = cap_mat or mat
        if top_open:
            inner = ellipse_mask(w, hh, w / 2, sy + rtop * ry_ratio * 0.12, rtop * 0.86, rtop * ry_ratio * 0.8)
            capc = shade(cm, np.zeros_like(X), np.ones_like(X) * 0.9, np.ones_like(X) * 0.3)
            rgb = rgb * (1 - m[..., None]) + capc * m[..., None]
            inn = cm.base * 0.25
            rgb = rgb * (1 - inner[..., None]) + inn * inner[..., None]
        else:
            capc = shade(cm, (X / max(rtop, 1)) * 0.4, np.ones_like(X) * 0.9, np.ones_like(X) * 0.4)
            rgb = rgb * (1 - m[..., None]) + capc * m[..., None]
        alpha = np.maximum(alpha, m)
    L.over(rgb, alpha, x0, int(round(top_y)))
    return (x0, int(round(top_y)), w, hh)


def box(L: Layer, x, y, w, h, depth, mat: Mat, top_mat=None, side_dark=0.72, bevel=2.0, front_tex_v=True):
    """Axis-aligned box in 3/4 view: (x,y) = top-left of the TOP face; depth = front face height."""
    W, Hh = int(math.ceil(w)), int(math.ceil(h + depth))
    yy, xx = np.mgrid[0:Hh, 0:W].astype(np.float32)
    top = rect_mask(W, Hh, 0, 0, w, h, r=bevel)
    front = rect_mask(W, Hh, 0, h - bevel, w, h + depth, r=bevel) * (1 - top * 0.999)
    tm = top_mat or mat
    nx = np.zeros_like(xx)
    # top face normal mostly up, slight bevel lighting near edges
    ex = np.clip(1 - xx / 4, 0, 1) - np.clip(1 - (w - xx) / 4, 0, 1)
    ey = np.clip(1 - yy / 4, 0, 1)
    ct = shade(tm, -ex * 0.5, np.ones_like(xx) * 0.85 + ey * 0.2, 0.45 + ey * 0.3, xx / w, yy / max(h, 1))
    fy = (yy - h) / max(depth, 1)
    ao = 1 - 0.25 * smooth(0.6, 1.0, fy)
    cf = shade(mat, -ex * 0.4, np.full_like(xx, -0.05) + 0.25 * (1 - fy), np.ones_like(xx), xx / w, fy, ao)
    # top front edge highlight
    hl = np.clip(1 - np.abs(yy - h) / 1.5, 0, 1) * 0.25
    rgb = ct * top[..., None] + cf * front[..., None]
    rgb = rgb + hl[..., None]
    alpha = np.clip(top + front, 0, 1)
    L.over(rgb, alpha, int(round(x)), int(round(y)))


def cylinder(L, cx, y_bottom, r, height, mat, cap_mat=None, ry_ratio=0.32):
    return lathe(L, cx, y_bottom, lambda t: r, mat, height, cap_mat=cap_mat, ry_ratio=ry_ratio)


def shadow_ellipse(L: Layer, cx, cy, rx, ry, opacity=0.38, soft=0.6):
    m = ellipse_mask(L.w, L.h, cx, cy, rx, ry, blur=max(1.0, min(rx, ry) * soft))
    L.over(np.zeros((L.h, L.w, 3), np.float32), m * opacity)


def drop_shadow(L: Layer, dx, dy, s, opacity=0.45):
    """Soft shadow of the whole layer content, placed behind it."""
    a = blur(np.roll(np.roll(L.a, int(dy), 0), int(dx), 1), s) * opacity
    new_a = L.a + a * (1 - L.a)
    rgb = np.where(new_a[..., None] > 1e-6, (L.rgb * L.a[..., None]) / np.maximum(new_a, 1e-6)[..., None], 0)
    L.rgb, L.a = rgb, new_a


def paint(L: Layer, mask, color_or_rgb, opacity=1.0):
    c = color_or_rgb
    if isinstance(c, str):
        c = hexc(c)
    rgb = np.broadcast_to(np.asarray(c, np.float32), (L.h, L.w, 3)) if np.ndim(c) == 1 else c
    L.over(rgb, mask * opacity)


def flat_shaded(L: Layer, mask, mat: Mat, nx=-0.2, ny=0.3, nz=0.9, grad_y=0.25, x0=0, y0=0):
    """Fill a mask with a material using a fixed normal + vertical gradient (for flat panels)."""
    h, w = mask.shape
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    g = 1 - grad_y * (yy / max(h, 1))
    col = shade(mat, np.full_like(xx, nx), np.full_like(xx, ny), np.full_like(xx, nz), xx / w, yy / h) * g[..., None]
    L.over(col, mask, x0, y0)


def glow(L: Layer, cx, cy, r, color, strength=0.6):
    m = ellipse_mask(L.w, L.h, cx, cy, r, r, blur=r * 0.9) * strength
    c = hexc(color) if isinstance(color, str) else color
    # additive-ish: blend toward colour
    L.rgb = L.rgb + c * m[..., None] * (L.a[..., None] * 0.6 + 0.4)
    L.a = np.maximum(L.a, m * 0.0)


def to_webp(im: Image.Image, path, q=88):
    im.save(path, 'WEBP', quality=q, method=6)


# ------------------------------------------------------------------ more primitives
def blob(L: Layer, cx, cy, rx, ry, mat: Mat, flat=1.0, alpha=1.0):
    """Shaded ellipsoid (sphere-like normals) — knobs, heads, leaves, cushions, fruit."""
    x0, y0 = int(cx - rx - 2), int(cy - ry - 2)
    w, h = int(rx * 2 + 5), int(ry * 2 + 5)
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    dx = (xx + x0 + 0.5 - cx) / max(rx, 0.5)
    dy = (yy + y0 + 0.5 - cy) / max(ry, 0.5)
    d2 = dx * dx + dy * dy
    m = np.clip((1 - np.sqrt(d2)) * min(rx, ry) + 0.5, 0, 1)
    nz = np.sqrt(np.clip(1 - d2, 0, 1)) * flat
    nrm = np.sqrt(dx * dx + dy * dy + nz * nz) + 1e-6
    col = shade(mat, dx / nrm, -dy / nrm, nz / nrm, (dx + 1) / 2, 1 - (dy + 1) / 2)
    L.over(col, m * alpha, x0, y0)


def tube(L: Layer, p0, p1, r0, mat: Mat, r1=None, alpha=1.0, caps=True):
    """Shaded cylinder/cone between two screen points (legs, poles, branches, necks, tubes)."""
    r1 = r0 if r1 is None else r1
    (ax, ay), (bx, by) = p0, p1
    R = max(r0, r1)
    x0, y0 = int(min(ax, bx) - R - 2), int(min(ay, by) - R - 2)
    w, h = int(abs(bx - ax) + 2 * R + 5), int(abs(by - ay) + 2 * R + 5)
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    px, py = xx + x0 + 0.5, yy + y0 + 0.5
    vx, vy = bx - ax, by - ay
    ln2 = vx * vx + vy * vy + 1e-6
    t = np.clip(((px - ax) * vx + (py - ay) * vy) / ln2, 0, 1)
    qx, qy = ax + vx * t, ay + vy * t
    rr = r0 + (r1 - r0) * t
    ln = math.sqrt(ln2)
    # signed perpendicular distance
    s = ((px - qx) * (-vy) + (py - qy) * vx) / ln
    d = np.sqrt((px - qx) ** 2 + (py - qy) ** 2)
    m = np.clip(rr - d + 0.5, 0, 1)
    if not caps:
        tt = ((px - ax) * vx + (py - ay) * vy) / ln2
        m = m * ((tt >= 0) & (tt <= 1))
    k = np.clip(s / np.maximum(rr, 0.5), -1, 1)
    nzv = np.sqrt(np.clip(1 - k * k, 0, 1))
    # perpendicular screen direction (-vy, vx)/ln ; ny is screen-up so flip y
    nx = k * (-vy / ln)
    ny = -k * (vx / ln)
    col = shade(mat, nx, ny, nzv, (k + 1) / 2, t)
    L.over(col, m * alpha, x0, y0)


def ring(L: Layer, cx, cy, rx, ry, thick, mat: Mat, rot=0.0, front_only=False, back_only=False, n=160):
    """Ellipse ring made of short tubes (armillary rings, handles, hoops)."""
    pts = []
    for i in range(n + 1):
        a = i / n * 2 * math.pi
        x, y = rx * math.cos(a), ry * math.sin(a)
        xr = x * math.cos(rot) - y * math.sin(rot)
        yr = x * math.sin(rot) + y * math.cos(rot)
        pts.append((cx + xr, cy + yr, math.sin(a)))
    for i in range(n):
        (x0, y0, f0), (x1, y1, f1) = pts[i], pts[i + 1]
        front = (f0 + f1) / 2 >= 0
        if front_only and not front:
            continue
        if back_only and front:
            continue
        tube(L, (x0, y0), (x1, y1), thick, mat)


def polyshade(L: Layer, pts, mat: Mat, n=(-0.2, 0.3, 0.9), grad=0.2, alpha=1.0, blur_px=0.0):
    w, h = L.w, L.h
    xs = [p[0] for p in pts]
    ys = [p[1] for p in pts]
    x0, y0 = max(0, int(min(xs)) - 2), max(0, int(min(ys)) - 2)
    x1, y1 = min(w, int(max(xs)) + 3), min(h, int(max(ys)) + 3)
    if x1 <= x0 or y1 <= y0:
        return
    m = poly_mask(x1 - x0, y1 - y0, [(x - x0, y - y0) for x, y in pts], blur=blur_px)
    yy, xx = np.mgrid[0:y1 - y0, 0:x1 - x0].astype(np.float32)
    g = 1 - grad * (yy / max(1, y1 - y0))
    nn = np.array(n, np.float32)
    nn = nn / np.linalg.norm(nn)
    col = shade(mat, np.full_like(xx, nn[0]), np.full_like(xx, nn[1]), np.full_like(xx, nn[2]), xx / max(1, x1 - x0), 1 - yy / max(1, y1 - y0)) * g[..., None]
    L.over(col, m * alpha, x0, y0)


def smoke(L: Layer, x, y, height, seed=1, alpha=0.35, width=3.0):
    rs = np.random.default_rng(seed)
    for k in range(3):
        pts = []
        ph = rs.random() * 6
        for i in range(40):
            t = i / 39
            pts.append((x + math.sin(t * 7 + ph) * (4 + 14 * t) + k * 3, y - t * height))
        m = line_mask(L.w, L.h, pts, width * (1 + k * 0.4), blur=width * 1.2)
        fade = np.clip((YYc(L) - (y - height)) / height, 0, 1)
        L.over(np.broadcast_to(hexc('#e8e4dc'), (L.h, L.w, 3)), m * alpha * fade * 0.8)


def YYc(L):
    return np.mgrid[0:L.h, 0:L.w][0].astype(np.float32)
