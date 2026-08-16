let salasProcesadas = []; 
let correccionesNombres = {};
let equiposEliminados = new Set();

function procesarArchivos() {
    const fileInput = document.getElementById('inputFileUpload');
    const files = fileInput.files;
    
    correccionesNombres = {};
    equiposEliminados.clear();

    if (files.length === 0) {
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
    }).catch(error => {
        console.error("Error al leer los archivos:", error);
        alert("Ocurrió un error al procesar los archivos.");
    });
}

function leerArchivo(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = e => resolve(e.target.result);
        reader.onerror = e => reject(e);
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
            const killScoreMatch = line.match(/KillScore:\s*(\d+)/);
            const rankScoreMatch = line.match(/RankScore:\s*(\d+)/);
            const totalScoreMatch = line.match(/TotalScore:\s*(\d+)/);

            equipoActual = {
                name: teamNameMatch ? teamNameMatch[1].trim() : "Unknown",
                rank: rankMatch ? parseInt(rankMatch[1]) : 0,
                killScore: killScoreMatch ? parseInt(killScoreMatch[1]) : 0,
                rankScore: rankScoreMatch ? parseInt(rankScoreMatch[1]) : 0,
                totalScore: totalScoreMatch ? parseInt(totalScoreMatch[1]) : 0,
                players: []
            };
        } else if (line.startsWith('NAME:') && equipoActual) {
            const nameMatch = line.match(/NAME:\s*(.*?)\s*ID:/);
            const killMatch = line.match(/KILL:\s*(\d+)/);

            if (nameMatch) {
                equipoActual.players.push({
                    name: nameMatch[1].trim(),
                    kills: killMatch ? parseInt(killMatch[1]) : 0
                });
            }
        }
    });

    if (equipoActual) equiposMap.set(equipoActual.name, equipoActual);
    return equiposMap;
}

