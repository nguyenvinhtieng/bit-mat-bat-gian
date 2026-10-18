"""
Sài Gòn meta art: map preview, map icon, task cards, home background (hẻm đêm, dây điện, xe CRAB, quán cóc).
  uv run -q --no-project --with numpy --with scipy --with pillow python tools/paint/sg_meta.py [preview|icon|cards|home]
  (run sg_floor.py + sg_props.py first)
Writes apps/web/public/assets/maps/sai-gon/meta/{sg-map-preview,sg-map-icon,home-bg,thumb}.webp,
       apps/web/public/assets/maps/sai-gon/cards/sg-card-<taskId>.webp  (+ PNG sources under assets/maps/sai-gon)
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
from props import P  # noqa: E402
import sg_props as SP  # noqa: E402
from sg_common import layout, pub, src  # noqa: E402

CW, CH = 640, 400


def to_im(rgb):
    return Image.fromarray((np.clip(rgb, 0, 1) * 255 + 0.5).astype(np.uint8))


def save(im, *p, q=86):
    im.save(src(*p[:-1], p[-1] + '.png'), optimize=True)
    im.save(pub(*p[:-1], p[-1] + '.webp'), 'WEBP', quality=q, method=6)
    print('wrote', '/'.join(p), im.size)


_cache = {}


def render(key, k=2):
    """Prop `key` painted at k× its sprite size (the painter supersamples, so k>1 stays crisp)."""
    if (key, k) not in _cache:
        w, h, fn = SP.REG[key]
        p = P(w, h)
        fn(p)
        _cache[key, k] = p.L.image((w * k, h * k))
    return _cache[key, k]


def sprite(key, scale, dim=1.0, tint=None, flip=False):
    """Prop at `scale`× sprite size; `dim` darkens it, `tint` (hex, amount) pushes it toward a light colour."""
    im = render(key, max(1, math.ceil(scale)))
    w, h = SP.REG[key][:2]
    im = im.resize((max(1, int(w * scale)), max(1, int(h * scale))), Image.LANCZOS)
    if flip:
        im = im.transpose(Image.FLIP_LEFT_RIGHT)
    if dim != 1.0 or tint:
        a = np.asarray(im).astype(np.float32) / 255
        rgb = a[..., :3] * dim
        if tint:
            rgb = rgb * (1 - tint[1]) + rgb * hexc(tint[0]) * tint[1] * 1.6
        im = Image.fromarray((np.clip(np.dstack([rgb, a[..., 3:]]), 0, 1) * 255 + 0.5).astype(np.uint8))
    return im


def place(out, im, cx, bottom):
    out.alpha_composite(im, (int(cx - im.width / 2), int(bottom - im.height)))


# ====================================================================== preview + icon
def preview():
    lay = layout()
    base = Image.open(src('tileset', 'sg-floor-bake.png')).convert('RGBA')
    for pr in sorted(lay['props'], key=lambda p: (not p.get('wall'), p['y'])):
        f = src('props', pr['key'] + '.png')
        if os.path.exists(f):
            im = Image.open(f).convert('RGBA')
            base.alpha_composite(im, (int(pr['x'] - im.width / 2), int(pr['y'] - im.height)))
    out = base.resize((base.width // 2, base.height // 2), Image.LANCZOS).convert('RGB')
    save(out, 'meta', 'sg-map-preview')
    return out


def icon():
    """A CRAB scooter under a sodium street lamp, inside a green-rimmed roundel."""
    S = 128
    yy, xx = np.mgrid[0:S, 0:S].astype(np.float32)
    d = np.sqrt((xx - 64) ** 2 + (yy - 64) ** 2)
    rgb = hexc('#0c1424') * (1 - yy[..., None] / S) + hexc('#1c1a2a') * (yy[..., None] / S)
    rgb += np.exp(-((xx - 40) ** 2 + (yy - 30) ** 2) / 900)[..., None] * hexc(SP.SODIUM) * 0.55  # lamp pool
    rgb += np.exp(-((xx - 64) ** 2 / 1800 + (yy - 104) ** 2 / 60))[..., None] * hexc(SP.SODIUM) * 0.25  # wet street glint
    im = to_im(rgb).convert('RGBA')
    p = P(S, S)
    p.line([(0, 22), (40, 30), (128, 18)], 1.0, '#05070c', 0.9)  # dây điện
    p.line([(0, 34), (64, 40), (128, 30)], 0.8, '#05070c', 0.8)
    p.tube((26, 120), (26, 22), 2.6, SP.CONC)
    p.tube((26, 24), (40, 26), 1.4, SP.DSTEEL)
    p.glow(42, 29, 18, SP.SODIUM, 0.9)
    p.ell(42, 29, 5, 2.4, '#fff2c0')
    im.alpha_composite(p.image())
    place(im, sprite('sg-decor-xe-crab', 0.98), 74, 116)
    rim = P(S, S)
    rim.ring(64, 64, 59, 59, 5, SP.CRAB)
    rim.ring(64, 64, 62.5, 62.5, 1.6, SP.CRAB_D)
    im.alpha_composite(rim.image())
    a = np.asarray(im).copy()
    a[..., 3] = (a[..., 3] * np.clip(64.5 - d, 0, 1)).astype(np.uint8)
    save(Image.fromarray(a), 'meta', 'sg-map-icon', q=90)


# ====================================================================== cards
CARDS = {  # taskId: (tile x, y, [(prop, cx, bottom, scale)], light colour)
    'task_chi_duong': (17.2, 1.9, [('sg-prop-courtyard-cot-dien', 90, 400, 1.4), ('sg-prop-courtyard-xe-crab-hang', 400, 384, 1.6)], '#ffb04a'),
    'task_com_tam': (6.4, 12.6, [('sg-prop-exhibition-xe-com-tam', 260, 384, 2.0), ('sg-decor-ghe-nhua-do', 520, 388, 1.8), ('sg-decor-ghe-nhua-xanh', 590, 392, 1.7)], '#ffb45a'),
    'task_tieng_rao': (10.5, 21.5, [('sg-decor-cot-dien', 110, 400, 1.5), ('sg-prop-exhibition-xe-hu-tieu', 310, 384, 2.0), ('sg-decor-xe-banh-trang', 545, 388, 1.6)], '#ffa848'),
    'task_ca_phe_phin': (34.3, 8.7, [('sg-prop-coordination-quay-ca-phe', 250, 380, 2.1), ('sg-prop-coordination-binh-tra-da', 550, 390, 1.9)], '#ffc070'),
    'task_khui_hui': (39.4, 17.4, [('sg-decor-du-che', 330, 360, 1.7), ('sg-prop-coordination-ban-ghe-nhua', 330, 390, 2.2)], '#ffb45a'),
    'task_do_xang': (27.4, 21.5, [('sg-prop-editing-ke-xang', 180, 384, 2.3), ('sg-decor-binh-xang', 350, 388, 1.8), ('sg-decor-xe-crab', 500, 392, 1.8)], '#ffa040'),
    'task_va_vo': (14.6, 21.5, [('sg-decor-lop-treo', 140, 380, 2.2), ('sg-prop-editing-thau-va-xe', 400, 390, 2.4)], '#ffb04a'),
    'task_so_hui': (12.6, 27.3, [('sg-prop-archive-tu-so', 170, 390, 1.9), ('sg-prop-archive-nem', 450, 392, 2.0)], '#ffc070'),
    'task_dem_tien': (4.5, 28.6, [('sg-decor-quat-may', 110, 384, 2.0), ('sg-prop-archive-ban-dem-tien', 360, 392, 2.4)], '#ffc070'),
    'task_xep_xe': (37.4, 30.4, [('sg-prop-storage-xe-may-xep', 250, 392, 2.0), ('sg-prop-storage-xe-may', 520, 396, 1.7)], '#ffa848'),
}


def card_bg(prev, tx, ty):
    s = 24  # preview px per tile
    cw, ch = 16 * s, 10 * s
    x0 = int(min(max(tx * s - cw / 2, 0), prev.width - cw))
    y0 = int(min(max(ty * s - ch / 2, 0), prev.height - ch))
    im = prev.crop((x0, y0, x0 + cw, y0 + ch)).resize((CW, CH), Image.LANCZOS).filter(ImageFilter.GaussianBlur(6))
    return np.asarray(im).astype(np.float32) / 255 * 0.5


def card(prev, task, tx, ty, items, light):
    rgb = card_bg(prev, tx, ty)
    yy, xx = np.mgrid[0:CH, 0:CW].astype(np.float32)
    rgb += np.exp(-(((xx - 320) / 300) ** 2 + ((yy - 300) / 160) ** 2))[..., None] * hexc(light) * 0.35  # sodium pool
    out = to_im(rgb).convert('RGBA')
    for key, cx, bot, sc in sorted(items, key=lambda it: it[2]):
        sc = min(sc * 1.3, (bot - 6) / SP.REG[key][1])  # heroes fill the card, tall poles still fit
        place(out, sprite(key, sc), cx, bot)
    rgb = np.asarray(out.convert('RGB')).astype(np.float32) / 255
    rs = np.random.default_rng(sum(map(ord, task)))
    for _ in range(26):  # out-of-focus street lights (bokeh): sodium, a few CRAB green
        x, y, r = rs.uniform(0, CW), rs.uniform(0, CH * 0.55), rs.uniform(5, 14)
        col = '#3fd08a' if rs.random() < 0.2 else SP.SODIUM
        disc = np.clip(r - np.sqrt((xx - x) ** 2 + (yy - y) ** 2), 0, 1.5) / 1.5
        rgb += (disc * rs.uniform(0.05, 0.14))[..., None] * hexc(col)
    for _ in range(90):  # faint drizzle streaks
        x, y, ln = rs.uniform(0, CW), rs.uniform(0, CH), rs.uniform(10, 26)
        m = (np.abs((xx - x) - (yy - y) * 0.12) < 0.6) & (yy > y) & (yy < y + ln)
        rgb[m] += 0.05
    v = ((xx - CW / 2) / (CW * 0.62)) ** 2 + ((yy - CH / 2) / (CH * 0.62)) ** 2
    rgb *= np.clip(1.15 - 0.55 * v, 0.35, 1)[..., None]
    rgb += lib.value_noise(CH, CW, 1, 77)[..., None] * 0.025 - 0.0125
    save(to_im(rgb), 'cards', f'sg-card-{task}', q=88)


# ====================================================================== home background (1920x1080)
def catenary(x0, y0, x1, y1, sag, n=40):
    return [(x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n + sag * math.sin(math.pi * i / n)) for i in range(n + 1)]


def home():
    W, H = 1920, 1080
    hz = 760  # foot of the house fronts / start of the wet street
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    rs = np.random.default_rng(2042)
    # sky: deep blue with the orange city glow Sài Gòn never switches off
    t = np.clip(yy / hz, 0, 1)[..., None]
    rgb = hexc('#0a1022') * (1 - t) + hexc('#2a2036') * t
    rgb += np.exp(-((yy - 420) / 260) ** 2)[..., None] * hexc('#a0502a') * 0.35
    # far skyline: blocky high-rises with a few lit windows + a red aviation light
    sk = np.full(W, 1e9)
    x = 0
    while x < W:
        bw, bh = rs.uniform(60, 160), rs.uniform(160, 380)
        sk[int(x):int(x + bw)] = np.minimum(sk[int(x):int(x + bw)], 560 - bh)
        if rs.random() < 0.3:
            rgb += (np.exp(-((xx - x - bw / 2) ** 2 + (yy - (560 - bh - 6)) ** 2) / 8) * 0.9)[..., None] * hexc('#ff3a2a')
        x += bw + rs.uniform(-20, 30)
    far = yy >= sk[None, :]
    win = (lib.value_noise(H, W, 6, 41) > 0.72) & ((xx.astype(int) % 14) < 6) & ((yy.astype(int) % 18) < 8)
    rgb = np.where(far[..., None], hexc('#141626') + win[..., None] * hexc('#c8a060') * 0.45, rgb)
    out = to_im(rgb).convert('RGBA')
    # the alley: a row of tube houses, nearer ones larger and brighter
    # each house a different wash (mint, lemon, rose, sky, sand), overlapping so no gap shows the skyline
    houses = ((100, 2.0, 0.42, '#8fd0c0'), (450, 2.2, 0.5, '#f0d070'), (800, 2.05, 0.44, '#f0a0b4'),
              (1150, 2.25, 0.52, '#a8c8f0'), (1500, 2.1, 0.46, '#e8c090'), (1850, 2.2, 0.5, '#9ad8a8'))
    for i, (cx, sc, dim, wash) in enumerate(sorted(houses, key=lambda h: h[1])):
        place(out, sprite('sg-decor-nha-ong', sc, dim, (wash, 0.55), flip=i % 2 == 1), cx, hz + 8)
    # utility poles + the dây điện tangle across the top of the frame
    poles = [(330, 1.6), (1130, 1.65), (1560, 1.55)]
    for cx, sc in poles:
        place(out, sprite('sg-decor-cot-dien', sc, 0.75), cx, hz + 30)
    wires = P(W // 2, H // 2)
    tops = [(cx / 2, (hz + 30 - 248 * sc) / 2 + 22) for cx, sc in poles]
    anchors = [(-10, 40)] + tops + [(W / 2 + 10, 50)]
    for k in range(7):
        for (ax, ay), (bx, by) in zip(anchors, anchors[1:]):
            dy = k * 2.2 - 4
            wires.line(catenary(ax, ay + dy, bx, by + dy, 18 + k * 5 + rs.uniform(-4, 4)), 0.55 + 0.1 * (k % 3), '#06070c', 0.92)
    for (ax, ay) in tops:  # loose coils hanging off each pole
        wires.ring(ax + 8, ay + 26, 6, 9, 1.2, SP.RUBBER)
    out.alpha_composite(wires.image().resize((W, H), Image.LANCZOS))
    # sodium lamps: warm pools on the house fronts
    a = np.asarray(out.convert('RGB')).astype(np.float32) / 255
    for cx, sc in poles:
        lx, ly = cx + 26 * sc, hz + 30 - 236 * sc
        g = np.exp(-((xx - lx) ** 2 / 90000 + (yy - ly - 160) ** 2 / 60000))
        a += g[..., None] * hexc(SP.SODIUM) * 0.32 + np.exp(-((xx - lx) ** 2 + (yy - ly) ** 2) / 120)[..., None] * hexc('#fff2c0') * 0.9
    # wet asphalt: dark street mirroring the alley, broken up by ripples and puddle edges
    st = yy >= hz
    ty = np.clip((yy - hz) / (H - hz), 0, 1)
    n = lib.fbm(H, W, 40, 4, 43)
    street = hexc('#121318') * (1 - ty[..., None]) + hexc('#1c1d22') * ty[..., None]
    street *= (0.85 + 0.3 * n)[..., None]
    mir = np.clip(2 * hz - yy, 0, H - 1).astype(int)
    wob = np.round(np.sin(yy * 0.08 + n * 4) * 1.5).astype(int)
    refl = a[mir, np.clip(xx.astype(int) + wob, 0, W - 1)]
    refl = np.asarray(to_im(refl).filter(ImageFilter.GaussianBlur(2.5))).astype(np.float32) / 255
    puddle = np.clip((lib.fbm(H, W, 120, 3, 44) - 0.42) * 6, 0, 1)
    street += refl * (0.18 + 0.4 * puddle)[..., None] * (1 - 0.6 * ty[..., None])
    a = np.where(st[..., None], street, a)
    a[(np.abs(yy - hz - 2) < 2)] *= 0.6  # kerb line
    out = to_im(a).convert('RGBA')
    # mid-ground: quán cóc on the left (umbrella, steel table, red stools), CRAB bikes lined up on the right
    place(out, sprite('sg-decor-du-che', 2.2, 0.9), 470, hz + 168)
    place(out, sprite('sg-decor-ban-inox', 2.3, 0.92), 470, hz + 175)
    for cx, by, key in ((330, hz + 190, 'sg-decor-ghe-nhua-do'), (610, hz + 196, 'sg-decor-ghe-nhua-do'),
                        (420, hz + 232, 'sg-decor-ghe-nhua-xanh'), (540, hz + 238, 'sg-decor-ghe-nhua-do')):
        place(out, sprite(key, 2.4, 0.95), cx, by)
    place(out, sprite('sg-decor-binh-tra-da', 2.0, 0.9), 220, hz + 188)
    for i, cx in enumerate((1230, 1450, 1670, 1890)):
        key = 'sg-decor-xe-crab' if i % 2 == 0 else 'sg-prop-storage-xe-may'
        place(out, sprite(key, 2.25 if key == 'sg-decor-xe-crab' else 1.75, 0.95, flip=True), cx, hz + 214 + i * 8)
    place(out, sprite('sg-decor-non-bao-hiem', 2.2, 0.95), 1000, hz + 250)
    # foreground cart edge bottom-left, softly out of focus
    fg = sprite('sg-decor-xe-banh-trang', 3.4, 0.7).filter(ImageFilter.GaussianBlur(3))
    place(out, fg, 110, H + 40)
    # grade: vignette, warm lift, a little grain
    a = np.asarray(out.convert('RGB')).astype(np.float32) / 255
    v = ((xx - W / 2) / (W * 0.6)) ** 2 + ((yy - H / 2) / (H * 0.65)) ** 2
    a *= np.clip(1.12 - 0.5 * v, 0.4, 1)[..., None]
    a += lib.value_noise(H, W, 1, 45)[..., None] * 0.02 - 0.01
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
