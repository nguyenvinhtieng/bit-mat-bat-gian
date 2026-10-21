"""Writes maps/thang-long/thang-long.assets.json (both copies) from the painted Thăng Long assets on disk.
  python3 tools/paint/tl_manifest.py   (run after tl_floor / tl_props / tl_minigames / tl_meta / draw-thang-long)
Shape mirrors co-do-hue.assets.json; shared (common/*) entries are copied from it."""
import json
import os

from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '../..'))
PUBA = os.path.join(ROOT, 'apps/web/public/assets')
SLUG = 'thang-long'
M = f'maps/{SLUG}'
HUE = json.load(open(os.path.join(PUBA, 'maps/co-do-hue/co-do-hue.assets.json')))
TASKS = ['task_banh_chung', 'task_dong_ho', 'task_cho_chu', 'task_cay_neu', 'task_cau_doi', 'task_ngu_qua', 'task_ca_tru', 'task_roi_nuoc']


def atlas(name):
    a = json.load(open(os.path.join(PUBA, M, 'atlas', f'{name}.json')))
    return a, {'name': name, 'file': f'{M}/atlas/{name}', 'size': [a['meta']['size']['w'], a['meta']['size']['h']]}


def size(rel):
    return list(Image.open(os.path.join(PUBA, rel)).size)


decor, decor_e = atlas('tl-decor-0')
st, st_e = atlas('tl-stations-0')
decor_e['generatedBy'] = 'tools/paint/tl_props.py (procedural raster painting)'
st_e['generatedBy'] = 'tools/paint/tl_minigames.py (procedural raster painting)'

mg_dir = os.path.join(PUBA, M, 'minigames')
mg = {}
for f in sorted(os.listdir(mg_dir)):
    if f.endswith('.webp'):
        k = f[:-5]
        mg[k] = {'file': f'{M}/minigames/{f}', 'size': size(f'{M}/minigames/{f}'), 'generatedBy': 'tools/paint/tl_minigames.py'}

d = {
    'mapSlug': SLUG,
    'mapVersion': 1,
    'layoutVersion': HUE['layoutVersion'],
    'tileSize': 48,
    'skin': 'thang-long',
    'generatedBy': 'tools/paint/tl_*.py + tools/sfx/draw-thang-long.mjs (procedural, offline)',
    'atlases': [decor_e, st_e],
    'textures': {
        'player': HUE['textures']['player'],
        # no Thăng Long tile atlas: the floor bake covers every floor/wall; Huế's tileset stays as the fallback
        'tileset': {**HUE['textures']['tileset'], 'note': 'fallback (shared with co-do-hue); floors come from floor-bake'},
        'tl-map-icon': {'file': f'{M}/meta/tl-map-icon.webp', 'size': [128, 128]},
        'floor-bake': {'file': f'{M}/tileset/tl-floor-bake', 'size': [2016, 1536], 'generatedBy': 'tools/paint/tl_floor.py',
                       'note': 'floors + 3/4 walls + lake + lantern lighting baked for the common layout'},
        'map-preview': {'file': f'{M}/meta/tl-map-preview', 'size': [1008, 768], 'generatedBy': 'tools/paint/tl_meta.py'},
    },
    'areas': HUE['areas'],
    'props': {k: {'atlas': 'tl-decor-0', 'size': [v['frame']['w'], v['frame']['h']], 'anchor': [0.5, 1],
                  **({'footprint': [48, 48]} if k.startswith('tl-prop-') else {})} for k, v in decor['frames'].items()},
    'stations': [{'key': k, 'atlas': 'tl-stations-0', 'size': [v['frame']['w'], v['frame']['h']], 'display': [52, 52], 'hitbox': [96, 96]}
                 for k, v in st['frames'].items() if k.startswith('tl-station-')],
    'ui': {**HUE['ui'], 'task-marker': {'size': 64, 'atlas': 'tl-stations-0'},
           **{k: {'file': v['file'], 'size': v['size'][0]} for k, v in mg.items() if k.startswith('tl-ui-')}},
    'roles': HUE['roles'],
    'story': 'dem-giao-thua',
    'minigames': {k: v for k, v in mg.items() if k.startswith('tl-mg-')},
    'cards': {f'tl-card-{t}': {'file': f'{M}/cards/tl-card-{t}', 'size': [640, 400], 'generatedBy': 'tools/paint/tl_meta.py'} for t in TASKS},
    'meta': {
        'home-bg': {'file': f'{M}/meta/home-bg.webp', 'size': [1920, 1080], 'generatedBy': 'tools/paint/tl_meta.py'},
        'thumb': {'file': f'{M}/meta/thumb.webp', 'size': [640, 360], 'generatedBy': 'tools/paint/tl_meta.py'},
    },
    'sfx': {n: {'file': f'{M}/sfx/{n}.wav', 'generatedBy': 'tools/sfx/draw-thang-long.mjs'} for n in ['phao', 'trong-chau-tom', 'trong-chau-chat']},
}
for rel in (f'assets/maps/{SLUG}/{SLUG}.assets.json', f'apps/web/public/assets/maps/{SLUG}/{SLUG}.assets.json'):
    with open(os.path.join(ROOT, rel), 'w') as fh:
        json.dump(d, fh, indent=1, ensure_ascii=False)
        fh.write('\n')
    print('wrote', rel, len(d['props']), 'props', len(d['stations']), 'stations', len(d['minigames']), 'mg')
