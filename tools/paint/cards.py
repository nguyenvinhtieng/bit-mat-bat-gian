"""
Painted heritage illustration cards (one per task) for the "task complete" popup.
Each card = a softly blurred crop of the real room (painted bake) + hero props re-rendered at 2x
+ light rays & vignette. Ngọ Môn and the moon get their own painted scenes.
  python3 tools/paint/cards.py
Writes apps/web/public/assets/maps/co-do-hue/cards/hue-card-<task>.webp (640x400) + PNG sources.
"""
from __future__ import annotations

import math
import os
import sys

import numpy as np
from PIL import Image, ImageFilter

sys.path.insert(0, os.path.dirname(__file__))
import lib  # noqa: E402
from lib import Mat, hexc, tex_noise  # noqa: E402
import props as PR  # noqa: E402

ROOT = PR.ROOT
CW, CH = 640, 400
BAKE = Image.open(os.path.join(ROOT, 'assets/maps/co-do-hue/meta/hue-map-preview.png')).convert('RGB')  # half-res composite


def render_prop(key, k=2):
    w, h, fn = PR.REG[key]
    p = PR.P(w, h)
    fn(p)
    return p.L.image((w * k, h * k))


def bg_from_room(tx, ty, blur=6, dark=0.55):
    """crop around a tile position from the overview, upscale, blur (depth-of-field)"""
    s = 24  # preview px per tile
    cw, ch = 16 * s, 10 * s
    x0 = int(min(max(tx * s - cw / 2, 0), BAKE.width - cw))
    y0 = int(min(max(ty * s - ch / 2, 0), BAKE.height - ch))
    im = BAKE.crop((x0, y0, x0 + cw, y0 + ch)).resize((CW, CH), Image.LANCZOS).filter(ImageFilter.GaussianBlur(blur))
    a = np.asarray(im).astype(np.float32) / 255 * dark
    return a


def finish(rgb, items, rays=True, name=''):
    """compose props (list of (img, cx, bottom)) over background, add light + vignette"""
    L = lib.Layer(CW, CH)
    L.rgb = rgb.copy()
    L.a = np.ones((CH, CW), np.float32)
    yy, xx = np.mgrid[0:CH, 0:CW].astype(np.float32)
    if rays:
        ang = np.arctan2(yy + 80, xx - CW * 0.32)
        r = (np.sin(ang * 22) * 0.5 + 0.5) ** 6 * np.clip(1 - np.sqrt((xx - CW * 0.35) ** 2 + (yy + 40) ** 2) / 520, 0, 1)
        L.rgb = L.rgb + r[..., None] * hexc('#ffd690') * 0.22
    glow = np.exp(-(((xx - CW / 2) / 260) ** 2 + ((yy - CH * 0.62) / 150) ** 2))
    L.rgb = L.rgb + glow[..., None] * hexc('#ffb860') * 0.18
    for img, cx, bottom in items:
        arr = np.asarray(img).astype(np.float32) / 255
        rgb_, a = arr[..., :3], arr[..., 3]
        # soft ground shadow
        sh = lib.ellipse_mask(CW, CH, cx, bottom - 6, img.width * 0.42, 12, blur=10)
        L.rgb = L.rgb * (1 - 0.35 * sh[..., None])
        L.over(rgb_, a, int(cx - img.width / 2), int(bottom - img.height))
    vig = np.clip(1 - (((xx - CW / 2) / (CW * 0.62)) ** 2 + ((yy - CH / 2) / (CH * 0.7)) ** 2) * 0.55, 0.3, 1)
    L.rgb = L.rgb * vig[..., None]
    L.rgb = L.rgb + (lib.value_noise(CH, CW, 1.0, 5)[..., None] - 0.5) * 0.03
    im = Image.fromarray((np.clip(L.rgb, 0, 1) * 255 + 0.5).astype(np.uint8), 'RGB')
    return im


def sky(top='#0b1430', bot='#3a2a48', stars=True, seed=3):
    yy, xx = np.mgrid[0:CH, 0:CW].astype(np.float32)
    g = (yy / CH)[..., None]
    rgb = hexc(top) * (1 - g) + hexc(bot) * g
    if stars:
        rs = np.random.default_rng(seed)
        for _ in range(140):
            x, y, r = rs.random() * CW, rs.random() * CH * 0.7, 0.5 + rs.random() * 1.2
            d = np.sqrt((xx - x) ** 2 + (yy - y) ** 2)
            rgb = rgb + (np.clip(1 - d / r, 0, 1) * (0.5 + rs.random() * 0.5))[..., None]
    return rgb


