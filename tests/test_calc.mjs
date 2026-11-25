import assert from 'node:assert/strict';
import { totals, votesOf, sumSections, pct, compare, breaks } from '../js/calc.js';
import { classify } from '../js/strength.js';
// participación: válidos = cand+blancos; emitidos = válidos+nulos; part = emitidos/censo
const t = totals([1000, 20, 30, 600, {}]);
assert.equal(t.validos, 620); assert.equal(t.emitidos, 650); assert.equal(t.part, 65);
// agregación: se suman votos, nunca porcentajes
const secs = { a: [100, 0, 0, 50, { x: 10, y: 40 }], b: [1000, 0, 0, 500, { x: 400, y: 100 }] };
const base = sumSections(secs); assert.equal(votesOf(base, ['x', 'y']), 550); assert.equal(pct(votesOf(base, ['x', 'y']), 550), 100);
assert.notEqual(pct(10, 50) + pct(400, 500), pct(410, 550));   // sumar % daría otro resultado
assert.equal(compare(base, ['x']).resto, 140);
// fortaleza: ejemplo del enunciado 35% / 20% = 1,75 -> fuerte
let r = classify(35, 100, 20, 100); assert.equal(r.cat, 'fuerte'); assert.equal(r.idx, 1.75);
assert.equal(classify(30, 100, 20, 100).cat, 'medio');           // 1,5 exacto -> medio
assert.equal(classify(10, 100, 20, 100).cat, 'medio');           // 0,5 exacto -> medio
assert.equal(classify(9, 100, 20, 100).cat, 'debil');
assert.equal(classify(0, 100, 20, 100).cat, 'debil');            // 0 votos, media > 0 -> débil
assert.equal(classify(5, 100, 0, 100).cat, 'na');                // partido sin votos en el municipio
assert.equal(classify(0, 0, 20, 100).cat, 'sin');                // sección sin votos válidos
assert.equal(classify(301, 1000, 200, 1000).cat, 'fuerte');      // 30,1 % vs 20 % -> 1,505
assert.deepEqual(breaks([0, 10]), [0, 2, 4, 6, 8, 10]);
console.log('OK: todas las pruebas de cálculo pasan');
