/**
 * ============================================================================
 * SCRIPT PRINCIPAL DE GESTIÓN Y PROCESAMIENTO (PUMAS GAMING)
 * ============================================================================
 */

let salasProcesadas = []; 
let correccionesNombres = {};
let equiposEliminados = new Set();
let equiposManualesDatos = [];

// Listas oficiales de ubicaciones por mapa para los desplegables de caídas
const opcionesMapas = {
  "BERMUDA": [
    "RIM NAM VILLA", "OBSERVATORIO", "HANGAR", "GRAVEYARD", "BULLSEYE", 
    "SHYRPIARD", "KATULISTUWA", "PLANTATION", "BIMASAKTI", "RIVERSIDE", 
    "MARS ELECTRIC", "POCHINOK", "PEAK", "CLOCK TOWER", "KOTA TUA", 
    "SENTOSA", "CAPETOWN", "KERATON", "MILL"
  ],
  "PURGATORIO": [
    "MOATHOUSE", "CROSSROADS", "MARBLEWORKS", "QUARY", "GOLF", 
    "MT. VILLA", "CENTRAL", "BOMBEROS", "LUMBER MILL", "CAMPSITE", 
    "FORGE", "SKI LODGE", "BRASILIA ALTA", "BRASILIA BAJA", "FIELS"
  ],
  "NEXTERRA": [
    "C. DE INTELIGENCIA", "P. GEMELOS", "C. EN RUINAS", "C. FANTASMA", 
    "PANTANAL", "DECAGONO", "G. BOXEO", "TIROLESA", "PLAZARIA", 
    "GRATIVACION", "INVERNADEROS", "EOLICAS", "MUSEO"
  ],
  "KALAHARI": [
    "ASENTAMIENTO", "RUINAS", "LABERINTO", "C.ELEFANTE", "REFINERIA", 
    "EL SUB", "BAHIA", "SANTUARIO", "EL CONSEJO", "RECLUSORIO", 
    "SANTA CATARINA", "C. DE PIEDRA", "P. DE COMANDO"
  ],
  "SOLARA": [
    "MOLINO", "ISLA DELTA", "ACUARIO", "BAHIA", "P. ECOLOGICA", 
    "FLORISTERIA", "ESTUDIO", "EL CENTRO", "CASCADA", "CENTRO HIPICO", 
    "FERIA", "ARCOS", "TORRE DE TV", "CASA VISTA"
  ]
};

// Datos iniciales de ejemplo para la tabla de caídas
let filasCaidas = [
    { equipo: "PUMAS GG", b: "PEAK", p: "BRASILIA ALTA", n: "MUSEO", k: "P. DE COMANDO", s: "TORRE DE TV" },
];

/**
 * Procesa la carga de archivos logs de sala seleccionados por el usuario.
 */
function procesarArchivos() {
    const fileInput = document.getElementById('inputFileUpload');
    const files = fileInput.files;
    if (files.length === 0 && equiposManualesDatos.length === 0) {
        salasProcesadas = [];
        actualizarEditorEquipos();
        renderizarResultados();
        return;
    }
    let promesas = [];
    for (let i = 0; i < files.length; i++) {
        promesas.push(leerArchivo(files[i]));
    }
    Promise.all(promesas).then(resultadosTextos => {
        salasProcesadas = resultadosTextos.map(txt => parsearLogSala(txt));
        actualizarEditorEquipos();
        renderizarResultados();
    });
}

function leerArchivo(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = e => resolve(e.target.result);
        reader.readAsText(file);
    });
}

function parsearLogSala(rawData) {
    const lineas = rawData.split('\n');
    let equiposMap = new Map();
    let equipoActual = null;
    lineas.forEach(linea => {
        const line = linea.trim();
        if (line.startsWith('TeamName:')) {
            if (equipoActual) equiposMap.set(equipoActual.name, equipoActual);
            const teamNameMatch = line.match(/TeamName:\s*(.*?)\s*Rank:/);
            const rankMatch = line.match(/Rank:\s*(\d+)/);
            const totalScoreMatch = line.match(/TotalScore:\s*(\d+)/);
            equipoActual = {
                name: teamNameMatch ? teamNameMatch[1].trim() : "Unknown",
                rank: rankMatch ? parseInt(rankMatch[1]) : 0,
                totalScore: totalScoreMatch ? parseInt(totalScoreMatch[1]) : 0
            };
        }
    });
    if (equipoActual) equiposMap.set(equipoActual.name, equipoActual);
    return equiposMap;
}