function actualizarEditorEquipos() {
    const contenedor = document.getElementById('contenedorEdicionEquipos');
    const divTabla = document.getElementById('tablaEdicionEquipos');

    if (salasProcesadas.length === 0) {
        contenedor.style.display = 'none';
        divTabla.innerHTML = '';
        return;
    }

    let nombresSet = new Set();
    salasProcesadas.forEach(salaMap => {
        salaMap.forEach((_, name) => nombresSet.add(name));
    });

    let listaNombres = Array.from(nombresSet).sort();

    let html = `<table>
        <thead>
            <tr>
                <th>No</th>
                <th>Nombre Original en Data</th>
                <th>Nombre Visible (Editar)</th>
                <th>Acción</th>
            </tr>
        </thead>
        <tbody>`;

    listaNombres.forEach((nombre, idx) => {
        let esEliminado = equiposEliminados.has(nombre);
        let valorActual = correccionesNombres[nombre] !== undefined ? correccionesNombres[nombre] : nombre;

        html += `<tr id="row-edit-${idx}" style="${esEliminado ? 'opacity: 0.4; background: rgba(255,0,0,0.1);' : ''}">
            <td>${idx + 1}</td>
            <td style="color: var(--gray); font-weight: bold;">${nombre}</td>
            <td>
                <input type="text" class="input-edit-team" value="${valorActual.replace(/"/g, '&quot;')}" 
                       ${esEliminado ? 'disabled' : ''} 
                       oninput="cambiarNombreEquipo('${nombre.replace(/'/g, "\\'")}', this.value)">
            </td>
            <td>
                ${esEliminado ? 
                    `<button class="btn-tabla-restaurar" onclick="restaurarEquipo('${nombre.replace(/'/g, "\\'")}')"><i class="fa-solid fa-rotate-left"></i> Restaurar</button>` :
                    `<button class="btn-tabla-eliminar" onclick="eliminarEquipo('${nombre.replace(/'/g, "\\'")}')"><i class="fa-solid fa-trash"></i> Borrar</button>`
                }
            </td>
        </tr>`;
    });

    html += `</tbody></table>`;
    divTabla.innerHTML = html;
    contenedor.style.display = 'block';
}

function cambiarNombreEquipo(nombreOriginal, nuevoNombre) {
    if (nuevoNombre.trim() === '') {
        correccionesNombres[nombreOriginal] = nombreOriginal;
    } else {
        correccionesNombres[nombreOriginal] = nuevoNombre;
    }
    renderizarResultados();
}

function eliminarEquipo(nombreOriginal) {
    equiposEliminados.add(nombreOriginal);
    actualizarEditorEquipos();
    renderizarResultados();
}

function restaurarEquipo(nombreOriginal) {
    equiposEliminados.delete(nombreOriginal);
    actualizarEditorEquipos();
    renderizarResultados();
}

function formatearFechaHoraZonas(datetimeVal) {
    let fechaObj = datetimeVal ? new Date(datetimeVal) : new Date();
    if (isNaN(fechaObj.getTime())) { fechaObj = new Date(); }

    let opcionesFecha = { day: '2-digit', month: '2-digit', year: 'numeric' };
    let opcionesHora = { hour: 'numeric', minute: 'numeric', hour12: true };

    let fechaFormateada = fechaObj.toLocaleDateString('es-CO', opcionesFecha);
    let horaMex = fechaObj.toLocaleTimeString('es-MX', { ...opcionesHora, timeZone: 'America/Mexico_City' });
    let horaCol = fechaObj.toLocaleTimeString('es-CO', { ...opcionesHora, timeZone: 'America/Bogota' });
    let horaArg = fechaObj.toLocaleTimeString('es-AR', { ...opcionesHora, timeZone: 'America/Argentina/Buenos_Aires' });

    return {
        fecha: fechaFormateada,
        mex: `${horaMex} Mx`,
        col: `${horaCol} Col`,
        arg: `${horaArg} Arg`
    };
}

function obtenerTagBase(nombreEquipo) {
    let limpio = nombreEquipo.trim().split(/\s+/)[0].replace(/[^a-zA-Z0-9]/g, '');
    return limpio.toUpperCase();
}

function renderizarResultados() {
    const contenedorSide = document.getElementById('outputTablasLadoALado');
    const contenedorReducida = document.getElementById('outputTablaReducida');

    if (salasProcesadas.length === 0) {
        contenedorSide.innerHTML = "";
        contenedorReducida.innerHTML = "";
        return;
    }

    const modoCalculo = document.getElementById('selectModoCalculo').value;
    const temaVal = document.getElementById('selectTemaVisual').value;
    const inputFechaHora = document.getElementById('inputFechaHora').value;
    const moderadorVal = document.getElementById('inputModerador').value;
    let horasZona = formatearFechaHoraZonas(inputFechaHora);

    let mapaConsolidado = new Map();
    let mapaJugadoresKills = new Map();
    let booyahsPorSala = [];

    salasProcesadas.forEach((salaMap, idxSala) => {
        salaMap.forEach((eqData, nombreOriginal) => {
            if (equiposEliminados.has(nombreOriginal)) return;

            let nombreVisible = correccionesNombres[nombreOriginal] || nombreOriginal;

            if (eqData.rank === 1) {
                booyahsPorSala.push({ sala: idxSala + 1, equipo: nombreVisible });
            }

            if (!mapaConsolidado.has(nombreVisible)) {
                mapaConsolidado.set(nombreVisible, {
                    name: nombreVisible,
                    salas: new Array(salasProcesadas.length).fill(null),
                    totalScoreAcumulado: 0,
                    rankScoreAcumulado: 0,
                    killScoreAcumulado: 0,
                    jugadoresValidosTag: 0,
                    totalJugadoresRegistrados: 0
                });
            }

            let itemConsolidado = mapaConsolidado.get(nombreVisible);
            
            itemConsolidado.totalScoreAcumulado += eqData.totalScore;
            itemConsolidado.rankScoreAcumulado += eqData.rankScore;
            itemConsolidado.killScoreAcumulado += eqData.killScore;

            let valorObtenido = 0;
            if (modoCalculo === 'normal') valorObtenido = eqData.totalScore;
            else if (modoCalculo === 'top') valorObtenido = eqData.rankScore;
            else if (modoCalculo === 'kill') valorObtenido = eqData.killScore;

            if (itemConsolidado.salas[idxSala] === null) {
                itemConsolidado.salas[idxSala] = valorObtenido;
            } else {
                itemConsolidado.salas[idxSala] += valorObtenido;
            }

            if (eqData.players && eqData.players.length > 0) {
                let tagEquipo = obtenerTagBase(nombreVisible);

                eqData.players.forEach(p => {
                    if (tagEquipo && p.name.toUpperCase().includes(tagEquipo)) {
                        itemConsolidado.jugadoresValidosTag++;
                    }
                    itemConsolidado.totalJugadoresRegistrados++;

                    let key = `${p.name}___${nombreVisible}`;
                    if (!mapaJugadoresKills.has(key)) {
                        mapaJugadoresKills.set(key, { name: p.name, team: nombreVisible, kills: 0 });
                    }
                    mapaJugadoresKills.get(key).kills += p.kills;
                });
            }
        });
    });

    let listaConsolidada = Array.from(mapaConsolidado.values()).map(item => {
        let total = 0;
        if (modoCalculo === 'normal') total = item.totalScoreAcumulado;
        else if (modoCalculo === 'top') total = item.rankScoreAcumulado;
        else if (modoCalculo === 'kill') total = item.killScoreAcumulado;

        return { ...item, total: total };
    });

    listaConsolidada.sort((a, b) => b.total - a.total);

    let topKillers = Array.from(mapaJugadoresKills.values())
        .filter(k => k.kills > 0)
        .sort((a, b) => b.kills - a.kills)
        .slice(0, 5);

    let cantidadSalas = salasProcesadas.length;
    let tienePuntosAscenso = false;

    let equiposAscenso = listaConsolidada.filter(item => {
        let cumplePuntos = false;

        if (modoCalculo === 'normal') {
            if (cantidadSalas <= 4 && item.totalScoreAcumulado >= 90) cumplePuntos = true;
            else if (cantidadSalas === 5 && item.totalScoreAcumulado >= 110) cumplePuntos = true;
            else if (cantidadSalas >= 6 && item.totalScoreAcumulado >= 125) cumplePuntos = true;
        } else if (modoCalculo === 'top') {
            if (cantidadSalas <= 4 && item.rankScoreAcumulado >= 40) cumplePuntos = true;
            else if (cantidadSalas === 5 && item.rankScoreAcumulado >= 45) cumplePuntos = true;
            else if (cantidadSalas >= 6 && item.rankScoreAcumulado >= 50) cumplePuntos = true;
        }

        let ratioTag = item.totalJugadoresRegistrados > 0 
            ? (item.jugadoresValidosTag / item.totalJugadoresRegistrados) 
            : 1; 

        let cumpleTag = ratioTag >= 0.75;

        return cumplePuntos && cumpleTag;
    });

    if ((modoCalculo === 'normal' || modoCalculo === 'top') && equiposAscenso.length > 0) {
        tienePuntosAscenso = true;
    }

    let thead = `<tr><th>TOP</th><th>EQUIPO</th>`;
    salasProcesadas.forEach((_, idx) => {
        thead += `<th>S${idx + 1}</th>`;
    });
    thead += `<th>TOTAL</th></tr>`;

    let tbody = ``;
    listaConsolidada.forEach((item, index) => {
        tbody += `<tr>
            <td><strong>#${index + 1}</strong></td>
            <td><strong>${item.name}</strong></td>`;
        
        item.salas.forEach(val => {
            if (val === null) {
                tbody += `<td class="sala-sin-registro"><i class="fa-solid fa-skull"></i></td>`;
            } else {
                tbody += `<td>${val}</td>`;
            }
        });

        tbody += `<td><strong>${item.total}</strong></td></tr>`;
    });

    let htmlModerador = moderadorVal ? `<p class="moderador-reducido">MODERADOR: <strong>${moderadorVal}</strong></p>` : '';

    let tituloModo = "TABLA GENERAL";
    if (modoCalculo === 'top') tituloModo = "TABLA SOLO TOP";
    if (modoCalculo === 'kill') tituloModo = "TABLA SOLO KILL";

    let htmlTablaGeneral = `
        <div class="column-table-general" style="flex: 0 0 100%; max-width: 100%;">
            <h3 style="font-size: 1rem; color: var(--accent-yellow); margin-bottom: 8px;"><i class="fa-solid fa-list-ol"></i> ${tituloModo}</h3>
            <div class="table-general-box" style="background: #121520;">
                <div class="table-general-overlay">
                    <div style="text-align: center; margin-bottom: 8px;">
                        <p style="color: var(--gray); font-size: 0.8rem;"><strong>${horasZona.fecha}</strong> — ${horasZona.mex} | ${horasZona.col} | ${horasZona.arg}</p>
                        ${htmlModerador}
                    </div>
                    <table><thead>${thead}</thead><tbody>${tbody}</tbody></table>
                </div>
            </div>
        </div>`;

    contenedorSide.innerHTML = `<div class="side-by-side-wrapper">${htmlTablaGeneral}</div>`;

    let htmlTopKillers = ``;
    if (topKillers.length > 0) {
        htmlTopKillers = `<table><thead><tr><th>#</th><th>JUGADOR</th><th>EQUIPO</th><th>KILLS</th></tr></thead><tbody>`;
        topKillers.forEach((k, idx) => {
            htmlTopKillers += `<tr><td>#${idx + 1}</td><td><strong>${k.name}</strong></td><td>${k.team}</td><td><strong>${k.kills}</strong></td></tr>`;
        });
        htmlTopKillers += `</tbody></table>`;
    } else {
        htmlTopKillers = `<p style="text-align:center; padding:10px; opacity:0.7;">Sin registro de kills</p>`;
    }

    let htmlBooyahs = ``;
    if (booyahsPorSala.length > 0) {
        htmlBooyahs = `<table><thead><tr><th>SALA</th><th>BOOYAH</th></tr></thead><tbody>`;
        booyahsPorSala.forEach(b => {
            htmlBooyahs += `<tr><td>Sala ${b.sala}</td><td><strong>${b.equipo} <i class="fa-solid fa-crown" style="color: var(--accent-yellow);"></i></strong></td></tr>`;
        });
        htmlBooyahs += `</tbody></table>`;
    } else {
        htmlBooyahs = `<p style="text-align:center; padding:10px; opacity:0.7;">Sin registro de Booyahs</p>`;
    }

    let htmlAscensoPanel = ``;
    if (tienePuntosAscenso) {
        let rowsAscenso = ``;
        equiposAscenso.forEach((eq, idx) => {
            rowsAscenso += `<tr><td>#${idx + 1}</td><td><strong>${eq.name}</strong> <i class="fa-solid fa-arrow-up" style="color: var(--primary);"></i></td><td><strong>${eq.total}</strong></td></tr>`;
        });

        htmlAscensoPanel = `
            <div style="margin-top: 15px; border-top: 1px dashed var(--tema-border); padding-top: 10px;">
                <h4 style="font-family:'Orbitron'; font-size:1.3rem; color:var(--tema-header-text); text-align:center; margin-bottom:8px;"><i class="fa-solid fa-angles-up"></i> ASCENSO DIRECTO</h4>
                <table>
                    <thead><tr><th>#</th><th>EQUIPO</th><th>PUNTOS</th></tr></thead>
                    <tbody>${rowsAscenso}</tbody>
                </table>
            </div>
        `;
    }

    let htmlTerceraTablaCompleta = `
        <div id="tablaReducidaCaptura" class="table-reduced-wrapper tema-${temaVal}">
            <div class="layout-stack-composite">
                <div class="row-tabla-general box-composite-panel">
                    <div style="text-align: center; margin-bottom: 10px;">
                        <h3 style="font-size: 1.8rem; font-family: 'Orbitron'; margin-bottom: 5px;">${tituloModo}</h3>
                        <div class="horarios-badge-grande">
                            <span style="background: var(--secondary); color: #fff; padding: 4px 10px; border-radius: 4px; font-weight: bold; margin-right: 8px;">★ HORARIOS</span> 
                            <strong>${horasZona.fecha}</strong> — ${horasZona.mex} | ${horasZona.col} | ${horasZona.arg}
                        </div>
                        ${htmlModerador}
                    </div>
                    <table><thead>${thead}</thead><tbody>${tbody}</tbody></table>
                </div>

                <div class="row-panel-inferior">
                    <div class="box-composite-panel col-top-killer">
                        <h3><i class="fa-solid fa-crosshairs"></i> TOP KILLER</h3>
                        ${htmlTopKillers}
                        ${htmlAscensoPanel}
                    </div>

                    <div class="box-composite-panel col-booyah">
                        <h3><i class="fa-solid fa-trophy"></i> BOOYAH</h3>
                        ${htmlBooyahs}
                    </div>
                </div>
            </div>
        </div>`;

    contenedorReducida.innerHTML = htmlTerceraTablaCompleta;
}

