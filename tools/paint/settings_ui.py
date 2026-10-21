"""Painted UI assets for the lobby settings popup and the in-game alive counter (tools/paint)."""
import os, sys, math
sys.path.insert(0, os.path.dirname(__file__))
import lib
from lib import Mat
import props as PR
ROOT = PR.ROOT
PUB = os.path.join(ROOT, 'apps/web/public/assets/maps/common/ui')
SRC = os.path.join(ROOT, 'assets/maps/common/ui')
os.makedirs(PUB, exist_ok=True); os.makedirs(SRC, exist_ok=True)

def save(name, im, q=90):
    im.save(os.path.join(SRC, name + '.png'), optimize=True)
    im.save(os.path.join(PUB, name + '.webp'), 'WEBP', quality=q, method=6)
    print('ui', name, im.size)

LACQUER = Mat('#7a1d14', shine=0.6, rough=30, amb=0.4, diff=0.8, tex=lib.tex_noise(0.1, 4, 81))
SHADOWM = Mat('#2a1838', shine=0.45, rough=26, amb=0.35, diff=0.75, tex=lib.tex_noise(0.14, 5, 82))

# 1) settings: brass gear on a lacquer disc
p = PR.P(96, 96)
p.shadow(48, 56, 40, 40, 0.45, 0.4)
p.blob(48, 48, 40, 40, LACQUER, flat=0.45)
p.ring(48, 48, 36, 36, 1.6, PR.BRASS)
for k in range(8):
    a0 = k / 8 * 2 * math.pi
    p.blob(48 + math.cos(a0) * 24, 48 + math.sin(a0) * 24, 7, 7, PR.BRASS, flat=0.6)
p.blob(48, 48, 22, 22, PR.BRASS, flat=0.5)
p.blob(48, 48, 9, 9, LACQUER, flat=0.4)
p.ring(48, 48, 9, 9, 1.2, PR.DWOOD)
save('settings', p.image())

# 2) slider thumb: brass coin with a square hole (đồng tiền)
p = PR.P(64, 64)
p.shadow(32, 37, 26, 26, 0.45, 0.4)
p.blob(32, 32, 26, 26, PR.BRASS, flat=0.5)
p.ring(32, 32, 21, 21, 1.4, PR.DWOOD)
p.rect(25, 25, 39, 39, '#3a1d0c', r=1.5)
save('slider-thumb', p.image())

# 3) alive counter: villager (jade bust) and shadow (violet hooded bust)
def bust(mat, hood):
    p = PR.P(64, 64)
    p.shadow(32, 58, 22, 5, 0.4, 0.5)
    p.blob(32, 50, 22, 14, mat, flat=0.55)
    if hood:
        p.blob(32, 26, 15, 17, mat, flat=0.5)
        p.ell(32, 29, 9, 10, '#0c0710')
        p.ell(28, 28, 1.8, 1.8, '#f05a4a'); p.ell(36, 28, 1.8, 1.8, '#f05a4a')
    else:
        p.blob(32, 26, 12, 12, PR.CREAM, flat=0.55)
        p.poly([(14, 22), (32, 8), (50, 22)], Mat('#c9a35a', shine=0.2, rough=10, amb=0.5, diff=0.6))
    return p.image()
save('count-crew', bust(PR.JADE, False))
save('count-killer', bust(SHADOWM, True))
