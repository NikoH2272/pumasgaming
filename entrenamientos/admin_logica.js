let rawFilesData = [];
let processedFilesTexts = [];
let logoPersonalizadoBase64 = null;
let fondoPersonalizadoBase64 = null;
let globalEquipos = [];
let globalTopKillers = [];
let globalNumSalas = 0;

async function prepararRenombradoEquipos() {
    const fileInput = document.getElementById('fileInput');
    let files = Array.from(fileInput.files);
    if (files.length === 0) return;

    rawFilesData = [];
    let equiposEnLogs = new Set();

    for (let file of files) {
        let text = await file.text();
        rawFilesData.push(text);
        let lines = text.split('\n');
        lines.forEach(line => {
            const teamMatch = line.match(/TeamName:\s*(.+?)\s+Rank:/i);
            if (teamMatch) equiposEnLogs.add(teamMatch[1].trim());
        });
    }

    let equiposOficialesMap = {};
    try {
        const SUPABASE_URL = "https://bqemjroiegybdzksddkn.supabase.co";
        const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJxZW1qcm9pZWd5YmR6a3NkZGtuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc1NzgwNDIsImV4cCI6MjEwMzE1NDA0Mn0.49gC204FPWSNxWYa6eZFBgWJgr7ZvFax5mqOM9lyGPo";
        let supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        
        const { data: dbEquipos } = await supabaseClient.from('equipos_registrados').select('*');
        if (dbEquipos) {
            dbEquipos.forEach(eq => {
                equiposOficialesMap[eq.nombre.toUpperCase()] = {
                    nombreOficial: eq.nombre,
                    tag: eq.tag
                };
            });
        }
    } catch (e) {
        console.warn("No se pudo cargar el listado oficial de Supabase.", e);
    }

    const contenedor = document.getElementById('listaEquiposInputs');
    if (!contenedor) return;
    
    contenedor.innerHTML = '';
    contenedor.style.maxHeight = 'none';
    contenedor.style.overflowY = 'visible';

    Array.from(equiposEnLogs).forEach((eqOriginal) => {
        let matchOficial = equiposOficialesMap[eqOriginal.toUpperCase()];
        let sugerenciaNombre = matchOficial ? matchOficial.nombreOficial : eqOriginal;
        
        let badgeEstado = '';
        if (matchOficial) {
            badgeEstado = `<span style="background: rgba(0, 255, 128, 0.15); color: #00ff80; border: 1px solid rgba(0, 255, 128, 0.4); padding: 3px 8px; border-radius: 4px; font-size: 0.7rem; font-family: 'Orbitron'; font-weight: bold; white-space: nowrap;"><i class="fa-solid fa-check"></i> REGISTRADO [${matchOficial.tag}]</span>`;
        } else {
            badgeEstado = `<span style="background: rgba(255, 51, 51, 0.15); color: #ff5555; border: 1px solid rgba(255, 51, 51, 0.4); padding: 3px 8px; border-radius: 4px; font-size: 0.7rem; font-family: 'Orbitron'; font-weight: bold; white-space: nowrap;"><i class="fa-solid fa-xmark"></i> NO REGISTRADO</span>`;
        }

        contenedor.innerHTML += `
            <div style="display: flex; flex-direction: column; gap: 6px; background: rgba(255,255,255,0.03); padding: 12px 15px; border-radius: 6px; margin-bottom: 10px; border-left: 3px solid ${matchOficial ? '#00ff80' : '#ff5555'};">
                <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 5px;">
                    <span style="color: var(--gray); font-size: 0.85rem;">Original: <strong>${eqOriginal}</strong></span>
                    ${badgeEstado}
                </div>
                <div style="display: flex; gap: 10px; align-items: center;">
                    <input type="text" class="input-nombre-editable" data-original="${eqOriginal}" value="${sugerenciaNombre}" style="flex: 2; padding: 9px; background: #0a0b10; border: 1px solid rgba(220,204,156,0.3); color: #fff; border-radius: 4px; font-family:'Rajdhani'; font-weight:bold; font-size: 0.95rem;">
                    <button onclick="this.closest('div').parentElement.remove()" style="background:#ff3333; color:#fff; border:none; padding:8px 12px; border-radius:4px; cursor:pointer;" title="Eliminar equipo de esta sesión"><i class="fa-solid fa-trash"></i></button>
                </div>
            </div>
        `;
    });
    
    document.getElementById('seccionRenombrar').style.display = 'block';
}

