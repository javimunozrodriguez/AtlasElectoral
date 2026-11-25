// Orquestación: estado, selección de municipio, modalidades de mapa y paneles.
import * as D from './data.js'; import * as C from './calc.js'; import { classify } from './strength.js'; import * as M from './map.js'; import * as U from './ui.js';
const $ = s => document.querySelector(s);
const BLUES = ['#eff3ff', '#bdd7e7', '#6baed6', '#3182bd', '#08519c'], GREENS = ['#edf8e9', '#bae4b3', '#74c476', '#31a354', '#006d2c'], PURPLES = ['#f2f0f7', '#cbc9e2', '#9e9ac8', '#756bb1', '#54278f'];
const RAMP = { participacion: GREENS, votos: BLUES, pct: BLUES, agregado: PURPLES };
const CATCOL = { fuerte: '#0b4f9c', medio: '#7fb2de', debil: '#dbe9f6', sin: '#d9d9d9', na: '#d9d9d9' };
const S = { election: null, index: [], cumun: null, muni: null, cands: {}, base: null, geo: [], provName: '', mode: 'participacion', cand: null, sel: new Set(), tab: 'resumen', tabs: 'abs', useAgg: false, val: null, view: null };
const norm = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const MODE_TAB = { participacion: 'resumen', votos: 'resultados', pct: 'resultados', agregado: 'agregacion', fortaleza: 'fortaleza' };

function targetCods() { return S.mode === 'agregado' || (S.mode === 'fortaleza' && S.useAgg) ? [...S.sel] : [S.cand]; }
function compute() {
  const secs = S.muni.s, base = S.base, BV = base[3] + base[1], cods = targetCods(), V = C.votesOf(base, cods);
  const vals = {}, counts = { fuerte: 0, medio: 0, debil: 0, sin: 0, na: 0 };
  for (const [id, s] of Object.entries(secs)) {
    const t = C.totals(s), vs = C.votesOf(s, cods);
    if (S.mode === 'participacion') vals[id] = t.part;
    else if (S.mode === 'votos') vals[id] = vs;
    else if (S.mode === 'fortaleza') { const r = classify(vs, t.validos, V, BV); vals[id] = r; counts[r.cat]++; }
    else vals[id] = C.pct(vs, t.validos);
  }
  const v = { vals, counts, V, BV, cods, label: cods.map(c => S.cands[c] || c).join(' + ') };
  if (S.mode === 'fortaleza') v.legend = { title: 'Fortaleza territorial', items: [['fuerte', 'Fuerte · índice > 1,5'], ['medio', 'Medio · 0,5 – 1,5'], ['debil', 'Débil · índice < 0,5'], ['sin', V === 0 ? 'No aplicable' : 'Sin clasificar']].map(([k, l]) => ({ color: CATCOL[k], label: l })) };
  else {
    const br = C.breaks(Object.values(vals)), ramp = RAMP[S.mode], isP = S.mode !== 'votos', f = x => isP ? U.p1(x) : U.n0(x);
    v.br = br; v.ramp = ramp;
    const title = { participacion: 'Participación (%)', votos: 'Votos: ' + v.label, pct: '% s/ válidos: ' + v.label, agregado: '% agregado: ' + v.label }[S.mode];
    v.legend = { title, items: br.length < 2 ? [] : br.slice(0, -1).map((b, i) => ({ color: ramp[Math.min(i, 4)], label: `${f(b)} – ${f(br[i + 1])}` })) };
  }
  return v;
}
const styleFn = id => {
  const base = { weight: .6, color: '#555', fillOpacity: .78 }, v = S.view;
  if (S.geoNr.has(id)) return { ...base, fillColor: '#bbb', fillOpacity: .3, dashArray: '3' };
  const x = v.vals[id];
  if (S.mode === 'fortaleza') return { ...base, fillColor: CATCOL[x.cat] };
  return { ...base, fillColor: x == null ? '#d9d9d9' : v.ramp[Math.min(C.classIndex(x, v.br), 4)] };
};
const valText = id => { const x = S.view.vals[id]; if (S.mode === 'fortaleza') return U.CAT_TXT[x.cat] + (x.idx != null ? ' · índice ' + U.p2(x.idx) : ''); return x == null ? 'sin datos' : S.mode === 'votos' ? U.n0(x) + ' votos' : U.p1(x); };
const popFn = id => {
  const s = S.muni.s[id]; if (!s) return `<b>Sección ${id}</b><p class="warn">Sin resultados electorales para esta sección.</p>`;
  const v = S.view, t = C.totals(s), vs = C.votesOf(s, v.cods); let extra = '';
  if (S.mode !== 'participacion') extra = `<p class="tgt"><b>${U.esc(v.label)}</b>: ${U.n0(vs)} votos · ${U.p2(C.pct(vs, t.validos))} %`;
  if (S.mode === 'fortaleza') { const r = v.vals[id]; extra += r.cat === 'na' ? '<br>Fortaleza: no aplicable (0 votos en el municipio)' : `<br>Media municipal: ${U.p2(C.pct(v.V, v.BV))} %<br>Índice de fortaleza: <b>${r.idx == null ? '—' : U.p2(r.idx)}</b> → <b>${U.CAT_TXT[r.cat]}</b>`; }
  return U.popup(S, id, s, extra + (extra ? '</p>' : ''));
};

