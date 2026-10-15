"""Composites the floor bake + every prop (y-sorted) into a small overview for the in-game map popup."""
import json, os
from PIL import Image
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '../..'))
LAY = json.load(open(os.path.join(os.path.dirname(__file__), '_layout.json')))
base = Image.open(os.path.join(ROOT, 'assets/maps/co-do-hue/tileset/hue-floor-bake.png')).convert('RGBA')
pdir = os.path.join(ROOT, 'assets/maps/co-do-hue/props')
props = sorted(LAY['props'], key=lambda p: (not p.get('wall'), p['y']))
for p in props:
    f = os.path.join(pdir, p['key'] + '.png')
    if not os.path.exists(f):
        continue
    im = Image.open(f).convert('RGBA')
    base.alpha_composite(im, (int(p['x'] - im.width / 2), int(p['y'] - im.height)))
# stations: small glowing markers are drawn by the UI, not baked
out = base.resize((base.width // 2, base.height // 2), Image.LANCZOS).convert('RGB')
dst = os.path.join(ROOT, 'apps/web/public/assets/maps/co-do-hue/meta/hue-map-preview.webp')
out.save(dst, 'WEBP', quality=86, method=6)
out.save(os.path.join(ROOT, 'assets/maps/co-do-hue/meta/hue-map-preview.png'))
print('preview', out.size, os.path.getsize(dst) // 1024, 'KB')