function agregarEquipoManualConPuntos() {
    const inputNombre = document.getElementById('inputNombreManual');
    const nombre = inputNombre.value.trim();
    if (!nombre) return alert("Ingresa un nombre de equipo.");
    let puntosSalas = [
        parseInt(document.getElementById('mS1').value) || 0,
        parseInt(document.getElementById('mS2').value) || 0,
        parseInt(document.getElementById('mS3').value) || 0,
        parseInt(document.getElementById('mS4').value) || 0,
        parseInt(document.getElementById('mS5').value) || 0,
        parseInt(document.getElementById('mS6').value) || 0
    ];
    equiposManualesDatos.push({ name: nombre, salas: puntosSalas });
    inputNombre.value = '';
    for(let i=1; i<=6; i++) document.getElementById(`mS${i}`).value = 0;
    actualizarEditorEquipos();
    renderizarResultados();
}

function eliminarEquipoManual(index) {
    equiposManualesDatos.splice(index, 1);
    actualizarEditorEquipos();
    renderizarResultados();
}

function actualizarEditorEquipos() {
    const divTabla = document.getElementById('tablaEdicionEquipos');
    let nombresSet = new Set();
    salasProcesadas.forEach(salaMap => salaMap.forEach((_, name) => nombresSet.add(name)));
    let lista = Array.from(nombresSet).sort();
    let html = `<table><thead><tr><th>No</th><th>Equipo</th><th>Acción</th></tr></thead><tbody>`;
    let c = 0;
    lista.forEach(nombre => {
        html += `<tr><td>${++c}</td><td>${nombre}</td><td><button class="btn-tabla-eliminar" onclick="eliminarEquipo('${nombre}')">Borrar</button></td></tr>`;
    });
    equiposManualesDatos.forEach((eq, idx) => {
        html += `<tr><td>${++c}</td><td>${eq.name} (Manual)</td><td><button class="btn-tabla-eliminar" onclick="eliminarEquipoManual(${idx})">Quitar</button></td></tr>`;
    });
    if (c === 0) html += `<tr><td colspan="3">No hay equipos.</td></tr>`;
    html += `</tbody></table>`;
    divTabla.innerHTML = html;
}

function eliminarEquipo(nombre) {
    equiposEliminados.add(nombre);
    actualizarEditorEquipos();
    renderizarResultados();
}

function formatearFechaHoraZonas(datetimeVal) {
    let fechaObj = datetimeVal ? new Date(datetimeVal) : new Date();
    if (isNaN(fechaObj.getTime())) fechaObj = new Date();
    let fechaFormateada = fechaObj.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });
    let horaCol = fechaObj.toLocaleTimeString('es-CO', { hour: 'numeric', minute: 'numeric', hour12: true, timeZone: 'America/Bogota' });
    let horaMex = fechaObj.toLocaleTimeString('es-MX', { hour: 'numeric', minute: 'numeric', hour12: true, timeZone: 'America/Mexico_City' });
    let horaArg = fechaObj.toLocaleTimeString('es-AR', { hour: 'numeric', minute: 'numeric', hour12: true, timeZone: 'America/Argentina/Buenos_Aires' });
    return { fecha: fechaFormateada, mex: `${horaMex} Mx`, col: `${horaCol} Col`, arg: `${horaArg} Arg` };
}