function render() {
  $('#tabs').innerHTML = U.tabsHtml(S.tab); const p = $('#panel');
  if (S.tab === 'validacion') { p.innerHTML = S.val ? U.validacion(S.val) : 'Cargando…'; return; }
  if (!S.muni) { p.innerHTML = '<p class="mut">Busca un municipio para ver sus resultados.</p>'; return; }
  if (S.muni.small) { p.innerHTML = U.resumen(S); return; }
  p.innerHTML = { resumen: () => U.resumen(S), resultados: () => U.resultados(S), agregacion: () => U.agregacion(S), fortaleza: () => U.fortaleza(S, S.view) }[S.tab]();
}
function refresh(redraw) {
  if (!S.muni || S.muni.small) { render(); return; }
  S.view = compute(); M.showLegend(S.view.legend);
  if (redraw) M.draw(S.geo, styleFn, id => id.slice(5) + ' · ' + (S.geoNr.has(id) ? 'sin resultados' : valText(id)), popFn); else M.restyle(styleFn);
  render();
}
async function selectMuni(cumun) {
  const e = S.index.find(x => x[0] === cumun); S.cumun = cumun; S.provName = e[2]; $('#q').value = e[1] + ' (' + e[2] + ')'; $('#results').hidden = true;
  S.muni = null; S.geo = []; M.clear();
  if (e[3] === 0) { S.tab = 'resumen'; $('#panel').innerHTML = `<h2>${U.esc(e[1])}</h2><p class="sub">${U.esc(e[2])}</p><p class="warn">Este municipio tiene polígono en la cartografía pero no aparece en ningún fichero de resultados.</p>`; $('#tabs').innerHTML = U.tabsHtml('resumen'); return; }
  const { res, geo } = await D.province(S.election, cumun.slice(0, 2));
  S.muni = res.muni[cumun]; S.cands = res.cands;
  if (S.muni.small) { S.tab = 'resumen'; refresh(true); return; }
  S.geo = geo.features.filter(f => f.properties.id.startsWith(cumun)); S.geoNr = new Set(S.geo.filter(f => f.properties.nr).map(f => f.properties.id));
  S.base = C.sumSections(S.muni.s);
  const rows = C.resultRows(S.muni, S.cands); S.cand = rows[0]?.cod; S.sel = new Set(S.cand ? [S.cand] : []);
  $('#cand').innerHTML = rows.map(r => `<option value="${r.cod}">${U.esc(r.siglas)} (${U.n0(r.votos)})</option>`).join('');
  S.tab = MODE_TAB[S.mode]; refresh(true);
}
function search(q) {
  const box = $('#results'), n = norm(q.trim()); if (n.length < 2) { box.hidden = true; return; }
  const hits = S.index.filter(x => norm(x[1]).startsWith(n)).concat(S.index.filter(x => !norm(x[1]).startsWith(n) && norm(x[1]).includes(n))).slice(0, 12);
  box.innerHTML = hits.map(x => `<li data-m="${x[0]}">${U.esc(x[1])} <span>${U.esc(x[2])}${x[3] === 1 ? ' · sin mapa (<250 hab.)' : x[3] === 0 ? ' · sin resultados' : ''}</span></li>`).join('') || '<li class="mut">Sin coincidencias</li>'; box.hidden = false;
}
async function loadElection(id) {
  S.election = id; S.index = await D.index(id); S.val = await D.validation(id); S.muni = null; S.cumun = null; M.clear(); render();
}
async function init() {
  if (location.protocol === 'file:') $('#panel').innerHTML = '<p class="warn">Abre la aplicación desde un servidor local: <code>python3 -m http.server</code> y visita http://localhost:8000</p>';
  M.init('map'); const els = await D.elections(); $('#elec').innerHTML = els.map(e => `<option value="${e.id}">${e.label}</option>`).join('');
  $('#elec').onchange = e => loadElection(e.target.value); await loadElection(els[0].id);
  $('#q').oninput = e => search(e.target.value);
  $('#q').onkeydown = e => { if (e.key === 'Enter') { const li = $('#results li[data-m]'); if (li) selectMuni(li.dataset.m); } };
  $('#results').onclick = e => { const li = e.target.closest('li[data-m]'); if (li) selectMuni(li.dataset.m); };
  $('#mode').onchange = e => { S.mode = e.target.value; S.tab = MODE_TAB[S.mode]; refresh(false); };
  $('#cand').onchange = e => { S.cand = e.target.value; refresh(false); };
  $('#base').onchange = e => M.toggleBase(e.target.checked);
  $('#tabs').onclick = e => { const b = e.target.closest('[data-tab]'); if (b) { S.tab = b.dataset.tab; render(); } };
  $('#panel').onclick = e => { const b = e.target.closest('[data-tm]'); if (b) { S.tabs = b.dataset.tm; render(); } if (e.target.matches('[data-clear]')) { S.sel.clear(); refresh(false); } };
  $('#panel').onchange = e => {
    if (e.target.dataset.cod) { e.target.checked ? S.sel.add(e.target.dataset.cod) : S.sel.delete(e.target.dataset.cod); S.mode = 'agregado'; $('#mode').value = 'agregado'; refresh(false); }
    if (e.target.id === 'useAgg') { S.useAgg = e.target.checked; refresh(false); }
  };
  window.addEventListener('resize', M.resize);
}
init().catch(err => { $('#panel').innerHTML = `<p class="warn">No se pudieron cargar los datos: ${U.esc(err.message)}. Ejecuta pipeline/build_data.py y sirve la carpeta con un servidor local.</p>`; });