def moon_disc(rgb, cx, cy, R, phase=None):
    yy, xx = np.mgrid[0:CH, 0:CW].astype(np.float32)
    d = np.sqrt((xx - cx) ** 2 + (yy - cy) ** 2)
    m = np.clip(R - d + 0.5, 0, 1)
    n = lib.fbm(CH, CW, 18, 4, 9)
    col = hexc('#f4ecd2') * (0.78 + 0.3 * n)[..., None]
    lit = np.ones_like(d)
    if phase is not None:  # crescent: shadow disc offset
        sd = np.sqrt((xx - cx - phase * R) ** 2 + (yy - cy) ** 2)
        lit = np.clip((sd - R) / 2 + 0.5, 0.06, 1)
    halo = np.exp(-((d / (R * 1.8)) ** 2)) * 0.35
    rgb = rgb + halo[..., None] * hexc('#ffe9b0') * (1 if phase is None else 0.4)
    return rgb * (1 - m[..., None]) + (col * lit[..., None]) * m[..., None]


def ngo_mon(k=2):
    """Painted Ngọ Môn: stone base with 5 gates + two-tier Lầu Ngũ Phụng with yellow glazed roofs."""
    W, H = 300, 190
    p = PR.P(W, H)
    S = Mat('#b49a74', shine=0.05, rough=8, amb=0.5, diff=0.6, tex=lib.tex_stone(61, 4, 0.25))
    p.box(10, 120, 280, 8, 62, S, top=S)
    for i, (x, w, h) in enumerate(((40, 18, 30), (88, 22, 36), (139, 26, 44), (192, 22, 36), (242, 18, 30))):
        p.rect(x, 190 - h, x + w, 186, '#140b06')
        p.ell(x + w / 2, 190 - h, w / 2, w / 2.2, '#140b06')
        p.ell(x + w / 2, 190 - h - 1, w / 2 + 2, w / 2.2 + 2, '#d9c08a', 0.25)
    # balustrade + pavilion
    p.box(40, 108, 220, 6, 8, PR.LACQ, top=PR.GOLD)
    for x in range(56, 248, 24):
        p.tube((x, 108), (x, 70), 3.0, PR.LACQ)
    p.rect(52, 74, 248, 108, '#5a1a10', 0.55)
    p.rect(60, 80, 240, 104, '#f2cf7a', 0.35)

    def roof(y, x0, x1, hgt):
        Y = Mat('#e7b33a', shine=0.6, rough=30, amb=0.45, diff=0.75, tex=tex_noise(0.12, 2, 62))
        pts = [(x0 - 18, y + 4), (x0 - 8, y), (x0 + 16, y - hgt), (x1 - 16, y - hgt), (x1 + 8, y), (x1 + 18, y + 4), (x1 + 6, y + 10), (x0 - 6, y + 10)]
        p.poly(pts, Y, n=(-0.2, 0.7, 0.7), grad=0.35)
        L = p.L
        mk = lib.poly_mask(L.w, L.h, [(a * PR.SS, b * PR.SS) for a, b in pts])
        xx = np.mgrid[0:L.h, 0:L.w][1].astype(np.float32) / PR.SS
        L.rgb = L.rgb * (1 - mk[..., None] * 0.22 * ((np.sin(xx * 1.6) * 0.5 + 0.5) ** 3)[..., None])
        p.line([(x0 + 14, y - hgt), (x1 - 14, y - hgt)], 2.4, '#8a5a14')
        for ex in (x0 - 18, x1 + 18):
            p.blob(ex, y + 2, 3, 2.4, PR.GOLD)

    roof(72, 46, 254, 18)
    for x in range(86, 224, 22):
        p.tube((x, 54), (x, 40), 2.4, PR.LACQ)
    p.rect(80, 40, 220, 56, '#5a1a10', 0.5)
    roof(40, 86, 214, 16)
    p.blob(150, 22, 4, 4, PR.GOLD)
    return p.L.image((W * k, H * k))


