// Apartado Cruce: HTML + gráfico de dispersión en SVG (sin librerías). Recibe los datos ya calculados por js/cruce.js.
import { KINDS, MEASURES, hasMeasure, WIN_NONE } from './cruce.js?v=5';
import { esc, n0, secLabel } from './ui.js?v=5';
const f = (v, d = 2) => v.toLocaleString('es-ES', { minimumFractionDigits: d, maximumFractionDigits: d }), sig = v => v.toLocaleString('es-ES', { maximumSignificantDigits: 5 });
const val = (v, u) => u === 'n' ? n0(v) : u === '%' ? f(v, 2) + ' %' : f(v, 3);
const PAL = ['#1f77b4', '#d62728', '#2ca02c', '#ff7f0e', '#9467bd', '#8c564b', '#e377c2', '#17becf', '#bcbd22', '#6a3d9a'], GREY = '#9aa6b6';
const niceStep = (range, n) => { const raw = range / n, p = Math.pow(10, Math.floor(Math.log10(raw))), m = raw / p; return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10) * p; };
const ticks = (lo, hi, n = 5) => { const step = niceStep(hi - lo, n), t = []; for (let v = Math.ceil(lo / step - 1e-9) * step; v <= hi + 1e-9; v += step) t.push(+v.toFixed(12)); return { t, step }; };
const tf = (v, step) => v.toLocaleString('es-ES', { maximumFractionDigits: Math.max(0, -Math.floor(Math.log10(step))) });
const dom = a => { let lo = Math.min(...a), hi = Math.max(...a); const pad = hi === lo ? (Math.abs(lo) * 0.05 || 1) : (hi - lo) * 0.05; return [lo - pad, hi + pad]; };

function chart(D, color) {
  const W = 720, H = 440, m = { l: 74, r: 22, t: 14, b: 58 }, pw = W - m.l - m.r, ph = H - m.t - m.b, P = D.points;
  if (!P.length) return '<div class="cx-empty">No hay secciones con datos válidos para estas dos variables y estos filtros.</div>';
  const [x0, x1] = dom(P.map(p => p.x)), [y0, y1] = dom(P.map(p => p.y)), sx = v => m.l + (v - x0) / (x1 - x0) * pw, sy = v => m.t + ph - (v - y0) / (y1 - y0) * ph;
  const tx = ticks(x0, x1), ty = ticks(y0, y1), r = D.reg, fs = l => l.length > 52 ? 10.5 : 12;
  const line = r.ok ? `<line x1="${sx(x0).toFixed(1)}" y1="${sy(r.intercept + r.slope * x0).toFixed(1)}" x2="${sx(x1).toFixed(1)}" y2="${sy(r.intercept + r.slope * x1).toFixed(1)}" class="reg" clip-path="url(#cxclip)"/>` : '';
  return `<svg class="cx-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Gráfico de dispersión: ${esc(D.ay.label)} frente a ${esc(D.ax.label)}"><defs><clipPath id="cxclip"><rect x="${m.l}" y="${m.t}" width="${pw}" height="${ph}"/></clipPath></defs>
  ${tx.t.map(v => `<line x1="${sx(v).toFixed(1)}" y1="${m.t}" x2="${sx(v).toFixed(1)}" y2="${m.t + ph}" class="grid"/><text x="${sx(v).toFixed(1)}" y="${m.t + ph + 18}" text-anchor="middle">${tf(v, tx.step)}</text>`).join('')}
  ${ty.t.map(v => `<line x1="${m.l}" y1="${sy(v).toFixed(1)}" x2="${m.l + pw}" y2="${sy(v).toFixed(1)}" class="grid"/><text x="${m.l - 8}" y="${(sy(v) + 4).toFixed(1)}" text-anchor="end">${tf(v, ty.step)}</text>`).join('')}
  <rect x="${m.l}" y="${m.t}" width="${pw}" height="${ph}" class="frame"/>
  <g clip-path="url(#cxclip)">${P.map((p, i) => `<circle cx="${sx(p.x).toFixed(1)}" cy="${sy(p.y).toFixed(1)}" r="4.2" fill="${color(p.w)}" data-pt="${i}" data-tip="${esc(`${secLabel(p.id)}\n${D.ax.label}: ${val(p.x, D.ax.unit)}\n${D.ay.label}: ${val(p.y, D.ay.unit)}`)}"/>`).join('')}</g>${line}
  <text x="${m.l + pw / 2}" y="${H - 12}" text-anchor="middle" class="al" style="font-size:${fs(D.ax.label)}px">${esc(D.ax.label)}</text>
  <text transform="rotate(-90 18 ${m.t + ph / 2})" x="18" y="${m.t + ph / 2}" text-anchor="middle" class="al" style="font-size:${fs(D.ay.label)}px">${esc(D.ay.label)}</text></svg>`;
}
const axisCtl = (key, sp, ctx, S) => { const cm = hasMeasure(sp.kind);
  return `<fieldset class="axis"><legend>Eje ${key.toUpperCase()}</legend><select data-ax="${key}" data-f="kind" aria-label="Variable del eje ${key.toUpperCase()}">${KINDS.map(([k, l]) => `<option value="${k}" ${k === sp.kind ? 'selected' : ''}>${l}</option>`).join('')}</select>
  ${sp.kind === 'cand' ? `<select data-ax="${key}" data-f="cod">${ctx.candList.map(c => `<option value="${c.cod}" ${c.cod === sp.cod ? 'selected' : ''}>${esc(c.siglas)}</option>`).join('')}</select>` : ''}
  ${sp.kind === 'grupo' ? `<select data-ax="${key}" data-f="group">${ctx.groups.map(g => `<option value="${g.id}" ${g.id === sp.group ? 'selected' : ''}>${esc(g.name)}</option>`).join('')}</select>` : ''}
  ${sp.kind === 'suma' ? `<span class="mut">${esc(ctx.sel.map(c => ctx.cands[c]).join(' + ') || 'ninguna marcada')} (se cambia en Suma)</span>` : ''}
  ${cm ? `<select data-ax="${key}" data-f="measure">${MEASURES[cm].map(([k, l]) => `<option value="${k}" ${k === sp.measure ? 'selected' : ''}>${l}</option>`).join('')}</select>` : ''}</fieldset>`; };