async function procesarConNombresPersonalizados() {
    let diccionarioRenombres = {};

    document.querySelectorAll('.input-nombre-editable').forEach(input => {
        let original = input.getAttribute('data-original');
        let nuevoNombre = input.value.trim() || original;
        diccionarioRenombres[original] = nuevoNombre;
    });

    // Modificar el texto interno de los archivos .log con los nombres mapeados (sin autorregistrar equipos nuevos)
    processedFilesTexts = rawFilesData.map(text => {
        let updatedText = text;
        for (let original in diccionarioRenombres) {
            let nuevo = diccionarioRenombres[original];
            if (original !== nuevo) {
                let regex = new RegExp(`TeamName:\\s*${escapeRegExp(original)}\\s+Rank:`, 'gi');
                updatedText = updatedText.replace(regex, `TeamName: ${nuevo} Rank:`);
            }
        }
        return updatedText;
    });

    procesarLogs(processedFilesTexts, {});
}

function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function procesarArchivosLog() {
    if (rawFilesData.length === 0) {
        alert("Por favor, selecciona primero los archivos de registro (.log o .txt).");
        return;
    }
    procesarConNombresPersonalizados();
    await guardarEntrenamientoEnSupabase();
}

function procesarLogs(textsArray, renombresMap) {
    let equiposMap = {};
    let jugadoresMap = {};
    let roomWinners = [];
    let numSalas = textsArray.length;

    textsArray.forEach((text, i) => {
        let lines = text.split('\n');
        let salaBooyahEquipo = null;
        let salaBooyahPts = 0;
        let salaBooyahKills = 0;

        lines.forEach(line => {
            const teamMatch = line.match(/TeamName:\s*(.+?)\s+Rank:\s*(\d+)\s+KillScore:\s*(\d+)\s+RankScore:\s*(\d+)\s+TotalScore:\s*(\d+)/i);
            if (teamMatch) {
                let name = teamMatch[1].trim();
                if (!equiposMap[name]) {
                    equiposMap[name] = { 
                        name, 
                        totalScore: 0, 
                        killScore: 0, 
                        rankScore: 0, 
                        salasPuntos: {}, 
                        salasKills: {}, 
                        salasRank: {}, 
                        salasJugadas: 0, 
                        booyahsCount: 0 
                    };
                }
                let totalScore = parseInt(teamMatch[5]);
                let killScore = parseInt(teamMatch[3]);
                let rankScore = parseInt(teamMatch[4]);
                let rank = parseInt(teamMatch[2]);

                equiposMap[name].totalScore += totalScore;
                equiposMap[name].killScore += killScore;
                equiposMap[name].rankScore += rankScore;
                
                equiposMap[name].salasPuntos[i] = totalScore;
                equiposMap[name].salasKills[i] = killScore;
                equiposMap[name].salasRank[i] = rankScore;
                equiposMap[name].salasJugadas += 1;

                if (rank === 1) {
                    equiposMap[name].booyahsCount += 1;
                    salaBooyahEquipo = name;
                    salaBooyahPts = totalScore;
                    salaBooyahKills = killScore;
                }
            }

            const playerMatch = line.match(/NAME:\s*(.+?)\s+ID:\s*\d+.*?KILL:\s*(\d+)/i);
            if (playerMatch) {
                let pName = playerMatch[1].trim();
                let pKills = parseInt(playerMatch[2]);
                
                if (!jugadoresMap[pName]) {
                    jugadoresMap[pName] = { name: pName, kills: 0 };
                }
                jugadoresMap[pName].kills += pKills;
            }
        });

        if (salaBooyahEquipo) {
            roomWinners.push({ sala: i + 1, team: salaBooyahEquipo, points: salaBooyahPts, kills: salaBooyahKills });
        } else {
            roomWinners.push({ sala: i + 1, team: "N/D", points: 0, kills: 0 });
        }
    });

    let equiposArray = Object.values(equiposMap);
    equiposArray.sort((a, b) => b.totalScore - a.totalScore);
    
    let topKillersArray = Object.values(jugadoresMap).sort((a, b) => b.kills - a.kills);
    
    globalEquipos = equiposArray;
    globalTopKillers = topKillersArray;
    globalNumSalas = numSalas;
    window._rWGlobal = roomWinners;

    renderizarResultados(equiposArray, topKillersArray, numSalas);
}

