let globalParsedData = null;

// Diccionario opcional para corregir nombres variantes entre logs
const correccionNombresEquipos = {};
const correccionNombresJugadores = {};

async function procesarArchivosLog() {
    const fileInput = document.getElementById('fileInput');
    let files = Array.from(fileInput.files);
    
    if (files.length === 0) return;

    files.sort((a, b) => a.name.localeCompare(b.name));

    let equiposMap = {};
    let playerKillsMap = {};
    let roomWinners = [];
    let numSalas = files.length;
    let salasDataPorEquipo = {}; // Almacena el puntaje por sala para cada equipo

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const text = await file.text();
        const lines = text.split('\n');

        let salaWinnerTeam = null;
        let salaWinnerKillScore = 0;

        lines.forEach(line => {
            // Lectura de Kills de Jugadores y asociación a su equipo en esta sala
            const playerMatch = line.match(/NAME:\s*(.+?)\s+ID:\s*\d+.*?KILL:\s*(\d+)/i);
            if (playerMatch) {
                let rawName = playerMatch[1].trim();
                let playerName = correccionNombresJugadores[rawName] || rawName;
                let kills = parseInt(playerMatch[2], 10);
                
                if (!playerKillsMap[playerName]) {
                    playerKillsMap[playerName] = { name: playerName, kills: 0, equipo: 'Desconocido' };
                }
                playerKillsMap[playerName].kills += kills;
            }

            // Lectura de Puntuación de Equipos por Sala
            const teamMatch = line.match(/TeamName:\s*(.+?)\s+Rank:\s*(\d+)\s+KillScore:\s*(\d+)\s+RankScore:\s*(\d+)\s+TotalScore:\s*(\d+)/i);
            if (teamMatch) {
                let rawTeam = teamMatch[1].trim();
                let teamName = correccionNombresEquipos[rawTeam] || rawTeam;
                
                let rank = parseInt(teamMatch[2], 10);
                let killScore = parseInt(teamMatch[3], 10);
                let rankScore = parseInt(teamMatch[4], 10);
                let totalScore = parseInt(teamMatch[5], 10);

                if (!equiposMap[teamName]) {
                    equiposMap[teamName] = {
                        name: teamName,
                        totalScore: 0,
                        rankScore: 0,
                        killScore: 0,
                        booyahs: 0,
                        matchesPlayed: 0,
                        salasPuntos: {} // Guardará puntos por cada índice de sala
                    };
                }

                equiposMap[teamName].totalScore += totalScore;
                equiposMap[teamName].rankScore += rankScore;
                equiposMap[teamName].killScore += killScore;
                equiposMap[teamName].matchesPlayed += 1;
                equiposMap[teamName].salasPuntos[i] = totalScore; // Puntos en esta sala específica

                if (rank === 1) {
                    equiposMap[teamName].booyahs += 1;
                    if (killScore > salaWinnerKillScore) {
                        salaWinnerKillScore = killScore;
                        salaWinnerTeam = teamName;
                    }
                }
            }
        });

        if (salaWinnerTeam) {
            roomWinners.push({
                sala: i + 1,
                team: salaWinnerTeam,
                kills: salaWinnerKillScore
            });
        }
    }

    let equiposArray = Object.values(equiposMap);
    let topKillersArray = Object.values(playerKillsMap).sort((a, b) => b.kills - a.kills);

    globalParsedData = {
        equiposArray,
        topKillersArray,
        roomWinners,
        numSalas
    };

    renderizarResultados(globalParsedData);
}

function cambiarModoCalculo() {
    if (globalParsedData) renderizarResultados(globalParsedData);
}

function actualizarDatosEnVivo() {
    if (globalParsedData) renderizarResultados(globalParsedData);
}

