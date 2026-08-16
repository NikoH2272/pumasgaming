const TABLA_PUNTOS_TOP = {
    1: 12, 2: 9, 3: 8, 4: 7, 5: 6, 6: 5,
    7: 4, 8: 3, 9: 2, 10: 1, 11: 0, 12: 0
};

function convertirTopAPuntos(top) {
    return TABLA_PUNTOS_TOP[top] !== undefined ? TABLA_PUNTOS_TOP[top] : null;
}

function obtenerEquiposLista() {
    const rawText = document.getElementById('inputEquipos').value;
    if (!rawText.trim()) return [];
    
    let lineas = rawText.split('\n');
    let equiposObj = [];

    lineas.forEach(linea => {
        if (!linea.trim()) return;
        let lastIndex = linea.lastIndexOf('-');
        let nombre = "";
        let tag = "";

        if (lastIndex !== -1) {
            nombre = linea.substring(0, lastIndex).trim();
            tag = linea.substring(lastIndex + 1).trim();
        } else {
            nombre = linea.trim();
        }
        
        if (nombre) {
            equiposObj.push({ name: nombre, tag: tag });
        }
    });

    return equiposObj;
}

function actualizarEstructuraEquipos() {
    const equipos = obtenerEquiposLista();
    const tipoTablaDer = document.getElementById('selectTipoTablaDer').value;
    const totalSalasSeleccionadas = parseInt(document.getElementById('selectCantidadSalas').value) || 6;
    const contenedor = document.getElementById('contenedorSalasManuales');
    
    if (equipos.length === 0) {
        contenedor.innerHTML = `<p style="color: var(--gray); text-align: center;">Ingresa al menos un equipo en la lista superior para habilitar la tabla de puntuación.</p>`;
        document.getElementById('outputTablasLadoALado').innerHTML = "";
        document.getElementById('outputBooyahs').innerHTML = "";
        document.getElementById('outputTablaReducida').innerHTML = "";
        return;
    }

    let html = `
    <h3 style="color: var(--accent-yellow); font-size: 1.1rem; margin-bottom: 15px;"><i class="fa-solid fa-table"></i> Registro de Puntuación por Sala</h3>
    <div class="table-input-container">
        <table>
            <thead>
                <tr>
                    <th>No</th>
                    <th>Equipos</th>
                    <th>Tag</th>
                    <th>Tag Cantidad</th>`;
    
    for (let s = 1; s <= totalSalasSeleccionadas; s++) {
        html += `<th>Sala ${s} (Top)</th>`;
        if (tipoTablaDer === 'top_kill') {
            html += `<th>Kill ${s}</th>`;
        }
    }
    html += `</tr></thead><tbody>`;

    equipos.forEach((eq, index) => {
        let safeName = eq.name.replace(/"/g, '&quot;');
        let safeTag = eq.tag.replace(/"/g, '&quot;');
        
        html += `
                <tr>
                    <td>${index + 1}</td>
                    <td>${eq.name}</td>
                    <td><input type="text" class="input-tag input-cell-box" data-team="${safeName}" value="${safeTag}" placeholder="Tag" style="width: 70px;" oninput="renderizarResultados()"></td>
                    <td><input type="number" class="input-tag-cant input-cell-box" data-team="${safeName}" value="0" min="0" max="4" style="width: 60px;" oninput="renderizarResultados()"></td>`;
        
        for (let s = 1; s <= totalSalasSeleccionadas; s++) {
            html += `<td><input type="number" class="input-pos input-cell-box" data-sala="${s}" data-team="${safeName}" value="" placeholder="Top" min="0" max="12" oninput="renderizarResultados()"></td>`;
            if (tipoTablaDer === 'top_kill') {
                html += `<td><input type="number" class="input-kill input-cell-box" data-sala="${s}" data-team="${safeName}" value="" placeholder="Kill" min="0" oninput="renderizarResultados()"></td>`;
            }
        }
        html += `</tr>`;
    });

    html += `</tbody></table></div>`;
    contenedor.innerHTML = html;
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
        mex: `${horaMex} México`,
        col: `${horaCol} (Colombia)`,
        arg: `${horaArg} Argentina`
    };
}

function renderizarResultados() {
    const equipos = obtenerEquiposLista();
    if (equipos.length === 0) {
        document.getElementById('outputTablasLadoALado').innerHTML = "";
        document.getElementById('outputBooyahs').innerHTML = "";
        document.getElementById('outputTablaReducida').innerHTML = "";
        return;
    }

    const tipoTablaDer = document.getElementById('selectTipoTablaDer').value;
    const totalSalasSeleccionadas = parseInt(document.getElementById('selectCantidadSalas').value) || 6;
    const temaSelect = document.getElementById('selectTemaVisual');
    const temaVal = temaSelect.value;
    const temaTextoVisible = temaSelect.options[temaSelect.selectedIndex].text;

    let salasConDatos = new Array(totalSalasSeleccionadas).fill(false);
    let datosEquipos = {};

    equipos.forEach(eq => {
        const tagInput = document.querySelector(`.input-tag[data-team="${eq.name.replace(/"/g, '\\"')}"]`);
        const tagCantInput = document.querySelector(`.input-tag-cant[data-team="${eq.name.replace(/"/g, '\\"')}"]`);

        let tagVal = tagInput ? tagInput.value : eq.tag;
        let tagCantVal = tagCantInput ? (parseInt(tagCantInput.value) || 0) : 0;

        datosEquipos[eq.name] = {
            name: eq.name, tag: tagVal, tagCantidad: tagCantVal,
            salasPosRaw: new Array(totalSalasSeleccionadas).fill(null),
            salasPosPtos: new Array(totalSalasSeleccionadas).fill(null),
            salasKill: new Array(totalSalasSeleccionadas).fill(0),
            salasTotal: new Array(totalSalasSeleccionadas).fill(null),
            totalPuntosPosicion: 0, acumulado: 0, totalKillsGlobal: 0
        };
    });

    for (let s = 1; s <= totalSalasSeleccionadas; s++) {
        let topsEnSala = {};
        equipos.forEach(eq => {
            const safeTeam = eq.name.replace(/"/g, '\\"');
            const inputPos = document.querySelector(`.input-pos[data-sala="${s}"][data-team="${safeTeam}"]`);
            const inputKill = document.querySelector(`.input-kill[data-sala="${s}"][data-team="${safeTeam}"]`);

            if (inputPos) {
                let rawValue = inputPos.value.trim();
                let topVal = rawValue !== "" ? parseInt(rawValue) : null;
                let killVal = inputKill ? (parseInt(inputKill.value) || 0) : 0;
                let puntosPos = null;

                if (topVal !== null) {
                    salasConDatos[s - 1] = true;
                    if (topVal === 0) {
                        puntosPos = null; // Cero digitado en la tabla equivale a null (calavera)
                    } else if (topVal >= 1 && topVal <= 12) {
                        if (!topsEnSala[topVal]) {
                            topsEnSala[topVal] = true;
                            puntosPos = convertirTopAPuntos(topVal);
                        } else {
                            puntosPos = convertirTopAPuntos(topVal);
                        }
                    }
                }

                datosEquipos[eq.name].salasPosRaw[s - 1] = topVal;
                datosEquipos[eq.name].salasPosPtos[s - 1] = puntosPos;
                datosEquipos[eq.name].salasKill[s - 1] = killVal;
                datosEquipos[eq.name].totalKillsGlobal += killVal;

                if (puntosPos !== null) {
                    datosEquipos[eq.name].totalPuntosPosicion += puntosPos;
                }

                let scoreSala = null;
                if (topVal !== null) {
                    let ptsBase = (puntosPos !== null) ? puntosPos : 0;
                    scoreSala = (tipoTablaDer === 'top') ? ptsBase : (ptsBase + killVal);
                    datosEquipos[eq.name].acumulado += scoreSala;
                }

                datosEquipos[eq.name].salasTotal[s - 1] = scoreSala;
            }
        });
    }

    let roomWinners = [];
    for (let s = 1; s <= totalSalasSeleccionadas; s++) {
        if (!salasConDatos[s - 1]) continue;
        let winnerTeam = "", winnerKills = 0, foundBooyah = false;
        equipos.forEach(eq => {
            if (datosEquipos[eq.name].salasPosRaw[s - 1] === 1) {
                winnerTeam = eq.name;
                winnerKills = datosEquipos[eq.name].salasKill[s - 1];
                foundBooyah = true;
            }
        });
        if (foundBooyah) { roomWinners.push({ sala: s, team: winnerTeam, kills: winnerKills }); }
    }

    let salasActivasIndices = [];
    salasConDatos.forEach((activa, idx) => { if (activa) salasActivasIndices.push(idx); });

    let processedData = Object.values(datosEquipos).map(team => {
        let salasFiltradas = salasActivasIndices.map(idx => team.salasTotal[idx]);
        let totalCalculado = salasFiltradas.reduce((a, b) => a + (b !== null ? b : 0), 0);
        let cumpleAscenso = (team.totalPuntosPosicion >= 45) && (team.tagCantidad === 3 || team.tagCantidad === 4);
        return {
            name: team.name, tag: team.tag, tagCantidad: team.tagCantidad,
            totalPuntosPos: team.totalPuntosPosicion, cumpleAscenso: cumpleAscenso,
            salas: salasFiltradas, total: totalCalculado, totalKills: team.totalKillsGlobal
        };
    });

    processedData.sort((a, b) => b.total - a.total);
    let equiposAscenso = processedData.filter(item => item.name !== "" && item.cumpleAscenso);

    const inputFechaHora = document.getElementById('inputFechaHora').value;
    const moderadorVal = document.getElementById('inputModerador').value;
    let horasZona = formatearFechaHoraZonas(inputFechaHora);

    let displayData = [...processedData];
    if (displayData.length > 15) { displayData = displayData.slice(0, 15); }
    else { while (displayData.length < 10) { displayData.push({ name: "", salas: new Array(salasActivasIndices.length).fill(null), total: "" }); } }

    let thead = `<tr><th>TOP</th><th>EQUIPO</th><th>TAG</th>`;
    salasActivasIndices.forEach(idx => { thead += `<th>S${idx + 1}</th>`; });
    thead += `<th>Total</th></tr>`;

    let tbody = ``;
    displayData.forEach((item, index) => {
        let rankStr = item.name !== "" ? `#${index + 1}` : "";
        let nameStr = item.name !== "" ? `<strong>${item.name}</strong>` : "";
        let totalStr = item.total !== "" ? `<strong>${item.total}</strong>` : "";
        let tagStr = item.name !== "" && item.tag ? `<strong>${item.tag}</strong>` : "";
        let cantidadStr = item.name !== "" && item.tagCantidad ? `${item.tagCantidad} JUG.` : "";
        tbody += `<tr><td><strong>${rankStr}</strong></td><td>${nameStr}</td><td>${tagStr}</td>`;        salasActivasIndices.forEach((_, i) => {
            const valorSala = item.salas[i];
            if (item.name !== "" && (valorSala === undefined || valorSala === null)) {
                tbody += `<td class="sala-sin-registro"><i class="fa-solid fa-skull"></i></td>`;
            } else {
                tbody += `<td>${item.name !== "" && valorSala !== undefined ? valorSala : ""}</td>`;
            }
        });
        tbody += `<td>${totalStr}</td></tr>`;
    });

    let htmlModerador = moderadorVal ? `
        <p class="moderador-reducido">
            MODERADOR: <strong>${moderadorVal}</strong>
        </p>
    ` : '';
let tituloAutomatizadoGeneral = ``;
    let htmlTablaGeneral = `
        <div class="column-table-general">
            <h3 style="font-size: 1rem; color: var(--accent-yellow); margin-bottom: 8px;"><i class="fa-solid fa-list-ol"></i> Tabla General</h3>
            <div class="table-general-box" style="background: #121520;">
                <div class="table-general-overlay">
                    <div style="text-align: center; margin-bottom: 8px;">
                        <h3 style="color: var(--accent-yellow); font-size: 1.1rem; font-family: 'Orbitron';">${tituloAutomatizadoGeneral}</h3>
                        <p style="color: var(--gray); font-size: 0.8rem;"><strong>${horasZona.fecha}</strong> — ${horasZona.mex} | ${horasZona.col} | ${horasZona.arg}</p>
                        ${htmlModerador}
                    </div>
                    <table><thead>${thead}</thead><tbody>${tbody}</tbody></table>
                </div>
            </div>
        </div>`;

    let htmlPanelDerecho = "";
    if (tipoTablaDer === "top") {
        htmlPanelDerecho = `
            <div class="column-table-right">
                <h3 style="font-size: 1rem; color: var(--accent-yellow); margin-bottom: 8px;"><i class="fa-solid fa-arrow-up-right-dots"></i> Ascenso Directo</h3>
                <div class="table-right-box"><div class="table-right-overlay">
                    <div style="text-align: center; margin-bottom: 8px;"><h3 style="color: var(--light); font-size: 1rem; font-family: 'Orbitron';">CLASIFICADOS</h3></div>`;
        if (equiposAscenso.length > 0) {
            htmlPanelDerecho += `<table><thead><tr><th>#</th><th>Equipo</th><th>Pts Pos</th></tr></thead><tbody>`;
            equiposAscenso.forEach((eq, idx) => {
                htmlPanelDerecho += `<tr><td>#${idx + 1}</td><td><strong>${eq.name}</strong> <i class="fa-solid fa-crown" style="color: var(--accent-yellow);"></i></td><td>${eq.totalPuntosPos}</td></tr>`;
            });
            htmlPanelDerecho += `</tbody></table>`;
        } else { htmlPanelDerecho += `<p style="color: var(--gray); text-align: center; font-size: 0.85rem; padding: 15px;">Sin clasificados</p>`; }
        htmlPanelDerecho += `</div></div></div>`;
    } else {
        let topKillers = Object.values(datosEquipos).map(t => ({ name: t.name, kills: t.totalKillsGlobal })).sort((a, b) => b.kills - a.kills).slice(0, 5);
        htmlPanelDerecho = `
            <div class="column-table-right" style="display: flex; flex-direction: column; gap: 15px;">
                <div><h3 style="font-size: 0.95rem; color: var(--accent-yellow); margin-bottom: 5px;">Ascenso Directo</h3><div class="table-right-box"><div class="table-right-overlay" style="padding: 10px;">
                <table><thead><tr><th>#</th><th>Equipo</th><th>Pts</th></tr></thead><tbody>`;
        if (equiposAscenso.length > 0) {
            equiposAscenso.forEach((eq, idx) => { htmlPanelDerecho += `<tr><td>#${idx + 1}</td><td><strong>${eq.name}</strong></td><td>${eq.totalPuntosPos}</td></tr>`; });
        } else { htmlPanelDerecho += `<tr><td colspan="3" style="color: var(--gray); font-size: 0.8rem;">Sin clasificados</td></tr>`; }
        htmlPanelDerecho += `</tbody></table></div></div></div></div>`;
    }

    document.getElementById('outputTablasLadoALado').innerHTML = `<div class="side-by-side-wrapper">${htmlTablaGeneral}${htmlPanelDerecho}</div>`;

    let htmlReducidaGeneral = `
        <div class="reduced-general">
            <div style="text-align: center; margin-bottom: 10px;">
                <h3 style="font-size: 2.2rem; font-family: 'Orbitron'; margin-bottom: 5px; letter-spacing: 2px;">${tituloAutomatizadoGeneral}</h3>
                <div class="horarios-badge-grande">
                    <span style="background: var(--secondary); color: #fff; padding: 4px 10px; border-radius: 4px; font-weight: bold; margin-right: 8px;">★ HORARIOS</span> 
                    <strong>${horasZona.fecha}</strong> — ${horasZona.mex} | ${horasZona.col} | ${horasZona.arg}
                </div>
                ${htmlModerador}
            </div>
            <table><thead>${thead}</thead><tbody>${tbody}</tbody></table>
        </div>`;

    let rowsAscensoHorizontal = "";
    if (equiposAscenso.length > 0) {
        equiposAscenso.forEach((eq) => {
            rowsAscensoHorizontal += `<tr><td>EQUIPO</td><td>${eq.name} <i class="fa-solid fa-crown" style="color: var(--accent-yellow);"></i></td><td>${eq.totalPuntosPos}</td><td>${eq.tag}</td></tr>`;
        });
    } else { rowsAscensoHorizontal = `<tr><td colspan="4" style="opacity: 0.7;">Sin equipos clasificados en Ascenso Directo</td></tr>`; }

    let htmlReducidaDerechaHorizontal = `
        <div class="reduced-right-horizontal">
            <h3 style="font-size: 1.4rem; font-family: 'Orbitron'; text-align: center; margin-bottom: 15px;">ASCENSO DIRECTO</h3>
            <table><thead><tr><th>EQUIPO</th><th>NOMBRE</th><th>PUNTOS</th><th>TAG</th></tr></thead><tbody>${rowsAscensoHorizontal}</tbody></table>
        </div>`;

    let htmlTerceraTablaCompleta = `
        <div id="tablaReducidaCaptura" class="table-reduced-wrapper tema-${temaVal}">
            <div class="tabla-marco-guia">
                <div class="table-reduced-content">
                    ${htmlReducidaGeneral}
                    ${htmlReducidaDerechaHorizontal}
                </div>
            </div>
        </div>`;

    document.getElementById('outputTablaReducida').innerHTML = htmlTerceraTablaCompleta;
}

function descargarTablaReducida() {
    const elemento = document.getElementById('tablaReducidaCaptura');
    if (!elemento) { alert("Primero genera los resultados."); return; }

    html2canvas(elemento, { scale: 1, useCORS: true, backgroundColor: null }).then(canvas => {
        let enlace = document.createElement('a');
        enlace.download = 'resultados-pumas-gaming-2000x2000.png';
        enlace.href = canvas.toDataURL('image/png');
        enlace.click();
    });
}

window.onload = function() { actualizarEstructuraEquipos(); };