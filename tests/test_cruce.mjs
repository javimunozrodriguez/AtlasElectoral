import assert from 'node:assert/strict'; import fs from 'node:fs';
import { regression, spearman, ranks, axis, dataset, makeCtx, presets, winnerOf } from '../js/cruce.js';
const near = (a, b, e = 1e-9) => assert.ok(Math.abs(a - b) < e, `${a} ≉ ${b}`);
// regresión: recta perfecta y caso de libro (x=1..5, y=2,4,5,4,5 → b=0,6; a=2,2; r=0,7746; R²=0,6)
let g = regression([1, 2, 3, 4, 5], [3, 5, 7, 9, 11]); near(g.slope, 2); near(g.intercept, 1); near(g.r, 1); near(g.r2, 1);
g = regression([1, 2, 3, 4, 5], [2, 4, 5, 4, 5]); near(g.slope, 0.6); near(g.intercept, 2.2); near(g.r, 6 / Math.sqrt(10 * 6));   // Sxy=6, Sxx=10, Syy=6 near(g.r2, 0.6);
near(regression([1, 2, 3, 4], [4, 3, 2, 1]).r, -1);
// avisos: pocos casos y sin variabilidad (no se inventa nada)
assert.equal(regression([1, 2], [1, 2]).ok, false); assert.match(regression([1, 2], [1, 2]).warn, /al menos 3/);
assert.equal(regression([5, 5, 5], [1, 2, 3]).ok, false); const gy = regression([1, 2, 3], [7, 7, 7]); assert.equal(gy.ok, true); assert.equal(gy.r, null); assert.match(gy.warn, /Y no varía/);
// Spearman: rangos con empates, relación monótona no lineal y signo
assert.deepEqual(ranks([10, 20, 20, 30]), [1, 2.5, 2.5, 4]); near(spearman([1, 2, 3, 4, 5], [1, 8, 27, 64, 125]).rho, 1); near(regression([1, 2, 3, 4, 5], [1, 8, 27, 64, 125]).r, 304 / Math.sqrt(10 * 10390));   // Sxy=304, Sxx=10, Syy=10390: Pearson < 1 mientras Spearman = 1
near(spearman([1, 2, 2, 3], [1, 3, 2, 4]).rho, 4.5 / Math.sqrt(22.5)); near(spearman([1, 2, 3, 4], [9, 7, 5, 1]).rho, -1); assert.equal(spearman([1, 1, 1], [1, 2, 3]).ok, false);
// datos reales: Burgos
const res = JSON.parse(fs.readFileSync('data/municipales-2023/res/09.json')), m = res.muni['09059'], cands = res.cands;
const cod = s => Object.keys(m.off).find(c => cands[c] === s); const groups = [{ id: 'izq', name: 'Izquierdas' }, { id: 'der', name: 'Derechas' }, { id: 'na', name: 'No alineadas' }];
const assign = { PSOE: 'izq', 'PODEMOS-IU-AV': 'izq', PP: 'der', VOX: 'der' };
const ctx = makeCtx({ secs: m.s, cands, off: m.off, sel: new Set([cod('PSOE'), cod('PODEMOS-IU-AV')]), groupOf: s => assign[s] || null, groups });
const secs = Object.entries(m.s), V = secs.reduce((a, [, s]) => a + (s[4][cod('PSOE')] || 0), 0), BV = secs.reduce((a, [, s]) => a + s[3] + s[1], 0);
const val = (spec, id) => { const a = axis(spec, ctx), s = m.s[id]; const [c, b, n, ca] = s; return a.fn(s, { censo: c, blancos: b, nulos: n, cand: ca, validos: ca + b, emitidos: ca + b + n, part: c > 0 ? (ca + b + n) / c * 100 : null }); };
const id = secs[5][0], s5 = m.s[id], [c5, b5, n5, ca5] = s5;
near(val({ kind: 'part' }, id), (b5 + n5 + ca5) / c5 * 100); near(val({ kind: 'abst' }, id), 100 - (b5 + n5 + ca5) / c5 * 100); near(val({ kind: 'votantes' }, id), b5 + n5 + ca5); near(val({ kind: 'abstn' }, id), c5 - (b5 + n5 + ca5));
near(val({ kind: 'cand', cod: cod('PSOE'), measure: 'pct' }, id), s5[4][cod('PSOE')] / (ca5 + b5) * 100);   // denominador: válidos de la SECCIÓN (candidaturas + blancos)
near(val({ kind: 'blancos', measure: 'pct' }, id), b5 / (ca5 + b5) * 100); near(val({ kind: 'nulos', measure: 'pct' }, id), n5 / (b5 + n5 + ca5) * 100);
near(val({ kind: 'cand', cod: cod('PSOE'), measure: 'idx' }, id), (s5[4][cod('PSOE')] / (ca5 + b5)) / (V / BV));   // índice = %sección / %municipio (misma base)
near(val({ kind: 'suma', measure: 'votos' }, id), (s5[4][cod('PSOE')] || 0) + (s5[4][cod('PODEMOS-IU-AV')] || 0)); near(val({ kind: 'grupo', group: 'der', measure: 'pct' }, id), ((s5[4][cod('PP')] || 0) + (s5[4][cod('VOX')] || 0)) / (ca5 + b5) * 100);
// el peso de las secciones en el voto municipal de una candidatura suma 100 %
near(secs.reduce((a, [i]) => a + val({ kind: 'cand', cod: cod('PSOE'), measure: 'peso' }, i), 0), 100, 1e-7);
// dataset: 147 secciones, sin ausentes; filtros cambian n
const cx = { x: { kind: 'part' }, y: { kind: 'cand', cod: cod('PSOE'), measure: 'pct' }, excl: true, win: null, grp: null };
let d = dataset(ctx, cx); assert.equal(d.points.length, 147); assert.equal(d.total, 147); assert.equal(d.reg.n, 147);
const wk = [...d.winCounts.keys()], one = new Set([wk[0]]); const d2 = dataset(ctx, { ...cx, win: one }); assert.ok(d2.points.length < 147 && d2.points.length === d.winCounts.get(wk[0]), 'el filtro de ganadora cambia n'); assert.equal(d2.excl.filtro, 147 - d2.points.length);
const d3 = dataset(ctx, { ...cx, grp: new Set(['izq']) }); assert.ok(d3.points.length > 0 && d3.points.length < 147, 'filtro de agrupación líder');
// valores ausentes: nunca se convierten en 0. Candidatura sin votos en el municipio -> índice y peso ausentes (no 0)
const cero = { ...m.off, '999999': [0, 0] }; const ctx0 = makeCtx({ secs: m.s, cands: { ...cands, 999999: 'CERO' }, off: cero, sel: new Set(), groupOf: () => null, groups });
const d0 = dataset(ctx0, { ...cx, y: { kind: 'cand', cod: '999999', measure: 'idx' } }); assert.equal(d0.points.length, 0); assert.equal(d0.excl.ausentes, 147); assert.equal(d0.reg.ok, false);
const dp = dataset(ctx0, { ...cx, y: { kind: 'cand', cod: '999999', measure: 'pct' } }); assert.equal(dp.points.length, 147, 'el % sí existe (0 %) cuando el dato es real'); 
// grupo vacío / suma vacía -> ausente con aviso
const e = axis({ kind: 'grupo', group: 'na', measure: 'pct' }, ctx); assert.ok(e.note && dataset(ctx, { ...cx, y: { kind: 'grupo', group: 'na', measure: 'pct' } }).points.length === 0);
assert.ok(axis({ kind: 'suma', measure: 'pct' }, makeCtx({ secs: m.s, cands, off: m.off, sel: new Set(), groupOf: () => null, groups })).note);
// excluir incompletas: sección sintética con censo 0
const sx = { ...m.s, '0905999999': [0, 0, 0, 0, {}] }; const ctxS = makeCtx({ secs: sx, cands, off: m.off, sel: new Set(), groupOf: () => null, groups });
assert.equal(dataset(ctxS, { ...cx, excl: true }).excl.incompleta, 1); assert.equal(dataset(ctxS, { ...cx, excl: false }).excl.ausentes, 1, 'sin el filtro, la sección sin censo queda fuera por dato ausente (no por 0)');
// presets
const P = presets(ctx, cod('PSOE')); assert.deepEqual(P.map(p => p.id), ['part-cand', 'part-grupo', 'part-idx', 'cand-cand', 'cand-grupo', 'censo-part', 'peso-pct']);
assert.equal(P[4].y.group, 'izq', 'el grupo de PSOE'); assert.equal(P[4].warn, ''); assert.equal(P[3].y.cod !== P[3].x.cod, true);
console.log('OK pruebas de Cruce (regresión, Pearson, Spearman, variables, filtros, ausentes, presets)');
