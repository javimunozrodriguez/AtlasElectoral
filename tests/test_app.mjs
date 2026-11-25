// Prueba de extremo a extremo de los módulos REALES de la app con DOM y Leaflet simulados.
// La app se "aloja" en https://usuario.github.io/atlas/ (subruta, como GitHub Pages) para comprobar las rutas relativas.
import fs from 'node:fs'; import assert from 'node:assert/strict';
const BASE = 'https://usuario.github.io/atlas/', els = {}, rec = { layers: [], legend: { innerHTML: '', hidden: true } }, raw = [];
const el = k => els[k] ??= { innerHTML: '', value: '', hidden: false, dataset: {}, style: {}, checked: true };
const mkLS = () => { const m = new Map(); return { getItem: k => m.has(k) ? m.get(k) : null, setItem: (k, v) => m.set(k, String(v)), _m: m }; };
globalThis.localStorage = mkLS(); globalThis.location = { protocol: 'https:', href: BASE + 'index.html' };
globalThis.fetch = async u => { raw.push(u); const url = new URL(u, location.href); assert.ok(url.pathname.startsWith('/atlas/'), 'ruta fuera de la subruta: ' + u); const f = url.pathname.slice(7), ok = fs.existsSync(f); return { ok, status: ok ? 200 : 404, json: async () => JSON.parse(fs.readFileSync(f)) }; };
globalThis.document = { querySelector: s => el(s), getElementById: s => el('#' + s), body: { dataset: {} } }; globalThis.window = { addEventListener() {} };
globalThis.L = { map: () => ({ setView() { return this; }, fitBounds() {}, removeLayer() {}, invalidateSize() {} }), tileLayer: () => ({ addTo() { return this; } }), control: () => ({ addTo() { this.onAdd(); return this; } }), DomUtil: { create: () => rec.legend },
  geoJSON: (fc, o) => { const ls = fc.features.map(f => { const l = { f, bindTooltip(fn) { this.tip = fn; }, bindPopup(fn) { this.pop = fn; }, on() {}, setStyle() {} }; o.onEachFeature(f, l); l.style = o.style(f); return l; }); rec.layers = ls; return { addTo() { return this; }, getBounds() {}, resetStyle() {}, setStyle(fn) { ls.forEach(l => l.style = fn(l.f)); } }; } };
const tick = (ms = 500) => new Promise(r => setTimeout(r, ms)), pick = m => { els['#results'].onclick({ target: { closest: () => ({ dataset: { m } }) } }); return tick(); };
const tab = t => els['#tabs'].onclick({ target: { closest: () => ({ dataset: { tab: t } }) } }), page = v => els['.main-nav'].onclick({ target: { closest: () => ({ dataset: { view: v } }) } });
const n0 = v => Math.round(v).toLocaleString('es-ES'), p2 = v => v.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
await import('../js/main.js'); await tick();
const { KEY, createStore } = await import('../js/store.js');
const res09 = JSON.parse(fs.readFileSync('data/municipales-2023/res/09.json')), bur = res09.muni['09059'], cod = s => Object.keys(res09.cands).find(c => res09.cands[c] === s && bur.off[c]);

