// Prueba de humo del HTML empaquetado con un DOM simulado (sin navegador). Uso: node tests/test_bundle.mjs demo.html
import fs from 'node:fs'; import assert from 'node:assert/strict'; import vm from 'node:vm';
const html = fs.readFileSync(process.argv[2], 'utf8'); const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
let code = scripts[1]; const i = code.indexOf('const NS_map'), j = code.indexOf('const NS_ui');
const calls = { draw: [], legend: [], restyle: 0 };
code = code.slice(0, i) + `const NS_map={init(){},draw(f,s,t,p){__c.draw.push({n:f.length,f,s,t,p})},restyle(){__c.restyle++},clear(){},showLegend(l){__c.legend.push(l)},toggleBase(){},resize(){}};\n` + code.slice(j);
const els = {}; const el = k => els[k] ??= { innerHTML: '', value: '', hidden: false, dataset: {}, style: {}, checked: true };
const ctx = { window: { __DB: JSON.parse(scripts[0].replace('window.__DB=', '').replace(/;$/, '')), addEventListener() {} }, __c: calls, location: { protocol: 'http:' },
  document: { querySelector: s => el(s), getElementById: s => el('#' + s) }, atob, Blob, Response, DecompressionStream, Uint8Array, console, setTimeout };
ctx.window.window = ctx.window; vm.createContext(ctx);
const tick = () => new Promise(r => setTimeout(r, 400));
vm.runInContext(code, ctx); await tick();
els['#q'].oninput({ target: { value: 'burgos' } }); assert.ok(/Burgos/.test(els['#results'].innerHTML) && /Burgos<\/span|Burgos/.test(els['#results'].innerHTML));
els['#results'].onclick({ target: { closest: () => ({ dataset: { m: '09059' } }) } }); await tick();
assert.ok(els['#panel'].innerHTML.includes('Resultados por candidatura'), 'al elegir municipio se abre Resultados'); els['#tabs'].onclick({ target: { closest: () => ({ dataset: { tab: 'resumen' } }) } });
const p = els['#panel'].innerHTML; assert.ok(p.includes('Burgos') && p.includes('134.916') && p.includes('Participación'), 'panel resumen');
const d = calls.draw.at(-1); assert.equal(d.n, 147); const [x, y] = d.f[0].geometry.coordinates[0][0][0]; assert.ok(x > -3.9 && x < -3.5 && y > 42.2 && y < 42.5, 'coordenadas Burgos');
console.log('Burgos: 147 polígonos, 1er vértice', x, y);
for (const mode of ['votos', 'pct', 'agregado', 'fortaleza']) { els['#mode'].onchange({ target: { value: mode } }); const l = calls.legend.at(-1); assert.ok(l && l.items.length >= 3, mode); console.log(mode, '→', l.title, '|', l.items.map(i => i.label).join(' ; ')); }
assert.ok(els['#panel'].innerHTML.includes('Fortaleza') && els['#panel'].innerHTML.includes('1,5'));
const id = d.f[0].properties.id; const pop = d.p(id); assert.ok(pop.includes('Media municipal') && pop.includes('Índice de fortaleza') && pop.includes('Censo electoral'), 'popup fortaleza'); console.log('popup OK para', id);
const m2 = ctx.window.__DB.val.poligonos_sin_resultados_en_municipios_con_mesas[0].seccion.slice(0, 5); els['#results'].onclick({ target: { closest: () => ({ dataset: { m: m2 } }) } }); await tick();
assert.ok(calls.draw.at(-1).f.some(f => f.properties.nr), 'polígonos sin resultados en gris'); console.log(m2, ': polígonos sin resultados marcados (gris)');
console.log('OK humo del paquete');
