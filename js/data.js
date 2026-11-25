// Carga de datos (separada de la interfaz). Todo se lee de data/<elección>/ generado por pipeline/build_data.py
const cache = new Map();
const get = async url => { if (!cache.has(url)) cache.set(url, fetch(url).then(r => { if (!r.ok) throw new Error(url + ' → ' + r.status); return r.json(); })); return cache.get(url); };
export const elections = () => get('data/elections.json').then(j => j.elections);
export const index = e => get(`data/${e}/index.json`);          // [cumun, nombre, provincia, estado(2=mapa,1=pequeño,0=sin datos)]
export const validation = e => get(`data/${e}/validation.json`);
export const province = async (e, p) => { const [res, geo] = await Promise.all([get(`data/${e}/res/${p}.json`), get(`data/${e}/geo/${p}.json`)]); return { res, geo }; };
