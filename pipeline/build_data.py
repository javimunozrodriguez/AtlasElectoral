#!/usr/bin/env python3
"""Genera data/ a partir de los ficheros oficiales (DAT de Infoelectoral + shapefile INE).
Uso: python3 pipeline/build_data.py --dat <dir DAT> --shp <dir shapefile> --config config/municipales_2023.json --out data
Solo requiere numpy. No inventa ni estima datos: lo que no casa se registra en validation.json."""
import argparse, json, glob, os, struct, collections
import numpy as np

def read_fixed(path, enc, fields):
    return [{k: l[a-1:b] for k, (a, b) in fields.items()} for l in open(path, 'rb').read().decode(enc).splitlines()]

def read_dbf(path):
    f = open(path, 'rb').read(); n, hl, rl = struct.unpack('<IHH', f[4:12]); fl = []; p = 32
    while f[p] != 0x0D: fl.append((f[p:p+11].split(b'\0')[0].decode(), f[p+16])); p += 32
    rows = []
    for i in range(n):
        rec = f[hl+i*rl+1: hl+(i+1)*rl]; q = 0; r = {}
        for nm, ln in fl: r[nm] = rec[q:q+ln].decode('utf-8', 'replace').strip(); q += ln
        rows.append(r)
    return rows

def read_shp(path):
    s = open(path, 'rb').read(); pos = 100; out = []
    while pos < len(s):
        _, cl = struct.unpack('>2i', s[pos:pos+8]); b = s[pos+8:pos+8+cl*2]; pos += 8 + cl*2
        npart, npts = struct.unpack('<2i', b[36:44])
        parts = list(struct.unpack('<%di' % npart, b[44:44+4*npart])) + [npts]
        pts = np.frombuffer(b, '<f8', npts*2, 44+4*npart).reshape(-1, 2)
        out.append([pts[parts[i]:parts[i+1]] for i in range(npart)])
    return out

def utm30_to_wgs84(xy):  # ETRS89 / UTM 30N -> lon, lat (GRS80)
    a = 6378137.0; f = 1/298.257222101; e2 = f*(2-f); ep2 = e2/(1-e2); k0 = 0.9996
    x = xy[:, 0]-500000.0; M = xy[:, 1]/k0
    mu = M/(a*(1-e2/4-3*e2**2/64-5*e2**3/256)); e1 = (1-np.sqrt(1-e2))/(1+np.sqrt(1-e2))
    p = (mu+(3*e1/2-27*e1**3/32)*np.sin(2*mu)+(21*e1**2/16-55*e1**4/32)*np.sin(4*mu)
         +(151*e1**3/96)*np.sin(6*mu)+(1097*e1**4/512)*np.sin(8*mu))
    C1 = ep2*np.cos(p)**2; T1 = np.tan(p)**2; s2 = np.sin(p)**2
    N1 = a/np.sqrt(1-e2*s2); R1 = a*(1-e2)/(1-e2*s2)**1.5; D = x/(N1*k0)
    lat = p-(N1*np.tan(p)/R1)*(D**2/2-(5+3*T1+10*C1-4*C1**2-9*ep2)*D**4/24+(61+90*T1+298*C1+45*T1**2-252*ep2-3*C1**2)*D**6/720)
    lon = np.radians(-3.0)+(D-(1+2*T1+C1)*D**3/6+(5-2*C1+28*T1-3*C1**2+8*ep2+24*T1**2)*D**5/120)/np.cos(p)
    return np.degrees(lon), np.degrees(lat)

def dp(pts, tol):  # Douglas-Peucker iterativo sobre anillo cerrado
    n = len(pts)
    if n <= 5: return pts
    keep = np.zeros(n, bool); keep[0] = keep[-1] = True
    far = int(np.argmax(np.hypot(*(pts-pts[0]).T))); keep[far] = True
    stack = [(0, far), (far, n-1)]
    while stack:
        i, j = stack.pop()
        if j <= i+1: continue
        a, b = pts[i], pts[j]; seg = pts[i+1:j]; d = b-a; L = np.hypot(*d)
        dist = np.hypot(*(seg-a).T) if L == 0 else np.abs(d[0]*(seg[:, 1]-a[1])-d[1]*(seg[:, 0]-a[0]))/L
        k = int(np.argmax(dist))
        if dist[k] > tol: m = i+1+k; keep[m] = True; stack += [(i, m), (m, j)]
    return pts[keep]

