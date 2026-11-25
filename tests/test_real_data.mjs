// Pruebas con datos reales (Burgos 09059): coherencia de agregaciones y fortaleza con las cifras oficiales.
import assert from 'node:assert/strict'; import fs from 'node:fs';
import { totals, votesOf, sumSections, pct, resultRows } from '../js/calc.js'; import { classify } from '../js/strength.js';
const res = JSON.parse(fs.readFileSync('data/municipales-2023/res/09.json')); const m = res.muni['09059'], cands = res.cands;
const base = sumSections(m.s);
assert.deepEqual(base.slice(0, 4), m.t.slice(0, 4), 'suma de secciones = total oficial (Burgos)');
const rows = resultRows(m, cands); for (const r of rows) assert.equal(base[4][r.cod] || 0, r.votos, r.siglas);
const [a, b] = rows.slice(0, 2).map(r => r.cod), validos = base[3] + base[1];
const agg = votesOf(base, [a, b]); assert.equal(agg, rows[0].votos + rows[1].votos); assert.ok(Math.abs(pct(agg, validos) - (rows[0].pct + rows[1].pct)) < 1e-9);
let n = { fuerte: 0, medio: 0, debil: 0 };
for (const s of Object.values(m.s)) { const t = totals(s), r = classify(votesOf(s, [a]), t.validos, rows[0].votos, validos);
  const idx = (votesOf(s, [a]) / t.validos) / (rows[0].votos / validos); assert.ok(Math.abs(idx - r.idx) < 1e-12); n[r.cat]++; }
console.log(`Burgos: ${rows[0].siglas} ${rows[0].votos} votos (${pct(rows[0].votos, validos).toFixed(2)} %), ${Object.keys(m.s).length} secciones →`, n);
console.log('OK pruebas con datos reales');