function renderizarResultados(eqs, tKs, nS) {
    let tC = document.getElementById('inputTituloTorneo') ? document.getElementById('inputTituloTorneo').value : "LIGA PUMAS GAMING",
        jC = document.getElementById('inputJornadaTorneo') ? document.getElementById('inputJornadaTorneo').value : "JORNADA 1",
        fC = document.getElementById('inputFechaTorneo') ? document.getElementById('inputFechaTorneo').value : "",
        cF = document.getElementById('selectColorFuente') ? document.getElementById('selectColorFuente').value : "#ffffff",
        sM = document.getElementById('selectModoCalculo'), mC = sM ? sM.value : '1',
        iM = document.getElementById('inputModerador'), nM = iM && iM.value.trim() !== "" ? iM.value.trim().toUpperCase() : "PUMAS ZEE",
        lU = logoPersonalizadoBase64 || "imagenes/LOGO PUMAS WEB.png", 
        fU = fondoPersonalizadoBase64 || "imagenes/FONDOS.png";
    
    let fV = `background-image: url('${fU}'); background-size: cover; background-position: center;`,
        fCo = "rgba(18, 19, 23, 0.95)";

    let eqO = [...eqs].map(eq => {
        let tV = eq.totalScore;
        if (mC === '2') tV = eq.rankScore;
        else if (mC === '3') tV = eq.killScore;
        return { ...eq, totalCalculado: tV };
    });
    
    if (mC === '1') eqO.sort((a, b) => b.totalScore - a.totalScore);
    else if (mC === '2') eqO.sort((a, b) => b.rankScore - a.rankScore);
    else if (mC === '3') eqO.sort((a, b) => b.killScore - a.killScore);

    let tKL = [...tKs].slice(0, 15), 
        tM = "TABLA GENERAL (ESTÁNDAR)";
    if (mC === '2') tM = "TABLA SOLO POSICIÓN (RANKSCORE)";
    if (mC === '3') tM = "TABLA SOLO KILLS";
    
    let rWData = window._rWGlobal || [];
    let totalEquiposParticipantes = eqs.length;
    let totalKillsGenerales = tKs.reduce((acc, curr) => acc + curr.kills, 0);

    let html = `
        <div style="display: flex; flex-direction: column; align-items: center; width: 100%;">
            <div id="tablaCaptura" style="width: 800px; height: 1000px; ${fV} position: relative; font-family: 'Rajdhani', sans-serif; color: ${cF}; padding: 15px; box-sizing: border-box; border: 2px solid rgba(220,204,156,0.3); border-radius: 12px; overflow: hidden;">
                
                <div style="position: absolute; top: 15px; right: 25px;">
                    <img src="${lU}" style="width: 55px; height: 55px; object-fit: contain; border-radius: 50%; border: 2px solid #DCCC9C; background: rgba(18,19,23,0.8);">
                </div>

                <div style="text-align: center; position: absolute; top: 15px; left: 40px; right: 40px;">
                    <h1 style="font-family: 'Orbitron'; font-size: 1.4rem; color: #DCCC9C; margin: 0; text-transform: uppercase; text-shadow: 2px 2px 4px rgba(0,0,0,0.8);">${tC}</h1>
                    <div style="font-family: 'Orbitron'; font-size: 0.8rem; color: ${cF}; margin-top: 2px; font-weight: bold; letter-spacing: 1px;">${jC} ${fC ? '— ' + fC : ''} | MODERADOR: ${nM}</div>
                </div>
                
                <div style="position: absolute; top: 75px; left: 25px; width: 750px; background: ${fCo}; padding: 6px 10px; border-radius: 8px; border: 1px solid rgba(220,204,156,0.3);">
                    <div style="color: #DCCC9C; font-family: 'Orbitron'; font-size: 0.78rem; margin-bottom: 2px; font-weight: bold;">${tM}</div>
                    <table style="width: 100%; border-collapse: collapse; font-size: 0.68rem; color: ${cF};">
                        <thead>
                            <tr style="color: #DCCC9C; font-family: 'Orbitron'; border-bottom: 2px solid rgba(220,204,156,0.3); font-size: 0.7rem;">
                                <th style="text-align:left; padding: 2px;">#</th>
                                <th style="text-align:left; padding: 2px;">EQUIPO</th>
                                ${Array.from({length: Math.min(nS, 5)}).map((_, i) => `<th style="padding: 2px; text-align:center;">S${i+1}</th>`).join('')}
                                <th style="padding: 2px; text-align:center;">KILL</th>
                                <th style="padding: 2px; text-align:center;">TOTAL</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${eqO.slice(0, 15).map((eq, i) => {
                                let cFila = cF;
                                if (i === 0) cFila = '#DCCC9C';
                                else if (i === 1) cFila = '#959595';
                                return `
                                <tr style="border-bottom: 1px solid rgba(255,255,255,0.04);">
                                    <td style="padding: 2px 3px; font-weight: bold; color:${cFila};">#${i+1}</td>
                                    <td style="padding: 2px 3px; font-weight: bold; max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;"><span style="color:${cF};">${eq.name}</span></td>
                                    ${Array.from({length: Math.min(nS, 5)}).map((_, s) => {
                                        let pS = eq.salasPuntos[s];
                                        if (pS === undefined) return `<td style="text-align:center; padding: 2px 3px; color:var(--gray);">-</td>`;
                                        return `<td style="text-align:center; padding: 2px 3px; color:${cF};">${pS}</td>`;
                                    }).join('')}
                                    <td style="text-align:center; padding: 2px 3px; color:#DCCC9C; font-weight:bold;">${eq.killScore}</td>
                                    <td style="text-align:center; padding: 2px 3px; color:${cFila}; font-weight:bold;">${eq.totalCalculado}</td>
                                </tr>`;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
                
                <div style="position: absolute; top: 430px; left: 25px; width: 750px; background: ${fCo}; padding: 6px 10px; border-radius: 8px; border: 1px solid rgba(220,204,156,0.3);">
                    <div style="font-family: 'Orbitron'; color: #DCCC9C; margin-bottom: 3px; font-size: 0.78rem; font-weight: bold;">RESUMEN DE EQUIPOS DESTACADOS (TOP 6)</div>
                    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 5px;">
                        ${eqO.slice(0, 6).map((eq, i) => {
                            let cP = cF;
                            if (i === 0) cP = '#DCCC9C';
                            let sumK = eq.killScore || 0;
                            return `
                            <div style="font-size: 0.68rem; background: rgba(18,19,23,0.85); padding: 4px 6px; border-radius: 5px; border: 1px solid rgba(220,204,156,0.2);">
                                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1px;">
                                    <span style="color:${cP}; font-weight:bold; max-width: 110px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">#${i+1} ${eq.name}</span>
                                    <span style="color:#DCCC9C; font-weight:bold;">👑 ${eq.booyahsCount || 0}</span>
                                </div>
                                <div style="display:flex; justify-content:space-between; color:var(--gray); font-size:0.62rem;">
                                    <span>Pts: <strong style="color:${cF};">${eq.totalCalculado}</strong></span>
                                    <span>Kills: <strong style="color:#DCCC9C;">${sumK}</strong></span>
                                </div>
                            </div>`;
                        }).join('')}
                    </div>
                </div>

                <div style="position: absolute; top: 565px; left: 25px; width: 750px; background: ${fCo}; padding: 6px 10px; border-radius: 8px; border: 1px solid rgba(220,204,156,0.3);">
                    <div style="font-family: 'Orbitron'; color: #DCCC9C; margin-bottom: 3px; font-size: 0.78rem; font-weight: bold;">BOOYAH POR SALA (VICTORIAS)</div>
                    <div style="display: grid; grid-template-columns: repeat(${Math.min(Math.max(rWData.length, 1), 5)}, 1fr); gap: 5px;">
                        ${rWData.length ? rWData.map(rw => `
                            <div style="font-size: 0.65rem; background: rgba(18,19,23,0.85); padding: 4px 5px; border-radius: 5px; border: 1px solid rgba(220,204,156,0.2); text-align: center;">
                                <div style="color: #DCCC9C; font-family: 'Orbitron'; font-weight: bold; margin-bottom: 1px;">SALA ${rw.sala} 👑</div>
                                <div style="color: ${cF}; font-weight: bold; max-width: 110px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin: 0 auto;" title="${rw.team}">${rw.team}</div>
                                <div style="color: var(--gray); font-size: 0.6rem; margin-top: 1px;">Pts: <strong style="color: #DCCC9C;">${rw.points}</strong> | K: <strong style="color: #DCCC9C;">${rw.kills}</strong></div>
                            </div>
                        `).join('') : `<div style="color: var(--gray); font-size: 0.72rem; text-align: center; padding: 4px;">No hay datos de Booyah registrados.</div>`}
                    </div>
                </div>

                <div style="position: absolute; top: 675px; left: 25px; width: 750px; background: ${fCo}; padding: 6px 10px; border-radius: 8px; border: 1px solid rgba(220,204,156,0.3);">
                    <div style="font-family: 'Orbitron'; color: #DCCC9C; margin-bottom: 3px; font-size: 0.78rem; font-weight: bold;">TOP 15 KILLERS MÁS LETALES</div>
                    <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 4px;">
                        ${tKL.map((tk, i) => {
                            let cP = cF;
                            if (i === 0) cP = '#DCCC9C';
                            return `
                            <div style="font-size: 0.65rem; background: rgba(18,19,23,0.85); padding: 3px 5px; border-radius: 4px; border: 1px solid rgba(220,204,156,0.2); display: flex; justify-content: space-between; align-items: center;">
                                <div style="overflow: hidden;">
                                    <span style="color: ${cP}; font-weight: bold; margin-right: 2px;">#${i+1}</span>
                                    <span style="color: ${cF}; font-weight: bold; max-width: 75px; display: inline-block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; vertical-align: middle;">${tk.name}</span>
                                </div>
                                <span style="color: #DCCC9C; font-weight: bold; font-size: 0.7rem;">${tk.kills}</span>
                            </div>`;
                        }).join('')}
                    </div>
                </div>

                <div style="position: absolute; top: 795px; left: 25px; width: 750px; background: ${fCo}; padding: 6px 10px; border-radius: 8px; border: 1px solid rgba(220,204,156,0.3);">
                    <div style="font-family: 'Orbitron'; color: #DCCC9C; margin-bottom: 3px; font-size: 0.78rem; font-weight: bold;">RESUMEN GENERAL DE LA PARTIDA</div>
                    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; text-align: center; font-size: 0.72rem;">
                        <div style="background: rgba(18,19,23,0.85); padding: 5px; border-radius: 5px; border: 1px solid rgba(220,204,156,0.2);">
                            <div style="color: var(--gray); font-size: 0.62rem;">SALAS JUGADAS</div>
                            <div style="color: #DCCC9C; font-family: 'Orbitron'; font-weight: bold; font-size: 0.9rem;">${nS}</div>
                        </div>
                        <div style="background: rgba(18,19,23,0.85); padding: 5px; border-radius: 5px; border: 1px solid rgba(220,204,156,0.2);">
                            <div style="color: var(--gray); font-size: 0.62rem;">EQUIPOS QUE JUGARON</div>
                            <div style="color: #DCCC9C; font-family: 'Orbitron'; font-weight: bold; font-size: 0.9rem;">${totalEquiposParticipantes}</div>
                        </div>
                        <div style="background: rgba(18,19,23,0.85); padding: 5px; border-radius: 5px; border: 1px solid rgba(220,204,156,0.2);">
                            <div style="color: var(--gray); font-size: 0.62rem;">KILL GENERALES</div>
                            <div style="color: #DCCC9C; font-family: 'Orbitron'; font-weight: bold; font-size: 0.9rem;">${totalKillsGenerales}</div>
                        </div>
                    </div>
                </div>

            </div>
            
            <div style="margin-top: 25px; margin-bottom: 25px; width: 100%; display: flex; justify-content: center;">
                <button onclick="descargar()" class="btn-generar" style="max-width: 350px; padding: 12px 25px; font-size: 1rem;">DESCARGAR IMAGEN 4:5</button>
            </div>
        </div>
    `;
    
    document.getElementById('outputTablasLadoALado').innerHTML = html;
}

