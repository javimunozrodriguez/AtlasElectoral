// Apartado D'Hondt: construye el HTML a partir de js/dhondt.js. Datos oficiales del municipio (ficheros 05/06).
import { distribute, simulate, votesNeeded, nextQuotient } from './dhondt.js';
import { esc, n0, p2 } from './ui.js';
const q1 = v => v.toLocaleString('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const ctx = S => { const m = S.muni; return { cands: Object.entries(m.off || {}).map(([cod, [votos, conc]]) => ({ cod, votos, conc })).sort((a, b) => b.votos - a.votos), validos: m.t[3] + m.t[1], N: m.t[4] }; };
export const needed = S => { const { cands, validos, N } = ctx(S); const r = votesNeeded(cands, validos, N, S.dh.cod); return r ? r.x : 0; };
const tieMsg = (t, S) => !t ? '' : t.sorteo ? `<p class="warn">Empate absoluto en el último concejal: ${esc(S.cands[t.a.cod])} y ${esc(S.cands[t.b.cod])} tienen el mismo cociente y los mismos votos. La ley lo resuelve por sorteo; este cálculo no puede determinarlo.</p>`
  : `<p class="warn">Empate de cocientes en el último concejal entre ${esc(S.cands[t.a.cod])} y ${esc(S.cands[t.b.cod])}: se resuelve a favor de la candidatura con más votos.</p>`;

export function html(S) {
  if (!S.muni) return '<p class="mut">Busca un municipio en el buscador superior para analizar su reparto de concejales.</p>';
  if (S.muni.small || !S.muni.off) return `<h2>${esc(S.muni.n)}</h2><p class="warn">Municipio sin resultados por candidatura en los datos: no se puede analizar el reparto D'Hondt.</p>`;
  const { cands, validos, N } = ctx(S), cod = cands.some(c => c.cod === S.dh.cod) ? S.dh.cod : cands[0].cod, sel = cands.find(c => c.cod === cod), sg = c => S.cands[c] || c;
  const base = distribute(cands, validos, N), s = base.seats[cod] || 0, elig = base.eligible.some(c => c.cod === cod), extra = S.dh.extra || 0;
  const need = votesNeeded(cands, validos, N, cod), sim = simulate(cands, validos, N, cod, extra), L = base.last, nq = elig ? nextQuotient(sel, s) : null;
  const mismatch = cands.filter(c => (base.seats[c.cod] || 0) !== c.conc);
  const lost = need ? need.lost.map(sg).map(esc).join(', ') : '';
  const ans = s >= N ? `<b>${esc(sg(cod))}</b> ya tiene los ${N} concejales: no puede obtener más.`
    : !need ? 'No es posible que esta candidatura obtenga un concejal adicional con votos adicionales.'
    : `A <b>${esc(sg(cod))}</b> le han faltado <b>${n0(need.x)} votos</b> para conseguir un concejal más. Con esos votos habría arrebatado un concejal a <b>${lost || 'otra candidatura'}</b>.${elig ? '' : ' (Parte de una situación en la que no alcanzó la barrera del 5 %, que también tendría que superar.)'}`;
  const gain = (sim.seats[cod] || 0) - s;
  const simMsg = !extra ? 'Introduce votos adicionales para la candidatura seleccionada y compara el reparto.'
    : gain > 0 ? `Con <b>${n0(extra)}</b> votos más, ${esc(sg(cod))} pasa de ${s} a <b>${s + gain}</b> concejales.`
    : `Con ${n0(extra)} votos más ${esc(sg(cod))} <b>no</b> consigue un concejal adicional${need ? ` (faltarían ${n0(Math.max(need.x - extra, 0))} votos más)` : ''}.`;
  const rows = cands.map(c => { const hs = sim.seats[c.cod] || 0, bs = base.seats[c.cod] || 0, d = hs - bs; return `<tr class="${c.cod === cod ? 'me' : ''}"><td>${esc(sg(c.cod))}</td><td class="r">${n0(c.votos + (c.cod === cod ? extra : 0))}</td><td class="r">${c.conc}</td><td class="r">${hs}</td><td class="r ${d > 0 ? 'up' : d < 0 ? 'dn' : ''}">${d > 0 ? '+' : ''}${d || '·'}</td></tr>`; }).join('');
  const win = new Map(base.win.map((w, i) => [w.cod + '|' + w.k, i + 1])), K = Math.min(N, Math.max(...base.eligible.map(c => c.seats)) + 1);
  const qrows = base.eligible.map(c => `<tr class="${c.cod === cod ? 'me' : ''}"><th>${esc(sg(c.cod))}</th><td class="r">${n0(c.votos)}</td><td class="r"><b>${c.seats}</b></td>${Array.from({ length: K }, (_, i) => { const k = i + 1, r = win.get(c.cod + '|' + k), cl = [r ? 'w' : '', L && L.cod === c.cod && L.k === k ? 'last' : '', c.cod === cod && k === s + 1 ? 'nx' : '', base.nextLoser && base.nextLoser.cod === c.cod && base.nextLoser.k === k ? 'nl' : ''].join(' ');
      return `<td class="r ${cl}"${r ? ` title="Concejal nº ${r}"` : ''}>${q1(c.votos / k)}</td>`; }).join('')}</tr>`).join('');
  return `<div class="dh-head"><div><h2>${esc(S.muni.n)}</h2><p class="sub">${esc(S.provName)} · ${N} concejales · reparto D'Hondt con barrera del 5 %</p></div>
  <label>Candidatura <select id="dhCand">${cands.map(c => `<option value="${c.cod}" ${c.cod === cod ? 'selected' : ''}>${esc(sg(c.cod))} (${n0(c.votos)})</option>`).join('')}</select></label></div>
  ${mismatch.length ? `<p class="warn">El reparto recalculado no coincide con el oficial en: ${mismatch.map(c => `${esc(sg(c.cod))} (oficial ${c.conc}, calculado ${base.seats[c.cod] || 0})`).join('; ')}. ${base.tie ? 'Hay un empate en el último concejal (sorteo o desempate legal).' : 'Puede deberse a una resolución posterior a la proclamación; el fichero conserva el dato oficial.'}</p>` : ''}${tieMsg(base.tie, S)}
  <div class="dh-grid"><section class="card"><h3>Candidatura</h3><p class="big">${esc(S.names?.[cod] || sg(cod))}</p>
    <dl><dt>Siglas</dt><dd>${esc(sg(cod))}</dd><dt>Votos</dt><dd>${n0(sel.votos)}</dd><dt>% sobre votos válidos</dt><dd>${p2(sel.votos / validos * 100)} %</dd><dt>Concejales (oficial)</dt><dd><b>${sel.conc}</b></dd>
    <dt>Cociente de su siguiente concejal</dt><dd>${nq ? `${n0(nq.v)} / ${nq.k} = <b>${q1(nq.q)}</b>` : 'no participa (&lt; 5 %)'}</dd>
    <dt>Cociente del último concejal</dt><dd>${L ? `${esc(sg(L.cod))}: ${n0(L.v)} / ${L.k} = <b>${q1(L.v / L.k)}</b>` : '—'}</dd></dl></section>
  <section class="card"><h3>¿Cuánto le ha faltado?</h3><p class="ans">${ans}</p><p class="mut">Se calculan los votos mínimos x para que, con x votos válidos más, la candidatura obtenga un concejal adicional: se recalcula el reparto completo (cocientes, desempate por votos y barrera del 5 % sobre el nuevo total), no solo una resta de votos entre dos candidaturas.</p></section></div>
  <section class="card"><h3>Barrera legal del 5 %</h3><p>Umbral: <b>${n0(base.umbral)} votos</b> (5 % de ${n0(validos)} votos válidos, que incluyen blancos y excluyen nulos). Superan la barrera ${base.eligible.length} de ${cands.length} candidaturas.</p>
    ${base.excluded.length ? `<table><tr><th>Excluida del reparto</th><th class="r">Votos</th><th class="r">%</th><th>Motivo</th></tr>${base.excluded.sort((a, b) => b.votos - a.votos).map(c => `<tr><td>${esc(sg(c.cod))}</td><td class="r">${n0(c.votos)}</td><td class="r">${p2(c.pct)}</td><td>${p2(c.pct)} % &lt; 5 % (faltan ${n0(base.umbral - c.votos)} votos)</td></tr>`).join('')}</table>` : '<p class="mut">Ninguna candidatura queda excluida.</p>'}</section>
  <section class="card"><h3>Simulación</h3><div class="sim"><label>Votos adicionales para ${esc(sg(cod))} <input id="dhExtra" type="number" min="0" step="1" value="${extra}"></label>${need ? `<button data-act="need">Poner los necesarios (${n0(need.x)})</button>` : ''}<button data-act="reset">Restablecer</button></div>
    <p>${simMsg}</p>${extra ? tieMsg(sim.tie, S) + (sim.excluded.length > base.excluded.length ? '<p class="mut">Con el nuevo total de votos válidos cambia la barrera del 5 % y alguna candidatura queda excluida.</p>' : '') : ''}
    <table><tr><th>Candidatura</th><th class="r">Votos</th><th class="r">Oficial</th><th class="r">Hipotético</th><th class="r">Δ</th></tr>${rows}</table>
    <p class="mut">«Oficial» son los concejales de los datos; «Hipotético» es la simulación (${n0(validos + extra)} votos válidos). Δ se mide contra el reparto D'Hondt recalculado.</p></section>
  <section class="card"><h3>Tabla de cocientes</h3><div class="scroll-x"><table class="qt"><tr><th>Candidatura</th><th class="r">Votos</th><th class="r">Conc.</th>${Array.from({ length: K }, (_, i) => `<th class="r">÷${i + 1}</th>`).join('')}</tr>${qrows}</table></div>
    <p class="leg2"><i class="w"></i>Cociente con concejal <i class="last"></i>Último concejal adjudicado <i class="nx"></i>Siguiente cociente de la candidatura seleccionada <i class="nl"></i>Primer cociente sin concejal</p></section>`;
}
