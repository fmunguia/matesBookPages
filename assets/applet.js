// Carga los applets de GeoGebra de una unidad cuando se acercan a la pantalla
// y conecta los botones Reiniciar, Ver solución y Descargar .ggb.
(function () {
  "use strict";

  const datos = JSON.parse(document.getElementById("datos-unidad").textContent);
  const apis = {};
  const PIEZA = /^(point|segment|polygon|triangle|quadrilateral|pentagon|hexagon)$/i;
  const FIGURA = /polygon|triangle|quadrilateral|pentagon|hexagon|polyhedron|cube|hedron|prism|pyramid|cone|cylinder|net/i;

  // Ejecuta una orden. Si crea una figura con sus vértices, lados o caras,
  // oculta esas piezas (etiqueta y vista algebraica) y deja solo la figura.
  function ejecuta(api, orden) {
    // SetCoords(P, x, y) coloca un punto sobre un objeto en su posición inicial
    const coords = orden.match(/^SetCoords\((\w+),\s*(-?[\d.]+),\s*(-?[\d.]+)\)$/);
    if (coords) {
      api.setCoords(coords[1], Number(coords[2]), Number(coords[3]));
      return true;
    }
    const antes = new Set(api.getAllObjectNames());
    if (!api.evalCommand(orden)) {
      console.warn("No se pudo ejecutar:", orden);
      return false;
    }
    const nuevos = api.getAllObjectNames().filter((n) => !antes.has(n));
    if (nuevos.length < 2) return true;
    const tipos = Object.fromEntries(nuevos.map((n) => [n, api.getObjectType(n)]));
    if (!nuevos.some((n) => FIGURA.test(tipos[n]))) return true;
    const nombrado = (orden.match(/^\s*([A-Za-z][\w']*)\s*=/) || [])[1];
    const principal =
      (nuevos.includes(nombrado) && nombrado) ||
      nuevos.find((n) => !PIEZA.test(tipos[n])) ||
      nuevos.find((n) => FIGURA.test(tipos[n]));
    for (const n of nuevos) {
      if (n === principal || !PIEZA.test(tipos[n])) continue;
      api.setLabelVisible(n, false);
      api.setAuxiliary(n, true);
    }
    return true;
  }

  // Encaja la zona pedida en la vista gráfica. Salvo que el applet diga
  // "proporcional": false, mantiene la misma escala en los dos ejes para que
  // los círculos y los cuadrados no se deformen.
  function ajustaVista(api, applet) {
    const [x0, x1, y0, y1] = applet.vista;
    api.setCoordSystem(x0, x1, y0, y1);
    if (applet.proporcional === false) return;
    let ancho, alto;
    try {
      const v = JSON.parse(api.getViewProperties(1));
      ancho = v.width;
      alto = v.height;
    } catch (e) {
      return;
    }
    if (!ancho || !alto) return;
    const escala = Math.min(ancho / (x1 - x0), alto / (y1 - y0));
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    const rx = ancho / escala / 2, ry = alto / escala / 2;
    api.setCoordSystem(cx - rx, cx + rx, cy - ry, cy + ry);
  }

  function aplicaEstilo(api, applet) {
    for (const nombre of applet.visibles || []) {
      if (api.exists(nombre)) api.setVisible(nombre, true);
    }
    for (const nombre of applet.rastro || []) {
      if (api.exists(nombre)) api.setTrace(nombre, true);
    }
  }

  function prepara(api, applet) {
    api.newConstruction();
    for (const orden of applet.ggbInicio) ejecuta(api, orden);
    for (const nombre of applet.fijos || []) api.setFixed(nombre, true, false);
    aplicaEstilo(api, applet);
    const perspectiva = applet.perspectiva || "AG";
    if (perspectiva.includes("G")) {
      if (applet.vista) ajustaVista(api, applet);
      api.setGridVisible(applet.cuadricula !== false);
      api.setAxesVisible(true, true);
    }
  }

  function carga(tarjeta) {
    const id = tarjeta.id;
    const applet = datos.applets.find((a) => a.id === id);
    const caja = tarjeta.querySelector(".applet");
    if (!applet || caja.dataset.cargado) return;
    caja.dataset.cargado = "1";
    caja.textContent = "";

    const perspectiva = applet.perspectiva || "AG";
    const params = {
      id: "ggb_" + id,
      appName: "classic",
      language: "es",
      width: 900,
      height: perspectiva === "A" ? 380 : 520,
      perspective: perspectiva,
      showToolBar: perspectiva !== "A",
      showAlgebraInput: true,
      showMenuBar: false,
      showResetIcon: false,
      enableShiftDragZoom: true,
      enableRightClick: true,
      preventFocus: true,
      allowStyleBar: true,
      scaleContainerClass: "applet-ancho",
      autoHeight: true,
      appletOnLoad: function (api) {
        apis[id] = api;
        prepara(api, applet);
        tarjeta.classList.add("listo");
      },
    };
    new GGBApplet(params, true).inject(caja.id);
  }

  function descarga(id) {
    const api = apis[id];
    if (!api) return;
    api.getBase64(function (b64) {
      const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      const blob = new Blob([bytes], { type: "application/vnd.geogebra.file" });
      const enlace = document.createElement("a");
      enlace.href = URL.createObjectURL(blob);
      const nombre = id === "taller" ? "taller" : "actividad" + id.slice(1);
      enlace.download = `${datos.curso}_${datos.unidad}_${nombre}.ggb`;
      document.body.appendChild(enlace);
      enlace.click();
      setTimeout(() => {
        URL.revokeObjectURL(enlace.href);
        enlace.remove();
      }, 1000);
    });
  }

  document.addEventListener("click", function (e) {
    const boton = e.target.closest("button[data-accion]");
    if (!boton) return;
    const tarjeta = boton.closest(".tarjeta");
    const id = tarjeta.id;
    const applet = datos.applets.find((a) => a.id === id);
    const api = apis[id];
    if (!api) return;
    const accion = boton.dataset.accion;
    if (accion === "reiniciar") {
      prepara(api, applet);
      const pasos = tarjeta.querySelector(".pasos");
      if (pasos) pasos.hidden = true;
    } else if (accion === "solucion") {
      for (const orden of applet.ggbSolucion) ejecuta(api, orden);
      aplicaEstilo(api, applet);
      tarjeta.querySelector(".pasos").hidden = false;
    } else if (accion === "descargar") {
      descarga(id);
    }
  });

  const tarjetas = document.querySelectorAll(".tarjeta");
  if ("IntersectionObserver" in window) {
    const observador = new IntersectionObserver(
      (entradas) => {
        for (const entrada of entradas) {
          if (entrada.isIntersecting) {
            carga(entrada.target);
            observador.unobserve(entrada.target);
          }
        }
      },
      { rootMargin: "300px 0px" }
    );
    tarjetas.forEach((t) => observador.observe(t));
  } else {
    tarjetas.forEach(carga);
  }
})();
