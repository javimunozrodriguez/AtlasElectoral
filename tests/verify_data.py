#!/usr/bin/env python3
"""Verificación independiente: recalcula desde los .DAT originales (otro código que el pipeline) y compara con data/.
Uso: python3 tests/verify_data.py <dir DAT> <dir data/municipales-2023>"""
import sys, json, glob, collections
dat, out = sys.argv[1], sys.argv[2]
rd = lambda f, enc='utf-8': open(f'{dat}/{f}042305.DAT', 'rb').read().decode(enc).splitlines()
secs = collections.defaultdict(lambda: [0, 0, 0, 0]); votes = collections.defaultdict(int)
for l in rd('09'):
    k = l[11:13]+l[13:16]+l[16:18]+l[18:21]; s = secs[k]
    for i, (a, b) in enumerate([(30, 37), (65, 72), (72, 79), (79, 86)]): s[i] += int(l[a:b])
for l in rd('10'): votes[(l[11:13]+l[13:16]+l[16:18]+l[18:21], l[23:29])] += int(l[29:36])
gen = {}; geo = {}
for f in glob.glob(out+'/res/*.json'):
    for m, d in json.load(open(f))['muni'].items():
        for k, s in d.get('s', {}).items(): gen[k] = s
for f in glob.glob(out+'/geo/*.json'):
    for ft in json.load(open(f))['features']: geo[ft['properties']['id']] = ft
bad = 0
for k, s in secs.items():
    g = gen.get(k)
    if g is None or g[:4] != s: bad += 1
for (k, c), v in votes.items():
    if gen[k][4].get(c, 0) != v: bad += 1
print('secciones recalculadas:', len(secs), '| generadas:', len(gen), '| diferencias:', bad)
# totales nacionales
print('suma nacional  censo/blancos/nulos/cand:', [sum(s[i] for s in secs.values()) for i in range(4)])
# cada polígono con resultados: ¿cae dentro del bbox de su provincia? (lon/lat plausibles para España)
out_bbox = [k for k, f in geo.items() if not f['properties'].get('nr') and not all(-19 < x < 5 and 27 < y < 44.5 for p in f['geometry']['coordinates'] for x, y in p[0])]
print('polígonos con coordenadas fuera de España:', len(out_bbox), '| polígonos con geometría:', len(geo), '| geometrías vacías:', sum(1 for f in geo.values() if not f['geometry']['coordinates']))
assert bad == 0 and not out_bbox
print('OK verificación de datos')
