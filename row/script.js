let rawFilesData = [];

async function prepararRenombradoEquipos() {
    const fileInput = document.getElementById('fileInput');
    let files = Array.from(fileInput.files);
    if (files.length === 0) return;

    rawFilesData = [];
    let equiposUnicos = new Set();

    for (let file of files) {
        let text = await file.text();
        rawFilesData.push(text);
        let lines = text.split('\n');
        lines.forEach(line => {
            const teamMatch = line.match(/TeamName:\s*(.+?)\s+Rank:/i);
            if (teamMatch) equiposUnicos.add(teamMatch[1].trim());
        });
    }

    const contenedor = document.getElementById('listaEquiposInputs');
    contenedor.innerHTML = '';
    Array.from(equiposUnicos).forEach((eq) => {
        contenedor.innerHTML += `
            <div style="display: flex; gap: 10px; align-items: center; background: rgba(255,255,255,0.03); padding: 10px 15px; border-radius: 6px;">
                <span style="color: var(--gray); font-size: 0.85rem; width: 140px;">Original: <strong>${eq}</strong></span>
                <input type="text" class="input-nombre-editable" data-original="${eq}" value="${eq}" style="flex: 2; padding: 8px; background: #0a0b10; border: 1px solid rgba(255,255,255,0.2); color: #fff; border-radius: 4px;">
            </div>
        `;
    });
    document.getElementById('seccionRenombrar').style.display = 'block';
}

