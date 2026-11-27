#!/usr/bin/env python3
"""Empaqueta app + datos en UN único HTML autocontenido (para publicar como enlace). Uso: python3 pipeline/bundle_demo.py [--prov 09,28,...] --out demo.html
Sin Leaflet (las páginas publicadas no pueden cargar su CSS ni los mosaicos): usa un visor SVG propio con zoom y desplazamiento."""
import json, gzip, base64, re, sys, os, argparse
ap = argparse.ArgumentParser(); ap.add_argument('--prov'); ap.add_argument('--out', default='demo.html'); ap.add_argument('--eid', default='municipales-2023'); a = ap.parse_args()
D = f'data/{a.eid}'; provs = a.prov.split(',') if a.prov else sorted(f[:-5] for f in os.listdir(D + '/geo'))
def enc(g):  # MultiPolygon -> [[ [x0,y0,dx,dy,...] por anillo ] por polígono ], enteros 1e-5 grados
    out = []
    for poly in g['coordinates']:
        rs = []
        for ring in poly:
            pts = [(round(x * 1e5), round(y * 1e5)) for x, y in ring]; flat = [pts[0][0], pts[0][1]]
            for i in range(1, len(pts)): flat += [pts[i][0] - pts[i-1][0], pts[i][1] - pts[i-1][1]]
            rs.append(flat)
        out.append(rs)
    return out
blobs = {}
for p in provs:
    r = json.load(open(f'{D}/res/{p}.json')); g = json.load(open(f'{D}/geo/{p}.json'))
    feats = [[f['properties']['id'], 1 if f['properties'].get('nr') else 0, enc(f['geometry'])] for f in g['features']]
    blobs[p] = base64.b64encode(gzip.compress(json.dumps({'res': r, 'feats': feats}, separators=(',', ':')).encode(), 9)).decode()
index = [x for x in json.load(open(f'{D}/index.json')) if x[0][:2] in blobs]
val = json.load(open(f'{D}/validation.json'))
mods = {}
for n in ['calc', 'strength', 'dhondt', 'store', 'ui', 'dhondt_view', 'main']: mods[n] = open(f'js/{n}.js').read()
def wrap(name, src):
    names = re.findall(r'^export (?:const|function) (\w+)', src, re.M) + [x for m in re.findall(r'^export \{([^}]*)\}', src, re.M) for x in m.split(',')]
    src = re.sub(r"^import \* as (\w+) from '\./(\w+)\.js(?:\?v=\w+)?';?", lambda m: f'const {m.group(1)} = NS_{m.group(2)};', src, flags=re.M)
    src = re.sub(r"import \* as (\w+) from '\./(\w+)\.js(?:\?v=\w+)?';", lambda m: f'const {m.group(1)} = NS_{m.group(2)};', src)
    src = re.sub(r"import \{([^}]*)\} from '\./(\w+)\.js(?:\?v=\w+)?';", lambda m: f'const {{{m.group(1)}}} = NS_{m.group(2)};', src)
    src = re.sub(r'^export ', '', src, flags=re.M)
    return f'const NS_{name} = (() => {{\n{src}\nreturn {{{", ".join(n.strip() for n in names)}}};\n}})();\n'
