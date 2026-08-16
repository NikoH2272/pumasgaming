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
    if (!contenedor) return;
    
    contenedor.innerHTML = '';
    Array.from(equiposUnicos).forEach((eq) => {
        contenedor.innerHTML += `
            <div style="display: flex; gap: 10px; align-items: center; background: rgba(255,255,255,0.03); padding: 10px 15px; border-radius: 6px; margin-bottom: 8px;">
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
    procesarLogs(rawFilesData, diccionarioRenombres);
}

function procesarLogs(textsArray, renombresMap) {
    let equiposMap = {};
    let jugadoresMap = {};
    let roomWinners = [];
    let numSalas = textsArray.length;

    textsArray.forEach((text, i) => {
        let lines = text.split('\n');
        let salaWinnerTeam = null;
        let salaWinnerTotalScore = 0;
        let salaWinnerKillScore = 0;

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

                if (parseInt(teamMatch[2]) === 1) {
                    salaWinnerTeam = name;
                    salaWinnerTotalScore = totalScore;
                    salaWinnerKillScore = killScore;
                }
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

        if (salaWinnerTeam) {
            roomWinners.push({ sala: i + 1, team: salaWinnerTeam, points: salaWinnerTotalScore, kills: salaWinnerKillScore });
        }
    });

    let equiposArray = Object.values(equiposMap).sort((a, b) => b.totalScore - a.totalScore);
    let topKillersArray = Object.values(jugadoresMap).sort((a, b) => b.kills - a.kills).slice(0, 9);
    renderizarResultados(equiposArray, topKillersArray, roomWinners, numSalas);
}

function renderizarResultados(equipos, topKillers, roomWinners, numSalas) {
    // Obtener valores personalizados por el usuario
    let tituloCustom = document.getElementById('inputTituloTorneo') ? document.getElementById('inputTituloTorneo').value : "TABLA DE RESULTADOS";
    let jornadaCustom = document.getElementById('inputJornadaTorneo') ? document.getElementById('inputJornadaTorneo').value : "JORNADA 1";
    let fechaCustom = document.getElementById('inputFechaTorneo') ? document.getElementById('inputFechaTorneo').value : "";
    let colorFuente = document.getElementById('selectColorFuente') ? document.getElementById('selectColorFuente').value : "#ffffff";
    let logoUrl = document.getElementById('inputLogoUrl') ? document.getElementById('inputLogoUrl').value : "imagenes/LOGO PUMAS WEB.png";

    let html = `
        <div id="tablaCaptura" style="width: 1000px; height: 900px; background: #0a0b10; background-image: url('ligaspumas.png'); background-size: cover; position: relative; font-family: 'Rajdhani', sans-serif; color: ${colorFuente}; padding: 20px;">
            
            <!-- LOGO ESQUINA SUPERIOR DERECHA -->
            <div style="position: absolute; top: 20px; right: 30px;">
                <img src="${logoUrl}" alt="Logo" style="width: 70px; height: 70px; object-fit: contain; border-radius: 50%; border: 2px solid #ffcc00; background: rgba(0,0,0,0.5);">
            </div>

            <!-- TÍTULO GRANDE Y CABECERA (CENTRADOS) -->
            <div style="text-align: center; position: absolute; top: 20px; left: 50px; right: 50px;">
                <h1 style="font-family: 'Orbitron'; font-size: 2.2rem; color: #ffcc00; margin: 0; text-transform: uppercase; text-shadow: 2px 2px 4px rgba(0,0,0,0.8);">${tituloCustom}</h1>
                <div style="font-family: 'Orbitron'; font-size: 1rem; color: ${colorFuente}; margin-top: 5px; font-weight: bold; letter-spacing: 1px;">
                    ${jornadaCustom} ${fechaCustom ? '— ' + fechaCustom : ''}
                </div>
            </div>

            <!-- TABLA DE RESULTADOS VERTICAL (Izquierda) -->
            <div style="position: absolute; top: 120px; left: 50px; width: 560px;">
                <div style="color: #ffcc00; font-family: 'Orbitron'; font-size: 1rem; margin-bottom: 8px; font-weight: bold;">TABLA GENERAL</div>
                <table style="width: 100%; border-collapse: collapse; font-size: 0.8rem; color: ${colorFuente};">
                    <thead>
                        <tr style="color: #ffcc00; font-family: 'Orbitron'; border-bottom: 2px solid rgba(255,255,255,0.3); font-size: 0.85rem;">
                            <th style="text-align:left; padding: 6px;"># / EQUIPO</th>
                            ${Array.from({length: Math.min(numSalas, 5)}).map((_,i) => `<th style="padding: 6px; text-align:center;">S${i+1}</th>`).join('')}
                            <th style="padding: 6px; text-align:center;">KILL</th>
                            <th style="padding: 6px; text-align:center;">TOTAL</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${equipos.map((eq, i) => {
                            let colorFila = colorFuente;
                            if (i === 0) colorFila = '#ffd700';
                            else if (i === 1) colorFila = '#c0c0c0';
                            else if (i === 2) colorFila = '#cd7f32';
                            return `
                            <tr style="border-bottom: 1px solid rgba(255,255,255,0.08);">
                                <td style="padding: 5px; font-weight: bold; max-width: 140px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                                    <span style="color:${colorFila};">#${i+1}</span> <span style="color:${colorFuente};">${eq.name}</span>
                                </td>
                                ${Array.from({length: Math.min(numSalas, 5)}).map((_,s) => `<td style="text-align:center; padding: 5px; color:${colorFuente};">${eq.salasPuntos[s] !== undefined ? eq.salasPuntos[s] : '💀'}</td>`).join('')}
                                <td style="text-align:center; padding: 5px; color:#ff3333; font-weight:bold;">${eq.killScore}</td>
                                <td style="text-align:center; padding: 5px; color:${colorFila}; font-weight:bold;">${eq.totalScore}</td>
                            </tr>`;
                        }).join('')}
                    </tbody>
                </table>
            </div>

            <!-- TOP KILLER VERTICAL (Derecha) -->
            <div style="position: absolute; top: 120px; left: 635px; width: 310px;">
                <div style="font-family: 'Orbitron'; color: #ffcc00; margin-bottom: 8px; font-size: 1rem; font-weight: bold;">TOP KILLER</div>
                <div style="display: flex; flex-direction: column; gap: 6px;">
                    ${topKillers.map((tk, i) => {
                        let colorPos = colorFuente;
                        if (i === 0) colorPos = '#ffd700';
                        else if (i === 1) colorPos = '#c0c0c0';
                        else if (i === 2) colorPos = '#cd7f32';
                        return `
                        <div style="font-size: 0.8rem; background: rgba(0,0,0,0.7); padding: 8px 10px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.15); display: flex; justify-content: space-between; align-items: center;">
                            <div>
                                <span style="color: ${colorPos}; font-weight: bold; margin-right: 6px;">#${i+1}</span> 
                                <span style="color: ${colorFuente}; font-weight: bold;">${tk.name}</span>
                            </div>
                            <span style="color: #ff3333; font-weight: bold; font-size: 0.9rem;">${tk.kills} Kills</span>
                        </div>`;
                    }).join('')}
                </div>
            </div>

        </div>
        <button onclick="descargar()" class="btn-generar" style="margin-top: 20px;">DESCARGAR IMAGEN</button>
    `;
    document.getElementById('outputTablasLadoALado').innerHTML = html;
}

function descargar() {
    let elemento = document.getElementById('tablaCaptura');
    
    let opciones = {
        scale: 2, 
        useCORS: true,
        backgroundColor: '#0a0b10', // Garantiza fondo completamente negro
        logging: false
    };

    html2canvas(elemento, opciones).then(canvas => {
        let link = document.createElement('a');
        link.download = 'Tabla_Resultados_Vertical.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
    });
}

function procesarConNombresPersonalizados() {
    let diccionarioRenombres = {};
    document.querySelectorAll('.input-nombre-editable').forEach(input => {
        diccionarioRenombres[input.getAttribute('data-original')] = input.value.trim() || input.getAttribute('data-original');
    });
    procesarLogs(rawFilesData, diccionarioRenombres);
}

function procesarLogs(textsArray, renombresMap) {
    let equiposMap = {};
    let jugadoresMap = {};
    let roomWinners = [];
    let numSalas = textsArray.length;

    textsArray.forEach((text, i) => {
        let lines = text.split('\n');
        let salaWinnerTeam = null;
        let salaWinnerTotalScore = 0;
        let salaWinnerKillScore = 0;

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

                if (parseInt(teamMatch[2]) === 1) {
                    salaWinnerTeam = name;
                    salaWinnerTotalScore = totalScore;
                    salaWinnerKillScore = killScore;
                }
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

        if (salaWinnerTeam) {
            roomWinners.push({ sala: i + 1, team: salaWinnerTeam, points: salaWinnerTotalScore, kills: salaWinnerKillScore });
        }
    });

    let equiposArray = Object.values(equiposMap).sort((a, b) => b.totalScore - a.totalScore);
    let topKillersArray = Object.values(jugadoresMap).sort((a, b) => b.kills - a.kills).slice(0, 9);
    renderizarResultados(equiposArray, topKillersArray, roomWinners, numSalas);
}

function renderizarResultados(equipos, topKillers, roomWinners, numSalas) {
    let html = `
        <div id="tablaCaptura" style="width: 1000px; height: 900px; background-image: url('ligaspumas.png'); background-size: cover; position: relative; font-family: 'Rajdhani', sans-serif; color: #fff; padding: 20px;">
            
            <!-- TABLA DE RESULTADOS VERTICAL (Izquierda) -->
            <div style="position: absolute; top: 120px; left: 50px; width: 560px;">
                <div style="color: #ffcc00; font-family: 'Orbitron'; font-size: 1rem; margin-bottom: 8px; font-weight: bold;">TABLA GENERAL</div>
                <table style="width: 100%; border-collapse: collapse; font-size: 0.8rem;">
                    <thead>
                        <tr style="color: #ffcc00; font-family: 'Orbitron'; border-bottom: 2px solid rgba(255,255,255,0.3); font-size: 0.85rem;">
                            <th style="text-align:left; padding: 6px;"># / EQUIPO</th>
                            ${Array.from({length: Math.min(numSalas, 5)}).map((_,i) => `<th style="padding: 6px; text-align:center;">S${i+1}</th>`).join('')}
                            <th style="padding: 6px; text-align:center;">KILL</th>
                            <th style="padding: 6px; text-align:center;">TOTAL</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${equipos.map((eq, i) => {
                            let colorFila = '#fff';
                            if (i === 0) colorFila = '#ffd700';
                            else if (i === 1) colorFila = '#c0c0c0';
                            else if (i === 2) colorFila = '#cd7f32';
                            return `
                            <tr style="border-bottom: 1px solid rgba(255,255,255,0.08); color: ${colorFila};">
                                <td style="padding: 5px; font-weight: bold; max-width: 140px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                                    <span style="color:${colorFila};">#${i+1}</span> ${eq.name}
                                </td>
                                ${Array.from({length: Math.min(numSalas, 5)}).map((_,s) => `<td style="text-align:center; padding: 5px;">${eq.salasPuntos[s] !== undefined ? eq.salasPuntos[s] : '💀'}</td>`).join('')}
                                <td style="text-align:center; padding: 5px; color:#ff3333; font-weight:bold;">${eq.killScore}</td>
                                <td style="text-align:center; padding: 5px; color:${colorFila === '#fff' ? '#ffd700' : colorFila}; font-weight:bold;">${eq.totalScore}</td>
                            </tr>`;
                        }).join('')}
                    </tbody>
                </table>
            </div>

            <!-- TOP KILLER VERTICAL (Derecha, al lado de la tabla general) -->
            <div style="position: absolute; top: 120px; left: 635px; width: 310px;">
                <div style="font-family: 'Orbitron'; color: #ffcc00; margin-bottom: 8px; font-size: 1rem; font-weight: bold;">TOP KILLER</div>
                <div style="display: flex; flex-direction: column; gap: 6px;">
                    ${topKillers.map((tk, i) => {
                        let colorPos = '#fff';
                        if (i === 0) colorPos = '#ffd700';
                        else if (i === 1) colorPos = '#c0c0c0';
                        else if (i === 2) colorPos = '#cd7f32';
                        return `
                        <div style="font-size: 0.8rem; background: rgba(0,0,0,0.7); padding: 8px 10px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.15); display: flex; justify-content: space-between; align-items: center;">
                            <div>
                                <span style="color: ${colorPos}; font-weight: bold; margin-right: 6px;">#${i+1}</span> 
                                <span style="color: #fff; font-weight: bold;">${tk.name}</span>
                            </div>
                            <span style="color: #ff3333; font-weight: bold; font-size: 0.9rem;">${tk.kills} Kills</span>
                        </div>`;
                    }).join('')}
                </div>
            </div>

            <!-- BOOYAH (Abajo) -->
            <div style="position: absolute; bottom: 30px; left: 50px; width: 900px; display: flex; justify-content: space-around; gap: 8px; flex-wrap: wrap;">
                ${roomWinners.map(rw => `
                    <div style="background: rgba(0,0,0,0.8); border: 1px solid #ffd700; padding: 8px 12px; border-radius: 6px; text-align: center; font-size: 0.75rem; min-width: 130px;">
                        <div style="color: #ffd700; font-weight: bold; font-family: 'Orbitron'; font-size: 0.7rem;">SALA ${rw.sala} (BOOYAH)</div>
                        <div style="color: #fff; font-weight: bold; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 140px; margin: 2px 0;">${rw.team}</div>
                        <div style="font-size: 0.68rem; color: #ddd;">Pts: <span style="color:#ffd700; font-weight:bold;">${rw.points}</span></div>
                    </div>
                `).join('')}
            </div>

        </div>
        <button onclick="descargar()" class="btn-generar" style="margin-top: 20px;">DESCARGAR IMAGEN</button>
    `;
    document.getElementById('outputTablasLadoALado').innerHTML = html;
}

function descargar() {
    let elemento = document.getElementById('tablaCaptura');
    
    // Opciones para asegurar que capture correctamente el fondo negro
    let opciones = {
        scale: 2, 
        useCORS: true,
        backgroundColor: '#0a0b10', // Fuerza el fondo negro/oscuro idéntico al de tu diseño
        logging: false
    };

    html2canvas(elemento, opciones).then(canvas => {
        let link = document.createElement('a');
        link.download = 'Tabla_Resultados_Vertical.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
    });
}