function renderizarResultados(data) {
    let { equiposArray, topKillersArray, roomWinners, numSalas } = data;
    let modoCalculo = document.getElementById('selectModoCalculo').value;
    let tituloTorneo = document.getElementById('inputTitulo').value || 'Torneo Oficial Free Fire';
    let jornadaTorneo = document.getElementById('inputJornada').value || 'Fase General Acumulada';
    let moderador = document.getElementById('inputModerador').value || 'Staff';

    // 6 MODOS DE ORDENAMIENTO
    if (modoCalculo === '1') {
        // 1. Total Score Estándar (Mayor a menor puntos totales)
        equiposArray.sort((a, b) => b.totalScore - a.totalScore || b.killScore - a.killScore);
    } else if (modoCalculo === '2') {
        // 2. Solo Posición / RankScore
        equiposArray.sort((a, b) => b.rankScore - a.rankScore || b.killScore - a.killScore);
    } else if (modoCalculo === '3') {
        // 3. Solo Kills / KillScore
        equiposArray.sort((a, b) => b.killScore - a.killScore || b.rankScore - a.rankScore);
    } else if (modoCalculo === '4') {
        // 4. Booyahs (Más victorias de sala primero)
        equiposArray.sort((a, b) => b.booyahs - a.booyahs || b.totalScore - a.totalScore);
    } else if (modoCalculo === '5') {
        // 5. Promedio / Menor Rank (Equilibrio de rendimiento)
        equiposArray.sort((a, b) => a.rankScore - b.rankScore);
    } else if (modoCalculo === '6') {
        // 6. Alfabético por Equipo
        equiposArray.sort((a, b) => a.name.localeCompare(b.name));
    } else {
        equiposArray.sort((a, b) => b.totalScore - a.totalScore);
    }

    let fondoTablaFile = document.getElementById('inputFondoTabla').files[0];
    let fondoTablaUrl = fondoTablaFile ? URL.createObjectURL(fondoTablaFile) : '';
    let styleBgTabla = fondoTablaUrl ? `background-image: url('${fondoTablaUrl}');` : `background: #121520;`;

    let fondoBooyahFile = document.getElementById('inputFondoBooyah').files[0];
    let fondoBooyahUrl = fondoBooyahFile ? URL.createObjectURL(fondoBooyahFile) : '';

    // 1. ZONA DE BOOYAH (Parte Superior)
    let htmlBooyahs = `
        <div style="background: rgba(18, 21, 32, 0.95); border: 2px solid var(--accent-yellow); border-radius: 10px; padding: 20px; margin-bottom: 25px;">
            <h3 style="font-size: 1.2rem; color: var(--accent-yellow); margin-bottom: 15px; font-family: 'Orbitron'; text-align: center;">
                <i class="fa-solid fa-trophy"></i> ZONA DE BOOYAH (GANADORES POR SALA)
            </h3>
    `;
    if (roomWinners.length > 0) {
        htmlBooyahs += `<div class="booyah-grid">`;
        roomWinners.forEach(rw => {
            let styleBgCard = fondoBooyahUrl ? `background-image: url('${fondoBooyahUrl}');` : `background: #181c2e;`;
            htmlBooyahs += `
                <div class="booyah-card" style="${styleBgCard}">
                    <div class="booyah-overlay">
                        <span style="color: var(--accent-yellow); font-weight: 900; font-family: 'Orbitron'; font-size: 0.85rem;">SALA ${rw.sala}</span>
                        <h4 style="font-size: 1.1rem; margin: 6px 0; color: #fff;">${rw.team}</h4>
                        <p style="color: var(--gray); font-size: 0.8rem;"><i class="fa-solid fa-crosshairs" style="color: var(--secondary);"></i> Kills: <strong>${rw.kills}</strong></p>
                    </div>
                </div>
            `;
        });
        htmlBooyahs += `</div>`;
    } else {
        htmlBooyahs += `<p style="color: var(--gray); text-align: center;">No se registraron ganadores.</p>`;
    }
    htmlBooyahs += `</div>`;
    document.getElementById('outputBooyahs').innerHTML = htmlBooyahs;

    // 2. TABLA DE PUNTUACIÓN GENERAL (Izquierda) con columnas de Sala 1, Sala 2...
    let htmlTablaGeneral = `
        <div class="table-general-box">
            <div style="background: rgba(0,0,0,0.85); padding: 15px; border-bottom: 2px solid var(--accent-yellow);">
                <h3 style="color: var(--accent-yellow); font-family: 'Orbitron'; font-size: 1rem; margin-bottom: 4px;">${tituloTorneo}</h3>
                <p style="color: var(--gray); font-size: 0.8rem;">${jornadaTorneo} | Admin: ${moderador}</p>
            </div>
            <div style="overflow-x: auto;">
            <table style="width: 100%; border-collapse: collapse; min-width: 600px;">
                <thead>
                    <tr>
                        <th style="width: 35px;">#</th>
                        <th style="text-align: left; padding-left: 10px;">EQUIPO</th>
    `;

    // Generar columnas dinámicas de salas (S1, S2, S3...)
    for (let s = 1; s <= numSalas; s++) {
        htmlTablaGeneral += `<th style="width: 40px; font-size: 0.8rem;">S${s}</th>`;
    }

    htmlTablaGeneral += `
                        <th style="width: 40px;">KILL</th>
                        <th style="width: 55px; color: var(--primary);">PTS</th>
                    </tr>
                </thead>
                <tbody>
    `;

    equiposArray.forEach((eq, idx) => {
        let totalItems = equiposArray.length;
        let estiloFila = "";
        
        // Destacar los 3 últimos en rojo
        if (idx >= totalItems - 3 && totalItems >= 4) {
            estiloFila = "color: #ff4444; background: rgba(255, 68, 68, 0.08);";
        }

        htmlTablaGeneral += `
            <tr style="${estiloFila}">
                <td style="font-weight: 900; color: ${idx < 3 ? 'var(--accent-yellow)' : 'inherit'};">${idx + 1}</td>
                <td style="text-align: left; padding-left: 10px; font-weight: 700;">${eq.name}</td>
        `;

        // Puntos por cada sala
        for (let s = 0; s < numSalas; s++) {
            let ptsSala = eq.salasPuntos[s] !== undefined ? eq.salasPuntos[s] : '-';
            htmlTablaGeneral += `<td>${ptsSala}</td>`;
        }

        htmlTablaGeneral += `
                <td>${eq.killScore}</td>
                <td style="font-weight: 900; color: var(--primary);">${eq.totalScore}</td>
            </tr>
        `;
    });
    htmlTablaGeneral += `</tbody></table></div></div>`;

    // 3. TOP KILLER / MVP INDIVIDUAL (Derecha) con Destacados (Top 3 especiales)
    let htmlTopKiller = `
        <div class="table-killer-box">
            <div style="background: rgba(0,0,0,0.85); padding: 15px; border-bottom: 2px solid var(--secondary);">
                <h3 style="color: var(--secondary); font-family: 'Orbitron'; font-size: 1rem; margin-bottom: 4px;">TOP KILLERS</h3>
                <p style="color: var(--gray); font-size: 0.8rem;">MVP Global</p>
            </div>
            <table style="width: 100%; border-collapse: collapse;">
                <thead>
                    <tr>
                        <th style="width: 35px;">TOP</th>
                        <th style="text-align: left; padding-left: 10px;">JUGADOR</th>
                        <th style="width: 55px; color: var(--secondary);">ELIM.</th>
                    </tr>
                </thead>
                <tbody>
    `;

    if (topKillersArray.length > 0) {
        topKillersArray.slice(0, 15).forEach((tk, idx) => {
            let badgeColor = "#fff";
            let rowStyle = "";
            if (idx === 0) { badgeColor = "#ffd700"; rowStyle = "background: rgba(255, 215, 0, 0.12); font-weight: bold;"; } // Oro (Top 1)
            else if (idx === 1) { badgeColor = "#c0c0c0"; rowStyle = "background: rgba(192, 192, 192, 0.12); font-weight: bold;"; } // Plata (Top 2)
            else if (idx === 2) { badgeColor = "#cd7f32"; rowStyle = "background: rgba(205, 127, 50, 0.12); font-weight: bold;"; } // Bronce (Top 3)

            htmlTopKiller += `
                <tr style="${rowStyle}">
                    <td style="font-weight: 900; color: ${badgeColor};">#${idx + 1}</td>
                    <td style="text-align: left; padding-left: 10px;">${tk.name}</td>
                    <td style="font-weight: 900; color: var(--secondary);">${tk.kills}</td>
                </tr>
            `;
        });
    } else {
        htmlTopKiller += `<tr><td colspan="3" style="padding: 20px; color: var(--gray);">Sin registros.</td></tr>`;
    }
    htmlTopKiller += `</tbody></table></div>`;

    // Contenedor Lado a Lado (Tabla de Puntuación General + Top Killer) con Botón de Impresión 4K
    let htmlLadoALado = `
        <div style="margin-bottom: 15px; text-align: right;">
            <button onclick="imprimirTabla4K()" class="btn-access" style="padding: 10px 20px; font-size: 0.9rem; cursor: pointer;">
                <i class="fa-solid fa-print"></i> IMPRIMIR / EXPORTAR EN 4K
            </button>
        </div>
        <div id="printableArea4K" class="tablas-lado-a-lado" style="${styleBgTabla}">
            ${htmlTablaGeneral}
            ${htmlTopKiller}
        </div>
    `;

    document.getElementById('outputTablasLadoALado').innerHTML = htmlLadoALado;
}

