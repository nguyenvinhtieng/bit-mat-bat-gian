"""Painted UI assets for the meeting / vote screen and cinematic FX (tools/paint)."""
import os, sys, math
import numpy as np
from PIL import Image, ImageFilter
sys.path.insert(0, os.path.dirname(__file__))
import lib
from lib import Mat, hexc
import props as PR
ROOT = PR.ROOT
PUB = os.path.join(ROOT, 'apps/web/public/assets/common/ui/meeting')
SRC = os.path.join(ROOT, 'assets/common/ui/meeting')
os.makedirs(PUB, exist_ok=True); os.makedirs(SRC, exist_ok=True)

def save(name, im, q=88):
    im.save(os.path.join(SRC, name + '.png'), optimize=True)
    im.save(os.path.join(PUB, name + '.webp'), 'WEBP', quality=q, method=6)
    print('ui', name, im.size)

# 1) backdrop: the throne hall, blurred + darkened (depth of field behind the vote UI)
prev = Image.open(os.path.join(ROOT, 'assets/maps/co-do-hue/meta/hue-map-preview.png')).convert('RGB')
crop = prev.crop((24, 140, 24 + 330, 140 + 186)).resize((1280, 720), Image.LANCZOS).filter(ImageFilter.GaussianBlur(5))
a = np.asarray(crop).astype(np.float32) / 255
yy, xx = np.mgrid[0:720, 0:1280].astype(np.float32)
vig = np.clip(1 - (((xx - 640) / 820) ** 2 + ((yy - 360) / 470) ** 2), 0.15, 1)
a = a * 0.5 * vig[..., None]
save('meeting-bg', Image.fromarray((a * 255).astype(np.uint8)), 80)

# 2) wax-seal vote token (red lacquer seal with gold ring) — "voted" stamp + eject icon
p = PR.P(96, 96)
p.shadow(48, 56, 40, 40, 0.45, 0.4)
p.blob(48, 48, 40, 40, Mat('#a8231a', shine=0.6, rough=30, amb=0.4, diff=0.8, tex=lib.tex_noise(0.12, 4, 71)), flat=0.45)
p.ring(48, 48, 33, 33, 2.2, PR.GOLD)
p.ring(48, 48, 26, 26, 0.9, PR.GOLD)
for k in range(8):
    a0 = k / 8 * 2 * math.pi
    p.blob(48 + math.cos(a0) * 38, 48 + math.sin(a0) * 38, 6, 6, Mat('#a8231a', shine=0.5, rough=26, amb=0.4, diff=0.8), flat=0.5)
p.line([(36, 36), (60, 60)], 4.5, '#f3c860'); p.line([(60, 36), (36, 60)], 4.5, '#f3c860')
save('seal-eject', p.image())
# 3) skip token (jade disc with a gold dash)
p = PR.P(96, 96)
p.shadow(48, 56, 40, 40, 0.45, 0.4)
p.blob(48, 48, 40, 40, PR.JADE, flat=0.45)
p.ring(48, 48, 33, 33, 2.2, PR.GOLD)
p.line([(32, 48), (64, 48)], 5, '#f3c860')
save('seal-skip', p.image())
# 4) "voted" ink stamp (square seal, cinnabar)
p = PR.P(96, 96)
L = p.L
m = lib.rect_mask(L.w, L.h, 10 * 4, 10 * 4, 86 * 4, 86 * 4, 6 * 4) - lib.rect_mask(L.w, L.h, 18 * 4, 18 * 4, 78 * 4, 78 * 4, 3 * 4)
n = lib.fbm(L.h, L.w, 6, 3, 72)
lib.paint(L, np.clip(m, 0, 1) * (n > 0.32), '#c8321f')
p.line([(28, 50), (42, 64), (70, 32)], 7, '#c8321f')
save('stamp-voted', p.image())
# 5) lantern + bell for the header corners
for key in ('hue-prop-den-cung-dinh', 'hue-prop-chuong-ngu-phung'):
    w, h, fn = PR.REG[key]
    pp = PR.P(w, h); fn(pp)
    save(key.replace('hue-prop-', ''), pp.L.image((w * 2, h * 2)))
