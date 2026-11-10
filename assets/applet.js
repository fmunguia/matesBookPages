// Carga los applets de GeoGebra de una unidad cuando se acercan a la pantalla
// y conecta los botones Reiniciar, Ver solución y Descargar .ggb.
(function () {
  "use strict";

  const datos = JSON.parse(document.getElementById("datos-unidad").textContent);
  const apis = {};

  // Ejecuta una orden y oculta los objetos auxiliares que crea de paso
  // (lados y vértices de los polígonos transformados) para no llenar el
  // dibujo de etiquetas ni la vista algebraica de líneas.
  function ejecuta(api, orden) {
    const antes = new Set(api.getAllObjectNames());
    if (!api.evalCommand(orden)) {
      console.warn("No se pudo ejecutar:", orden);
      return;
    }
    const nuevos = api.getAllObjectNames().filter((n) => !antes.has(n));
    if (nuevos.length < 2) return;
    const nombrado = (orden.match(/^\s*([A-Za-z][\w']*)\s*=/) || [])[1];
    for (const n of nuevos) {
      if (n === nombrado) continue;
      api.setLabelVisible(n, false);
      api.setAuxiliary(n, true);
    }
  }

  function prepara(api, applet) {
    api.newConstruction();
    for (const orden of applet.ggbInicio) ejecuta(api, orden);
    for (const nombre of applet.fijos || []) api.setFixed(nombre, true, false);
    if (applet.vista) {
      const [xmin, xmax, ymin, ymax] = applet.vista;
      api.setCoordSystem(xmin, xmax, ymin, ymax);
    }
    api.setGridVisible(true);
    api.setAxesVisible(true, true);
  }

  function carga(tarjeta) {
    const id = tarjeta.id;
    const applet = datos.applets.find((a) => a.id === id);
    const caja = tarjeta.querySelector(".applet");
    if (!applet || caja.dataset.cargado) return;
    caja.dataset.cargado = "1";
    caja.textContent = "";

    const params = {
      id: "ggb_" + id,
      appName: "classic",
      language: "es",
      width: 900,
      height: 520,
      perspective: "AG",
      showToolBar: true,
      showAlgebraInput: true,
      showMenuBar: false,
      showResetIcon: false,
      enableShiftDragZoom: true,
      preventFocus: true,
      enableRightClick: true,
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
      enlace.download = `${datos.curso}_${datos.unidad}_actividad${id.slice(1)}.ggb`;
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
      tarjeta.querySelector(".pasos").hidden = true;
    } else if (accion === "solucion") {
      for (const orden of applet.ggbSolucion) ejecuta(api, orden);
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