async function guardarEntrenamientoEnSupabase() {
    const SUPABASE_URL = "https://bqemjroiegybdzksddkn.supabase.co";
    const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJxZW1qcm9pZWd5YmR6a3NkZGtuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc1NzgwNDIsImV4cCI6MjEwMzE1NDA0Mn0.49gC204FPWSNxWYa6eZFBgWJgr7ZvFax5mqOM9lyGPo";
    
    let supabaseClient = null;
    if (typeof supabase !== 'undefined' && supabase.createClient) {
        supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }

    if (!supabaseClient) {
        alert("Error crítico: El cliente de Supabase no está disponible.");
        return;
    }

    try {
        let titulo = document.getElementById('inputTituloTorneo') ? document.getElementById('inputTituloTorneo').value : "ENTRENAMIENTO";
        let jornada = document.getElementById('inputJornadaTorneo') ? document.getElementById('inputJornadaTorneo').value : "JORNADA 1";
        let fechaInput = document.getElementById('inputFechaHoraEntreno') ? document.getElementById('inputFechaHoraEntreno').value : "";
        let fecha = fechaInput ? new Date(fechaInput) : new Date();
        let moderador = document.getElementById('inputModerador') ? document.getElementById('inputModerador').value : "";

        const fileInput = document.getElementById('fileInput');
        let files = Array.from(fileInput.files);

        let folderName = `entreno_${fecha.toISOString().slice(0,10)}_${titulo.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}_${Date.now()}`;

        if (files.length > 0 && processedFilesTexts.length === files.length) {
            for (let i = 0; i < files.length; i++) {
                let nombreLimpio = files[i].name.replace(/[^a-zA-Z0-9_.-]/g, '_');
                let filePath = `${folderName}/${nombreLimpio}`;
                let blobModificado = new Blob([processedFilesTexts[i]], { type: 'text/plain' });
                await supabaseClient.storage.from('entrenamientos_logs').upload(filePath, blobModificado);
            }
        } else if (files.length > 0) {
            for (let file of files) {
                let nombreLimpio = file.name.replace(/[^a-zA-Z0-9_.-]/g, '_');
                let filePath = `${folderName}/${nombreLimpio}`;
                await supabaseClient.storage.from('entrenamientos_logs').upload(filePath, file);
            }
        }

        const { data: sesionData, error: sesionError } = await supabaseClient
            .from('entrenamientos_sesiones')
            .insert([{ titulo, jornada, fecha, moderador, archivo_url: folderName }])
            .select()
            .single();

        if (sesionError) throw sesionError;
        const sesionId = sesionData.id;

        let salasRows = [];
        globalEquipos.forEach(eq => {
            Object.keys(eq.salasPuntos).forEach(indexSala => {
                let numSala = parseInt(indexSala) + 1;
                let puntosSala = eq.salasPuntos[indexSala];
                let killsSala = eq.salasKills ? (eq.salasKills[indexSala] || 0) : 0;
                let rankSala = eq.salasRank ? (eq.salasRank[indexSala] || 0) : 0;

                salasRows.push({
                    sesion_id: sesionId,
                    numero_sala: numSala,
                    equipo_nombre: eq.name,
                    rank: rankSala,
                    kill_score: killsSala,
                    rank_score: rankSala,
                    total_score: puntosSala,
                    es_booyah: (rankSala === 1)
                });
            });
        });

        if (salasRows.length > 0) {
            const { error: salasError } = await supabaseClient.from('salas_resultados').insert(salasRows);
            if (salasError) throw salasError;
        }

        let killersRows = globalTopKillers.map(tk => ({
            sesion_id: sesionId,
            jugador_nombre: tk.name,
            equipo_nombre: 'Pumas Squad',
            kills: tk.kills
        }));

        if (killersRows.length > 0) {
            const { error: killersError } = await supabaseClient.from('top_killers').insert(killersRows);
            if (killersError) throw killersError;
        }

        alert("¡Resultados procesados y guardados exitosamente en la base de datos!");

    } catch (error) {
        console.error("Error al registrar en Supabase:", error);
        alert("Error al sincronizar con la base de datos: " + (error.message || error));
    }
}

