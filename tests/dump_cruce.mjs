// Vuelca los estadísticos del módulo cruce.js para varios municipios (los contrasta tests/verify_cruce.py con NumPy/SciPy).
import fs from 'node:fs'; import { makeCtx, dataset } from '../js/cruce.js';
const out = {}, groups = [{ id: 'izq', name: 'Izquierdas' }];
for (const mun of process.argv.slice(2)) {
  const r = JSON.parse(fs.readFileSync(`data/municipales-2023/res/${mun.slice(0, 2)}.json`)), m = r.muni[mun], ctx = makeCtx({ secs: m.s, cands: r.cands, off: m.off, sel: new Set(), groupOf: () => null, groups });
  const top = ctx.candList[0].cod, C = (measure) => ({ kind: 'cand', cod: top, measure }), specs = { 'part~pct': [{ kind: 'part' }, C('pct')], 'censo~votantes': [{ kind: 'censo' }, { kind: 'votantes' }], 'part~idx': [{ kind: 'part' }, C('idx')], 'peso~pct': [C('peso'), C('pct')], 'abst~blancos%': [{ kind: 'abst' }, { kind: 'blancos', measure: 'pct' }] };
  out[mun] = { top, n: Object.keys(m.s).length };
  for (const [k, [x, y]] of Object.entries(specs)) { const d = dataset(ctx, { x, y, excl: true, win: null, grp: null }); out[mun][k] = { n: d.reg.n, slope: d.reg.slope, intercept: d.reg.intercept, r: d.reg.r, r2: d.reg.r2, rho: d.sp.rho }; }
}
console.log(JSON.stringify(out));