// ----------------------------------------------------
// EXPORTACIÓN COMO IMAGEN (2400x1200 px - FUENTES AMPLIADAS +120%)
// ----------------------------------------------------
async function imprimirTabla4K() {
    const booyahBox = document.getElementById('outputBooyahs');
    const printableArea = document.getElementById('printableArea4K');
    
    if (!printableArea) {
        alert("Primero procesa los archivos de log para generar los resultados.");
        return;
    }

    // Contenedor temporal adaptado a dimensiones de 2400x1200 px
    const wrapperTemporal = document.createElement('div');
    wrapperTemporal.style.background = '#0a0b10';
    wrapperTemporal.style.padding = '40px';
    wrapperTemporal.style.width = '4800px';   
    wrapperTemporal.style.minHeight = '2400px'; 
    wrapperTemporal.style.display = 'flex';
    wrapperTemporal.style.flexDirection = 'column';
    wrapperTemporal.style.justifyContent = 'space-between';
    wrapperTemporal.style.gap = '30px';
    wrapperTemporal.style.boxSizing = 'border-box';
    
    // Clonar los elementos visuales
    const clonBooyah = booyahBox.cloneNode(true);
    const clonTabla = printableArea.cloneNode(true);

    clonBooyah.style.width = '100%';
    clonBooyah.style.flex = '0 0 auto';
    
    clonTabla.style.width = '100%';
    clonTabla.style.flex = '1 1 auto';
    clonTabla.style.display = 'grid';
    clonTabla.style.gridTemplateColumns = '65% 35%'; // 65% Tabla General, 35% Top Killer exactos
    clonTabla.style.gap = '40px';
    clonTabla.style.height = '100%';

    // Aumento del tamaño de las fuentes un 120% adicional para máxima visibilidad
    const styleInyectado = document.createElement('style');
    styleInyectado.innerHTML = `
        th { font-size: 3.2rem !important; padding: 40px 28px !important; }
        td { font-size: 3.0rem !important; padding: 38px 28px !important; }
        h3, h4 { font-size: 3.8rem !important; }
        p, span { font-size: 2.8rem !important; }
    `;
    wrapperTemporal.appendChild(styleInyectado);

    wrapperTemporal.appendChild(clonBooyah);
    wrapperTemporal.appendChild(clonTabla);
    
    // Posicionar temporalmente fuera de pantalla
    wrapperTemporal.style.position = 'absolute';
    wrapperTemporal.style.left = '-9999px';
    wrapperTemporal.style.top = '0';
    document.body.appendChild(wrapperTemporal);

    let tituloTorneo = document.getElementById('inputTitulo').value || 'Torneo_Free_Fire';
    let nombreArchivoLimpio = tituloTorneo.replace(/[^a-zA-Z0-9]/g, '_');

    try {
        // Renderizado a escala completa
        const canvas = await html2canvas(wrapperTemporal, {
            scale: 1, 
            width: 4800,
            windowWidth: 4800,
            useCORS: true,
            backgroundColor: '#0a0b10',
            logging: false
        });

        // Redimensionar el resultado final exactamente a la medida solicitada de 2400x1200 px
        const finalCanvas = document.createElement('canvas');
        finalCanvas.width = 2400;
        finalCanvas.height = 1200;
        const ctx = finalCanvas.getContext('2d');
        ctx.drawImage(canvas, 0, 0, 2400, 1200);

        // Descarga automática de la imagen PNG optimizada
        const link = document.createElement('a');
        link.download = `${nombreArchivoLimpio}_2400x1200.png`;
        link.href = finalCanvas.toDataURL('image/png', 1.0);
        link.click();
    } catch (error) {
        console.error("Error al generar la imagen:", error);
        alert("Hubo un problema al exportar la imagen.");
    } finally {
        document.body.removeChild(wrapperTemporal);
    }
}