def geom(rings, tol):
    polys = []
    for r in rings:
        s = dp(r, tol)
        if len(s) < 4: continue
        area = 0.5*np.sum(s[:-1, 0]*s[1:, 1]-s[1:, 0]*s[:-1, 1])
        lon, lat = utm30_to_wgs84(s); c = np.round(np.column_stack([lon, lat]), 5).tolist()
        if area < 0: polys.append([c])      # horario = exterior (convención shapefile)
        elif polys: polys[-1].append(c)      # antihorario = hueco
    return {"type": "MultiPolygon", "coordinates": polys}

def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--dat', required=True); ap.add_argument('--shp', required=True)
    ap.add_argument('--config', required=True); ap.add_argument('--out', default='data'); ap.add_argument('--tol', type=float, default=4.0)
    a = ap.parse_args(); cfg = json.load(open(a.config)); eid = cfg['id']
    fpath = lambda k: os.path.join(a.dat, cfg['files'][k] + cfg['suffix'] + '.DAT')
    R = {k: read_fixed(fpath(k), cfg['encoding'][k], cfg['fields'][k]) for k in cfg['files']}
    I = lambda s: int(s) if s.strip() else 0
    sh = cfg['shapefile']; base = glob.glob(os.path.join(a.shp, '**', sh['name'] + '.shp'), recursive=True)[0][:-4]
    attrs = read_dbf(base+'.dbf'); shapes = read_shp(base+'.shp'); TD = cfg['totalDistrict']
    cands = {c['cod']: c['siglas'].strip() for c in R['cands']}
    # mesas -> secciones: suma de votos originales
    secs = {}; mesa_keys = set(); dup = 0; mesa_inc = []
    mc = collections.defaultdict(lambda: collections.defaultdict(int))
    for r in R['mesa_c']: mc[(r['pro'], r['mun'], r['dis'], r['sec'], r['mesa'])][r['cod']] += I(r['votos'])
    for r in R['mesa']:
        mk = (r['pro'], r['mun'], r['dis'], r['sec'], r['mesa'])
        if mk in mesa_keys: dup += 1
        mesa_keys.add(mk); key = r['pro']+r['mun']+r['dis']+r['sec']
        s = secs.setdefault(key, [0, 0, 0, 0, collections.defaultdict(int)])
        s[0] += I(r['censo_esc']); s[1] += I(r['blancos']); s[2] += I(r['nulos']); s[3] += I(r['cand'])
        v = mc.get(mk, {})
        if sum(v.values()) != I(r['cand']): mesa_inc.append({"mesa": '-'.join(mk), "cand09": I(r['cand']), "suma10": sum(v.values())})
        for c, n in v.items(): s[4][c] += n
    muni = {}
    for r in R['muni']:
        if r['dis'] == TD:
            muni[r['pro']+r['mun']] = dict(n=r['nombre'].strip(), pob=I(r['pob']), t=[I(r['censo_esc']), I(r['blancos']), I(r['nulos']), I(r['cand']), I(r['esc'])])
    for r in R['muni_c']:
        if r['dis'] == TD and r['pro']+r['mun'] in muni:
            muni[r['pro']+r['mun']].setdefault('off', {})[r['cod']] = [I(r['votos']), I(r['conc'])]
    small = {r['pro']+r['mun']: dict(n=r['nombre'].strip(), pob=I(r['pob']), t=[I(r['censo_esc']), I(r['blancos']), I(r['nulos']), I(r['cand']), 0], small=1) for r in R['small']}
    A = {at[sh['key']]: (at, g) for at, g in zip(attrs, shapes)}
    cart_muni = {at[sh['muni']]: (at[sh['muniName']], at[sh['pro']], at[sh['proName']]) for at, _ in A.values()}
    res_keys, cart_keys = set(secs), set(A)
    bymuni = collections.defaultdict(lambda: [0, 0, 0, 0])
    for k, s in secs.items():
        for i in range(4): bymuni[k[:5]][i] += s[i]
    diffs = []
    for m, d in muni.items():
        sm = bymuni.get(m, [0]*4)
        if sm != d['t'][:4]: d['diff'] = 1; diffs.append({"muni": m, "nombre": d['n'], "oficial": d['t'][:4], "suma_secciones": sm})
    os.makedirs(os.path.join(a.out, eid, 'geo'), exist_ok=True); os.makedirs(os.path.join(a.out, eid, 'res'), exist_ok=True)
    byp = collections.defaultdict(dict)
    for k, s in secs.items(): byp[k[:2]].setdefault(k[:5], {})[k] = [s[0], s[1], s[2], s[3], dict(s[4])]
    index = []; unmatched_poly = []; missing = []
    for m, (nm, pro, npro) in sorted(cart_muni.items()):
        st = 2 if m in muni else 1 if m in small else 0
        if st == 0: missing.append({"muni": m, "nombre": nm, "provincia": npro})
        index.append([m, nm, npro, st])
    for p in sorted({m[:2] for m in cart_muni}):
        feats = []; res = {"cands": {}, "muni": {}}
        for m in [m for m in cart_muni if m[:2] == p]:
            if m in muni:
                d = muni[m]; d['s'] = byp[p].get(m, {}); res['muni'][m] = d
                for c in list(d.get('off', {})) + [c for s in d['s'].values() for c in s[4]]: res['cands'][c] = cands.get(c, '?')
                for k in sorted(kk for kk in cart_keys if kk.startswith(m)):
                    if k in res_keys: feats.append({"type": "Feature", "properties": {"id": k}, "geometry": geom(A[k][1], a.tol)})
                    else:
                        unmatched_poly.append({"seccion": k, "muni": cart_muni[m][0]})
                        feats.append({"type": "Feature", "properties": {"id": k, "nr": 1}, "geometry": geom(A[k][1], a.tol)})
            elif m in small: res['muni'][m] = small[m]
        json.dump({"type": "FeatureCollection", "features": feats}, open(os.path.join(a.out, eid, 'geo', p+'.json'), 'w'), separators=(',', ':'))
        json.dump(res, open(os.path.join(a.out, eid, 'res', p+'.json'), 'w'), separators=(',', ':'))
    unmatched_res = [{"seccion": k, "censo": secs[k][0], "votos_cand": secs[k][3]} for k in sorted(res_keys - cart_keys)]
    over100 = [{"seccion": k, "censo": s[0], "votantes": s[1]+s[2]+s[3]} for k, s in secs.items() if s[0] and s[1]+s[2]+s[3] > s[0]]
    json.dump(index, open(os.path.join(a.out, eid, 'index.json'), 'w'), ensure_ascii=False, separators=(',', ':'))
    cmp = collections.defaultdict(int)
    for k, s in secs.items():
        for c, n in s[4].items(): cmp[(k[:5], c)] += n
    d06 = sum(1 for m, d in muni.items() for c, (v, _) in d.get('off', {}).items() if cmp.get((m, c), 0) != v)
    val = {"eleccion": eid, "mesas": len(R['mesa']), "mesas_duplicadas": dup, "mesas_inconsistentes_09_10": mesa_inc,
           "secciones_con_resultados": len(secs), "poligonos": len(A), "municipios_con_mesas": len(muni), "municipios_menores_250": len(small),
           "resultados_sin_poligono": unmatched_res, "poligonos_sin_resultados_en_municipios_con_mesas": unmatched_poly,
           "poligonos_municipios_menores_250": sum(1 for at, _ in A.values() if at[sh['muni']] in small),
           "municipios_sin_resultados": missing, "municipios_diferencia_oficial_vs_secciones": diffs,
           "pares_municipio_candidatura_06_vs_10_distintos": d06, "secciones_participacion_mayor_100": over100}
    json.dump(val, open(os.path.join(a.out, eid, 'validation.json'), 'w'), ensure_ascii=False, indent=1)
    json.dump({"elections": [{"id": eid, "label": cfg['label']}]}, open(os.path.join(a.out, 'elections.json'), 'w'))
    print({k: (len(v) if isinstance(v, list) else v) for k, v in val.items()})
main()
