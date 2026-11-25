// Reparto de concejales por D'Hondt con barrera del 5 % (LOREG arts. 163.1 y 180). Funciones puras, aritmética entera.
// cands: [{cod, votos}]; validos = candidaturas + blancos (sin nulos); N = concejales a elegir.
export const BARRERA = 5;
export const umbralVotos = validos => Math.floor((validos * BARRERA + 99) / 100);   // ceil(5 % de válidos)
export const cumple = (votos, validos) => votos > 0 && votos * 100 >= BARRERA * validos;   // "al menos el 5 %"

export function distribute(cands, validos, N) {
  const eligible = [], excluded = [];
  for (const c of cands) (cumple(c.votos, validos) ? eligible : excluded).push({ ...c, pct: validos > 0 ? c.votos / validos * 100 : null });
  const q = [];
  for (const c of eligible) for (let k = 1; k <= N; k++) q.push({ cod: c.cod, k, v: c.votos });
  // mayor cociente (comparación cruzada exacta); empate de cocientes -> más votos totales (art. 163.1 d)
  q.sort((a, b) => (b.v * a.k - a.v * b.k) || (b.v - a.v));
  const win = q.slice(0, N), seats = {}; for (const c of eligible) seats[c.cod] = 0; for (const w of win) seats[w.cod]++;
  const last = win[N - 1] || null, nextLoser = q[N] || null; let tie = null;
  if (last && nextLoser && last.v * nextLoser.k === nextLoser.v * last.k) tie = { a: last, b: nextLoser, sorteo: last.v === nextLoser.v };  // sorteo = igualdad total de votos
  for (const c of eligible) c.seats = seats[c.cod];
  return { eligible, excluded, seats, win, last, nextLoser, tie, validos, N, umbral: umbralVotos(validos) };
}
export const nextQuotient = (c, seats) => ({ k: seats + 1, v: c.votos, q: c.votos / (seats + 1) });

// Reparto hipotético: la candidatura `cod` obtiene `extra` votos más (válidos adicionales; se recalcula la barrera con el nuevo total).
export function simulate(cands, validos, N, cod, extra) {
  return distribute(cands.map(c => c.cod === cod ? { ...c, votos: c.votos + extra } : c), validos + extra, N);
}
// Mínimo de votos adicionales (enteros) para que `cod` obtenga un concejal más. Búsqueda exacta sobre el propio reparto (incluye barrera y desempates).
export function votesNeeded(cands, validos, N, cod) {
  const base = distribute(cands, validos, N), s0 = base.seats[cod] || 0;
  if (s0 >= N) return null;
  // Solo cuenta el concejal si es seguro: un escaño que dependa de un sorteo (mismo cociente y mismos votos) no se considera conseguido.
  const gets = x => { const r = simulate(cands, validos, N, cod, x), t = r.tie; return (r.seats[cod] || 0) > s0 && !(t && t.sorteo && (t.a.cod === cod || t.b.cod === cod)); };
  let hi = 1; while (!gets(hi)) { hi *= 2; if (hi > 1e9) return null; }
  let lo = 0; while (hi - lo > 1) { const m = Math.floor((lo + hi) / 2); gets(m) ? hi = m : lo = m; }
  const sim = simulate(cands, validos, N, cod, hi);
  const lost = Object.keys(base.seats).filter(k => k !== cod && (base.seats[k] || 0) > (sim.seats[k] || 0));
  return { x: hi, base, sim, lost, gained: lost.length || Object.keys(sim.seats).some(k => k !== cod && (sim.seats[k] || 0) < (base.seats[k] || 0)) };
}
// Fórmula directa (solo explicativa): x mínimo para que (v+x)/(s+1) supere el cociente del último concejal L = vL/kL.
export function formulaX(c, seats, last) {
  if (!last || last.cod === c.cod) return null;
  const need = last.v * (seats + 1);                       // (v+x)*kL > vL*(s+1)
  let x = Math.floor(need / last.k) - c.votos + 1;
  if ((c.votos + x - 1) * last.k === need && c.votos + x - 1 > last.v) x -= 1;   // igualdad de cocientes con más votos que L gana
  return Math.max(x, 0);
}
