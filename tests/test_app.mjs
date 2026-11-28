// Prueba de extremo a extremo de los módulos REALES de la app con DOM y Leaflet simulados.
// La app se "aloja" en https://usuario.github.io/atlas/ (subruta, como GitHub Pages) para comprobar las rutas relativas.
import fs from 'node:fs'; import assert from 'node:assert/strict';
const BASE = 'https://usuario.github.io/atlas/', els = {}, rec = { layers: [], legend: { innerHTML: '', hidden: true } }, raw = [];
const el = k => els[k] ??= { innerHTML: '', value: '', hidden: false, dataset: {}, style: {}, checked: true };
const mkLS = () => { const m = new Map(); return { getItem: k => m.has(k) ? m.get(k) : null, setItem: (k, v) => m.set(k, String(v)), _m: m }; };
globalThis.localStorage = mkLS(); globalThis.location = { protocol: 'https:', href: BASE + 'index.html' };
globalThis.fetch = async u => { raw.push(u); const url = new URL(u, location.href); assert.ok(url.pathname.startsWith('/atlas/'), 'ruta fuera de la subruta: ' + u); const f = url.pathname.slice(7), ok = fs.existsSync(f); return { ok, status: ok ? 200 : 404, json: async () => JSON.parse(fs.readFileSync(f)) }; };
globalThis.document = { querySelector: s => el(s), getElementById: s => el('#' + s), body: { dataset: {} } }; globalThis.window = { addEventListener() {} };
globalThis.L = { map: () => ({ setView() { return this; }, fitBounds() {}, removeLayer() {}, invalidateSize() { rec.inval = (rec.inval || 0) + 1; } }), tileLayer: () => ({ addTo() { return this; } }), control: () => ({ addTo() { this.onAdd(); return this; } }), DomUtil: { create: () => rec.legend },
  geoJSON: (fc, o) => { const ls = fc.features.map(f => { const l = { f, bindTooltip(fn) { this.tip = fn; }, bindPopup(fn) { this.pop = fn; }, on() {}, setStyle() {} }; o.onEachFeature(f, l); l.style = o.style(f); return l; }); rec.layers = ls; return { addTo() { return this; }, getBounds() {}, resetStyle() {}, setStyle(fn) { ls.forEach(l => l.style = fn(l.f)); } }; } };
for (const k of ['#panel', '#toolbody']) { const pn = el(k); let h = ''; Object.defineProperty(pn, 'innerHTML', { get: () => h, set: v => { h = v; pn.scrollTop = 0; } }); }
const chSig = (sig, g, checked = true) => els['#toolbody'].onchange({ target: { dataset: { sig, g }, checked, id: '' } });
const tick = (ms = 500) => new Promise(r => setTimeout(r, ms)), pick = m => { els['#results'].onclick({ target: { closest: () => ({ dataset: { m } }) } }); return tick(); };
const tab = t => els['#tabs'].onclick({ target: { closest: () => ({ dataset: { tab: t } }) } }), page = v => els['.main-nav'].onclick({ target: { closest: () => ({ dataset: { view: v } }) } });
const n0 = v => Math.round(v).toLocaleString('es-ES'), p2 = v => v.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const ROs = [], ROobs = []; globalThis.ResizeObserver = class { constructor(cb) { ROs.push(cb); } observe(e) { ROobs.push(e); } };
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

