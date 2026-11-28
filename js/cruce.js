// Cruce: variables por sección censal, filtros y estadística (regresión lineal, Pearson, Spearman). Funciones puras, sin DOM.
// Una sección es s = [censo_escrutinio, blancos, nulos, votosCandidaturas, {codCandidatura: votos}] (ver calc.js).
import { totals, votesOf, sumSections } from './calc.js?v=5';
import { classify } from './strength.js?v=5';

export const WIN_NONE = '_';   // clave para «sin candidatura ganadora única» / «sin agrupación líder»
export const KINDS = [['censo', 'Censo electoral (electores)'], ['votantes', 'Votantes'], ['part', 'Participación (%)'], ['abst', 'Abstención (%)'], ['abstn', 'Abstenciones (n.º)'],
  ['validos', 'Votos válidos'], ['blancos', 'Votos en blanco'], ['nulos', 'Votos nulos'], ['cand', 'Candidatura'], ['suma', 'Suma (candidaturas marcadas)'], ['grupo', 'Ideología (grupo)']];
export const MEASURES = { cands: [['votos', 'Votos'], ['pct', '% de voto s/ válidos'], ['idx', 'Índice de fortaleza'], ['peso', 'Peso de la sección en el voto municipal (%)']], bn: [['abs', 'Valor absoluto'], ['pct', 'Porcentaje']] };
export const hasMeasure = k => k === 'blancos' || k === 'nulos' ? 'bn' : ['cand', 'suma', 'grupo'].includes(k) ? 'cands' : null;

export function makeCtx({ secs, cands, off, sel, groupOf, groups }) {
  const base = sumSections(secs), offCods = Object.keys(off || {}), gm = {};
  return { secs, cands, offCods, groups, groupOf, base, BV: base[3] + base[1], sel: [...sel].filter(c => offCods.includes(c)),
    codsOfGroup: g => gm[g] ??= offCods.filter(c => groupOf(cands[c]) === g),
    candList: offCods.map(c => ({ cod: c, siglas: cands[c] || c, votos: off[c][0] })).sort((a, b) => b.votos - a.votos || a.siglas.localeCompare(b.siglas)),
    groupName: g => groups.find(x => x.id === g)?.name || g };
}

// Eje: { label, unit ('n' | '%' | 'idx'), fn(s, t) -> número | null, note? }. null = dato ausente (NUNCA se sustituye por 0).
export function axis(spec, ctx) {
  const { kind, measure } = spec, pctOf = (v, d) => d > 0 ? v / d * 100 : null;
  const simple = { censo: ['Censo electoral', 'n', t => t.censo], votantes: ['Votantes', 'n', t => t.emitidos], part: ['Participación (%)', '%', t => t.part],
    abst: ['Abstención (%)', '%', t => t.censo > 0 ? (t.censo - t.emitidos) / t.censo * 100 : null], abstn: ['Abstenciones (n.º)', 'n', t => t.censo > 0 ? t.censo - t.emitidos : null], validos: ['Votos válidos', 'n', t => t.validos] };
  if (simple[kind]) { const [label, unit, f] = simple[kind]; return { label, unit, fn: (s, t) => f(t) }; }
  if (kind === 'blancos') return measure === 'pct' ? { label: 'Votos en blanco (% s/ válidos)', unit: '%', fn: (s, t) => pctOf(t.blancos, t.validos) } : { label: 'Votos en blanco', unit: 'n', fn: (s, t) => t.blancos };
  if (kind === 'nulos') return measure === 'pct' ? { label: 'Votos nulos (% s/ emitidos)', unit: '%', fn: (s, t) => pctOf(t.nulos, t.emitidos) } : { label: 'Votos nulos', unit: 'n', fn: (s, t) => t.nulos };
  const cods = kind === 'cand' ? [spec.cod] : kind === 'suma' ? ctx.sel : ctx.codsOfGroup(spec.group);
  const name = kind === 'cand' ? (ctx.cands[spec.cod] || spec.cod) : kind === 'suma' ? 'Suma (' + (cods.map(c => ctx.cands[c]).join(' + ') || 'sin candidaturas') + ')' : 'Ideología: ' + ctx.groupName(spec.group);
  const ml = { votos: 'Votos', pct: '% de voto', idx: 'Índice de fortaleza', peso: 'Peso en el voto municipal (%)' }[measure] || 'Votos', unit = { votos: 'n', pct: '%', idx: 'idx', peso: '%' }[measure] || 'n', label = `${ml} · ${name}`;
  if (!cods.length) return { label, unit, fn: () => null, note: kind === 'suma' ? 'La herramienta Suma no tiene candidaturas marcadas.' : kind === 'grupo' ? `La agrupación «${ctx.groupName(spec.group)}» no tiene candidaturas asignadas en este municipio (asígnalas en Ideología).` : 'Candidatura no disponible.' };
  const V = votesOf(ctx.base, cods), BV = ctx.BV;
  const fn = { votos: s => votesOf(s, cods), pct: (s, t) => pctOf(votesOf(s, cods), t.validos), idx: (s, t) => classify(votesOf(s, cods), t.validos, V, BV).idx, peso: s => V > 0 ? votesOf(s, cods) / V * 100 : null }[measure] || (s => votesOf(s, cods));
  return { label, unit, fn };
}

