"""Shared bits for the Thăng Long painters (tl_*.py): paths, layout data, atlas packing."""
from __future__ import annotations

import json
import os

from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '../..'))
SLUG = 'thang-long'
SRC = os.path.join(ROOT, 'assets/maps', SLUG)  # committed PNG sources
PUB = os.path.join(ROOT, 'apps/web/public/assets/maps', SLUG)  # shipped webp
LAYOUT_JSON = os.path.join(os.path.dirname(__file__), '_tl_layout.json')


def layout():
    """Layout + TL_PROPS dumped by tools/paint/tl-export-layout.ts."""
    return json.load(open(LAYOUT_JSON))


def src(*p):
    path = os.path.join(SRC, *p)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    return path


def pub(*p):
    path = os.path.join(PUB, *p)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    return path


def pack_atlas(imgs: dict, name: str, app: str, maxw=2048, pad=2, q=90):
    """Shelf-pack RGBA images into maps/thang-long/atlas/<name>.{webp,json} (Phaser hash atlas)."""
    items = sorted(imgs.items(), key=lambda kv: (-kv[1].height, kv[0]))
    x = y = rowh = 0
    pos = {}
    for k, im in items:
        if x + im.width > maxw:
            x, y, rowh = 0, y + rowh + pad, 0
        pos[k] = (x, y)
        x += im.width + pad
        rowh = max(rowh, im.height)
    W = maxw if y > 0 else max(px + imgs[k].width for k, (px, _) in pos.items())
    H = y + rowh
    atlas = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    frames = {}
    for k, im in items:
        px, py = pos[k]
        atlas.alpha_composite(im, (px, py))
        frames[k] = {'frame': {'x': px, 'y': py, 'w': im.width, 'h': im.height}, 'rotated': False, 'trimmed': False,
                     'spriteSourceSize': {'x': 0, 'y': 0, 'w': im.width, 'h': im.height}, 'sourceSize': {'w': im.width, 'h': im.height}}
    wp = pub('atlas', f'{name}.webp')
    atlas.save(wp, 'WEBP', quality=q, method=6)
    json.dump({'frames': frames, 'meta': {'app': app, 'image': f'{name}.webp', 'format': 'RGBA8888', 'size': {'w': W, 'h': H}, 'scale': '1'}},
              open(pub('atlas', f'{name}.json'), 'w'), indent=1)
    print('atlas', name, W, H, os.path.getsize(wp) // 1024, 'KB')
    return atlas, frames