async function limpiarBaseDeDatosCompletamente() {
    if (!confirm("⚠️ ADVERTENCIA: ¿Estás seguro de vaciar absolutamente toda la base de datos de entrenamientos?")) {
        return;
    }

    const SUPABASE_URL = "https://bqemjroiegybdzksddkn.supabase.co";
    const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJxZW1qcm9pZWd5YmR6a3NkZGtuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc1NzgwNDIsImV4cCI6MjEwMzE1NDA0Mn0.49gC204FPWSNxWYa6eZFBgWJgr7ZvFax5mqOM9lyGPo";
    let supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    try {
        await supabaseClient.from('top_killers').delete().neq('id', 0);
        await supabaseClient.from('salas_resultados').delete().neq('id', 0);
        await supabaseClient.from('entrenamientos_sesiones').delete().neq('id', 0);

        alert("¡Base de datos limpiada correctamente!");
        window.location.reload();
    } catch (error) {
        alert("Error al limpiar la base de datos.");
    }
}

async function cargarEquiposRegistradosAdmin() {
    const tbody = document.getElementById('tablaEquiposRegistradosAdmin');
    if (!tbody) return;

    try {
        const SUPABASE_URL = "https://bqemjroiegybdzksddkn.supabase.co";
        const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJxZW1qcm9pZWd5YmR6a3NkZGtuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc1NzgwNDIsImV4cCI6MjEwMzE1NDA0Mn0.49gC204FPWSNxWYa6eZFBgWJgr7ZvFax5mqOM9lyGPo";
        let supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

        const { data, error } = await supabaseClient
            .from('equipos_registrados')
            .select('*')
            .order('nombre', { ascending: true });

        if (error || !data || data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="3" style="text-align: center; color: var(--gray); padding: 15px;">No hay equipos registrados.</td></tr>`;
            return;
        }

        tbody.innerHTML = '';
        data.forEach(eq => {
            tbody.innerHTML += `
                <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
                    <td style="padding: 8px; font-weight: bold; color: #fff;">${eq.nombre}</td>
                    <td style="text-align: center; padding: 8px; color: var(--primary); font-family: 'Orbitron'; font-weight: bold;">[${eq.tag}]</td>
                    <td style="text-align: center; padding: 8px;">
                        <button onclick="eliminarEquipoRegistrado(${eq.id}, '${eq.nombre}')" style="background: #ff3333; color: #fff; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer;" title="Eliminar equipo">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        });
    } catch (err) {
        console.error("Error cargando equipos registrados:", err);
    }
}