export function winnerOf(s, cods) {   // candidatura con más votos en la sección; null si hay empate o ninguna tiene votos
  let best = 0, w = null, tie = false;
  for (const c of cods) { const v = s[4][c] || 0; if (v > best) { best = v; w = c; tie = false; } else if (v === best && v > 0) tie = true; }
  return best > 0 && !tie ? w : null;
}
export function leaderGroup(s, ctx) {   // agrupación (definida por el usuario) con más votos; null si no hay asignaciones o hay empate
  let best = 0, g = null, tie = false;
  for (const { id } of ctx.groups) { const v = votesOf(s, ctx.codsOfGroup(id)); if (v > best) { best = v; g = id; tie = false; } else if (v === best && v > 0) tie = true; }
  return best > 0 && !tie ? g : null;
}

// ---- Estadística
export function ranks(a) {   // rangos con empates promediados
  const idx = a.map((v, i) => i).sort((i, j) => a[i] - a[j]), r = new Array(a.length);
  for (let i = 0; i < idx.length;) { let j = i; while (j + 1 < idx.length && a[idx[j + 1]] === a[idx[i]]) j++; const avg = (i + j) / 2 + 1; for (let k = i; k <= j; k++) r[idx[k]] = avg; i = j + 1; }
  return r;
}
function sums(xs, ys) {   // dos pasadas: medias y sumas de cuadrados centradas
  const n = xs.length; let mx = 0, my = 0; for (let i = 0; i < n; i++) { mx += xs[i]; my += ys[i]; } mx /= n; my /= n;
  let sxx = 0, syy = 0, sxy = 0; for (let i = 0; i < n; i++) { const dx = xs[i] - mx, dy = ys[i] - my; sxx += dx * dx; syy += dy * dy; sxy += dx * dy; }
  return { n, mx, my, sxx, syy, sxy };
}
export function regression(xs, ys) {
  const n = xs.length; if (n < 3) return { n, ok: false, warn: `Solo hay ${n} sección(es) con valor válido en las dos variables: se necesitan al menos 3 para calcular la regresión.` };
  const q = sums(xs, ys); if (q.sxx === 0) return { n, ok: false, warn: 'La variable X no varía (todas las secciones tienen el mismo valor): no se puede calcular la recta.' };
  const slope = q.sxy / q.sxx, intercept = q.my - slope * q.mx;
  if (q.syy === 0) return { n, ok: true, slope, intercept, r: null, r2: null, warn: 'La variable Y no varía: la recta es horizontal y no se puede calcular la correlación.', caution: n < 10 };
  const r = Math.max(-1, Math.min(1, q.sxy / Math.sqrt(q.sxx * q.syy)));
  return { n, ok: true, slope, intercept, r, r2: r * r, caution: n < 10 };   // r = Sxy/√(Sxx·Syy); R² = r²; pendiente = Sxy/Sxx; ordenada = ȳ − pendiente·x̄
}
export function spearman(xs, ys) {   // Pearson sobre los rangos (con empates promediados)
  if (xs.length < 3) return { ok: false };
  const q = sums(ranks(xs), ranks(ys)); if (q.sxx === 0 || q.syy === 0) return { ok: false, warn: 'Spearman no se puede calcular porque una de las variables no varía.' };
  return { ok: true, rho: Math.max(-1, Math.min(1, q.sxy / Math.sqrt(q.sxx * q.syy))) };
}