// ===== Estructura de navegación: menú lateral (Resultados, Resumen, Cruce) + menú inferior independiente (Ideología, Fortaleza, Suma) =====
const idx = fs.readFileSync('index.html', 'utf8'), labels = h => [...h.matchAll(/>([^<]+)<\/button>/g)].map(m => m[1]);
assert.deepEqual(labels(idx.match(/<nav class="main-nav"[^>]*>([\s\S]*?)<\/nav>/)[1]), ['Mapa', 'Concejales', 'Cruce']);
assert.ok(!/alidaci/.test(idx) && !/alidaci/.test(fs.readFileSync('js/ui.js', 'utf8')), 'sin Validación');
assert.deepEqual([...els['#tabs'].innerHTML.matchAll(/data-tab="\w+"[^>]*>([^<]+)</g)].map(m => m[1]), ['Resultados', 'Resumen'], 'menú lateral: solo Resultados y Resumen'); assert.ok(!/Cruce|Mapa|Concejales/.test(els['#tabs'].innerHTML), 'ninguna pestaña principal en el menú lateral');
assert.deepEqual([...els['#toolnav'].innerHTML.matchAll(/data-tool="\w+"[^>]*>([^<]+)</g)].map(m => m[1]), ['Ideología', 'Fortaleza', 'Suma'], 'menú inferior, en ese orden');
const iFoot = idx.indexOf('id="toolbar"'); assert.ok(iFoot > idx.indexOf('</main>') && !/<aside>[\s\S]*id="toolbar"[\s\S]*<\/aside>/.test(idx), 'franja inferior fuera del <main> y del <aside>: ocupa todo el ancho');
let rp = els['#panel'].innerHTML; assert.ok(rp.includes('Resultados por candidatura') && !/id="tool-|data-info|data-sig|Ideología|Fortaleza|>Suma</.test(rp), 'Resultados ya no contiene las herramientas');
assert.equal(els['#toolbody'].hidden, true, 'menú inferior cerrado por defecto');
const click = (id, k, v) => els[id].onclick({ target: { closest: s => s === k ? { dataset: { [k.slice(6, -1)]: v } } : null, matches: () => false } });
const openTool = id => click('#toolnav', '[data-tool]', id), info = id => click('#toolbody', '[data-info]', id);
const body = () => els['#toolbody'].innerHTML, sect = id => body().match(new RegExp(`<section class="tool" id="tool-${id}">([\\s\\S]*?)</section>`))[1];
// cada opción abre su herramienta en la franja inferior y es accesible desde cualquier pestaña lateral
for (const t of ['resultados', 'resumen']) { tab(t);
  for (const [id, mark] of [['ideologia', 'data-sig="PSOE"'], ['fortaleza', 'Índice = % del partido'], ['suma', 'data-cod=']]) { openTool(id); assert.equal(els['#toolbody'].hidden, false); assert.ok(sect(id).includes(mark), `${t}: ${id} abre su herramienta`); } }
assert.ok(!/id="tool-/.test(els['#panel'].innerHTML), 'el panel lateral no contiene herramientas');
tab('resumen'); assert.equal(els['#toolbody'].hidden, false, 'el menú inferior persiste al cambiar de pestaña lateral'); assert.ok(sect('suma').includes('data-cod='));
openTool('suma'); assert.equal(els['#toolbody'].hidden, true, 'pulsar de nuevo la herramienta activa la cierra');
// explicaciones didácticas
const checkInfo = (id, ...txt) => { openTool(id); assert.ok(/<div class="info" hidden>/.test(sect(id))); info(id); assert.ok(!/<div class="info" hidden>/.test(sect(id))); for (const t of txt) assert.ok(sect(id).includes(t), id + ': ' + t); info(id); assert.ok(/<div class="info" hidden>/.test(sect(id))); };
checkInfo('ideologia', 'izquierdas', 'derechas', 'no alineadas', 'configurables por cada usuario', 'no representan una clasificación ideológica oficial');
checkInfo('suma', 'sumar sus votos', 'votos válidos del municipio', 'sumar porcentajes calculados sobre bases distintas');
checkInfo('fortaleza', 'Índice de fortaleza', 'porcentaje de voto de la candidatura en la sección', 'superior a 1,5', '150 %', 'entre 0,5 y 1,5', 'inferior a 0,5', 'no como una media aritmética de los porcentajes de las secciones');
// la lógica no está duplicada: Fortaleza calcula con fstats() aunque el mapa muestre otra variable
els['#mode'].onchange({ target: { value: 'participacion' } }); openTool('fortaleza'); assert.equal(els['#toolbody'].hidden, true); openTool('fortaleza');   // cerrar y volver a abrir con el mapa en Participación
assert.ok(sect('fortaleza').includes('<td class="r">143</td>') && sect('fortaleza').includes('en el mapa'), 'Fortaleza: PSOE 143 secciones medias; el mapa pasa a Fortaleza al abrirla');
els['#toolbody'].scrollTop = 321; chSig('PSOE', 'izq'); assert.equal(els['#toolbody'].scrollTop, 321, 'el repintado conserva el desplazamiento del menú inferior');
els['#mode'].onchange({ target: { value: 'agregado' } }); assert.ok(body().includes('id="tool-suma"'), 'elegir Suma en el selector abre su herramienta');
click('#toolbody', '[data-closetool]', '1'); assert.equal(els['#toolbody'].hidden, true, 'botón de cerrar');
await pick('03014'); tab('resumen'); assert.ok(els['#panel'].innerHTML.includes('se muestran en gris') && /Distrito \d\d - Sección \d{3}/.test(els['#panel'].innerHTML), 'avisos internos de datos intactos');
await pick('09059'); els['#mode'].onchange({ target: { value: 'participacion' } }); tab('resultados');
console.log('OK navegación: principal [Mapa, Concejales, Cruce] · lateral [Resultados, Resumen] · inferior [Ideología, Fortaleza, Suma]');

// 1) agrupaciones (menú inferior)
openTool('ideologia'); assert.ok(body().includes('data-sig="PSOE"'));
const ch = chSig; ch('PSOE', 'izq'); ch('PODEMOS-IU-AV', 'izq'); ch('PP', 'der'); ch('VOX', 'der');
els['#mode'].onchange({ target: { value: 'g:izq' } }); assert.ok(rec.legend.innerHTML.includes('Izquierdas'));
const izq = [cod('PSOE'), cod('PODEMOS-IU-AV')], validos = bur.t[3] + bur.t[1], vIzq = izq.reduce((a, c) => a + bur.off[c][0], 0);
assert.ok(body().includes(n0(vIzq)) && body().includes(p2(vIzq / validos * 100)), 'agrupación = suma de votos / válidos (con blancos)');
const pp1 = L0.pop(); assert.ok(pp1.includes(n0(izq.reduce((a, c) => a + (bur.s[id0][4][c] || 0), 0))), 'agregado por sección');
ch('PP', 'izq'); assert.ok(body().includes('data-sig="PP" data-g="izq" checked') && !body().includes('data-sig="PP" data-g="der" checked')); ch('PP', 'der');
console.log('OK agrupaciones |', `izq=${n0(vIzq)} votos (${p2(vIzq / validos * 100)} %)`);
const saved = JSON.parse(localStorage._m.get(KEY)); assert.equal(saved.assign.PSOE, 'izq'); assert.equal(saved.assign.PP, 'der');
assert.equal(createStore(localStorage).groupOf('PSOE'), 'izq', 'sobrevive a recargar'); assert.equal(createStore(mkLS()).groupOf('PSOE'), null, 'otro navegador: independiente');
await pick('28079'); openTool('ideologia'); if (els['#toolbody'].hidden) openTool('ideologia'); assert.ok(body().includes('data-sig="PSOE" data-g="izq" checked'), 'se conserva en otro municipio');
await pick('09059'); console.log('OK persistencia: localStorage por navegador y por siglas');

// ===== Parte 2: el mapa tiene límites propios; leyenda y atribución no se salen de él =====
const css = fs.readFileSync('css/app.css', 'utf8');
assert.ok(/#map\{[^}]*isolation:isolate[^}]*overflow:hidden/.test(css), '#map aislado (contiene los z-index de Leaflet) y con límites propios');
assert.ok(!/position:\s*(sticky|fixed)/.test(css), 'sin posiciones sticky ni fixed');
assert.ok(/<main>\s*<div id="map"><\/div>/.test(idx) && idx.indexOf('id="toolbar"') > idx.indexOf('</main>'), 'franja inferior en su propio espacio del flujo, tras el contenedor del mapa');
assert.equal(ROs.length, 1); assert.equal(ROobs[0], els['#map']); const inv0 = rec.inval; ROs[0](); assert.ok(rec.inval > inv0, 'el mapa se actualiza al cambiar de tamaño');
const inv1 = rec.inval; page('concejales'); page('cruce'); page('mapa'); assert.ok(rec.inval > inv1, 'se actualiza al volver a la pestaña Mapa');
console.log('OK mapa: contenedor aislado, sin posiciones fijas, se redimensiona solo');

// ===== Parte 3: Cruce (pestaña principal) =====
const near = (a, b, e = 1e-9) => assert.ok(Math.abs(a - b) < e, `${a} ≉ ${b}`);
page('cruce'); assert.equal(els['#cx'].hidden, false); for (const k of ['main', '#dh', '#toolbar']) assert.equal(els[k].hidden, true, k + ' oculto en Cruce');
const cxh = () => els['#cx'].innerHTML, stat = k => +cxh().match(new RegExp(`data-stat="${k}" data-v="([^"]+)"`))[1], cxClick = (k, d) => els['#cx'].onclick({ target: { closest: s => s === k ? { dataset: d } : null } }), cxSet = (ax, f, value) => els['#cx'].onchange({ target: { dataset: { ax, f }, value } });
assert.ok(cxh().includes('Los datos representan secciones censales, no personas individuales') && cxh().includes('Debe evitarse la falacia ecológica'), 'advertencia metodológica');
assert.ok(Object.keys(bur.s).every(k => !cxh().includes(k)), 'ningún código de sección (CUSEC) aparece en la interfaz de Cruce');
const tips = () => [...cxh().matchAll(/<circle[^>]*data-tip="([^"]*)"/g)].map(m => m[1]); assert.equal(tips().length, 147); assert.ok(tips().every(t => /^Distrito \d\d - Sección \d{3}\n/.test(t)), 'puntos identificados como Distrito XX - Sección XXX');
const naiveReg = (xs, ys) => { const n = xs.length, mx = xs.reduce((a, b) => a + b) / n, my = ys.reduce((a, b) => a + b) / n; let sxy = 0, sxx = 0, syy = 0; xs.forEach((x, i) => { sxy += (x - mx) * (ys[i] - my); sxx += (x - mx) ** 2; syy += (ys[i] - my) ** 2; }); return { slope: sxy / sxx, r: sxy / Math.sqrt(sxx * syy), n }; };
const SEC = Object.values(bur.s), part = s => (s[1] + s[2] + s[3]) / s[0] * 100, valid = s => s[3] + s[1], vo = (s, cs) => cs.reduce((a, c) => a + (s[4][c] || 0), 0);
let R = naiveReg(SEC.map(part), SEC.map(s => s[4][cod('PSOE')] / valid(s) * 100)); assert.equal(stat('n'), 147); near(stat('pendiente'), R.slope); near(stat('r'), R.r); near(stat('R²'), R.r ** 2);   // preset inicial: participación vs % PSOE
assert.ok(cxh().includes('Participación (%)') && cxh().includes('% de voto · PSOE'), 'nombres de ambos ejes');
// filtros: cambian los resultados
const key0 = cxh().match(/data-win="([^"]+)"/)[1]; cxClick('[data-win]', { win: key0 }); const nF = stat('n'); assert.ok(nF < 147, 'excluir una candidatura ganadora reduce n'); cxClick('[data-resetf]', {}); assert.equal(stat('n'), 147, 'restablecer filtros');
cxClick('[data-grp]', { grp: 'der' }); assert.ok(stat('n') < 147, 'filtro por agrupación líder'); cxClick('[data-resetf]', {});
els['#cx'].onchange({ target: { dataset: { flt: 'incomplete' }, checked: false } }); assert.equal(stat('n'), 147);   // Burgos no tiene secciones incompletas
// variables: censo vs votantes (independiente) y Ideología / Suma integradas
cxSet('x', 'kind', 'censo'); cxSet('y', 'kind', 'votantes'); R = naiveReg(SEC.map(s => s[0]), SEC.map(s => s[1] + s[2] + s[3])); near(stat('r'), R.r); near(stat('pendiente'), R.slope);
cxSet('y', 'kind', 'grupo'); cxSet('y', 'f', 'izq'); els['#cx'].onchange({ target: { dataset: { ax: 'y', f: 'group' }, value: 'izq' } });
R = naiveReg(SEC.map(s => s[0]), SEC.map(s => vo(s, [cod('PSOE'), cod('PODEMOS-IU-AV')]) / valid(s) * 100)); assert.ok(cxh().includes('% de voto · Ideología: Izquierdas')); near(stat('r'), R.r, 1e-9);
els['#toolbody'].onchange({ target: { dataset: { cod: cod('PP') }, checked: true, id: '' } });   // Suma: PSOE + PP
cxSet('y', 'kind', 'suma'); R = naiveReg(SEC.map(part), SEC.map(s => vo(s, [cod('PSOE'), cod('PP')]) / valid(s) * 100)); cxSet('x', 'kind', 'part'); assert.ok(cxh().includes('Suma (PSOE + PP)')); near(stat('r'), R.r, 1e-9);
// sin datos: la agrupación «No alineadas» no tiene candidaturas -> aviso, sin ceros inventados
els['#cx'].onchange({ target: { dataset: { ax: 'y', f: 'kind' }, value: 'grupo' } }); els['#cx'].onchange({ target: { dataset: { ax: 'y', f: 'group' }, value: 'na' } });
assert.ok(/no tiene candidaturas asignadas/.test(cxh()) && cxh().includes('No hay secciones con datos válidos') && stat('n') === 0, 'sin datos: aviso y n = 0');
// accesos rápidos
const ids = [...cxh().matchAll(/data-preset="([^"]+)"/g)].map(m => m[1]); assert.deepEqual(ids, ['part-cand', 'part-grupo', 'part-idx', 'cand-cand', 'cand-grupo', 'censo-part', 'peso-pct']);
for (const id of ids) { cxClick('[data-preset]', { preset: id }); assert.ok(stat('n') > 0 && tips().length > 0, 'preset ' + id); }
cxClick('[data-preset]', { preset: 'censo-part' }); assert.ok(cxh().includes('Censo electoral') && cxh().includes('Participación (%)'));
cxClick('[data-preset]', { preset: 'peso-pct' }); assert.ok(cxh().includes('Peso en el voto municipal (%) · PSOE'));
// información emergente
const tp = tips()[0]; els['#cx'].onmouseover({ target: { closest: () => ({ dataset: { tip: tp } }) }, clientX: 50, clientY: 60 }); assert.equal(els['#cxTip'].textContent, tp); assert.equal(els['#cxTip'].hidden, false); els['#cx'].onmouseout(); assert.equal(els['#cxTip'].hidden, true);
cxClick('[data-swap]', {}); page('mapa'); assert.equal(els['main'].hidden, false); assert.equal(els['#toolbar'].hidden, false); assert.equal(els['#cx'].hidden, true);
console.log('OK Cruce: tres pestañas principales, variables correctas, filtros, Ideología/Suma, ausentes y accesos rápidos');

// 5) D'Hondt: independiente del módulo (implementación ingenua)
// Implementación ingenua con enteros exactos. `against`: en empates absolutos (mismo cociente y votos) se desfavorece a esa candidatura.
const naive = (votes, V, N, against) => { const e = Object.entries(votes).filter(([, v]) => v * 100 >= 5 * V && v > 0), s = Object.fromEntries(e.map(([c]) => [c, 0])); for (let i = 0; i < N; i++) { let b = null; for (const [c, v] of e) { const d = b ? v * (s[b.c] + 1) - b.v * (s[c] + 1) : 1; if (!b || d > 0 || (d === 0 && (v > b.v || (v === b.v && b.c === against)))) b = { c, v }; } s[b.c]++; } return s; };
page('concejales'); const dh = els['#dh'].innerHTML; assert.ok(dh.includes('Barrera legal del 5 %') && dh.includes('Tabla de cocientes') && dh.includes('Simulación') && dh.includes('Burgos'));
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
