// Visualización cartográfica con Leaflet. Solo dibuja; no calcula resultados.
let map, layer, legend, base;
export function init(id) {
  map = L.map(id, { zoomControl: true, preferCanvas: true }).setView([40.2, -3.7], 6);
  base = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, opacity: .55, attribution: '© OpenStreetMap' }).addTo(map);
  legend = L.control({ position: 'bottomleft' });
  legend.onAdd = () => { const d = L.DomUtil.create('div', 'legend'); d.hidden = true; legend._d = d; return d; };
  legend.addTo(map);
}
export const toggleBase = on => on ? base.addTo(map) : map.removeLayer(base);
export function draw(features, styleFn, tipFn, popFn, onClick) {
  if (layer) map.removeLayer(layer);
  layer = L.geoJSON({ type: 'FeatureCollection', features }, {
    style: f => styleFn(f.properties.id),
    onEachFeature: (f, l) => { l.bindTooltip(() => tipFn(f.properties.id), { sticky: true }); l.bindPopup(() => popFn(f.properties.id), { maxHeight: 320, minWidth: 250 });
      l.on('mouseover', () => l.setStyle({ weight: 2.5, color: '#111' })); l.on('mouseout', () => layer.resetStyle(l)); }
  }).addTo(map);
  if (features.length) map.fitBounds(layer.getBounds(), { padding: [20, 20] });
}
export function restyle(styleFn) { if (layer) layer.setStyle(f => styleFn(f.properties.id)); }
export function clear() { if (layer) { map.removeLayer(layer); layer = null; } showLegend(null); }
export function showLegend(spec) {
  const d = legend._d; if (!spec) { d.hidden = true; return; } d.hidden = false;
  d.innerHTML = `<b>${spec.title}</b>` + spec.items.map(i => `<div><i style="background:${i.color}"></i>${i.label}</div>`).join('');
}
export const resize = () => map && map.invalidateSize();