function renderizarResultados() {
    const contenedorSide = document.getElementById('outputTablasLadoALado');
    const contenedorReducida = document.getElementById('outputTablaReducida');
    const inputFechaHora = document.getElementById('inputFechaHora').value;
    const moderadorVal = document.getElementById('inputModerador').value;
    let horasZona = formatearFechaHoraZonas(inputFechaHora);

    let mapaConsolidado = new Map();
    salasProcesadas.forEach((salaMap, idxSala) => {
        salaMap.forEach((eqData, nombreOriginal) => {
            if (equiposEliminados.has(nombreOriginal)) return;
            let nombreVisible = correccionesNombres[nombreOriginal] || nombreOriginal;
            if (!mapaConsolidado.has(nombreVisible)) {
                mapaConsolidado.set(nombreVisible, { name: nombreVisible, salas: new Array(salasProcesadas.length).fill(0), total: 0 });
            }
            let item = mapaConsolidado.get(nombreVisible);
            item.salas[idxSala] = eqData.totalScore;
            item.total += eqData.totalScore;
        });
    });

    equiposManualesDatos.forEach(eqM => {
        if (!mapaConsolidado.has(eqM.name)) {
            mapaConsolidado.set(eqM.name, { name: eqM.name, salas: new Array(6).fill(0), total: 0 });
        }
        let item = mapaConsolidado.get(eqM.name);
        for (let i = 0; i < 6; i++) {
            item.salas[i] = eqM.salas[i];
        }
        item.total = item.salas.reduce((a, b) => a + b, 0);
    });

    let lista = Array.from(mapaConsolidado.values()).sort((a, b) => b.total - a.total).slice(0, 15);
    let numSalasCols = Math.max(5, salasProcesadas.length, ...equiposManualesDatos.map(() => 6));

    let thead = `<tr><th class="col-header-dark">#</th><th class="col-header-dark">EQUIPOS</th>`;
    for(let i=0; i<numSalasCols; i++) {
        let claseBgSala = (i % 2 === 0) ? 'col-header-yellow' : 'col-header-blue';
        thead += `<th class="${claseBgSala}">SALA ${i + 1}</th>`;
    }
    thead += `<th class="col-header-dark">TOTAL</th></tr>`;

    let tbody = ``;
    lista.forEach((item, index) => {
        tbody += `<tr><td class="col-index-dark"><strong>${index + 1}</strong></td><td class="col-equipo-nombre"><strong>${item.name}</strong></td>`;
        for(let i=0; i<numSalasCols; i++) {
            tbody += `<td>${item.salas[i] || 0}</td>`;
        }
        tbody += `<td class="col-total-puntos"><strong>${item.total}</strong></td></tr>`;
    });

    let htmlMod = moderadorVal ? `<p class="moderador-reducido">MODERADOR: <strong>${moderadorVal}</strong></p>` : '';

    contenedorSide.innerHTML = `<div class="side-by-side-wrapper"><div class="column-table-general"><div class="table-general-box"><div class="table-general-overlay"><p style="text-align:center; font-size:0.8rem;">${horasZona.fecha} — ${horasZona.mex} | ${horasZona.col}</p>${htmlMod}<table><thead>${thead}</thead><tbody>${tbody}</tbody></table></div></div></div></div>`;

    contenedorReducida.innerHTML = `<div id="tablaReducidaCaptura" class="table-reduced-wrapper"><div class="tabla-contenedor-exacto"><div style="text-align: center; margin-bottom: 6px;"><div class="horarios-badge-grande"><span>★ HORARIOS</span> <strong>${horasZona.fecha}</strong> — ${horasZona.mex} | ${horasZona.col}</div>${htmlMod}</div><table><thead>${thead}</thead><tbody>${tbody}</tbody></table></div></div>`;
}

function descargarTablaReducida() {
    const el = document.getElementById('tablaReducidaCaptura');
    if (!el) return alert("Genera resultados primero.");
    let tr = el.style.transform, pos = el.style.position, left = el.style.left;
    el.style.transform = 'none'; el.style.position = 'fixed'; el.style.left = '-9999px';
    html2canvas(el, { scale: 1, width: 1920, height: 1080, backgroundColor: '#ffffff' }).then(canvas => {
        let link = document.createElement('a');
        link.download = 'resultados-pumas.png';
        link.href = canvas.toDataURL('image/png', 1.0);
        link.click();
    }).finally(() => {
        el.style.transform = tr; el.style.position = pos; el.style.left = left;
    });
}

/**
 * ============================================================================
 * MÓDULO DE CONTROL DE CAÍDAS POR MAPA (Con Selección Aleatoria Inteligente)
 * ============================================================================
 */

function crearSelectHtml(mapaKey, valorActual, indexFila, campoKey) {
    const lista = opcionesMapas[mapaKey] || [];
    let html = `<select onchange="actualizarCaidaFila(${indexFila}, '${campoKey}', this.value)" style="width:100%; background:#000; color:#fff; border:1px solid #444; padding:5px; border-radius:4px; font-weight:bold;">`;
    html += `<option value="">-- Seleccionar --</option>`;
    lista.forEach(op => {
        let sel = (op.toUpperCase() === (valorActual || "").toUpperCase()) ? "selected" : "";
        html += `<option value="${op}" ${sel}>${op}</option>`;
    });
    html += `</select>`;
    return html;
}

