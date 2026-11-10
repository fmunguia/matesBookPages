#!/usr/bin/env python3
"""Genera la web de applets de GeoGebra a partir de datos/<curso>/<unidad>.json.

Uso:  python3 construir.py

Crea index.html y una página <curso>/<unidad>.html por cada fichero de datos.
Cada applet queda enlazado como <curso>/<unidad>.html#a<número de actividad>.
"""
import html
import json
import re
from pathlib import Path

RAIZ = Path(__file__).resolve().parent
CURSOS = {
    "1ESO": "1.º ESO",
    "2ESO": "2.º ESO",
    "3ESO": "3.º ESO",
    "4ESO-A": "4.º ESO · Matemáticas A",
    "4ESO-B": "4.º ESO · Matemáticas B",
}
GEOGEBRA = "https://www.geogebra.org/apps/deployggb.js"

# El API de GeoGebra solo ejecuta las órdenes en inglés. En los datos se
# escriben en español (como las verá el alumno) y aquí se traducen.
ORDENES = {
    "Polígono": "Polygon",
    "Segmento": "Segment",
    "Recta": "Line",
    "Perpendicular": "PerpendicularLine",
    "Mediatriz": "PerpendicularBisector",
    "Bisectriz": "AngleBisector",
    "Circunferencia": "Circle",
    "Elipse": "Ellipse",
    "Punto": "Point",
    "PuntoMedio": "Midpoint",
    "Vértices": "Vertex",
    "Vector": "Vector",
    "Ángulo": "Angle",
    "Distancia": "Distance",
    "Longitud": "Length",
    "Pendiente": "Slope",
    "Perímetro": "Perimeter",
    "Área": "Area",
    "Interseca": "Intersect",
    "Raíz": "Root",
    "Extremo": "Extremum",
    "Resuelve": "Solve",
    "Desarrolla": "Expand",
    "Factoriza": "Factor",
    "Rota": "Rotate",
    "Traslada": "Translate",
    "Refleja": "Reflect",
    "Homotecia": "Dilate",
    "Secuencia": "Sequence",
    "Suma": "Sum",
    "AleatorioEntre": "RandomBetween",
    "Media": "Mean",
    "Mediana": "Median",
    "Moda": "Mode",
    "DE": "SD",
    "DiagramaCaja": "BoxPlot",
    "AjusteLineal": "FitLine",
    "CoeficienteCorrelación": "CorrelationCoefficient",
    "Cubo": "Cube",
    "Dodecaedro": "Dodecahedron",
    "Icosaedro": "Icosahedron",
    "Cono": "Cone",
    "Cilindro": "Cylinder",
    "Esfera": "Sphere",
    "Desarrollo": "Net",
    "Volumen": "Volume",
    "Función": "Function",
    "Si": "If",
    "Deslizador": "Slider",
    "Texto": "Text",
}
NOMBRES = {"EjeX": "xAxis", "EjeY": "yAxis"}


def traduce(orden):
    for es, en in ORDENES.items():
        orden = re.sub(rf"(?<!\w){es}(?=\s*\()", en, orden)
    for es, en in NOMBRES.items():
        orden = re.sub(rf"(?<!\w){es}(?!\w)", en, orden)
    return orden


def pagina(titulo, miga, cuerpo, raiz, scripts=""):
    return f"""<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{html.escape(titulo)}</title>
<link rel="stylesheet" href="{raiz}assets/estilo.css">
</head>
<body>
<header><div class="contenido">
<p class="miga">{miga}</p>
<h1>{html.escape(titulo)}</h1>
</div></header>
<main>
{cuerpo}
</main>
<footer>Applets de GeoGebra del libro de Matemáticas · Colegio Puente</footer>
{scripts}
</body>
</html>
"""


def tarjeta(a):
    tareas = ""
    if a.get("tareas"):
        tareas = '<ol type="a">' + "".join(f"<li>{t}</li>" for t in a["tareas"]) + "</ol>"
    pasos = "".join(f"<li><code>{html.escape(p)}</code></li>" for p in a["solucion"])
    numero = a["actividad"] if a.get("actividad") else "Taller"
    boton_solucion = solucion = ""
    if a["solucion"]:
        boton_solucion = '<button type="button" data-accion="solucion">Ver solución</button>'
        solucion = f'<div class="pasos" hidden><strong>Órdenes de la solución:</strong><ol>{pasos}</ol></div>'
    return f"""<section class="tarjeta" id="{a['id']}">
<h2><span class="numero">{numero}</span>{html.escape(a['titulo'])}</h2>
<p>{a['enunciado']}</p>
{tareas}
<div class="applet-ancho"><div class="applet" id="caja_{a['id']}">Cargando GeoGebra…</div></div>
<div class="botones">
<button type="button" data-accion="reiniciar">Reiniciar</button>
{boton_solucion}
<button type="button" data-accion="descargar">Descargar .ggb</button>
</div>
{solucion}
</section>"""


def construye_unidad(ruta):
    datos = json.loads(ruta.read_text(encoding="utf-8"))
    for a in datos["applets"]:
        a.setdefault("id", f"a{a['actividad']}")
        a["ggbInicio"] = [traduce(o) for o in a.get("inicio", [])]
        a["ggbSolucion"] = [traduce(o) for o in a["solucion"]]
    curso = datos["curso"]
    nombre_curso = CURSOS.get(curso, curso)
    numero = datos["unidad"].removeprefix("UD")
    titulo = f"Unidad {int(numero)}. {datos['titulo']}"
    miga = f'<a href="../index.html">Inicio</a> · {html.escape(nombre_curso)}'
    cuerpo = "\n".join(tarjeta(a) for a in datos["applets"])
    js_datos = json.dumps(datos, ensure_ascii=False).replace("</", "<\\/")
    scripts = (
        f'<script type="application/json" id="datos-unidad">{js_datos}</script>\n'
        f'<script src="{GEOGEBRA}"></script>\n'
        '<script src="../assets/applet.js"></script>'
    )
    salida = RAIZ / curso / f"{datos['unidad']}.html"
    salida.parent.mkdir(exist_ok=True)
    salida.write_text(pagina(titulo, miga, cuerpo, "../", scripts), encoding="utf-8")
    return curso, datos["unidad"], titulo, len(datos["applets"])


def main():
    unidades = [construye_unidad(r) for r in sorted((RAIZ / "datos").glob("*/*.json"))]
    bloques = []
    for curso, nombre in CURSOS.items():
        propias = [u for u in unidades if u[0] == curso]
        if not propias:
            continue
        items = "".join(
            f'<li><a href="{c}/{u}.html">{html.escape(t)} '
            f'<span class="cuantos">· {n} applet{"s" if n != 1 else ""}</span></a></li>'
            for c, u, t, n in propias
        )
        bloques.append(f"<h2>{html.escape(nombre)}</h2>\n<ul class=\"lista-unidades\">{items}</ul>")
    (RAIZ / "index.html").write_text(
        pagina("Applets de GeoGebra", "Libro de Matemáticas", "\n".join(bloques), ""),
        encoding="utf-8",
    )
    print(f"{len(unidades)} unidades generadas")


if __name__ == "__main__":
    main()
