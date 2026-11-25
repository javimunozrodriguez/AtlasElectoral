// Agrupaciones ideológicas configurables, guardadas en localStorage (por navegador). La candidatura se identifica por sus siglas,
// así la asignación se conserva al cambiar de municipio o de elección. Sin clasificación predeterminada: todo lo decide el usuario.
export const DEFAULT_GROUPS = [{ id: 'izq', name: 'Izquierdas' }, { id: 'der', name: 'Derechas' }, { id: 'na', name: 'No alineadas' }];
export const KEY = 'atlas-electoral.agrupaciones.v1';
export const safeStorage = () => { try { return globalThis.localStorage || null; } catch (e) { return null; } };
export function createStore(storage = safeStorage()) {
  let st = { assign: {} };
  try { const j = JSON.parse(storage?.getItem(KEY) || 'null'); if (j && typeof j.assign === 'object') st = j; } catch (e) { /* datos corruptos: se ignoran */ }
  const save = () => { try { storage?.setItem(KEY, JSON.stringify(st)); } catch (e) { /* almacenamiento no disponible */ } };
  return {
    groups: () => DEFAULT_GROUPS, groupOf: s => st.assign[s] || null,
    set(siglas, g) { g ? st.assign[siglas] = g : delete st.assign[siglas]; save(); },   // una candidatura pertenece como máximo a una agrupación
    clear() { st = { assign: {} }; save(); },
  };
}
