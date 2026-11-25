// Índice de fortaleza territorial = %partido en sección / %partido en municipio (misma base: votos válidos).
// Comparaciones con enteros (sin redondeos de coma flotante): índice = vs*VALID / (validosSec*V).
export const CATS = { fuerte: 'Fuerte', medio: 'Medio', debil: 'Débil', sin: 'Sin clasificar', na: 'No aplicable' };
export function classify(vs, validosSec, V, VALID) {
  if (V === 0) return { cat: 'na', idx: null };                      // el partido no tiene votos en el municipio
  if (validosSec <= 0) return { cat: 'sin', idx: null };             // sección sin datos válidos
  const num = vs * VALID, den = validosSec * V, idx = num / den;
  if (num * 2 > den * 3) return { cat: 'fuerte', idx };              // índice > 1,5
  if (num * 2 < den) return { cat: 'debil', idx };                   // índice < 0,5 (incluye 0 votos con media > 0)
  return { cat: 'medio', idx };                                      // 0,5 <= índice <= 1,5
}
