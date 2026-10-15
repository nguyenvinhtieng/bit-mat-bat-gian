"""
Thăng Long meta art: map preview, map icon, task cards, home background (no moon — đêm giao thừa).
  python3 tools/paint/tl_meta.py            (run tl_floor.py + tl_props.py first)
Writes apps/web/public/assets/maps/thang-long/meta/{tl-map-preview,tl-map-icon,home-bg,thumb}.webp,
       apps/web/public/assets/maps/thang-long/cards/tl-card-<taskId>.webp  (+ PNG sources under assets/maps/thang-long)
"""
from __future__ import annotations

import math
import os
import sys

import numpy as np
from PIL import Image, ImageFilter

sys.path.insert(0, os.path.dirname(__file__))
import lib  # noqa: E402
from lib import hexc  # noqa: E402
from props import GOLD, P  # noqa: E402
import tl_props as TP  # noqa: E402
from tl_common import layout, pub, src  # noqa: E402

CW, CH = 640, 400


def to_im(rgb, mode='RGB'):
    return Image.fromarray((np.clip(rgb, 0, 1) * 255 + 0.5).astype(np.uint8), mode)


def save(im, *p, q=86):
    im.save(src(*p[:-1], p[-1] + '.png'), optimize=True)
    im.save(pub(*p[:-1], p[-1] + '.webp'), 'WEBP', quality=q, method=6)
    print('wrote', '/'.join(p), im.size)


def render(key, k=2):
    w, h, fn = TP.REG[key]
    p = P(w, h)
    fn(p)
    return p.L.image((w * k, h * k))