export function html(S, ctx, D, cx) {
  const wk = [...D.winCounts.entries()].sort((a, b) => b[1] - a[1]), cmap = {}; wk.filter(([k]) => k !== WIN_NONE).forEach(([k], i) => cmap[k] = i < PAL.length ? PAL[i] : GREY);
  const color = k => cmap[k] || GREY, on = (set, k) => !set || set.has(k), r = D.reg, sp = D.sp;
  const chip = (attr, k, label, n, c, set) => `<button class="chip ${on(set, k) ? '' : 'off'}" data-${attr}="${esc(k)}" aria-pressed="${on(set, k)}"><i style="background:${c}"></i>${esc(label)} <span class="mut">${n}</span></button>`;
  const grp = [...ctx.groups.map(g => [g.id, g.name]), [WIN_NONE, 'Sin agrupación líder']].filter(([k]) => D.grpCounts.has(k) || k !== WIN_NONE);
  const warns = [D.ax.note, D.ay.note, cx.note, r.warn, sp.warn, r.caution ? 'Con menos de 10 secciones, los indicadores son poco fiables.' : '', D.mayor100 ? `${D.mayor100} sección(es) tienen más votantes que censo en los datos originales (participación > 100 %); se mantienen tal cual.` : ''].filter(Boolean);
  const stat = (k, v, txt) => `<dt>${k}</dt><dd><b data-stat="${k}" data-v="${v}">${txt}</b></dd>`;
  return `<div class="cx-head"><h2>${esc(S.muni.n)}</h2><p class="sub">Cruce · relaciones entre variables de las secciones censales · ${esc(S.provName)}</p></div>
  <div class="cx-presets"><span class="mut">Cruces sugeridos:</span>${ctx.presetList.map(p => `<button class="chip" data-preset="${p.id}">${p.label}</button>`).join('')}</div>
  <div class="cx-grid"><div class="cx-main">
    <section class="card cx-axes">${axisCtl('x', cx.x, ctx, S)}<button class="swap" data-swap title="Intercambiar ejes" aria-label="Intercambiar ejes">⇄</button>${axisCtl('y', cx.y, ctx, S)}</section>
    <section class="card cx-chart" id="cxChart">${chart(D, color)}<div id="cxTip" class="cxtip" hidden></div>
      <div class="cx-legend"><span class="mut">Color = candidatura ganadora en la sección (pulsa para incluir o excluir):</span>${wk.map(([k, n]) => chip('win', k, k === WIN_NONE ? 'Sin ganadora única' : ctx.cands[k] || k, n, color(k), cx.win)).join('')}</div></section>
    <p class="warn cx-warn"><b>Atención:</b> Los datos representan secciones censales, no personas individuales. Una relación estadística entre variables agregadas no demuestra que exista esa misma relación a nivel individual. Debe evitarse la falacia ecológica.</p>
  </div><aside class="cx-side">
    <section class="card"><h3>Análisis estadístico</h3>${r.ok ? `<dl>${stat('n', r.n, n0(r.n))}${stat('pendiente', r.slope, sig(r.slope))}${stat('ordenada', r.intercept, sig(r.intercept))}${r.r == null ? '' : stat('r', r.r, f(r.r, 3)) + stat('R²', r.r2, f(r.r2, 3))}${sp.ok ? stat('Spearman ρ', sp.rho, f(sp.rho, 3)) : ''}</dl>
      <p class="eq">Y = ${sig(r.intercept)} ${r.slope < 0 ? '−' : '+'} ${sig(Math.abs(r.slope))}·X</p>` : `<dl>${stat('n', r.n, n0(r.n))}</dl>`}
      ${warns.map(w => `<p class="warn">⚠ ${esc(w)}</p>`).join('')}
      <p class="mut">Secciones del municipio: ${n0(D.total)} · incluidas: ${n0(D.points.length)} · sin dato en alguna variable: ${n0(D.excl.ausentes)} · excluidas por filtros: ${n0(D.excl.filtro)} · incompletas excluidas: ${n0(D.excl.incompleta)}.</p></section>
    <section class="card"><h3>Filtros</h3><label class="chk"><input type="checkbox" data-flt="incomplete" ${cx.excl ? 'checked' : ''}> Excluir secciones con datos incompletos (sin censo o sin votos válidos)</label>
      <p class="mut" style="margin:8px 0 4px">Agrupación líder en la sección (según tu Ideología):</p><div class="cx-chips">${grp.map(([k, l]) => chip('grp', k, l, D.grpCounts.get(k) || 0, k === WIN_NONE ? GREY : '#54278f', cx.grp)).join('')}</div>
      <button class="link" data-resetf>Restablecer filtros</button></section>
    <section class="card"><h3>Qué significa cada indicador</h3><dl class="def"><dt>n</dt><dd>Secciones con valor en las dos variables. Las que no tienen dato se descartan; nunca se rellenan con ceros.</dd>
      <dt>Pendiente</dt><dd>Cuánto cambia Y, de media, por cada unidad que aumenta X (si ambas son porcentajes, puntos de Y por cada punto de X).</dd>
      <dt>r de Pearson</dt><dd>De −1 a 1: intensidad y sentido de la relación lineal. Cerca de 0, poca relación lineal; positivo, ambas suben juntas; negativo, una sube cuando la otra baja.</dd>
      <dt>R²</dt><dd>Parte de la variación de Y que explica la recta (r al cuadrado, de 0 a 1).</dd>
      <dt>Spearman ρ</dt><dd>Como r, pero sobre los puestos de cada sección: capta relaciones en un mismo sentido aunque no sean una recta y le afectan menos los valores extremos.</dd></dl>
      <p class="mut">Una correlación no demuestra causalidad.</p></section></aside></div>`;
}
