"""Registers the painted assets (tools/paint) in manifests/co-do-hue.assets.json (both copies)."""
import json, os, re
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '../..'))
atlas = json.load(open(os.path.join(ROOT, 'apps/web/public/assets/maps/co-do-hue/atlas/hue-decor-0.json')))
for rel in ('assets/manifests/co-do-hue.assets.json', 'apps/web/public/assets/manifests/co-do-hue.assets.json'):
    p = os.path.join(ROOT, rel)
    d = json.load(open(p))
    d['atlases'] = [a for a in d['atlases'] if a['name'] != 'hue-decor-0'] + [{'name': 'hue-decor-0', 'file': 'maps/co-do-hue/atlas/hue-decor-0', 'size': [atlas['meta']['size']['w'], atlas['meta']['size']['h']], 'generatedBy': 'tools/paint/props.py (procedural raster painting)'}]
    d['textures']['floor-bake'] = {'file': 'maps/co-do-hue/tileset/hue-floor-bake', 'size': [2016, 1536], 'generatedBy': 'tools/paint/floor.py', 'note': 'floors + 3/4 walls + rugs + lighting baked for the common layout'}
    d['textures']['map-preview'] = {'file': 'maps/co-do-hue/meta/hue-map-preview', 'size': [1008, 768], 'generatedBy': 'tools/paint/preview.py'}
    for k, v in atlas['frames'].items():
        d['props'][k] = {**(d['props'].get(k) or {}), 'atlas': 'hue-decor-0', 'size': [v['frame']['w'], v['frame']['h']], 'anchor': [0.5, 1]}
    d['cards'] = {f'hue-card-{t}': {'file': f'maps/co-do-hue/cards/hue-card-{t}', 'size': [640, 400], 'generatedBy': 'tools/paint/cards.py'} for t in
                  ['task_moon_phase', 'task_woodblock_print', 'task_ngo_mon_gates', 'task_court_ranks', 'task_nha_nhac', 'task_cuu_dinh', 'task_poem_wall', 'task_royal_seal', 'task_banh_beo']}
    d['ui'].update({n: {'file': f'common/ui/meeting/{n}', 'generatedBy': 'tools/paint/ui.py'} for n in ['meeting-bg', 'seal-eject', 'seal-skip', 'stamp-voted', 'den-cung-dinh', 'chuong-ngu-phung']})
    d['ui'].update({n: {'file': f'common/ui/fx/{n}', 'generatedBy': 'tools/paint/fx.py', **({'frames': 8, 'frameSize': [256, 256]} if n.startswith('fx-') else {})} for n in
                    ['fx-kill-slash', 'fx-shield-block', 'fx-report-burst', 'fx-witness', 'spark', 'ink-drop', 'ink-splat', 'brush-stroke']})
    for k in list(d.get('minigames', {})):
        if isinstance(d['minigames'][k], dict):
            d['minigames'][k]['generatedBy'] = 'tools/paint/minigames.py'
    json.dump(d, open(p, 'w'), ensure_ascii=False, indent=1)
    print('manifest', rel)
