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
    let usarDosColumnas = equipos.length > 12;
    let eIz = usarDosColumnas ? equipos.slice(0, 12) : equipos;
    let eDe = usarDosColumnas ? equipos.slice(12) : [];

    let html = `
        <div id="tablaCaptura" style="width: 1200px; height: 580px; background-image: url('ligaspumas.png'); background-size: cover; position: relative; font-family: 'Rajdhani', sans-serif; color: #fff; padding: 15px;">
            
            <!-- TABLA IZQUIERDA -->
            <div style="position: absolute; top: 149px; left: ${usarDosColumnas ? '67px' : '150px'}; width: 520px;">
                <table style="width: 100%; border-collapse: collapse; font-size: 0.8rem;">
                    <thead>
                        <tr style="color: #ffcc00; font-family: 'Orbitron'; border-bottom: 2px solid rgba(255,255,255,0.3); font-size: 0.85rem;">
                            <th style="text-align:left; padding: 4px;">EQUIPO</th>
                            ${Array.from({length: Math.min(numSalas, 6)}).map((_,i) => `<th style="padding: 4px; text-align:center;">S${i+1}</th>`).join('')}
                            <th style="padding: 4px; text-align:center;">KILL</th>
                            <th style="padding: 4px; text-align:center;">TOTAL</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${eIz.map((eq, i) => {
                            let colorFila = '#fff';
                            if (i === 0) colorFila = '#ffd700'; // Oro
                            else if (i === 1) colorFila = '#c0c0c0'; // Plata
                            else if (i === 2) colorFila = '#cd7f32'; // Bronce
                            return `
                            <tr style="border-bottom: 1px solid rgba(255,255,255,0.08); color: ${colorFila};">
                                <td style="padding: 3px; font-weight: bold; max-width: 130px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${eq.name}</td>
                                ${Array.from({length: Math.min(numSalas, 6)}).map((_,s) => `<td style="text-align:center; padding: 3px;">${eq.salasPuntos[s] !== undefined ? eq.salasPuntos[s] : '💀'}</td>`).join('')}
                                <td style="text-align:center; padding: 3px; color:#ff3333; font-weight:bold;">${eq.killScore}</td>
                                <td style="text-align:center; padding: 3px; color:${colorFila === '#fff' ? '#ffd700' : colorFila}; font-weight:bold;">${eq.totalScore}</td>
                            </tr>`;
                        }).join('')}
                    </tbody>
                </table>
            </div>

            ${usarDosColumnas ? `
            <!-- TABLA DERECHA -->
            <div style="position: absolute; top: 149px; left: 592px; width: 520px;">
                <table style="width: 100%; border-collapse: collapse; font-size: 0.8rem;">
                    <thead>
                        <tr style="color: #ffcc00; font-family: 'Orbitron'; border-bottom: 2px solid rgba(255,255,255,0.3); font-size: 0.85rem;">
                            <th style="text-align:left; padding: 4px;">EQUIPO</th>
                            ${Array.from({length: Math.min(numSalas, 6)}).map((_,i) => `<th style="padding: 4px; text-align:center;">S${i+1}</th>`).join('')}
                            <th style="padding: 4px; text-align:center;">KILL</th>
                            <th style="padding: 4px; text-align:center;">TOTAL</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${eDe.map((eq, idx) => {
                            let i = 12 + idx;
                            let colorFila = '#fff';
                            if (i === 0) colorFila = '#ffd700'; // Oro
                            else if (i === 1) colorFila = '#c0c0c0'; // Plata
                            else if (i === 2) colorFila = '#cd7f32'; // Bronce
                            return `
                            <tr style="border-bottom: 1px solid rgba(255,255,255,0.08); color: ${colorFila};">
                                <td style="padding: 3px; font-weight: bold; max-width: 130px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${eq.name}</td>
                                ${Array.from({length: Math.min(numSalas, 6)}).map((_,s) => `<td style="text-align:center; padding: 3px;">${eq.salasPuntos[s] !== undefined ? eq.salasPuntos[s] : '💀'}</td>`).join('')}
                                <td style="text-align:center; padding: 3px; color:#ff3333; font-weight:bold;">${eq.killScore}</td>
                                <td style="text-align:center; padding: 3px; color:${colorFila === '#fff' ? '#ffd700' : colorFila}; font-weight:bold;">${eq.totalScore}</td>
                            </tr>`;
                        }).join('')}
                    </tbody>
                </table>
            </div>
            ` : ''}

            <!-- TOP KILLER (Debajo de la columna 2, en 3 columnas de 3 jugadores) -->
            <div style="position: absolute; top: ${usarDosColumnas ? '330px' : '400px'}; left: 592px; width: 520px;">
                <div style="font-family: 'Orbitron'; color: #ffcc00; margin-bottom: 6px; font-size: 0.85rem; font-weight: bold;">TOP KILLER</div>
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px;">
                    ${topKillers.map((tk, i) => {
                        let colorPos = '#fff';
                        if (i === 0) colorPos = '#ffd700';
                        else if (i === 1) colorPos = '#c0c0c0';
                        else if (i === 2) colorPos = '#cd7f32';
                        return `
                        <div style="font-size: 0.73rem; background: rgba(0,0,0,0.6); padding: 4px 6px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.1); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                            <span style="color: ${colorPos}; font-weight: bold;">#${i+1}</span> <span style="color: ${colorPos};">${tk.name}</span> (<span style="color: #ff3333; font-weight: bold;">${tk.kills}</span>)
                        </div>`;
                    }).join('')}
                </div>
            </div>

            <!-- BOOYAH (Debajo de la tabla) -->
            <div style="position: absolute; bottom: 20px; left: 50px; width: 1050px; display: flex; justify-content: space-around; gap: 8px;">
                ${roomWinners.map(rw => `
                    <div style="background: rgba(0,0,0,0.75); border: 1px solid #ffd700; padding: 6px 12px; border-radius: 6px; text-align: center; font-size: 0.75rem; min-width: 140px;">
                        <div style="color: #ffd700; font-weight: bold; font-family: 'Orbitron'; font-size: 0.7rem;">SALA ${rw.sala} (BOOYAH)</div>
                        <div style="color: #fff; font-weight: bold; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 150px; margin: 2px 0;">${rw.team}</div>
                        <div style="font-size: 0.68rem; color: #ddd;">Pts: <span style="color:#ffd700; font-weight:bold;">${rw.points}</span> | Kills: <span style="color:#ff3333; font-weight:bold;">${rw.kills}</span></div>
                    </div>
                `).join('')}
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