function actualizarCaidaFila(index, campo, valor) {
    filasCaidas[index][campo] = valor;
    renderizarCaidas();
}

function agregarFilaCaidaManual() {
    filasCaidas.push({ equipo: "", b: "", p: "", n: "", k: "", s: "" });
    renderizarCaidas();
}

function eliminarFilaCaida(idx) {
    filasCaidas.splice(idx, 1);
    renderizarCaidas();
}

function limpiarCaidas() {
    if(confirm("¿Limpiar caídas?")) {
        filasCaidas = [];
        renderizarCaidas();
    }
}

/**
 * Obtiene un elemento aleatorio de un array asegurando que no se repita para el mismo equipo.
 */
function obtenerAleatorioSinRepetir(arrayOriginal, usadosSet) {
    let disponibles = arrayOriginal.filter(item => !usadosSet.has(item));
    if (disponibles.length === 0) disponibles = arrayOriginal; // Fallback si se agotan
    let elegido = disponibles[Math.floor(Math.random() * disponibles.length)];
    usadosSet.add(elegido);
    return elegido;
}

/**
 * Procesa la lista de equipos ingresados y asigna caídas aleatorias sin repetir mapa por equipo.
 */
function procesarTextoCaidasAleatorio() {
    const txt = document.getElementById('pasteAreaCaidas').value.trim();
    if(!txt) return alert("Por favor, ingresa los nombres de los equipos.");
    
    // Soporta separación por comas o saltos de línea
    let equiposNombres = txt.split(/[\n,]+/).map(x => x.trim()).filter(x => x.length > 0);
    if(equiposNombres.length === 0) return alert("No se detectaron nombres válidos.");

    filasCaidas = []; // Reiniciar la lista de caídas

    equiposNombres.forEach(eqNombre => {
        let usadosEquipo = new Set();
        let b = obtenerAleatorioSinRepetir(opcionesMapas["BERMUDA"], usadosEquipo);
        let p = obtenerAleatorioSinRepetir(opcionesMapas["PURGATORIO"], usadosEquipo);
        let n = obtenerAleatorioSinRepetir(opcionesMapas["NEXTERRA"], usadosEquipo);
        let k = obtenerAleatorioSinRepetir(opcionesMapas["KALAHARI"], usadosEquipo);
        let s = obtenerAleatorioSinRepetir(opcionesMapas["SOLARA"], usadosEquipo);

        filasCaidas.push({ equipo: eqNombre, b, p, n, k, s });
    });

    document.getElementById('pasteAreaCaidas').value = "";
    renderizarCaidas();
    alert("¡Caídas aleatorias asignadas con éxito para " + equiposNombres.length + " equipos!");
}

/**
 * Renderiza la sección de caídas integrando desplegables oficiales y validando duplicados entre equipos.
 */
