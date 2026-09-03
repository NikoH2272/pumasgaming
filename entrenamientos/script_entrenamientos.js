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
            <div style="display: flex; flex-direction: column; sm-direction: row; gap: 8px; align-items: stretch; background: rgba(255,255,255,0.03); padding: 12px; border-radius: 6px; margin-bottom: 10px;">
                <span style="color: var(--gray); font-size: 0.85rem; word-break: break-all;">Original: <strong>${eq}</strong></span>
                <input type="text" class="input-nombre-editable" data-original="${eq}" value="${eq}" style="width: 100%; padding: 10px; background: #0a0b10; border: 1px solid rgba(255,255,255,0.2); color: #fff; border-radius: 4px; font-size: 0.95rem;">
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
    let numSalas = textsArray.length;

    textsArray.forEach((text, i) => {
        let lines = text.split('\n');
        let currentTeam = null;

        lines.forEach(line => {
            const teamMatch = line.match(/TeamName:\s*(.+?)\s+Rank:\s*(\d+)\s+KillScore:\s*(\d+)\s+RankScore:\s*(\d+)\s+TotalScore:\s*(\d+)/i);
            if (teamMatch) {
                let rawTeam = teamMatch[1].trim();
                let name = renombresMap[rawTeam] || rawTeam;
                currentTeam = name;
                if (!equiposMap[name]) {
                    equiposMap[name] = { name, totalScore: 0, killScore: 0, salasPuntos: {}, salasJugadas: 0, jugadores: new Set() };
                }
                let totalScore = parseInt(teamMatch[5]);
                let killScore = parseInt(teamMatch[3]);

                equiposMap[name].totalScore += totalScore;
                equiposMap[name].killScore += killScore;
                equiposMap[name].salasPuntos[i] = totalScore;
                equiposMap[name].salasJugadas += 1;
            }

            const playerMatch = line.match(/NAME:\s*(.+?)\s+ID:\s*\d+.*?KILL:\s*(\d+)/i);
            if (playerMatch) {
                let pName = playerMatch[1].trim();
                let pKills = parseInt(playerMatch[2]);
                
                if (!jugadoresMap[pName]) {
                    jugadoresMap[pName] = { name: pName, kills: 0 };
                }
                jugadoresMap[pName].kills += pKills;

                if (currentTeam && equiposMap[currentTeam]) {
                    equiposMap[currentTeam].jugadores.add(pName);
                }
            }
        });
    });

    let equiposArray = Object.values(equiposMap);

    equiposArray.forEach(eq => {
        let sumaSalasReales = 0;
        let salasJugadasCount = 0;
        for (let s = 0; s < numSalas; s++) {
            if (eq.salasPuntos[s] !== undefined) {
                sumaSalasReales += eq.salasPuntos[s];
                salasJugadasCount += 1;
            }
        }
        eq.totalScore = sumaSalasReales;
        eq.salasJugadas = salasJugadasCount;
    });

    equiposArray.sort((a, b) => b.totalScore - a.totalScore);
    let topKillersArray = Object.values(jugadoresMap).sort((a, b) => b.kills - a.kills).slice(0, 20);
    
    let equipoDestacado = null;
    if (equiposArray.length > 0) {
        let equiposPorKills = [...equiposArray].sort((a, b) => b.killScore - a.killScore);
        equipoDestacado = equiposPorKills[0];
    }

    globalEquipos = equiposArray;
    globalTopKillers = topKillersArray;
    globalNumSalas = numSalas;

    renderizarResultados(equiposArray, topKillersArray, equipoDestacado, numSalas);
}

let globalEquipos = [];
let globalTopKillers = [];
let globalNumSalas = 0;