data_js = '''const NS_data = (() => { const DB = window.__DB; const cache = {};
const un = async b64 => { const bin = Uint8Array.from(atob(b64), c => c.charCodeAt(0)); const s = new Blob([bin]).stream().pipeThrough(new DecompressionStream('gzip')); return JSON.parse(await new Response(s).text()); };
const dec = rs => ({ type: 'MultiPolygon', coordinates: rs.map(poly => poly.map(f => { let x = f[0], y = f[1]; const o = [[x / 1e5, y / 1e5]]; for (let i = 2; i < f.length; i += 2) { x += f[i]; y += f[i + 1]; o.push([x / 1e5, y / 1e5]); } return o; })) });
return { elections: async () => [{ id: DB.eid, label: DB.label }], index: async () => DB.index, validation: async () => DB.val,
 province: async (e, p) => { if (!cache[p]) cache[p] = un(DB.blobs[p]).then(j => ({ res: j.res, geo: { features: j.feats.map(([id, nr, g]) => ({ properties: nr ? { id, nr: 1 } : { id }, geometry: dec(g) })) } })); return cache[p]; } }; })();
'''
map_js = r'''const NS_map = (() => { let box, svg, g, tip, pop, leg, feats = [], vb, base0, lat0, k, styleFn, tipFn, popFn;
const P = (x, y) => [(x - base0[0]) * Math.cos(lat0 * Math.PI / 180) * k, (base0[1] - y) * k];
function init(id) { box = document.getElementById(id); box.style.position = 'relative'; box.style.overflow = 'hidden'; box.style.background = 'var(--bg)';
  box.innerHTML = '<svg style="width:100%;height:100%;touch-action:none;cursor:grab"><g></g></svg><div class="tip" hidden></div><div class="pp" hidden></div><div class="legend" style="position:absolute;left:10px;bottom:10px" hidden></div><div class="zb"><button data-z="1.5">+</button><button data-z="0.667">−</button></div>';
  svg = box.querySelector('svg'); g = svg.firstChild; tip = box.querySelector('.tip'); pop = box.querySelector('.pp'); leg = box.querySelector('.legend');
  let drag = null; svg.onpointerdown = e => { drag = { x: e.clientX, y: e.clientY, vb: [...vb], m: 0 }; };
  window.addEventListener('pointerup', () => { setTimeout(() => drag = null); });
  svg.onpointermove = e => { if (drag && vb) { const r = svg.getBoundingClientRect(), s = vb[2] / r.width; const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.m = Math.max(drag.m, Math.abs(dx) + Math.abs(dy)); vb[0] = drag.vb[0] - dx * s; vb[1] = drag.vb[1] - dy * s; apply(); } };
  svg.onwheel = e => { e.preventDefault(); zoom(e.deltaY < 0 ? 1.25 : .8, e); };
  box.querySelector('.zb').onclick = e => { const z = e.target.dataset.z; if (z) zoom(+z); };
  svg.onclick = e => { if (drag && drag.m > 4) return; const p = e.target.closest('path'); if (!p) { pop.hidden = true; return; } pop.innerHTML = '<button class="x">×</button>' + popFn(p.dataset.id); pop.hidden = false; pop.querySelector('.x').onclick = () => pop.hidden = true; };
  svg.onmouseover = e => { const p = e.target.closest('path'); if (p) { tip.textContent = tipFn(p.dataset.id); tip.hidden = false; } };
  svg.onmousemove = e => { const r = box.getBoundingClientRect(); tip.style.left = (e.clientX - r.left + 12) + 'px'; tip.style.top = (e.clientY - r.top + 12) + 'px'; };
  svg.onmouseout = () => tip.hidden = true; }
function apply() { svg.setAttribute('viewBox', vb.join(' ')); g.setAttribute('stroke-width', vb[2] / svg.getBoundingClientRect().width * .6); }
function zoom(f, e) { const r = svg.getBoundingClientRect(), px = e ? (e.clientX - r.left) / r.width : .5, py = e ? (e.clientY - r.top) / r.height : .5; const w = vb[2] / f, h = vb[3] / f; vb = [vb[0] + (vb[2] - w) * px, vb[1] + (vb[3] - h) * py, w, h]; apply(); }
function draw(features, sf, tf, pf) { styleFn = sf; tipFn = tf; popFn = pf; pop.hidden = true; feats = features; if (!features.length) { g.innerHTML = ''; return; }
  let mnx = 1e9, mxx = -1e9, mny = 1e9, mxy = -1e9; for (const f of features) for (const poly of f.geometry.coordinates) for (const [x, y] of poly[0]) { mnx = Math.min(mnx, x); mxx = Math.max(mxx, x); mny = Math.min(mny, y); mxy = Math.max(mxy, y); }
  base0 = [mnx, mxy]; lat0 = (mny + mxy) / 2; k = 100000; const [w, h] = P(mxx, mny); const r = svg.getBoundingClientRect(); const pad = .06 * Math.max(w, h);
  const asp = (r.width || 800) / (r.height || 600); let W = w + 2 * pad, H = h + 2 * pad; if (W / H < asp) W = H * asp; else H = W / asp; vb = [(w - W) / 2, (h - H) / 2, W, H];
  g.innerHTML = features.map(f => '<path data-id="' + f.properties.id + '" d="' + f.geometry.coordinates.map(poly => poly.map(ring => 'M' + ring.map(([x, y]) => P(x, y).map(v => v.toFixed(1)).join(',')).join('L') + 'Z').join('')).join('') + '" fill-rule="evenodd" stroke-linejoin="round"/>').join('');
  restyle(sf); apply(); }
function restyle(sf) { styleFn = sf; g.querySelectorAll('path').forEach(p => { const s = sf(p.dataset.id); p.setAttribute('fill', s.fillColor); p.setAttribute('fill-opacity', s.fillOpacity); p.setAttribute('stroke', s.color); if (s.dashArray) p.setAttribute('stroke-dasharray', '3'); else p.removeAttribute('stroke-dasharray'); }); }
function clear() { if (g) g.innerHTML = ''; if (pop) pop.hidden = true; showLegend(null); }
function showLegend(s) { if (!s) { leg.hidden = true; return; } leg.hidden = false; leg.innerHTML = '<b>' + s.title + '</b>' + s.items.map(i => '<div><i style="background:' + i.color + '"></i>' + i.label + '</div>').join(''); }
return { init, draw, restyle, clear, showLegend, toggleBase: () => {}, resize: () => { if (vb) apply(); } }; })();
'''
code = mods['calc'].replace('', '') 
js = wrap('calc', mods['calc']) + wrap('strength', mods['strength']) + wrap('dhondt', mods['dhondt']) + wrap('store', mods['store']) + data_js + map_js + wrap('ui', mods['ui']) + wrap('dhondt_view', mods['dhondt_view']) + wrap('main', mods['main'])
js = js.replace("const norm = s", "const norm = s", 1)
css = open('css/app.css').read()
css = css.replace('@media (prefers-color-scheme:dark){:root{', '@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){')
dark = re.search(r':root:not\(\[data-theme="light"\]\)\{([^}]*)\}', css).group(1)
css += f':root[data-theme="dark"]{{{dark}}}:root{{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}}\n.tip{{position:absolute;pointer-events:none;background:#111c;color:#fff;padding:4px 8px;border-radius:6px;font-size:12px;z-index:5;white-space:nowrap}}\n.pp{{position:absolute;right:12px;top:12px;background:var(--card);color:var(--ink);border:1px solid var(--line);border-radius:10px;padding:10px 12px;max-height:80%;overflow:auto;box-shadow:0 6px 24px #0004;z-index:6;max-width:300px}}.pp .x{{float:right;border:0;background:none;font-size:20px;cursor:pointer;color:var(--mut)}}\n.zb{{position:absolute;right:12px;bottom:12px;display:flex;flex-direction:column;gap:4px;z-index:4}}.zb button{{width:32px;height:32px;border:1px solid var(--line);background:var(--card);color:var(--ink);border-radius:8px;font-size:18px;cursor:pointer}}\n#base,label[for=base]{{display:none}}.chk:has(#base){{display:none}}\n'
db = {'eid': a.eid, 'label': 'Municipales 2023', 'index': index, 'val': val, 'blobs': blobs}
html = f'''<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"><title>Atlas electoral municipal · Municipales 2023</title><style>{css}</style></head><body data-view="mapa">
<header><div class="brand">Atlas electoral <small class="ver"></small></div><nav class="main-nav"><button data-view="mapa">Mapa</button><button data-view="concejales">Concejales</button></nav><select id="elec" hidden></select><div class="search"><input id="q" type="search" placeholder="Buscar municipio…" autocomplete="off"><ul id="results" hidden></ul></div>
<select id="mode"><option value="participacion">Participación</option><option value="votos">Votos de una candidatura</option><option value="pct">% de voto de una candidatura</option><option value="agregado">Suma</option><option value="fortaleza">Fortaleza</option><optgroup label="Ideología"><option value="g:izq">Izquierdas</option><option value="g:der">Derechas</option><option value="g:na">No alineadas</option></optgroup></select><select id="cand"></select><label class="chk"><input type="checkbox" id="base" checked></label></header>
<main><div id="map"></div><aside><nav id="tabs"></nav><div id="panel"></div></aside></main><section id="dh" hidden></section>
<script>window.__DB={json.dumps(db, ensure_ascii=False, separators=(',', ':'))};</script><script>{js}</script></body></html>'''
open(a.out, 'w').write(html); print(a.out, round(len(html) / 1e6, 2), 'MB;', len(blobs), 'provincias;', len(index), 'municipios')