// 2) participación por defecto + 4) etiquetas + 3) sin población en secciones
els['#q'].oninput({ target: { value: 'burgos' } }); await pick('09059');
assert.ok(rec.legend.innerHTML.includes('Participación'), 'la primera variable del mapa es la participación');
assert.equal(rec.layers.length, 147); assert.ok(new Set(rec.layers.map(l => l.style.fillColor)).size >= 3, 'escala con varios tonos');
const L0 = rec.layers[0], id0 = L0.f.properties.id, tip = L0.tip(), pop = L0.pop();
assert.match(tip, /^Distrito \d\d - Sección \d{3} · /); assert.ok(pop.includes('Distrito') && !pop.includes(id0), 'popup sin código CUSEC');
assert.ok(!/Población/i.test(pop) && pop.includes('Censo electoral'), 'sin población, con censo');
const sec = bur.s[id0], emit = sec[1] + sec[2] + sec[3]; assert.ok(pop.includes(p2(emit / sec[0] * 100).replace(/\.00$/, '')) || pop.includes((emit / sec[0] * 100).toLocaleString('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 })), 'participación = votantes/censo');
console.log('OK participación por defecto |', tip, '| popup sin Población');

// 1) agrupaciones
tab('grupos'); assert.ok(els['#panel'].innerHTML.includes('data-sig="PSOE"'));
const ch = (sig, g, checked = true) => els['#panel'].onchange({ target: { dataset: { sig, g }, checked, id: '' } });
ch('PSOE', 'izq'); ch('PODEMOS-IU-AV', 'izq'); ch('PP', 'der'); ch('VOX', 'der');
els['#mode'].onchange({ target: { value: 'g:izq' } }); assert.ok(rec.legend.innerHTML.includes('Izquierdas'));
const izq = [cod('PSOE'), cod('PODEMOS-IU-AV')], validos = bur.t[3] + bur.t[1], vIzq = izq.reduce((a, c) => a + bur.off[c][0], 0);
tab('grupos'); assert.ok(els['#panel'].innerHTML.includes(n0(vIzq)) && els['#panel'].innerHTML.includes(p2(vIzq / validos * 100)), 'agrupación = suma de votos / válidos (con blancos)');
const s1 = bur.s[id0], pp1 = L0.pop(); assert.ok(pp1.includes(n0(izq.reduce((a, c) => a + (s1[4][c] || 0), 0))), 'agregado por sección');
ch('PP', 'izq');   // mover PP a otra agrupación: exclusividad (una candidatura, una agrupación)
assert.ok(els['#panel'].innerHTML.includes('data-sig="PP" data-g="izq" checked') && !els['#panel'].innerHTML.includes('data-sig="PP" data-g="der" checked'));
ch('PP', 'der'); console.log('OK agrupaciones |', `izq=${n0(vIzq)} votos (${p2(vIzq / validos * 100)} %)`);

// 2b) persistencia por navegador y entre municipios
const saved = JSON.parse(localStorage._m.get(KEY)); assert.equal(saved.assign.PSOE, 'izq'); assert.equal(saved.assign.PP, 'der');
assert.equal(createStore(localStorage).groupOf('PSOE'), 'izq', 'sobrevive a recargar'); assert.equal(createStore(mkLS()).groupOf('PSOE'), null, 'otro navegador: independiente');
await pick('28079'); tab('grupos'); assert.ok(els['#panel'].innerHTML.includes('data-sig="PSOE" data-g="izq" checked'), 'se conserva en otro municipio');
await pick('09059'); console.log('OK persistencia: localStorage por navegador y por siglas');

// 5) D'Hondt: independiente del módulo (implementación ingenua)
// Implementación ingenua con enteros exactos. `against`: en empates absolutos (mismo cociente y votos) se desfavorece a esa candidatura.
const naive = (votes, V, N, against) => { const e = Object.entries(votes).filter(([, v]) => v * 100 >= 5 * V && v > 0), s = Object.fromEntries(e.map(([c]) => [c, 0])); for (let i = 0; i < N; i++) { let b = null; for (const [c, v] of e) { const d = b ? v * (s[b.c] + 1) - b.v * (s[c] + 1) : 1; if (!b || d > 0 || (d === 0 && (v > b.v || (v === b.v && b.c === against)))) b = { c, v }; } s[b.c]++; } return s; };
page('dhondt'); const dh = els['#dh'].innerHTML; assert.ok(dh.includes('Barrera legal del 5 %') && dh.includes('Tabla de cocientes') && dh.includes('Simulación') && dh.includes('Burgos'));
const votes = Object.fromEntries(Object.entries(bur.off).map(([c, [v]]) => [c, v])), N = bur.t[4], base = naive(votes, validos, N);
for (const [c, [, conc]] of Object.entries(bur.off)) assert.equal(base[c] || 0, conc, 'reparto = oficial: ' + res09.cands[c]);
console.log('OK reparto D\'Hondt Burgos = oficial:', Object.entries(base).map(([c, s]) => res09.cands[c] + ' ' + s).join(', '));
const excl = Object.entries(votes).filter(([, v]) => v * 100 < 5 * validos); assert.ok(excl.length > 0 && dh.includes('Excluida del reparto'), 'excluidas por la barrera'); for (const [c] of excl) assert.ok(dh.includes(res09.cands[c]));
for (const sg of ['PP', 'VOX', 'PODEMOS-IU-AV']) {
  els['#dh'].onchange({ target: { id: 'dhCand', value: cod(sg) } }); const h = els['#dh'].innerHTML, m = h.match(/le han faltado <b>([\d.]+) votos<\/b>/); assert.ok(m, sg);
  const shown = +m[1].replace(/\./g, ''); let x = 0; while (true) { const v2 = { ...votes, [cod(sg)]: votes[cod(sg)] + x }, s2 = naive(v2, validos + x, N, cod(sg)); if ((s2[cod(sg)] || 0) > (base[cod(sg)] || 0)) break; /* gana aun si los empates absolutos se resuelven en su contra */ x++; if (x > 1e6) throw new Error('sin solución'); }
  assert.equal(shown, x, 'votos necesarios (fuerza bruta) ' + sg); console.log(`OK votos necesarios ${sg}: ${shown} (fuerza bruta: ${x})`);
}
// 4) simulación
const sg = 'VOX'; els['#dh'].onchange({ target: { id: 'dhCand', value: cod(sg) } }); const need = +els['#dh'].innerHTML.match(/le han faltado <b>([\d.]+) votos/)[1].replace(/\./g, '');
els['#dh'].onchange({ target: { id: 'dhExtra', value: String(need - 1) } }); assert.ok(/no<\/b> consigue un concejal adicional/.test(els['#dh'].innerHTML), 'con x-1 no basta');
els['#dh'].onclick({ target: { closest: () => ({ dataset: { act: 'need' } }) } }); assert.ok(/pasa de \d+ a <b>\d+<\/b> concejales/.test(els['#dh'].innerHTML), 'con x sí'); assert.ok(els['#dh'].innerHTML.includes('Hipotético'));
els['#dh'].onclick({ target: { closest: () => ({ dataset: { act: 'reset' } }) } }); page('mapa'); assert.equal(els['main'].hidden, false);
// 10) rutas relativas
assert.ok(raw.length >= 5 && raw.every(u => !/^(\/|https?:)/.test(u)), 'todas las rutas de datos son relativas: ' + raw.slice(0, 3));
console.log('OK rutas relativas funcionan bajo /atlas/ (' + raw.length + ' peticiones, p. ej. ' + raw[0] + ')'); console.log('OK pruebas de la aplicación');