// ----------------------------------------------------
// SISTEMA DE ROLES Y AUTENTICACIÓN
// ----------------------------------------------------
if (!localStorage.getItem('esports_users')) {
    const initialUsers = [
        { username: 'admin', pass: 'admin123', role: 'administrador' },
        { username: 'ascensos', pass: '1234', role: 'resultadosascensos' },
        { username: 'ligas', pass: '1234', role: 'ligas privadas' },
        { username: 'quisqueya', pass: '1234', role: 'quisqueya' },
        { username: 'nova', pass: '1234', role: 'nova' },
        { username: 'rusheo', pass: '1234', role: 'rusheo' }
    ];
    localStorage.setItem('esports_users', JSON.stringify(initialUsers));
}

document.getElementById('loginForm')?.addEventListener('submit', function(e) {
    e.preventDefault();
    const uInput = document.getElementById('loginUser').value.trim();
    const pInput = document.getElementById('loginPass').value.trim();
    const users = JSON.parse(localStorage.getItem('esports_users'));
    const matchedUser = users.find(u => u.username === uInput && u.pass === pInput);

    if (matchedUser) {
        localStorage.setItem('current_user', JSON.stringify(matchedUser));
        aplicarAccesoPorRol(matchedUser);
    } else {
        document.getElementById('loginError').innerText = 'Credenciales incorrectas.';
    }
});

function aplicarAccesoPorRol(user) {
    document.getElementById('loginOverlay').style.display = 'none';
    document.getElementById('logoutBar').style.display = 'block';
    document.getElementById('currentUserSpan').innerText = `${user.username} (${user.role})`;
    document.getElementById('adminPanelContainer').style.display = user.role === 'administrador' ? 'block' : 'none';
    document.getElementById('mainAppContainer').style.display = user.role === 'administrador' ? 'none' : 'block';
    if(user.role === 'administrador') cargarTablaAdminUsuarios();
}

function cargarTablaAdminUsuarios() {
    const users = JSON.parse(localStorage.getItem('esports_users'));
    const tbody = document.getElementById('usersTableBody');
    tbody.innerHTML = '';
    users.forEach(u => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${u.username}</td><td><strong style="color: var(--accent-yellow);">${u.role}</strong></td>`;
        tbody.appendChild(tr);
    });
}

function cerrarSesion() {
    localStorage.removeItem('current_user');
    location.reload();
}

window.onload = function() {
    const activeUser = JSON.parse(localStorage.getItem('current_user'));
    if (activeUser) aplicarAccesoPorRol(activeUser);
};