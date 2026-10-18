"""Writes manifests/sai-gon.assets.json (both copies) from the painted Sài Gòn assets on disk.
  python3 tools/paint/sg_manifest.py   (re-run after sg_floor / sg_props / sg_minigames / sg_meta / draw-sai-gon)
Shape mirrors co-do-hue.assets.json; shared (common/*) entries are copied from it.
Entries whose files are not painted yet are left out, so the manifest never points at a missing file."""
import json
import os

from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '../..'))
PUBA = os.path.join(ROOT, 'apps/web/public/assets')
SLUG = 'sai-gon'
M = f'maps/{SLUG}'
HUE = json.load(open(os.path.join(PUBA, 'manifests/co-do-hue.assets.json')))
TASKS = ['task_chi_duong', 'task_com_tam', 'task_tieng_rao', 'task_ca_phe_phin', 'task_khui_hui',
         'task_do_xang', 'task_va_vo', 'task_so_hui', 'task_dem_tien', 'task_xep_xe']


def has(rel):
    return os.path.exists(os.path.join(PUBA, rel))


def size(rel):
    return list(Image.open(os.path.join(PUBA, rel)).size)


def atlas(name, by):
    if not has(f'{M}/atlas/{name}.json'):
        return None, None
    a = json.load(open(os.path.join(PUBA, M, 'atlas', f'{name}.json')))
    return a, {'name': name, 'file': f'{M}/atlas/{name}', 'size': [a['meta']['size']['w'], a['meta']['size']['h']],
               'generatedBy': f'{by} (procedural raster painting)'}


def tex(rel, by, **kw):
    """Texture entry for `rel` (path without extension) if its .webp exists."""
    return {'file': rel, 'size': size(f'{rel}.webp'), 'generatedBy': by, **kw} if has(f'{rel}.webp') else None


decor, decor_e = atlas('sg-decor-0', 'tools/paint/sg_props.py')
st, st_e = atlas('sg-stations-0', 'tools/paint/sg_minigames.py')

mg_dir = os.path.join(PUBA, M, 'minigames')
ui = {}
for f in sorted(os.listdir(mg_dir)) if os.path.isdir(mg_dir) else []:
    if f.startswith('sg-ui-') and f.endswith('.webp'):
        ui[f[:-5]] = {'file': f'{M}/minigames/{f}', 'size': size(f'{M}/minigames/{f}')[0], 'generatedBy': 'tools/paint/sg_minigames.py'}

textures = {
    'player': HUE['textures']['player'],
    # no Sài Gòn tile atlas: the floor bake covers every floor/wall; Huế's tileset stays as the fallback
    'tileset': {**HUE['textures']['tileset'], 'note': 'fallback (shared with co-do-hue); floors come from floor-bake'},
    'floor-bake': tex(f'{M}/tileset/sg-floor-bake', 'tools/paint/sg_floor.py',
                      note='asphalt/gạch bông/concrete floors + 3/4 tube-house walls + tin-roof sea + sodium lighting, baked for the common layout'),
    'map-preview': tex(f'{M}/meta/sg-map-preview', 'tools/paint/sg_meta.py'),
    'sg-map-icon': tex(f'{M}/meta/sg-map-icon', 'tools/paint/sg_meta.py'),
}
meta = {k: tex(f'{M}/meta/{k}', 'tools/paint/sg_meta.py') for k in ('home-bg', 'thumb')}
cards = {f'sg-card-{t}': tex(f'{M}/cards/sg-card-{t}', 'tools/paint/sg_meta.py') for t in TASKS}
sfx = {n: {'file': f'{M}/sfx/{n}.wav', 'generatedBy': 'tools/sfx/draw-sai-gon.mjs'}
       for n in ('coi-xe', 'to-te', 'go-hu-tieu') if has(f'{M}/sfx/{n}.wav')}
drop = lambda d: {k: v for k, v in d.items() if v is not None}  # noqa: E731

d = {
    'mapSlug': SLUG,
    'mapVersion': 1,
    'layoutVersion': HUE['layoutVersion'],
    'tileSize': 48,
    'skin': SLUG,
    'generatedBy': 'tools/paint/sg_*.py + tools/sfx/draw-sai-gon.mjs (procedural, offline)',
    'atlases': [a for a in (decor_e, st_e) if a],
    'textures': drop(textures),
    'areas': HUE['areas'],
    'props': {k: {'atlas': 'sg-decor-0', 'size': [v['frame']['w'], v['frame']['h']], 'anchor': [0.5, 1],
                  **({'footprint': [48, 48]} if k.startswith('sg-prop-') else {})} for k, v in (decor or {'frames': {}})['frames'].items()},
    'stations': [{'key': k, 'atlas': 'sg-stations-0', 'size': [v['frame']['w'], v['frame']['h']], 'display': [52, 52], 'hitbox': [96, 96]}
                 for k, v in (st or {'frames': {}})['frames'].items() if k.startswith('sg-station-')],
    'ui': {**HUE['ui'], **({'task-marker': {'size': 64, 'atlas': 'sg-stations-0'}} if st else {}), **ui},
    'roles': HUE['roles'],
    'story': 'phien-hui-chui',
    # mini-games are SVG/CSS (apps/web/src/ui/minigames/sai-gon), no raster art
    'minigames': {},
    'cards': drop(cards),
    'meta': drop(meta),
    'sfx': sfx,
}
for rel in (f'assets/manifests/{SLUG}.assets.json', f'apps/web/public/assets/manifests/{SLUG}.assets.json'):
    with open(os.path.join(ROOT, rel), 'w') as fh:
        json.dump(d, fh, indent=1, ensure_ascii=False)
        fh.write('\n')
    print('wrote', rel, len(d['props']), 'props', len(d['stations']), 'stations', len(ui), 'ui', len(d['cards']), 'cards', len(sfx), 'sfx')