def save(name, im):
    pub = os.path.join(ROOT, 'apps/web/public/assets/maps/co-do-hue/cards')
    src = os.path.join(ROOT, 'assets/maps/co-do-hue/cards')
    os.makedirs(pub, exist_ok=True)
    os.makedirs(src, exist_ok=True)
    im.save(os.path.join(src, f'hue-card-{name}.png'), optimize=True)
    im.save(os.path.join(pub, f'hue-card-{name}.webp'), 'WEBP', quality=84, method=6)
    print('card', name)


def main():
    R = render_prop
    # 1. moon phases — night sky over the observatory
    rgb = sky()
    rgb = moon_disc(rgb, 470, 110, 54)
    for i, ph in enumerate((-1.6, -1.0, -0.4, 0.4, 1.0, 1.6)):
        rgb = moon_disc(rgb, 120 + i * 46, 60 + abs(i - 2.5) * 8, 13, ph)
    ground = bg_from_room(21, 21, 4, 0.6)
    yy = np.mgrid[0:CH, 0:CW][0]
    blend = np.clip((yy - 250) / 40, 0, 1)[..., None]
    rgb = rgb * (1 - blend) + ground * blend
    save('task_moon_phase', finish(rgb, [(R('hue-prop-hon-thien-nghi'), 250, 380), (R('hue-decor-kinh-thien-van'), 420, 384), (R('hue-decor-thien-cau'), 120, 384)], rays=False))
    # 2. woodblock printing
    save('task_woodblock_print', finish(bg_from_room(16, 21), [(R('hue-prop-ban-khac'), 200, 360), (R('hue-prop-ban-in-lich'), 440, 380), (R('hue-decor-ke-sach'), 560, 300)]))
    # 3. Ngọ Môn gates
    rgb = sky('#1a1838', '#c87a4a', seed=8)
    yy, xx = np.mgrid[0:CH, 0:CW].astype(np.float32)
    rgb = rgb + np.exp(-(((xx - 320) / 300) ** 2 + ((yy - 300) / 90) ** 2))[..., None] * hexc('#ffb060') * 0.4
    court = bg_from_room(21, 4, 3, 0.7)
    blend = np.clip((yy - 330) / 20, 0, 1)[..., None]
    rgb = rgb * (1 - blend) + court * blend
    save('task_ngo_mon_gates', finish(rgb, [(ngo_mon(2), 320, 372), (R('hue-prop-co-le'), 60, 396), (R('hue-prop-co-le'), 590, 396)], rays=False))
    # 4. court ranks — stelae before the throne
    save('task_court_ranks', finish(bg_from_room(7.5, 12), [(R('hue-decor-ngai-vang'), 320, 250), (R('hue-prop-bia-pham-son'), 150, 380), (R('hue-prop-bia-pham-son'), 490, 380)]))
    # 5. royal court music
    save('task_nha_nhac', finish(bg_from_room(34.5, 10), [(R('hue-prop-trong-nha-nhac'), 190, 360), (R('hue-prop-bien-khanh'), 430, 330), (R('hue-decor-dan-tranh'), 400, 392)]))
    # 6. nine urns
    save('task_cuu_dinh', finish(bg_from_room(30.5, 28), [(R('hue-prop-dinh-dong'), 130, 330), (R('hue-prop-dinh-dong'), 510, 330), (R('hue-decor-cay-dai'), 560, 300), (R('hue-prop-dinh-dong'), 320, 392)]))
    # 7. poem-and-painting wall
    save('task_poem_wall', finish(bg_from_room(12.5, 27), [(R('hue-prop-tuong-tho'), 320, 260), (R('hue-prop-chau-kieng'), 110, 392), (R('hue-decor-an-thu'), 420, 392)]))
    # 8. royal seal
    save('task_royal_seal', finish(bg_from_room(7, 27), [(R('hue-prop-an-ban-lich'), 320, 330), (R('hue-prop-hop-an'), 520, 390), (R('hue-decor-ruong'), 110, 392)]))
    # 9. bánh bèo
    tray = R('hue-prop-mam-banh-beo', 4)
    save('task_banh_beo', finish(bg_from_room(10.5, 21), [(tray, 320, 380), (R('hue-prop-den-cung-dinh'), 80, 360), (R('hue-prop-den-cung-dinh'), 560, 360)]))


if __name__ == '__main__':
    main()
