#!/usr/bin/env python3
"""Verificación independiente de Cruce: recalcula con NumPy/SciPy desde los datos por sección y compara con js/cruce.js."""
import json, subprocess, numpy as np
try: from scipy.stats import spearmanr
except ImportError: spearmanr = None
MUNIS = ['09059', '28079', '08019', '41091', '46250', '31201']   # Burgos, Madrid, Barcelona, Sevilla, Valencia, Pamplona
js = json.loads(subprocess.check_output(['node', 'tests/dump_cruce.mjs', *MUNIS]))
def rank(a):  # rangos promediados (si no hay SciPy)
    a = np.asarray(a); o = a.argsort(kind='stable'); r = np.empty(len(a)); i = 0
    while i < len(a):
        j = i
        while j + 1 < len(a) and a[o[j + 1]] == a[o[i]]: j += 1
        r[o[i:j + 1]] = (i + j) / 2 + 1; i = j + 1
    return r
worst = 0; checks = 0
for mun in MUNIS:
    res = json.load(open(f'data/municipales-2023/res/{mun[:2]}.json')); m = res['muni'][mun]; S = list(m['s'].values())
    cen = np.array([s[0] for s in S], float); bl = np.array([s[1] for s in S], float); nu = np.array([s[2] for s in S], float); ca = np.array([s[3] for s in S], float)
    top = js[mun]['top']; v = np.array([s[4].get(top, 0) for s in S], float)
    emi = bl + nu + ca; val = ca + bl; part = emi / cen * 100; pct = v / val * 100; V = v.sum(); BV = val.sum()
    X = {'part~pct': (part, pct), 'censo~votantes': (cen, emi), 'part~idx': (part, pct / (V / BV * 100)), 'peso~pct': (v / V * 100, pct), 'abst~blancos%': ((cen - emi) / cen * 100, bl / val * 100)}
    for k, (x, y) in X.items():
        ok = np.isfinite(x) & np.isfinite(y); x, y = x[ok], y[ok]; a = js[mun][k]
        sl, ic = np.polyfit(x, y, 1); r = np.corrcoef(x, y)[0, 1]; rho = spearmanr(x, y)[0] if spearmanr else np.corrcoef(rank(x), rank(y))[0, 1]
        assert a['n'] == len(x), (mun, k, a['n'], len(x))
        for name, mine, theirs in [('pendiente', a['slope'], sl), ('ordenada', a['intercept'], ic), ('r', a['r'], r), ('R2', a['r2'], r * r), ('rho', a['rho'], rho)]:
            err = abs(mine - theirs) / max(1, abs(theirs)); worst = max(worst, err); checks += 1
            assert err < 1e-9, (mun, k, name, mine, theirs)
print(f'OK: {checks} estadísticos en {len(MUNIS)} municipios x 5 cruces coinciden con NumPy{"/SciPy" if spearmanr else ""}; error relativo máximo {worst:.2e}')
print('secciones por municipio:', {k: v['n'] for k, v in js.items()})