function procesarConNombresPersonalizados() {
    let diccionarioRenombres = {};
    document.querySelectorAll('.input-nombre-editable').forEach(input => {
        diccionarioRenombres[input.getAttribute('data-original')] = input.value.trim() || input.getAttribute('data-original');
    });

    let moderador = document.getElementById('inputModerador').value.trim() || 'N/A';
    let fechaInput = document.getElementById('inputFechaTorneo').value;
    let horaInput = document.getElementById('inputHoraTorneo').value;

    let fechaFinal = fechaInput ? new Date(fechaInput + 'T00:00:00').toLocaleDateString() : new Date().toLocaleDateString();
    
    let horaFormateada = "16:00";
    if (horaInput) {
        let [hh, mm] = horaInput.split(':');
        let hNum = parseInt(hh);
        let ampm = hNum >= 12 ? 'PM' : 'AM';
        let h12 = hNum % 12 || 12;
        let horaBaseStr = `${h12}:${mm} ${ampm}`;
        
        let hCol = (hNum + 1) % 24;
        let ampmCol = hCol >= 12 ? 'PM' : 'AM';
        let hCol12 = hCol % 12 || 12;
        let horaColStr = `${hCol12}:${mm} ${ampmCol}`;

        let hArg = (hNum + 3) % 24;
        let ampmArg = hArg >= 12 ? 'PM' : 'AM';
        let hArg12 = hArg % 12 || 12;
        let horaArgStr = `${hArg12}:${mm} ${ampmArg}`;

        horaFormateada = `${horaBaseStr} MX - ${horaColStr} COL - ${horaArgStr} ARG`;
    } else {
        horaFormateada = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    procesarLogs(rawFilesData, diccionarioRenombres, moderador, fechaFinal, horaFormateada);
}

function procesarLogs(textsArray, renombresMap, moderador, fecha, hora) {
    let equiposMap = {};
    let jugadoresMap = {};
    let numSalas = textsArray.length;

    textsArray.forEach((text, i) => {
        let lines = text.split('\n');

        lines.forEach(line => {
            const teamMatch = line.match(/TeamName:\s*(.+?)\s+Rank:\s*(\d+)\s+KillScore:\s*(\d+)\s+RankScore:\s*(\d+)\s+TotalScore:\s*(\d+)/i);
            if (teamMatch) {
                let rawTeam = teamMatch[1].trim();
                let name = renombresMap[rawTeam] || rawTeam;
                if (!equiposMap[name]) {
                    equiposMap[name] = { name, totalScore: 0, killScore: 0, salasPuntos: {} };
                }
                let totalScore = parseInt(teamMatch[5]);
                let killScore = parseInt(teamMatch[3]);

                equiposMap[name].totalScore += totalScore;
                equiposMap[name].killScore += killScore;
                equiposMap[name].salasPuntos[i] = totalScore;
            }

            const playerMatch = line.match(/NAME:\s*(.+?)\s+ID:\s*\d+.*?KILL:\s*(\d+)/i);
            if (playerMatch) {
                let pName = playerMatch[1].trim();
                if (!jugadoresMap[pName]) {
                    jugadoresMap[pName] = { name: pName, kills: 0 };
                }
                jugadoresMap[pName].kills += parseInt(playerMatch[2]);
            }
        });
    });

    let equiposArray = Object.values(equiposMap).sort((a, b) => b.totalScore - a.totalScore);
    let topKillersArray = Object.values(jugadoresMap).sort((a, b) => b.kills - a.kills).slice(0, 10);
    
    renderizarResultados(equiposArray, topKillersArray, numSalas, moderador, fecha, hora);
}

function renderizarResultados(equipos, topKillers, numSalas, moderador, fecha, hora) {
    let html = `
        <div id="tablaCaptura" style="width: 1200px; height: 600px; background-image: url('ligaspumas.png'); background-size: cover; position: relative; font-family: 'Rajdhani', sans-serif; color: #fff; padding: 15px;">
            
            <!-- PANEL DE INFORMACIÓN (Con 200px de espacio a los lados del moderador) -->
            <div style="position: absolute; top: 101px; left: 50px; width: 1100px; background: rgba(0, 0, 0, 0.55); padding: 7px 15px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.1); display: flex; justify-content: space-between; align-items: center; font-family: 'Orbitron'; font-size: 0.78rem; color: #ffcc00;">
                <div style="padding-left: 200px;">MOD: <span style="color: #fff; font-weight: normal;">${moderador}</span></div>
                <div>FECHA: <span style="color: #fff; font-weight: normal;">${fecha}</span></div>
                <div style="padding-right: 200px;">HORA: <span style="color: #fff; font-weight: normal;">${hora}</span></div>
            </div>

            <!-- TABLA ÚNICA DE EQUIPOS (Izquierda) -->
            <div style="position: absolute; top: 142px; left: 50px; width: 730px; background: rgba(0, 0, 0, 0.55); padding: 12px 15px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1);">
                <table style="width: 100%; border-collapse: collapse; font-size: 0.78rem; table-layout: fixed;">
                    <thead>
                        <tr style="color: #ffcc00; font-family: 'Orbitron'; border-bottom: 2px solid rgba(255,255,255,0.3); font-size: 0.82rem;">
                            <th style="text-align:center; padding: 4px 2px; width: 10%;">TOP</th>
                            <th style="text-align:left; padding: 4px 2px; width: 25%;">EQUIPO</th>
                            ${Array.from({length: numSalas}).map((_,i) => `<th style="padding: 4px 2px; text-align:center;">S${i+1}</th>`).join('')}
                            <th style="padding: 4px 2px; text-align:center; width: 10%;">KILL</th>
                            <th style="padding: 4px 2px; text-align:center; width: 10%;">TOTAL</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${equipos.map((eq, i) => {
                            return `
                            <tr style="border-bottom: 1px solid rgba(255,255,255,0.08); color: #fff;">
                                <td style="text-align:center; padding: 2.2px 2px; font-weight: bold;">${i+1}</td>
                                <td style="padding: 2.2px 2px; font-weight: bold; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; text-align: left;">${eq.name}</td>
                                ${Array.from({length: numSalas}).map((_,s) => `<td style="text-align:center; padding: 2.2px 2px;">${eq.salasPuntos[s] !== undefined ? eq.salasPuntos[s] : 'X'}</td>`).join('')}
                                <td style="text-align:center; padding: 2.2px 2px; color:#ff3333; font-weight:bold;">${eq.killScore}</td>
                                <td style="text-align:center; padding: 2.2px 2px; color:#ffd700; font-weight:bold;">${eq.totalScore}</td>
                            </tr>`;
                        }).join('')}
                    </tbody>
                </table>
            </div>

            <!-- TOP KILLER DE 10 (Derecha) -->
            <div style="position: absolute; top: 142px; left: 800px; width: 350px; background: rgba(0, 0, 0, 0.55); padding: 12px 15px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1);">
                <div style="font-family: 'Orbitron'; color: #ffcc00; margin-bottom: 8px; font-size: 0.9rem; font-weight: bold; text-align: center; border-bottom: 2px solid rgba(255,255,255,0.3); padding-bottom: 4px;">TOP KILLER 10</div>
                <table style="width: 100%; border-collapse: collapse; font-size: 0.8rem;">
                    <thead>
                        <tr style="color: #ffcc00; font-family: 'Orbitron'; border-bottom: 1px solid rgba(255,255,255,0.2); font-size: 0.8rem;">
                            <th style="text-align:left; padding: 3px; width: 15%;">#</th>
                            <th style="text-align:left; padding: 3px; width: 65%;">JUGADOR</th>
                            <th style="text-align:center; padding: 3px; width: 20%;">KILLS</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${topKillers.map((tk, i) => {
                            return `
                            <tr style="border-bottom: 1px solid rgba(255,255,255,0.06); color: #fff;">
                                <td style="padding: 3px; font-weight: bold;">${i+1}</td>
                                <td style="padding: 3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${tk.name}</td>
                                <td style="text-align:center; padding: 3px; color: #ff3333; font-weight: bold;">${tk.kills}</td>
                            </tr>`;
                        }).join('')}
                    </tbody>
                </table>
            </div>

        </div>
        <button onclick="descargar()" class="btn-generar" style="margin-top: 20px;">DESCARGAR IMAGEN</button>
    `;
    document.getElementById('outputTablasLadoALado').innerHTML = html;
}

function descargar() {
    html2canvas(document.getElementById('tablaCaptura'), { scale: 2, useCORS: true }).then(canvas => {
        let link = document.createElement('a');
        link.download = 'Tabla_Resultados.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
    });
}