# ====================================================================== preview + icon
def preview():
    lay = layout()
    base = Image.open(src('tileset', 'tl-floor-bake.png')).convert('RGBA')
    for pr in sorted(lay['props'], key=lambda p: (not p.get('wall'), p['y'])):
        f = src('props', pr['key'] + '.png')
        if os.path.exists(f):
            im = Image.open(f).convert('RGBA')
            base.alpha_composite(im, (int(pr['x'] - im.width / 2), int(pr['y'] - im.height)))
    out = base.resize((base.width // 2, base.height // 2), Image.LANCZOS).convert('RGB')
    save(out, 'meta', 'tl-map-preview')
    return out


def icon():
    """Tháp Rùa on the dark lake inside a red-gold roundel."""
    p = P(128, 128)
    p.blob(64, 64, 62, 62, GOLD, flat=0.35)
    p.ell(64, 64, 55, 55, '#0b1530')
    p.ell(64, 52, 50, 34, '#1a2850', 0.6, blur=12)
    TP.water_patch(p, 64, 98, 52, 18, 9)
    q = render('tl-decor-thap-rua', 1).resize((84, 84), Image.LANCZOS)
    im = p.image()
    im.alpha_composite(q, (22, 28))
    yy, xx = np.mgrid[0:128, 0:128]
    a = np.asarray(im).copy()
    a[..., 3] = (a[..., 3] * (((xx - 64) ** 2 + (yy - 64) ** 2) < 62 ** 2)).astype(np.uint8)
    out = Image.fromarray(a, 'RGBA')
    save(out, 'meta', 'tl-map-icon', q=90)


# ====================================================================== cards
CARDS = {  # taskId: (tile x, y, [(prop, cx, bottom, scale)], light colour)
    'task_banh_chung': (37.4, 30.4, [('tl-prop-noi-banh-chung', 300, 380, 2.0), ('tl-prop-mam-la-dong', 500, 384, 1.6)], '#ff7a2a'),
    'task_dong_ho': (12.6, 27.3, [('tl-prop-gia-tranh', 260, 360, 1.9), ('tl-prop-ban-in-tranh', 500, 384, 1.8)], '#ffb45a'),
    'task_cho_chu': (27.4, 21.5, [('tl-prop-thap-but', 140, 390, 1.5), ('tl-prop-chong-ong-do', 380, 384, 2.4)], '#ffb45a'),
    'task_cay_neu': (25.5, 30.5, [('tl-prop-cay-neu', 320, 396, 1.35), ('tl-prop-den-long', 130, 380, 1.4), ('tl-prop-den-long', 510, 380, 1.4)], '#ffa040'),
    'task_cau_doi': (14.6, 21.5, [('tl-prop-ban-cau-doi', 330, 384, 2.4), ('tl-decor-gia-cau-doi', 120, 390, 2.0), ('tl-decor-gia-cau-doi', 540, 390, 2.0)], '#ffb45a'),
    'task_ngu_qua': (6.4, 12.6, [('tl-prop-ban-tho-ngoc-son', 300, 390, 2.2), ('tl-prop-ban-ngu-qua', 520, 384, 1.8)], '#ffc060'),
    'task_ca_tru': (34.3, 8.7, [('tl-prop-ca-tru', 320, 380, 3.0), ('tl-decor-ghe-tre', 540, 390, 1.6)], '#ffb45a'),
    'task_roi_nuoc': (39.4, 17.4, [('tl-prop-thuy-dinh', 320, 380, 1.9), ('tl-prop-ao-roi', 540, 396, 1.6)], '#ff9a48'),
}


def card_bg(prev, tx, ty):
    s = 24  # preview px per tile
    cw, ch = 16 * s, 10 * s
    x0 = int(min(max(tx * s - cw / 2, 0), prev.width - cw))
    y0 = int(min(max(ty * s - ch / 2, 0), prev.height - ch))
    im = prev.crop((x0, y0, x0 + cw, y0 + ch)).resize((CW, CH), Image.LANCZOS).filter(ImageFilter.GaussianBlur(6))
    return np.asarray(im).astype(np.float32) / 255 * 0.55


def card(prev, task, tx, ty, items, light):
    rgb = card_bg(prev, tx, ty)
    yy, xx = np.mgrid[0:CH, 0:CW].astype(np.float32)
    L = lib.Layer(CW, CH)
    L.rgb[:] = rgb
    L.a[:] = 1
    # warm pool behind the hero props
    pool = np.exp(-(((xx - 320) / 300) ** 2 + ((yy - 300) / 160) ** 2))
    L.rgb += pool[..., None] * hexc(light) * 0.35
    for key, cx, bot, sc in sorted(items, key=lambda it: it[2]):
        im = render(key, 2)
        im = im.resize((int(im.width * sc / 2), int(im.height * sc / 2)), Image.LANCZOS)
        a = np.asarray(im).astype(np.float32) / 255
        x0, y0 = int(cx - im.width / 2), int(bot - im.height)
        # clip to card
        sx0, sy0 = max(0, -x0), max(0, -y0)
        ex, ey = min(im.width, CW - x0), min(im.height, CH - y0)
        if ex <= sx0 or ey <= sy0:
            continue
        sub = a[sy0:ey, sx0:ex]
        dst = L.rgb[y0 + sy0:y0 + ey, x0 + sx0:x0 + ex]
        dst[:] = dst * (1 - sub[..., 3:4]) + sub[..., :3] * sub[..., 3:4]
    # floating sparks / embers + vignette
    rs = np.random.default_rng(sum(map(ord, task)))
    for _ in range(40):
        x, y, r = rs.uniform(0, CW), rs.uniform(0, CH * 0.7), rs.uniform(0.8, 2.2)
        L.rgb += (np.exp(-((xx - x) ** 2 + (yy - y) ** 2) / (r * r * 2)) * 0.6)[..., None] * hexc('#ffcf7a')
    v = ((xx - CW / 2) / (CW * 0.62)) ** 2 + ((yy - CH / 2) / (CH * 0.62)) ** 2
    L.rgb *= np.clip(1.15 - 0.55 * v, 0.35, 1)[..., None]
    L.rgb += lib.value_noise(CH, CW, 1, 77)[..., None] * 0.025 - 0.0125
    save(to_im(L.rgb), 'cards', f'tl-card-{task}', q=88)


# ====================================================================== home background (1920x1080, no moon)
def home():
    W, H = 1920, 1080
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    hz = 640  # lake horizon
    t = np.clip(yy / hz, 0, 1)
    sky = hexc('#050a1c') * (1 - t[..., None]) + hexc('#1a1838') * t[..., None]
    sky += np.exp(-((yy - hz) / 140) ** 2)[..., None] * hexc('#5a2a30') * 0.55  # city glow on the horizon
    rgb = sky.copy()
    rs = np.random.default_rng(2026)
    for _ in range(700):  # stars, no moon
        x, y = rs.uniform(0, W), rs.uniform(0, hz * 0.8)
        b = rs.random() ** 3
        if b > 0.02:
            r = 0.6 + b * 1.3
            x0, y0 = int(x), int(y)
            sl = (slice(max(0, y0 - 4), y0 + 5), slice(max(0, x0 - 4), x0 + 5))
            rgb[sl] += (np.exp(-((xx[sl] - x) ** 2 + (yy[sl] - y) ** 2) / (r * r)) * b * 0.9)[..., None] * hexc('#e8eeff')
    # fireworks (giao thừa) — radial bursts
    for cx, cy, R, col in ((420, 210, 150, '#ffcf5a'), (1500, 170, 180, '#ff5a4a'), (980, 120, 110, '#ffe8a0'), (1240, 300, 90, '#7ad0ff')):
        d = np.sqrt((xx - cx) ** 2 + (yy - cy) ** 2)
        ang = np.arctan2(yy - cy, xx - cx)
        rays = (np.cos(ang * 36) * 0.5 + 0.5) ** 30 * (d < R) * (d > R * 0.15) * (d / R) ** 1.5
        dots = (np.cos(ang * 36) * 0.5 + 0.5) ** 60 * np.exp(-((d - R) / 6) ** 2) * 2
        glow = np.exp(-(d / (R * 0.7)) ** 2) * 0.12
        rgb += (rays + dots + glow)[..., None] * hexc(col)
    # skyline: phố cổ roofs + trees silhouettes on far shore
    sk = np.zeros(W)
    for x in range(W):
        sk[x] = hz - 40 - 30 * lib.value_noise(1, W, 60, 31)[0, x] - (60 if (x // 90) % 3 == 1 else 20) * ((x % 90) < 70)
    tree = hz - 70 - 70 * lib.fbm(1, W, 50, 4, 32)[0]
    top = np.minimum(sk, np.where((xx[0] < 600) | (xx[0] > 1400), tree, sk))
    shore = yy >= top[None, :]
    rgb = np.where((shore & (yy < hz))[..., None], hexc('#0a0c18') + (yy - top[None, :])[..., None] / 200 * hexc('#2a1a24'), rgb)
    for x in range(30, W, 47):  # lit windows / lanterns on far shore
        if rs.random() < 0.55:
            y = rs.uniform(top[x] + 10, hz - 8)
            d2 = (xx - x) ** 2 + (yy - y) ** 2
            rgb += (np.exp(-d2 / 10) * 0.9 + np.exp(-d2 / 300) * 0.25)[..., None] * hexc('#ff9a40')
    # lake
    lake = yy >= hz
    ty = np.clip((yy - hz) / (H - hz), 0, 1)
    n = lib.fbm(H, W, 30, 4, 33)
    rip = np.sin(xx * 0.02 + n * 7 + yy * 0.25 * (1 + ty * 2)) * 0.5 + 0.5
    water = hexc('#06161c') * (1 - ty[..., None]) + hexc('#0c2a30') * ty[..., None]
    water = water * (0.8 + 0.4 * rip[..., None])
    # mirrored sky reflection (fireworks + shore lights)
    mir = np.clip(2 * hz - yy, 0, H - 1).astype(int)
    refl = rgb[mir, xx.astype(int)]
    wob = np.roll(refl, 3, axis=1) * 0.5 + refl * 0.5
    water += wob * (0.35 * (1 - ty) * (0.6 + 0.4 * rip))[..., None]
    rgb = np.where(lake[..., None], water, rgb)
    out = to_im(rgb).convert('RGBA')
    # Thê Húc bridge (red arc) on the left + Ngọc Sơn temple; Tháp Rùa centre-right
    p = P(W // 2, H // 2)
    bx0, bx1, by = 60, 520, 330
    pts = [(bx0 + (bx1 - bx0) * i / 30, by - 46 * math.sin(math.pi * i / 30)) for i in range(31)]
    for a_, b_ in zip(pts, pts[1:]):
        p.tube(a_, b_, 4.5, TP.REDP)
    for i in range(0, 31, 2):
        x, y = pts[i]
        p.tube((x, y), (x, y - 14), 1.2, TP.REDP)
    p.line([(x, y - 14) for x, y in pts], 1.6, '#c8281c')
    for i in range(3, 31, 6):
        x, y = pts[i]
        TP.lantern(p, x, y - 24, 0.45)
    TP.roof(p, 70, 296, 70, 34, TP.ROOF, 10)
    p.box(16, 296, 108, 30, 6, lib.M['lacquer'])
    for x in (30, 70, 110):
        TP.lantern(p, x, 310, 0.4)
    near = p.image().resize((W, H), Image.LANCZOS)
    out.alpha_composite(near)
    tr = render('tl-decor-thap-rua', 2)
    tr = tr.resize((int(tr.width * 1.1), int(tr.height * 1.1)), Image.LANCZOS)
    out.alpha_composite(tr, (1180, hz - tr.height + 40))
    # foreground: blossom branch + lanterns top-right, cây nêu silhouette left
    f = P(W // 2, H // 2)
    TP.blossom_branch(f, [(960, 20), (860, 60), (760, 70), (700, 110)], 7, 41, 1.2)
    TP.blossom_branch(f, [(960, 140), (880, 150), (820, 190)], 5, 42, 1.0)
    for x, y, s in ((830, 110, 1.2), (900, 180, 0.9)):
        TP.lantern(f, x, y, s)
        f.glow(x, y, 50 * s, '#ff7a2a', 0.4)
    out.alpha_composite(f.image().resize((W, H), Image.LANCZOS))
    # vignette + warm lift
    a = np.asarray(out.convert('RGB')).astype(np.float32) / 255
    v = ((xx - W / 2) / (W * 0.6)) ** 2 + ((yy - H / 2) / (H * 0.65)) ** 2
    a *= np.clip(1.12 - 0.5 * v, 0.4, 1)[..., None]
    a += lib.value_noise(H, W, 1, 34)[..., None] * 0.02 - 0.01
    im = to_im(a)
    save(im, 'meta', 'home-bg', q=86)
    save(im.resize((640, 360), Image.LANCZOS), 'meta', 'thumb', q=86)


if __name__ == '__main__':
    what = set(sys.argv[1:]) or {'preview', 'icon', 'cards', 'home'}
    prev = preview() if 'preview' in what or 'cards' in what else None
    if 'icon' in what:
        icon()
    if 'cards' in what:
        for task, (tx, ty, items, light) in CARDS.items():
            card(prev, task, tx, ty, items, light)
    if 'home' in what:
        home()
