import assert from 'node:assert/strict'; import fs from 'node:fs';
import { distribute, simulate, votesNeeded, formulaX, umbralVotos, cumple } from '../js/dhondt.js';
// --- casos de libro
let d = distribute([{ cod: 'A', votos: 340000 }, { cod: 'B', votos: 280000 }, { cod: 'C', votos: 160000 }, { cod: 'D', votos: 60000 }, { cod: 'E', votos: 15000 }], 855000, 7);
assert.deepEqual(d.seats, { A: 3, B: 3, C: 1, D: 0 }); assert.deepEqual(d.excluded.map(c => c.cod), ['E']);   // E: 1,75 % < 5 %
// barrera: exactamente 5 % entra; 4,99 % no; blancos cuentan en el denominador, nulos no
assert.ok(cumple(50, 1000) && !cumple(49, 1000)); assert.equal(umbralVotos(1000), 50); assert.equal(umbralVotos(1001), 51);
// excluida por 5 % aunque tendría cociente ganador sin barrera
d = distribute([{ cod: 'A', votos: 940 }, { cod: 'B', votos: 49 }], 1000, 3); assert.deepEqual(d.seats, { A: 3 });
// empate de cocientes: gana más votos
d = distribute([{ cod: 'A', votos: 300 }, { cod: 'B', votos: 200 }], 500, 3);   // A/1=300,B/1=200,A/2=150... B/1=200 vs A/2=150
assert.deepEqual(d.seats, { A: 2, B: 1 });
d = distribute([{ cod: 'A', votos: 400 }, { cod: 'B', votos: 200 }, { cod: 'C', votos: 100 }], 700, 3);   // A/2=200 empata con B/1=200: gana A (más votos)
assert.equal(d.seats.A, 2); assert.equal(d.seats.B, 1); assert.equal(d.seats.C, 0);
d = distribute([{ cod: 'A', votos: 400 }, { cod: 'B', votos: 200 }, { cod: 'C', votos: 100 }], 700, 2); assert.ok(d.tie && !d.tie.sorteo && d.seats.A === 2);   // empate en el corte resuelto por votos
d = distribute([{ cod: 'A', votos: 200 }, { cod: 'B', votos: 200 }], 400, 3); assert.ok(d.tie && d.tie.sorteo);   // 3 escaños, A y B idénticos: el empate del corte (A/2 vs B/2) es de sorteo
d = distribute([{ cod: 'A', votos: 200 }, { cod: 'B', votos: 200 }], 400, 1); assert.ok(d.tie.sorteo);   // 1 escaño, votos idénticos -> sorteo
// votos necesarios: exacto y minimal
const cs = [{ cod: 'A', votos: 5000 }, { cod: 'B', votos: 3000 }, { cod: 'C', votos: 1900 }, { cod: 'D', votos: 700 }]; const V = 10600, N = 7;
const r = votesNeeded(cs, V, N, 'C'); const before = distribute(cs, V, N).seats.C;
assert.ok(simulate(cs, V, N, 'C', r.x).seats.C > before); assert.ok(simulate(cs, V, N, 'C', r.x - 1).seats.C <= before, 'x-1 no basta');
assert.ok(r.lost.length >= 1);
// Caso real (Burgos): con 2.072 votos más el PP igualaría al PSOE (29.651 = 29.651) y el concejal dependería de un sorteo; el primero seguro es 2.073
const bu = JSON.parse(fs.readFileSync('data/municipales-2023/res/09.json')).muni['09059'], bc = Object.entries(bu.off).map(([cod, [votos]]) => ({ cod, votos })), pp = bc.find(c => c.votos === 27579).cod;
assert.equal(votesNeeded(bc, bu.t[3] + bu.t[1], bu.t[4], pp).x, 2073); assert.ok(simulate(bc, bu.t[3] + bu.t[1], bu.t[4], pp, 2072).tie?.sorteo, 'a 2.072 hay empate absoluto');
// la fórmula directa coincide con la búsqueda cuando no hay efectos de barrera
for (const cod of ['A', 'B', 'C', 'D']) { const b = distribute(cs, V, N), c = cs.find(x => x.cod === cod), f = formulaX(c, b.seats[cod] || 0, b.last), s = votesNeeded(cs, V, N, cod); if (f != null && s) assert.equal(f, s.x, cod); }
// simulación respeta barrera con nuevo total: D (700/10600=6,6 %) cae por debajo del 5 % si C suma muchos votos
const sim = simulate(cs, V, N, 'C', 5000); assert.ok(sim.excluded.some(c => c.cod === 'D') && sim.validos === V + 5000);
// --- reparto oficial: todos los municipios con mesas
let ok = 0, bad = []; let tot = 0;
for (const f of fs.readdirSync('data/municipales-2023/res')) { const j = JSON.parse(fs.readFileSync('data/municipales-2023/res/' + f));
  for (const [m, x] of Object.entries(j.muni)) { if (x.small || !x.off) continue; tot++; const cands = Object.entries(x.off).map(([cod, [v]]) => ({ cod, votos: v })); const d = distribute(cands, x.t[3] + x.t[1], x.t[4]);
    const diff = Object.entries(x.off).filter(([c, [, conc]]) => (d.seats[c] || 0) !== conc);
    diff.length ? bad.push({ m, n: x.n, N: x.t[4], diff: diff.map(([c, [v, k]]) => `${j.cands[c]} oficial ${k} calc ${d.seats[c] || 0}`), tie: !!d.tie, diffcand: x.t[3] - cands.reduce((a, c) => a + c.votos, 0) }) : ok++; } }
console.log(`municipios: ${tot} | reparto idéntico al oficial: ${ok} | discrepancias: ${bad.length}`); if (bad.length) console.log(JSON.stringify(bad.slice(0, 12)));
fs.writeFileSync('/tmp/dhondt_bad.json', JSON.stringify(bad));
console.log('OK pruebas D\'Hondt (casos de libro)');
