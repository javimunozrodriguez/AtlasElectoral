// Prueba del index.html único (todo en línea) con DOM/Leaflet simulados y datos reales leídos de data/. Uso: node tests/test_single.mjs dist/index.html
import fs from 'node:fs'; import assert from 'node:assert/strict'; import vm from 'node:vm';
const html = fs.readFileSync(process.argv[2], 'utf8'); const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]); const code = scripts.at(-1);
assert.ok(!/<script[^>]+src="js\//.test(html) && !/href="css\//.test(html), 'sin referencias a js/ ni css/'); assert.ok(!/^\s*(import|export)\b/m.test(code));
const els = {}, rec = { layers: [], legend: { innerHTML: '', hidden: true } }; const el = k => els[k] ??= { innerHTML: '', value: '', hidden: false, dataset: {}, style: {}, checked: true, textContent: '' };
const store = new Map(), ctx = { console, setTimeout, JSON, Math, Object, Array, Set, Map, Number, String, Promise, Error, URL,
  localStorage: { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)) }, location: { protocol: 'https:', href: 'https://x.github.io/AtlasElectoral/index.html' },
  fetch: async u => { const f = new URL(u, 'https://x.github.io/AtlasElectoral/').pathname.slice('/AtlasElectoral/'.length), ok = fs.existsSync(f); return { ok, status: ok ? 200 : 404, json: async () => JSON.parse(fs.readFileSync(f)) }; },
  document: { querySelector: s => el(s), getElementById: s => el('#' + s), body: { dataset: {} } }, window: { addEventListener() {} },
  L: { map: () => ({ setView() { return this; }, fitBounds() {}, removeLayer() {}, invalidateSize() {} }), tileLayer: () => ({ addTo() { return this; } }), control: () => ({ addTo() { this.onAdd(); return this; } }), DomUtil: { create: () => rec.legend },
    geoJSON: (fc, o) => { rec.layers = fc.features.map(f => { const l = { f, bindTooltip(fn) { this.tip = fn; }, bindPopup(fn) { this.pop = fn; }, on() {} }; o.onEachFeature(f, l); return l; }); return { addTo() { return this; }, getBounds() {}, resetStyle() {}, setStyle() {} }; } } };
ctx.window.window = ctx.window; vm.createContext(ctx); vm.runInContext(code, ctx); const tick = (ms = 600) => new Promise(r => setTimeout(r, ms)); await tick();
assert.equal(els['.ver'].textContent, 'v3', 'marca v3');
els['#q'].oninput({ target: { value: 'burgos' } }); els['#results'].onclick({ target: { closest: () => ({ dataset: { m: '09059' } }) } }); await tick();
assert.deepEqual([...els['#tabs'].innerHTML.matchAll(/data-tab="\w+"[^>]*>([^<]+)</g)].map(m => m[1]), ['Resultados', 'Resumen']);
const p = els['#panel'].innerHTML; assert.ok(p.indexOf('Resultados por candidatura') < p.indexOf('id="tool-ideologia"') && p.indexOf('id="tool-suma"') < p.indexOf('id="tool-fortaleza"'));
assert.equal(rec.layers.length, 147); assert.match(rec.layers[0].tip(), /^Distrito \d\d - Sección \d{3}/);
els['.main-nav'].onclick({ target: { closest: () => ({ dataset: { view: 'concejales' } }) } }); const dh = els['#dh'].innerHTML;
assert.ok(dh.includes('Barrera legal del 5 %') && dh.includes('Tabla de cocientes') && dh.includes('Burgos') && els['#dh'].hidden === false && els['main'].hidden === true, 'Concejales funciona');
console.log('OK index.html único: v3, menú [Resultados, Resumen], herramientas abajo, Concejales muestra su contenido');