// ---- Conjunto de datos del gráfico: aplica filtros y descarta (sin rellenar) las secciones sin dato en alguna variable
export function dataset(ctx, cx) {
  const ax = axis(cx.x, ctx), ay = axis(cx.y, ctx), cods = ctx.offCods, points = [], excl = { incompleta: 0, filtro: 0, ausentes: 0 }, winCounts = new Map(), grpCounts = new Map();
  let total = 0, mayor100 = 0;
  for (const [id, s] of Object.entries(ctx.secs)) {
    total++; const t = totals(s); if (t.censo > 0 && t.emitidos > t.censo) mayor100++;
    if (cx.excl && (t.censo <= 0 || t.validos <= 0)) { excl.incompleta++; continue; }
    const w = winnerOf(s, cods) || WIN_NONE, g = leaderGroup(s, ctx) || WIN_NONE;
    winCounts.set(w, (winCounts.get(w) || 0) + 1); grpCounts.set(g, (grpCounts.get(g) || 0) + 1);
    if ((cx.win && !cx.win.has(w)) || (cx.grp && !cx.grp.has(g))) { excl.filtro++; continue; }
    const x = ax.fn(s, t), y = ay.fn(s, t);
    if (x == null || y == null || !Number.isFinite(x) || !Number.isFinite(y)) { excl.ausentes++; continue; }
    points.push({ id, x, y, w });
  }
  const xs = points.map(p => p.x), ys = points.map(p => p.y);
  return { ax, ay, points, excl, total, mayor100, winCounts, grpCounts, reg: regression(xs, ys), sp: spearman(xs, ys) };
}

// ---- Cruces sugeridos (accesos rápidos; el usuario puede modificarlos después)
export function presets(ctx, c1) {
  const L = ctx.candList, a = L.find(c => c.cod === c1) || L[0], b = L.find(c => c.cod !== a?.cod), g1 = a ? ctx.groupOf(a.siglas) : null;
  const firstG = ctx.groups.find(g => ctx.codsOfGroup(g.id).length)?.id || ctx.groups[0].id;
  const cand = (c, m) => ({ kind: 'cand', cod: c.cod, measure: m }), pg = (g, m) => ({ kind: 'grupo', group: g, measure: m });
  if (!a) return [];
  return [
    { id: 'part-cand', label: 'Participación y % de voto de una candidatura', x: { kind: 'part' }, y: cand(a, 'pct') },
    { id: 'part-grupo', label: 'Participación y % de una agrupación de Ideología', x: { kind: 'part' }, y: pg(firstG, 'pct') },
    { id: 'part-idx', label: 'Participación e índice de fortaleza', x: { kind: 'part' }, y: cand(a, 'idx') },
    { id: 'cand-cand', label: '% de una candidatura y % de otra', x: cand(a, 'pct'), y: b ? cand(b, 'pct') : cand(a, 'pct') },
    { id: 'cand-grupo', label: '% de una candidatura y % de su agrupación', x: cand(a, 'pct'), y: pg(g1 || firstG, 'pct'), warn: g1 ? '' : `«${a.siglas}» no está asignada a ninguna agrupación: asígnala en Ideología para que este cruce tenga sentido.` },
    { id: 'censo-part', label: 'Censo electoral y participación', x: { kind: 'censo' }, y: { kind: 'part' } },
    { id: 'peso-pct', label: 'Peso de la sección en el voto de una candidatura y su % de voto', x: cand(a, 'peso'), y: cand(a, 'pct') },
  ];
}