function descargarTablaReducida() {
    const elemento = document.getElementById('tablaReducidaCaptura');

    if (!elemento) {
        alert("Primero sube al menos un archivo de sala.");
        return;
    }

    // 1. Guardar estilos y transformaciones originales
    const estiloOriginalTransform = elemento.style.transform;
    const estiloOriginalPosition = elemento.style.position;
    const estiloOriginalLeft = elemento.style.left;
    const elementos = elemento.querySelectorAll('*');
    const sombras = [];

    elementos.forEach((el, i) => {
        sombras[i] = el.style.boxShadow;
        el.style.boxShadow = 'none';
    });

    // 2. REINICIAR TEMPORALMENTE LA ESCALA PARA EVITAR EL BLANCO EN CELULARES
    elemento.style.transform = 'none';
    elemento.style.position = 'fixed';
    elemento.style.left = '-9999px'; // Lo sacamos de la pantalla mientras toma la foto

    const opciones = {
        scale: 2, // Calidad HD en PC y Móvil
        width: 1280,
        height: 1280,
        useCORS: true,
        allowTaint: false,
        backgroundColor: '#0a0b10', // Mantiene el fondo oscuro original
        logging: false,
        onclone: function(documentoClonado) {
            const clon = documentoClonado.getElementById('tablaReducidaCaptura');
            if (clon) {
                clon.style.transform = 'none';
                clon.style.position = 'static';
                clon.style.boxShadow = 'none';
                clon.querySelectorAll('*').forEach(el => {
                    el.style.boxShadow = 'none';
                    el.style.textShadow = 'none';
                    if (el.style.filter) el.style.filter = 'none';
                });
            }
        }
    };

    html2canvas(elemento, opciones)
        .then(canvas => {
            const enlace = document.createElement('a');
            enlace.download = 'resultados-pumas-gaming.png';
            enlace.href = canvas.toDataURL('image/png', 1.0);
            document.body.appendChild(enlace);
            enlace.click();
            document.body.removeChild(enlace);
        })
        .catch(error => {
            console.error("Error al generar la imagen:", error);
            alert("Ocurrió un error al exportar la imagen.");
        })
        .finally(() => {
            // 3. RESTAURAR LA VISTA EN PANTALLA
            elemento.style.transform = estiloOriginalTransform;
            elemento.style.position = estiloOriginalPosition;
            elemento.style.left = estiloOriginalLeft;

            elementos.forEach((el, i) => {
                el.style.boxShadow = sombras[i];
            });
        });
}

window.onload = function() {
    procesarArchivos();
};