function renderizarCaidas() {
    const tituloEv = document.getElementById('inputTituloCaidas').value;
    const fechaVal = document.getElementById('inputFechaCaidas').value;
    let horasZona = formatearFechaHoraZonas(fechaVal);

    let conteos = { b: {}, p: {}, n: {}, k: {}, s: {} };
    filasCaidas.forEach(f => {
        if(f.b) conteos.b[f.b.toUpperCase()] = (conteos.b[f.b.toUpperCase()] || 0) + 1;
        if(f.p) conteos.p[f.p.toUpperCase()] = (conteos.p[f.p.toUpperCase()] || 0) + 1;
        if(f.n) conteos.n[f.n.toUpperCase()] = (conteos.n[f.n.toUpperCase()] || 0) + 1;
        if(f.k) conteos.k[f.k.toUpperCase()] = (conteos.k[f.k.toUpperCase()] || 0) + 1;
        if(f.s) conteos.s[f.s.toUpperCase()] = (conteos.s[f.s.toUpperCase()] || 0) + 1;
    });

    let editorHtml = `<table><thead><tr><th>Equipo</th><th>Bermuda</th><th>Purgatorio</th><th>Nexterra</th><th>Kalahari</th><th>Solara</th><th>Acción</th></tr></thead><tbody>`;
    filasCaidas.forEach((f, idx) => {
        editorHtml += `<tr>
            <td><input type="text" value="${f.equipo}" oninput="filasCaidas[${idx}].equipo=this.value" style="width:100%; background:#000; color:#fff; border:1px solid #444; padding:5px;"></td>
            <td>${crearSelectHtml("BERMUDA", f.b, idx, 'b')}</td>
            <td>${crearSelectHtml("PURGATORIO", f.p, idx, 'p')}</td>
            <td>${crearSelectHtml("NEXTERRA", f.n, idx, 'n')}</td>
            <td>${crearSelectHtml("KALAHARI", f.k, idx, 'k')}</td>
            <td>${crearSelectHtml("SOLARA", f.s, idx, 's')}</td>
            <td><button class="btn-tabla-eliminar" onclick="eliminarFilaCaida(${idx})">X</button></td>
        </tr>`;
    });
    editorHtml += `</tbody></table>`;
    document.getElementById('tablaEdicionCaidas').innerHTML = editorHtml;

    let thead = `<tr><th class="col-header-dark">EQUIPOS</th><th class="col-header-yellow">BERMUDA</th><th class="col-header-blue">PURGATORIO</th><th class="col-header-yellow">NEXTERRA</th><th class="col-header-blue">KALAHARI</th><th class="col-header-yellow">SOLARA</th></tr>`;
    
    let tbody = ``;
    filasCaidas.forEach(f => {
        let estiloB = (conteos.b[f.b.toUpperCase()] > 1) ? 'background: #ffaa00; color: #ff0000 !important;' : '';
        let estiloP = (conteos.p[f.p.toUpperCase()] > 1) ? 'background: #0055ff; color: #ff0000 !important;' : '';
        let estiloN = (conteos.n[f.n.toUpperCase()] > 1) ? 'background: #ffaa00; color: #ff0000 !important;' : '';
        let estiloK = (conteos.k[f.k.toUpperCase()] > 1) ? 'background: #0055ff; color: #ff0000 !important;' : '';
        let estiloS = (conteos.s[f.s.toUpperCase()] > 1) ? 'background: #ffaa00; color: #ff0000 !important;' : '';

        tbody += `<tr>
            <td class="col-equipo-nombre"><strong>${f.equipo || ''}</strong></td>
            <td style="${estiloB}">${f.b || ''}</td>
            <td style="${estiloP}">${f.p || ''}</td>
            <td style="${estiloN}">${f.n || ''}</td>
            <td style="${estiloK}">${f.k || ''}</td>
            <td style="${estiloS}">${f.s || ''}</td>
        </tr>`;
    });

    document.getElementById('outputCaidasReducida').innerHTML = `
        <div id="tablaCaidasPlantilla" class="table-reduced-wrapper">
            <div class="tabla-contenedor-exacto">
                <div style="text-align: center; margin-bottom: 6px;">
                    <h3 style="font-family:'Orbitron'; font-size: 1.3rem; color: #000; margin-bottom: 2px;">${tituloEv}</h3>
                    <div class="horarios-badge-grande"><span>★ HORARIOS</span> <strong>${horasZona.fecha}</strong> — ${horasZona.mex} | ${horasZona.col}</div>
                </div>
                <table><thead>${thead}</thead><tbody>${tbody}</tbody></table>
            </div>
        </div>
    `;
}

function descargarCaidasPlantilla() {
    const el = document.getElementById('tablaCaidasPlantilla');
    if (!el) return alert("No hay datos de caídas.");
    let tr = el.style.transform, pos = el.style.position, left = el.style.left;
    el.style.transform = 'none'; el.style.position = 'fixed'; el.style.left = '-9999px';
    html2canvas(el, { scale: 1, width: 1920, height: 1080, backgroundColor: '#ffffff' }).then(canvas => {
        let link = document.createElement('a');
        link.download = 'control-caidas-pumas.png';
        link.href = canvas.toDataURL('image/png', 1.0);
        link.click();
    }).finally(() => {
        el.style.transform = tr; el.style.position = pos; el.style.left = left;
    });
}

window.onload = function() {
    renderizarResultados();
    renderizarCaidas();
};