// Cálculos de participación, porcentajes y agregaciones. Funciones puras (sin DOM).
// Una sección/municipio se representa como s = [censo_escrutinio, blancos, nulos, votosCandidaturas, {codCandidatura: votos}]
export const votesOf = (s, cods) => { let v = 0; for (const c of cods) v += s[4][c] || 0; return v; };

export function totals(s) {
  const [censo, blancos, nulos, cand] = s;
  const validos = cand + blancos;          // válidos = candidaturas + blancos
  const emitidos = validos + nulos;        // emitidos = válidos + nulos
  return { censo, blancos, nulos, cand, validos, emitidos, part: censo > 0 ? emitidos / censo * 100 : null };
}
export const pct = (v, validos) => (validos > 0 ? v / validos * 100 : null);

// Suma de secciones (suma votos originales, nunca porcentajes)
export function sumSections(secs) {
  const t = [0, 0, 0, 0, {}];
  for (const s of Object.values(secs)) {
    for (let i = 0; i < 4; i++) t[i] += s[i];
    for (const [c, v] of Object.entries(s[4])) t[4][c] = (t[4][c] || 0) + v;
  }
  return t;
}
// Totales oficiales del municipio (ficheros 05/06) con el mismo formato
export const officialAsSection = m => [m.t[0], m.t[1], m.t[2], m.t[3], Object.fromEntries(Object.entries(m.off || {}).map(([c, a]) => [c, a[0]]))];

export function resultRows(m, cands) {
  const validos = m.t[3] + m.t[1];
  return Object.entries(m.off || {}).map(([cod, [votos, conc]]) => ({ cod, siglas: cands[cod] || cod, votos, pct: pct(votos, validos), conc }))
    .sort((a, b) => b.votos - a.votos || a.siglas.localeCompare(b.siglas));
}
// Comparación agregado vs resto (sobre votos válidos)
export function compare(s, cods) {
  const t = totals(s), agg = votesOf(s, cods), resto = t.cand - agg;
  return { agg, resto, blancos: t.blancos, validos: t.validos, pctAgg: pct(agg, t.validos), pctResto: pct(resto, t.validos), pctBlancos: pct(t.blancos, t.validos) };
}
// Cortes de igual intervalo para escalas secuenciales
export function breaks(values, n = 5) {
  const v = values.filter(x => x != null && isFinite(x)); if (!v.length) return [];
  const mn = Math.min(...v), mx = Math.max(...v); if (mn === mx) return [mn, mx];
  return Array.from({ length: n + 1 }, (_, i) => mn + (mx - mn) * i / n);
}
export const classIndex = (x, br) => { if (br.length < 2) return 0; const n = br.length - 1; for (let i = 1; i < n; i++) if (x < br[i]) return i - 1; return n - 1; };
