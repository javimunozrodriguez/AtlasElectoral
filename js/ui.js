// Interfaz: construcción de paneles HTML. No calcula; recibe valores ya calculados.
import { totals, pct, compare, resultRows, votesOf } from './calc.js';
import { CATS } from './strength.js';
export const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
export const n0 = v => v == null ? '—' : Math.round(v).toLocaleString('es-ES');
export const p1 = v => v == null ? '—' : v.toLocaleString('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' %';
export const p2 = v => v == null ? '—' : v.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
// Identificación legible de una sección (el código CUSEC original se conserva solo para uniones internas)
export const secLabel = id => `Distrito ${id.slice(5, 7)} - Sección ${id.slice(7, 10)}`;
const GCOL = { izq: '#a50f15', der: '#08519c', na: '#737373' };
const kv = rows => `<dl>${rows.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl>`;
export const TABS = [['resumen', 'Resumen'], ['resultados', 'Resultados'], ['grupos', 'Agrupaciones'], ['agregacion', 'Agregación'], ['fortaleza', 'Fortaleza'], ['validacion', 'Validación']];
export const tabsHtml = cur => TABS.map(([k, l]) => `<button data-tab="${k}" class="${k === cur ? 'on' : ''}">${l}</button>`).join('');

export function warnings(S) {
  const m = S.muni, v = S.val, w = [];
  if (m.diff) w.push('Los totales oficiales del municipio no coinciden con la suma de sus mesas (datos de origen). La tabla usa los oficiales; el mapa, las agregaciones y la fortaleza usan la suma de secciones.');
  const nr = v.resultados_sin_poligono.filter(x => x.seccion.startsWith(S.cumun)), np = v.poligonos_sin_resultados_en_municipios_con_mesas.filter(x => x.seccion.startsWith(S.cumun));
  if (nr.length) w.push(`${nr.length} sección(es) con resultados no tienen polígono en la cartografía (${nr.map(x => secLabel(x.seccion)).join('; ')}); cuentan en los totales pero no se ven en el mapa.`);
  if (np.length) w.push(`${np.length} polígono(s) sin resultados (${np.map(x => secLabel(x.seccion)).join('; ')}) se muestran en gris.`);
  return w.map(x => `<p class="warn">⚠ ${esc(x)}</p>`).join('');
}
export function resumen(S) {
  const m = S.muni, t = totals([m.t[0], m.t[1], m.t[2], m.t[3]]), nsec = Object.keys(m.s || {}).length;
  const note = m.small ? '<p class="warn">Municipio de menos de 250 habitantes: hay una única sección y el fichero no incluye resultados por sección. Se muestran solo los indicadores de participación; sin mapa ni tabla de candidaturas.</p>' : warnings(S);
  return `<h2>${esc(m.n)}</h2><p class="sub">${esc(S.provName)}</p>${note}
  <h3>Información general</h3>${kv([['Población (derecho)', n0(m.pob)], ['Secciones censales', m.small ? '1' : `${nsec} con resultados`], ['Censo electoral (escrutinio)', n0(t.censo)]])}
  <h3>Participación electoral</h3>${kv([['Votos a candidaturas', n0(t.cand)], ['Votos en blanco', n0(t.blancos)], ['<b>Votos válidos</b> (cand. + blancos)', '<b>' + n0(t.validos) + '</b>'], ['Votos nulos', n0(t.nulos)], ['<b>Total votos emitidos</b>', '<b>' + n0(t.emitidos) + '</b>'], ['<b>Participación</b>', '<b>' + p1(t.part) + '</b>']])}
  ${m.small ? '' : `<p class="mut">Concejales a elegir: ${n0(m.t[4])}</p>`}`;
}
export function resultados(S) {
  const rows = resultRows(S.muni, S.cands), abs = S.tabs === 'abs';
  return `<h3>Resultados por candidatura</h3><div class="seg"><button data-tm="abs" class="${abs ? 'on' : ''}">Votos</button><button data-tm="pct" class="${abs ? '' : 'on'}">% s/ válidos</button></div>
  <table><tr><th>Siglas</th><th class="r">${abs ? 'Votos' : '%'}</th><th class="r">Conc.</th></tr>${rows.map(r => `<tr><td>${esc(r.siglas)}</td><td class="r">${abs ? n0(r.votos) : p2(r.pct)}</td><td class="r">${r.conc || '·'}</td></tr>`).join('')}
  <tr class="tot"><td>Blancos</td><td class="r">${abs ? n0(S.muni.t[1]) : p2(pct(S.muni.t[1], S.muni.t[3] + S.muni.t[1]))}</td><td></td></tr></table>
  <p class="mut">Totales oficiales del municipio (ficheros 05/06). Porcentaje sobre votos válidos.</p>`;
}
export function agregacion(S) {
  const rows = resultRows(S.muni, S.cands), sel = [...S.sel], c = compare(S.base, sel);
  return `<h3>Agregación de candidaturas</h3><p class="mut">Marca las candidaturas a sumar; el mapa «Agregado» se actualiza solo.</p>
  <div class="checks">${rows.map(r => `<label><input type="checkbox" data-cod="${r.cod}" ${S.sel.has(r.cod) ? 'checked' : ''}> ${esc(r.siglas)} <span class="mut">${n0(r.votos)}</span></label>`).join('')}</div>
  <button class="link" data-clear>Quitar todas</button>
  <h3>Resultado conjunto</h3>${kv([['Votos agregados', '<b>' + n0(c.agg) + '</b>'], ['% sobre votos válidos', '<b>' + p2(c.pctAgg) + ' %</b>']])}
  <div class="bar"><span style="width:${c.pctAgg || 0}%" class="a"></span><span style="width:${c.pctResto || 0}%" class="r"></span><span style="width:${c.pctBlancos || 0}%" class="b"></span></div>
  <p class="leg"><i class="a"></i>Agregado ${p1(c.pctAgg)} <i class="r"></i>Resto ${p1(c.pctResto)} <i class="b"></i>Blancos ${p1(c.pctBlancos)}</p>
  <p class="mut">Suma de los votos originales de las candidaturas marcadas, dividida entre los votos válidos (suma de secciones: ${n0(c.validos)}).</p>`;
}
export function fortaleza(S, f) {
  const cnt = f.counts, tot = Object.values(cnt).reduce((a, b) => a + b, 0);
  return `<h3>Fortaleza territorial</h3><p class="mut">Candidatura: <b>${esc(S.cands[S.cand] || '')}</b>${S.useAgg ? ' (agregación marcada)' : ''}</p>
  <label class="chk"><input type="checkbox" id="useAgg" ${S.useAgg ? 'checked' : ''}> Aplicar a la agregación marcada</label>
  ${f.V === 0 ? '<p class="warn">La candidatura no obtiene votos en el municipio: clasificación no aplicable.</p>' : ''}
  ${kv([['Media municipal', p2(f.V && pct(f.V, f.BV)) + (f.V ? ' %' : '')], ['Votos / válidos (suma de secciones)', `${n0(f.V)} / ${n0(f.BV)}`]])}
  <table><tr><th>Categoría</th><th class="r">Umbral (índice)</th><th class="r">Secciones</th></tr>
  <tr><td><i class="sw" style="background:#0b4f9c"></i>Fuerte</td><td class="r">&gt; 1,5</td><td class="r">${cnt.fuerte}</td></tr>
  <tr><td><i class="sw" style="background:#7fb2de"></i>Medio</td><td class="r">0,5 – 1,5</td><td class="r">${cnt.medio}</td></tr>
  <tr><td><i class="sw" style="background:#dbe9f6;border:1px solid #bbb"></i>Débil</td><td class="r">&lt; 0,5</td><td class="r">${cnt.debil}</td></tr>
  <tr><td><i class="sw" style="background:#d9d9d9"></i>Sin clasificar / n.a.</td><td></td><td class="r">${cnt.sin + cnt.na}</td></tr></table>
  <p class="mut">Índice = % del partido en la sección ÷ % del partido en el municipio (ambos sobre votos válidos). La media municipal es votos totales ÷ votos válidos, no la media de porcentajes de las secciones. ${tot} secciones con resultados.</p>`;
}
export function validacion(v) {
  const list = (t, a, f) => `<details><summary>${t} <b>${a.length}</b></summary><div class="scroll">${a.slice(0, 300).map(f).join('<br>') || '—'}</div></details>`;
  return `<h3>Validación de datos (${esc(v.eleccion)})</h3>${kv([['Mesas', n0(v.mesas)], ['Mesas duplicadas', v.mesas_duplicadas], ['Secciones con resultados', n0(v.secciones_con_resultados)], ['Polígonos en cartografía', n0(v.poligonos)], ['Municipios con mesas', n0(v.municipios_con_mesas)], ['Municipios < 250 hab. (sin secciones)', n0(v.municipios_menores_250)]])}
  ${list('Secciones con resultados sin polígono', v.resultados_sin_poligono, x => `${secLabel(x.seccion)} (municipio ${x.seccion.slice(0, 5)}) · censo ${x.censo} · votos ${x.votos_cand}`)}
  ${list('Polígonos sin resultados (municipios con mesas)', v.poligonos_sin_resultados_en_municipios_con_mesas, x => `${secLabel(x.seccion)} · ${esc(x.muni)}`)}
  ${list('Municipios sin resultados en ningún fichero', v.municipios_sin_resultados, x => `${x.muni} · ${esc(x.nombre)} (${esc(x.provincia)})`)}
  ${list('Oficial ≠ suma de secciones (municipios)', v.municipios_diferencia_oficial_vs_secciones, x => `${x.muni} ${esc(x.nombre)}: oficial [${x.oficial}] vs secciones [${x.suma_secciones}]`)}
  ${list('Mesas con votos 09 ≠ suma fichero 10', v.mesas_inconsistentes_09_10, x => `${x.mesa}: ${x.cand09} vs ${x.suma10}`)}
  ${list('Secciones con participación > 100 %', v.secciones_participacion_mayor_100, x => `${secLabel(x.seccion)} (municipio ${x.seccion.slice(0, 5)}): ${x.votantes} votantes, censo ${x.censo}`)}
  <p class="mut">Pares municipio-candidatura con fichero 06 ≠ suma de mesas: ${v.pares_municipio_candidatura_06_vs_10_distintos}. Las discrepancias se informan, no se corrigen.</p>`;
}
export function popup(S, id, s, extra) {
  const t = totals(s), rows = Object.entries(s[4]).sort((a, b) => b[1] - a[1]);
  return `<div class="pop"><b>${secLabel(id)}</b>
  ${kv([['Censo electoral', n0(t.censo)], ['Votos emitidos', n0(t.emitidos)], ['Participación', p1(t.part)], ['Votos en blanco', n0(t.blancos)], ['Votos nulos', n0(t.nulos)]])}${extra || ''}
  <table><tr><th>Candidatura</th><th class="r">Votos</th><th class="r">%</th></tr>${rows.map(([c, v]) => `<tr><td>${esc(S.cands[c] || c)}</td><td class="r">${n0(v)}</td><td class="r">${p2(pct(v, t.validos))}</td></tr>`).join('')}</table></div>`;
}
export const CAT_TXT = CATS;

export function grupos(S, store) {
  const rows = resultRows(S.muni, S.cands), t = totals(S.base), G = store.groups();
  const inG = g => rows.filter(r => store.groupOf(r.siglas) === g).map(r => r.cod);
  const res = G.map(g => { const v = votesOf(S.base, inG(g.id)); return { g, n: inG(g.id).length, v, p: pct(v, t.validos) }; });
  const rest = t.cand - res.reduce((a, r) => a + r.v, 0), col = id => GCOL[id] || '#737373';
  return `<h3>Agrupaciones</h3><p class="mut">Asigna cada candidatura a la agrupación que prefieras; se guarda en este navegador y se recuerda en otros municipios por sus siglas. Los votos se suman y el % es sobre votos válidos (blancos incluidos).</p>
  <div class="checks"><table class="grp"><tr><th>Candidatura</th>${G.map(g => `<th class="c">${esc(g.name)}</th>`).join('')}</tr>${rows.map(r => `<tr><td>${esc(r.siglas)} <span class="mut">${n0(r.votos)}</span></td>${G.map(g => `<td class="c"><input type="checkbox" data-sig="${esc(r.siglas)}" data-g="${g.id}" ${store.groupOf(r.siglas) === g.id ? 'checked' : ''}></td>`).join('')}</tr>`).join('')}</table></div>
  <h3>Resultado por agrupación</h3>${kv(res.map(r => [`<i class="sw" style="background:${col(r.g.id)}"></i>${esc(r.g.name)} <span class="mut">(${r.n} cand.)</span>`, `<b>${n0(r.v)}</b> · ${p2(r.p)} %`]).concat([['Sin agrupar (cand.) + blancos', `${n0(rest + t.blancos)} · ${p2(pct(rest + t.blancos, t.validos))} %`]]))}
  <div class="bar">${res.map(r => `<span style="width:${r.p || 0}%;background:${col(r.g.id)}"></span>`).join('')}</div>
  <p class="seg">${res.map(r => `<button data-viewg="${r.g.id}">Ver ${esc(r.g.name)} en el mapa</button>`).join('')}</p>
  <p class="mut">Suma de secciones (misma base que el mapa). Ninguna candidatura viene clasificada de antemano.</p>`;
}