async function agregarEquipoOficial() {
    let nombreInput = document.getElementById('inputNuevoEquipoNombre');
    let tagInput = document.getElementById('inputNuevoEquipoTag');

    let nombre = nombreInput.value.trim().toUpperCase();
    let tag = tagInput.value.trim().toUpperCase();

    if (!nombre || !tag) {
        alert("Por favor, ingresa tanto el nombre como el tag del equipo.");
        return;
    }

    try {
        const SUPABASE_URL = "https://bqemjroiegybdzksddkn.supabase.co";
        const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJxZW1qcm9pZWd5YmR6a3NkZGtuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc1NzgwNDIsImV4cCI6MjEwMzE1NDA0Mn0.49gC204FPWSNxWYa6eZFBgWJgr7ZvFax5mqOM9lyGPo";
        let supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

        const { error } = await supabaseClient
            .from('equipos_registrados')
            .insert([{ nombre, tag }]);

        if (error) throw error;

        alert(`¡Equipo "${nombre}" registrado exitosamente!`);
        nombreInput.value = '';
        tagInput.value = '';
        cargarEquiposRegistradosAdmin();

    } catch (err) {
        console.error("Error al registrar equipo:", err);
        alert("No se pudo registrar el equipo. Es posible que ya exista.");
    }
}

