let rawFilesData = [];
let logoPersonalizadoBase64 = null;
let fondoPersonalizadoBase64 = null;

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
                <button onclick="this.parentElement.remove()" style="background:#ff3333; color:#fff; border:none; padding:6px 10px; border-radius:4px; cursor:pointer;" title="Eliminar equipo de esta sesión"><i class="fa-solid fa-trash"></i></button>
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
                let rawTeam = teamMatch[1].trim();
                let name = renombresMap[rawTeam] || rawTeam;
                if (!equiposMap[name]) {
                    equiposMap[name] = { name, totalScore: 0, killScore: 0, rankScore: 0, salasPuntos: {}, salasJugadas: 0, booyahsCount: 0 };
                }
                let totalScore = parseInt(teamMatch[5]);
                let killScore = parseInt(teamMatch[3]);
                let rankScore = parseInt(teamMatch[4]);
                let rank = parseInt(teamMatch[2]);

                equiposMap[name].totalScore += totalScore;
                equiposMap[name].killScore += killScore;
                equiposMap[name].rankScore += rankScore;
                equiposMap[name].salasPuntos[i] = totalScore;
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

let globalEquipos = [];
let globalTopKillers = [];
let globalNumSalas = 0;

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
                
                <!-- TABLA GENERAL HASTA 15 EQUIPOS -->
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
                
                <!-- RESUMEN TOP 6 EQUIPOS DESTACADOS -->
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

                <!-- BOOYAH POR SALA -->
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

                <!-- TOP 15 KILLERS MÁS LETALES EN 5 COLUMNAS -->
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

                <!-- RESUMEN FINAL DE LA PARTIDA (SALAS, EQUIPOS Y KILLS GENERALES) -->
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

        if (files.length > 0) {
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

                salasRows.push({
                    sesion_id: sesionId,
                    numero_sala: numSala,
                    equipo_nombre: eq.name,
                    rank: 0,
                    kill_score: eq.killScore || 0,
                    rank_score: 0,
                    total_score: puntosSala,
                    es_booyah: false
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

function descargar() {
    html2canvas(document.getElementById('tablaCaptura'), { scale: 2, useCORS: true }).then(canvas => {
        let link = document.createElement('a');
        link.download = 'Tabla_Resultados.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
    });
}