function renderizarResultados(equipos, topKillers, roomWinners, numSalas) {
    let tituloCustom = document.getElementById('inputTituloTorneo') ? document.getElementById('inputTituloTorneo').value : "LIGA PUMAS GAMING";
    let jornadaCustom = document.getElementById('inputJornadaTorneo') ? document.getElementById('inputJornadaTorneo').value : "JORNADA 1";
    let fechaCustom = document.getElementById('inputFechaTorneo') ? document.getElementById('inputFechaTorneo').value : "";
    let colorFuente = document.getElementById('selectColorFuente') ? document.getElementById('selectColorFuente').value : "#ffffff";
    
    let logoUrl = logoPersonalizadoBase64 ? logoPersonalizadoBase64 : "imagenes/LOGO PUMAS WEB.png";
    let fondoUrl = fondoPersonalizadoBase64 ? fondoPersonalizadoBase64 : "fondo.png";

    let fondoContenedor = "rgba(20, 20, 20, 0.95)"; 

    let html = `
        <div id="tablaCaptura" style="width: 800px; height: 1000px; background: #141414; background-image: url('${fondoUrl}'); background-size: cover; background-position: center; position: relative; font-family: 'Rajdhani', sans-serif; color: ${colorFuente}; padding: 20px; box-sizing: border-box;">
            
            <!-- LOGO EN ESQUINA SUPERIOR DERECHA -->
            <div style="position: absolute; top: 25px; right: 35px;">
                <img src="${logoUrl}" alt="Logo" style="width: 75px; height: 75px; object-fit: contain; border-radius: 50%; border: 2px solid #DCCC9C; background: rgba(20,20,20,0.8);">
            </div>

            <!-- TÍTULO Y CABECERA -->
            <div style="text-align: center; position: absolute; top: 25px; left: 50px; right: 50px;">
                <h1 style="font-family: 'Orbitron'; font-size: 2.1rem; color: #DCCC9C; margin: 0; text-transform: uppercase; text-shadow: 2px 2px 4px rgba(0,0,0,0.8);">${tituloCustom}</h1>
                <div style="font-family: 'Orbitron'; font-size: 0.95rem; color: ${colorFuente}; margin-top: 5px; font-weight: bold; letter-spacing: 1px;">
                    ${jornadaCustom} ${fechaCustom ? '— ' + fechaCustom : ''}
                </div>
            </div>

            <!-- TABLA GENERAL (CON SALAS JUGADAS) -->
            <div style="position: absolute; top: 120px; left: 40px; width: 720px; background: ${fondoContenedor}; padding: 10px; border-radius: 8px; border: 1px solid rgba(220,204,156,0.3); max-height: 440px; overflow: hidden;">
                <div style="color: #DCCC9C; font-family: 'Orbitron'; font-size: 1rem; margin-bottom: 4px; font-weight: bold;">TABLA GENERAL</div>
                <table style="width: 100%; border-collapse: collapse; font-size: 0.82rem; color: ${colorFuente};">
                    <thead>
                        <tr style="color: #DCCC9C; font-family: 'Orbitron'; border-bottom: 2px solid rgba(220,204,156,0.3); font-size: 0.85rem;">
                            <th style="text-align:left; padding: 4px;">#</th>
                            <th style="text-align:left; padding: 4px;">EQUIPO</th>
                            ${Array.from({length: Math.min(numSalas, 6)}).map((_,i) => `<th style="padding: 4px; text-align:center;">S${i+1}</th>`).join('')}
                            <th style="padding: 4px; text-align:center;">SALAS</th>
                            <th style="padding: 4px; text-align:center;">KILL</th>
                            <th style="padding: 4px; text-align:center;">TOTAL</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${equipos.map((eq, i) => {
                            let colorFila = colorFuente;
                            if (i === 0) colorFila = '#DCCC9C';
                            else if (i === 1) colorFila = '#959595';
                            return `
                            <tr style="border-bottom: 1px solid rgba(255,255,255,0.08);">
                                <td style="padding: 3.5px; font-weight: bold; color:${colorFila};">#${i+1}</td>
                                <td style="padding: 3.5px; font-weight: bold; max-width: 160px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                                    <span style="color:${colorFuente};">${eq.name}</span>
                                </td>
                                ${Array.from({length: Math.min(numSalas, 6)}).map((_,s) => `<td style="text-align:center; padding: 3.5px; color:${colorFuente};">${eq.salasPuntos[s] !== undefined ? eq.salasPuntos[s] : '💀'}</td>`).join('')}
                                <td style="text-align:center; padding: 3.5px; color:#DCCC9C; font-weight:bold;">${eq.salasJugadas}</td>
                                <td style="text-align:center; padding: 3.5px; color:#DCCC9C; font-weight:bold;">${eq.killScore}</td>
                                <td style="text-align:center; padding: 3.5px; color:${colorFila}; font-weight:bold;">${eq.totalScore}</td>
                            </tr>`;
                        }).join('')}
                    </tbody>
                </table>
            </div>

            <!-- TOP KILLERS (LOS 20 MÁS LETALES EN 3 COLUMNAS) -->
            <div style="position: absolute; top: 575px; left: 40px; width: 720px; background: ${fondoContenedor}; padding: 10px; border-radius: 8px; border: 1px solid rgba(220,204,156,0.3); max-height: 250px; overflow-y: auto;">
                <div style="font-family: 'Orbitron'; color: #DCCC9C; margin-bottom: 6px; font-size: 1rem; font-weight: bold;">TOP 20 KILLERS MÁS LETALES</div>
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 5px;">
                    ${topKillers.slice(0, 20).map((tk, i) => {
                        let colorPos = colorFuente;
                        if (i === 0) colorPos = '#DCCC9C';
                        return `
                        <div style="font-size: 0.75rem; background: rgba(20,20,20,0.8); padding: 4px 6px; border-radius: 4px; border: 1px solid rgba(220,204,156,0.2); display: flex; justify-content: space-between; align-items: center;">
                            <div>
                                <span style="color: ${colorPos}; font-weight: bold; margin-right: 3px;">#${i+1}</span> 
                                <span style="color: ${colorFuente}; font-weight: bold; max-width: 80px; display: inline-block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; vertical-align: middle;">${tk.name}</span>
                            </div>
                            <span style="color: #DCCC9C; font-weight: bold; font-size: 0.8rem;">${tk.kills}</span>
                        </div>`;
                    }).join('')}
                </div>
            </div>

            <!-- BOOYAH -->
            <div style="position: absolute; bottom: 15px; left: 40px; width: 720px; display: flex; justify-content: space-around; gap: 6px; flex-wrap: wrap;">
                ${roomWinners && roomWinners.sala ? `
                    <div style="background: rgba(20,20,20,0.9); border: 1px solid #DCCC9C; padding: 4px 8px; border-radius: 6px; text-align: center; font-size: 0.7rem;">
                        <div style="color: #DCCC9C; font-weight: bold; font-family: 'Orbitron'; font-size: 0.6rem;">MVP KILLER</div>
                        <div style="color: ${colorFuente}; font-weight: bold; margin: 2px 0;">${roomWinners.name}</div>
                    </div>
                ` : ''}
            </div>

        </div>
        <button onclick="descargar()" class="btn-generar" style="margin-top: 20px;">DESCARGAR IMAGEN 4:5</button>
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