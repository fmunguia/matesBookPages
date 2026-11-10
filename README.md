# Applets de GeoGebra del libro de Matemáticas

Web con los applets de GeoGebra de las actividades del libro, publicada con GitHub Pages.
Este repositorio solo contiene los applets: el libro está en otro repositorio privado.

Cada actividad tiene su applet con:

- la construcción de partida (lo que el alumno ya encuentra dibujado);
- **Reiniciar**, para volver a empezar;
- **Ver solución**, que ejecuta las órdenes de la solución y las muestra;
- **Descargar .ggb**, para abrirlo en GeoGebra o subirlo a geogebra.org.

Enlace directo a una actividad: `<curso>/<unidad>.html#a<número>`, por ejemplo `3ESO/UD11.html#a59`.

## Añadir o cambiar applets

1. Edita o crea `datos/<curso>/<unidad>.json` (mira `datos/3ESO/UD11.json` como ejemplo).
2. Ejecuta `python3 construir.py` para regenerar las páginas.
3. Sube los cambios.

Campos de cada applet:

| Campo | Qué es |
|---|---|
| `actividad` | Número de la actividad en el libro (`null` para un taller digital, con `"id": "taller"`) |
| `titulo`, `enunciado`, `tareas` | Texto que ve el alumno (admite `<code>`) |
| `perspectiva` | `"AG"` (álgebra y gráfica, por defecto), `"A"` (solo álgebra) o `"AT"` (álgebra y 3D) |
| `vista` | `[xmin, xmax, ymin, ymax]` de la vista gráfica |
| `cuadricula` | `false` para ocultar la cuadrícula |
| `proporcional` | `false` para no forzar la misma escala en los dos ejes (gráficas con valores muy distintos en x e y) |
| `visibles` | Objetos que se deben mostrar en la vista gráfica (por ejemplo, una lista de puntos) |
| `inicio` | Órdenes de GeoGebra de la construcción de partida |
| `fijos` | Objetos que no se pueden mover |
| `rastro` | Objetos que dejan rastro al moverse |
| `solucion` | Órdenes que ejecuta «Ver solución» (si está vacía, no sale el botón) |

Las órdenes se escriben en español, como las teclea el alumno. `construir.py` las traduce
al inglés para el API de GeoGebra; si usas una orden que no está en `ORDENES`, añádela allí.
En `inicio` también vale `SetCoords(P, x, y)` para colocar un punto que se mueve sobre
una recta o un eje.

## Activar GitHub Pages

*Settings → Pages → Build and deployment → Source: Deploy from a branch*, rama `main`, carpeta `/ (root)`.
