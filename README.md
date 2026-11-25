# Atlas electoral municipal (Municipales 2023)

Aplicación web estática (Leaflet + JavaScript modular) con datos reales de Infoelectoral (resultados por mesa) y del INE (secciones censales).

## Ejecutar
```
cd app
python3 -m http.server 8000      # abrir http://localhost:8000
```
Necesita conexión a internet solo para cargar Leaflet (cdnjs) y el mapa base de OpenStreetMap (se puede desactivar con «Mapa base»).

## Estructura
```
index.html, css/app.css
js/calc.js       Participación, porcentajes, agregación (suma votos, nunca %), cortes de escala
js/strength.js   Índice y clasificación de fortaleza (comparaciones con enteros)
js/data.js       Carga de datos (separada de la interfaz)
js/map.js        Leaflet: capas, leyenda, tooltips y popups
js/ui.js         Paneles HTML (resumen, resultados, agrupaciones, agregación, fortaleza, validación)
js/store.js      Agrupaciones del usuario en localStorage (por navegador; candidaturas identificadas por siglas)
js/dhondt.js     Reparto D'Hondt con barrera del 5 %, votos necesarios y simulación (funciones puras)
js/dhondt_view.js  Apartado D'Hondt
js/main.js       Estado y orquestación
config/municipales_2023.json   Posiciones de campos de los .DAT y del shapefile (por elección)
pipeline/build_data.py         Lee DAT + shapefile -> data/ (agrega mesas a secciones, reproyecta, valida)
data/<elección>/{index,validation}.json, res/<prov>.json, geo/<prov>.json
tests/           test_calc, test_real_data, test_dhondt, test_app (extremo a extremo), test_bundle (.mjs); verify_data.py
.nojekyll        evita el procesado Jekyll de GitHub Pages
```

## Cargar o actualizar datos
```
pip install numpy
python3 pipeline/build_data.py --dat <carpeta con los .DAT> --shp <carpeta con el shapefile> \
        --config config/municipales_2023.json --out data
```
Regenera `data/` y `validation.json` (visible en la pestaña Validación). La aplicación no cambia.

**Añadir otra elección:** copia `config/municipales_2023.json`, ajusta `id`, `suffix` y posiciones de campos según el diseño de registro de esa elección y ejecuta el pipeline con otra carpeta `--out`/config; la lista de elecciones (`data/elections.json`) alimenta el selector superior. (Si ejecutas el pipeline para varias elecciones, fusiona sus entradas en `elections.json`.)

## Publicar en GitHub Pages
Sube la carpeta completa (incluida `data/`, ~58 MB) a un repositorio y activa Pages sobre la rama/carpeta raíz. Todas las rutas son relativas, así que funciona también bajo `https://usuario.github.io/repositorio/`. No hay backend: las agrupaciones se guardan en el `localStorage` de cada navegador.

## Novedades (v2)
- **Agrupaciones** (Izquierdas, Derechas, No alineadas): pestaña «Agrupaciones» con casillas por candidatura; sin clasificación previa; una candidatura pertenece a una sola agrupación; modalidades de mapa propias.
- **Participación** = (blancos + nulos + candidaturas) / censo de escrutinio: es la variable por defecto del mapa.
- Se elimina la población de las secciones (el municipio conserva su población de derecho).
- Secciones identificadas como «Distrito XX - Sección XXX» (el CUSEC sigue siendo la clave interna).
- **D'Hondt**: reparto con barrera del 5 % (≥ 5 % de votos válidos, blancos incluidos y nulos excluidos), votos necesarios para un concejal más, simulación y tabla de cocientes. Desempate: más votos; si también empatan, sorteo (se advierte).
- Tras actualizar a esta versión hay que regenerar `data/` (se añade el nombre completo de las candidaturas).

## Pruebas
```
node tests/test_calc.mjs
node tests/test_real_data.mjs
node tests/test_dhondt.mjs      # incluye contraste con el reparto oficial de los 5.272 municipios
node tests/test_app.mjs         # app real con DOM simulado y subruta tipo GitHub Pages
python3 tests/verify_data.py <carpeta DAT> data/municipales-2023
```

## Criterios aplicados
- Clave territorial: provincia(2)+municipio(3)+distrito(2)+sección(3) = CUSEC. Nunca por nombre.
- Censo electoral = censo de escrutinio. Válidos = candidaturas + blancos; emitidos = válidos + nulos.
- Tabla municipal = totales oficiales (ficheros 05/06). Mapa, agregaciones y fortaleza = suma de mesas por sección.
- Media municipal de fortaleza = votos del partido / votos válidos (todas las secciones con resultados).
- Municipios < 250 hab.: sin mapa ni candidaturas (el fichero no trae secciones). 44 municipios no están en ningún fichero.
- Las discrepancias del origen se informan, no se corrigen.

## Pendiente (arquitectura preparada)
Comparación de partidos y de elecciones, evolución por sección, exportación CSV/Excel/PNG/GeoJSON y la carga de ficheros brutos desde el navegador (hoy se hace con el pipeline).