async function eliminarEquipoRegistrado(id, nombre) {
    if (!confirm(`¿Estás seguro de eliminar a "${nombre}" de los equipos registrados?`)) return;

    try {
        const SUPABASE_URL = "https://bqemjroiegybdzksddkn.supabase.co";
        const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJxZW1qcm9pZWd5YmR6a3NkZGtuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc1NzgwNDIsImV4cCI6MjEwMzE1NDA0Mn0.49gC204FPWSNxWYa6eZFBgWJgr7ZvFax5mqOM9lyGPo";
        let supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

        const { error } = await supabaseClient
            .from('equipos_registrados')
            .delete()
            .eq('id', id);

        if (error) throw error;

        alert("Equipo eliminado correctamente.");
        cargarEquiposRegistradosAdmin();

    } catch (err) {
        console.error("Error al eliminar equipo:", err);
        alert("Ocurrió un error al intentar eliminar el equipo.");
    }
}

async function cargarResultadosEquiposOficiales() {
    const tbody = document.getElementById('tablaFiltroEquiposOficiales');
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--primary); padding: 20px;">Cargando todos los equipos oficiales...</td></tr>`;

    try {
        const SUPABASE_URL = "https://bqemjroiegybdzksddkn.supabase.co";
        const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJxZW1qcm9pZWd5YmR6a3NkZGtuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc1NzgwNDIsImV4cCI6MjEwMzE1NDA0Mn0.49gC204FPWSNxWYa6eZFBgWJgr7ZvFax5mqOM9lyGPo";
        let supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

        const { data: dbOficiales, error: errOficiales } = await supabaseClient.from('equipos_registrados').select('*');
        if (errOficiales || !dbOficiales) throw errOficiales;

        let acumuladoOficial = {};
        dbOficiales.forEach(eq => {
            let nombreKey = eq.nombre.trim().toUpperCase();
            acumuladoOficial[nombreKey] = {
                nombre: eq.nombre.trim(),
                tag: eq.tag,
                totalScore: 0,
                booyahs: 0,
                participaciones: 0
            };
        });

        const { data: dbSalas, error: errSalas } = await supabaseClient.from('salas_resultados').select('*');
        if (errSalas || !dbSalas) throw errSalas;

        dbSalas.forEach(fila => {
            let nombreLimpio = fila.equipo_nombre.trim().toUpperCase();
            if (acumuladoOficial[nombreLimpio]) {
                acumuladoOficial[nombreLimpio].totalScore += (fila.total_score || 0);
                acumuladoOficial[nombreLimpio].participaciones += 1;
                if (fila.es_booyah || fila.rank === 1) {
                    acumuladoOficial[nombreLimpio].booyahs += 1;
                }
            }
        });

        let listaFiltrada = Object.values(acumuladoOficial).sort((a, b) => b.totalScore - a.totalScore);

        tbody.innerHTML = '';
        listaFiltrada.forEach((eq, idx) => {
            let colorPos = idx === 0 && eq.totalScore > 0 ? '#DCCC9C' : (idx === 1 && eq.totalScore > 0 ? '#959595' : (idx === 2 && eq.totalScore > 0 ? '#cd7f32' : '#fff'));
            let estiloFila = eq.participaciones === 0 ? 'opacity: 0.5;' : '';

            tbody.innerHTML += `
                <tr style="border-bottom: 1px solid rgba(255,255,255,0.05); ${estiloFila}">
                    <td style="padding: 10px; font-weight: bold; color: ${colorPos};">#${idx+1}</td>
                    <td style="padding: 10px; font-weight: bold; color: #fff;">${eq.nombre} ${eq.participaciones === 0 ? '<span style="font-size:0.75rem; color:#ff5555; margin-left:8px;">(No ha participado)</span>' : ''}</td>
                    <td style="text-align: center; padding: 10px; color: var(--primary); font-family: 'Orbitron'; font-weight: bold;">[${eq.tag}]</td>
                    <td style="text-align: center; padding: 10px; color: #DCCC9C; font-weight: bold;">${eq.booyahs}</td>
                    <td style="text-align: center; padding: 10px; color: ${colorPos}; font-weight: bold; font-family: 'Orbitron';">${eq.totalScore}</td>
                </tr>
            `;
        });

    } catch (err) {
        console.error("Error al cargar resultados de equipos oficiales:", err);
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: #ff5555; padding: 20px;">Error al conectar con la base de datos.</td></tr>`;
    }
}

window.addEventListener('DOMContentLoaded', () => {
    if (typeof cargarEquiposRegistradosAdmin === 'function') {
        cargarEquiposRegistradosAdmin();
    }
});

function descargar() {
    html2canvas(document.getElementById('tablaCaptura'), { scale: 2, useCORS: true }).then(canvas => {
        let link = document.createElement('a');
        link.download = 'Tabla_Resultados.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
    });
}