let rawFilesData = [];
let processedFilesTexts = [];
let logoPersonalizadoBase64 = null;
let fondoPersonalizadoBase64 = null;
let globalEquipos = [];
let globalTopKillers = [];
let globalNumSalas = 0;

function toggleMenu() {
    const nav = document.getElementById('mainNav');
    if (nav) nav.classList.toggle('is-active');
}

function cambiarPestanaPublica(pestana) {
    const vistaGeneral = document.getElementById('vistaGeneral');
    const vistaVip = document.getElementById('vistaVip');
    const navGlobal = document.getElementById('navGlobal');
    const navVip = document.getElementById('navVip');

    if (pestana === 'global') {
        if (vistaGeneral) vistaGeneral.style.display = 'grid';
        if (vistaVip) vistaVip.style.display = 'none';
        if (navGlobal) navGlobal.style.color = 'var(--primary)';
        if (navVip) navVip.style.color = 'var(--secondary)';
    } else {
        if (vistaGeneral) vistaGeneral.style.display = 'none';
        if (vistaVip) vistaVip.style.display = 'block';
        if (navVip) navVip.style.color = 'var(--primary)';
        if (navGlobal) navGlobal.style.color = 'var(--secondary)';
        cargarResultadosVipPublicos();
    }
}

const SUPABASE_URL = "https://bqemjroiegybdzksddkn.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJxZW1qcm9pZWd5YmR6a3NkZGtuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc1NzgwNDIsImV4cCI6MjEwMzE1NDA0Mn0.49gC204FPWSNxWYa6eZFBgWJgr7ZvFax5mqOM9lyGPo";
const supabaseClient = (typeof supabase !== 'undefined' && supabase.createClient) ? supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

async function cargarSesiones() {
    if (!supabaseClient) return;

    const { data, error } = await supabaseClient
        .from('entrenamientos_sesiones')
        .select('*')
        .order('fecha', { ascending: false });

    const tbody = document.getElementById('bodySesiones');
    if (!tbody) return;

    if (error || !data || data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="3" style="text-align:center; color: #ff3333;">Sin registros disponibles.</td></tr>`;
        let bgGlobal = document.getElementById('bodyTablaGlobal');
        let gridKillers = document.getElementById('gridTopKillersGlobal');
        if (bgGlobal) bgGlobal.innerHTML = `<tr><td colspan="5" style="text-align:center; color: var(--gray);">Sin datos globales.</td></tr>`;
        if (gridKillers) gridKillers.innerHTML = `<div style="color: var(--gray); text-align:center; padding: 20px;">Sin datos globales.</div>`;
        return;
    }

    let statEntrenamientos = document.getElementById('statTotalEntrenamientos');
    if (statEntrenamientos) statEntrenamientos.textContent = data.length;

    tbody.innerHTML = '';
    data.forEach(sesion => {
        let fechaFormateada = new Date(sesion.fecha).toLocaleDateString();
        let folderPath = sesion.archivo_url || '';

        tbody.innerHTML += `
            <tr>
                <td style="color: var(--secondary);">${fechaFormateada}</td>
                <td style="font-weight: bold; color: var(--light);">${sesion.titulo}</td>
                <td style="text-align: center;">
                    <button class="btn-ver" onclick="procesarSesionUnica('${folderPath}', '${sesion.titulo}', '${sesion.jornada}')">
                        <i class="fa-solid fa-table"></i> Ver
                    </button>
                </td>
            </tr>
        `;
    });

    await calcularTablaGlobalAcumulada(data);
}

async function calcularTablaGlobalAcumulada(sesiones) {
    let globalTeamsMap = {};
    let globalPlayersMap = {};
    let totalMapasJugados = 0;
    let totalKillsGenerales = 0;

    for (let sesion of sesiones) {
        if (!sesion.archivo_url) continue;

        try {
            const { data: fileList } = await supabaseClient.storage
                .from('entrenamientos_logs')
                .list(sesion.archivo_url);

            if (!fileList) continue;

            totalMapasJugados += fileList.length;

            for (let file of fileList) {
                const { data: fileData } = await supabaseClient.storage
                    .from('entrenamientos_logs')
                    .download(`${sesion.archivo_url}/${file.name}`);

                if (fileData) {
                    let text = await fileData.text();
                    let lines = text.split('\n');
                    
                    lines.forEach(line => {
                        const teamMatch = line.match(/TeamName:\s*(.+?)\s+Rank:\s*(\d+)\s+KillScore:\s*(\d+)\s+RankScore:\s*(\d+)\s+TotalScore:\s*(\d+)/i);
                        if (teamMatch) {
                            let name = teamMatch[1].trim();
                            let rank = parseInt(teamMatch[2]);
                            let totalScore = parseInt(teamMatch[5]);

                            if (!globalTeamsMap[name]) {
                                globalTeamsMap[name] = { 
                                    name: name, 
                                    totalScore: 0, 
                                    booyahs: 0, 
                                    sesionesSet: new Set() 
                                };
                            }
                            
                            globalTeamsMap[name].totalScore += totalScore;
                            globalTeamsMap[name].sesionesSet.add(sesion.id);
                            
                            // Corrección estricta para asegurar el conteo de victorias (Booyah)
                            if (rank === 1) {
                                globalTeamsMap[name].booyahs += 1;
                            }
                        }

                        const pMatch = line.match(/NAME:\s*(.+?)\s+ID:\s*\d+.*?KILL:\s*(\d+)/i);
                        if (pMatch) {
                            let pName = pMatch[1].trim();
                            let killsCount = parseInt(pMatch[2]);
                            totalKillsGenerales += killsCount;
                            
                            if (!globalPlayersMap[pName]) {
                                globalPlayersMap[pName] = { name: pName, kills: 0 };
                            }
                            globalPlayersMap[pName].kills += killsCount;
                        }
                    });
                }
            }
        } catch (e) {
            console.error("Error leyendo carpeta global:", e);
        }
    }

    let statEquipos = document.getElementById('statTotalEquipos');
    let statKills = document.getElementById('statTotalKills');
    let statMapas = document.getElementById('statTotalMapas');

    if (statEquipos) statEquipos.textContent = Object.keys(globalTeamsMap).length;
    if (statKills) statKills.textContent = totalKillsGenerales;
    if (statMapas) statMapas.textContent = totalMapasJugados;

    let equiposGlobalesOrdenados = Object.values(globalTeamsMap).sort((a, b) => b.totalScore - a.totalScore).slice(0, 50);
    let bodyGlobal = document.getElementById('bodyTablaGlobal');
    
    if (bodyGlobal) {
        if (equiposGlobalesOrdenados.length === 0) {
            bodyGlobal.innerHTML = `<tr><td colspan="5" style="text-align:center; color: var(--gray);">Sin registros globales.</td></tr>`;
        } else {
            bodyGlobal.innerHTML = '';
            equiposGlobalesOrdenados.forEach((eq, idx) => {
                let colorPos = idx === 0 ? '#DCCC9C' : (idx === 1 ? '#959595' : (idx === 2 ? '#cd7f32' : 'var(--light)'));
                let sesionesCount = eq.sesionesSet ? eq.sesionesSet.size : 1;

                bodyGlobal.innerHTML += `
                    <tr>
                        <td style="font-weight:bold; color: ${colorPos};">#${idx+1}</td>
                        <td style="font-weight: bold; color: var(--light);">${eq.name}</td>
                        <td style="text-align:center; color: var(--secondary); font-weight:bold;">${sesionesCount}</td>
                        <td style="text-align:center; color: #DCCC9C; font-weight:bold;">${eq.booyahs}</td>
                        <td style="text-align:center; color: ${colorPos}; font-weight:bold; font-family:'Orbitron';">${eq.totalScore}</td>
                    </tr>
                `;
            });
        }
    }

    let killersGlobalesOrdenados = Object.values(globalPlayersMap).sort((a, b) => b.kills - a.kills).slice(0, 20);
    let gridKillersGlobalHtml = '';
    let gridKillersEl = document.getElementById('gridTopKillersGlobal');

    if (gridKillersEl) {
        if (killersGlobalesOrdenados.length === 0) {
            gridKillersGlobalHtml = `<div style="color: var(--gray); text-align:center; padding: 20px;">Sin datos de killers.</div>`;
        } else {
            killersGlobalesOrdenados.forEach((tk, i) => {
                let colorPos = i === 0 ? '#DCCC9C' : (i === 1 ? '#959595' : (i === 2 ? '#cd7f32' : 'var(--light)'));
                gridKillersGlobalHtml += `
                    <div class="killer-card">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <span style="color: ${colorPos}; font-weight: bold; font-family: 'Orbitron'; min-width: 25px;">#${i+1}</span>
                            <span style="color: var(--light); font-weight: bold; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 140px;">${tk.name}</span>
                        </div>
                        <span style="color: var(--primary); font-weight: bold; font-family: 'Orbitron'; font-size: 0.9rem;"><i class="fa-solid fa-crosshairs" style="margin-right: 4px;"></i> ${tk.kills}</span>
                    </div>
                `;
            });
        }
        gridKillersEl.innerHTML = gridKillersGlobalHtml;
    }
}

async function cargarResultadosVipPublicos() {
    const tbody = document.getElementById('bodyTablaVip');
    if (!tbody || !supabaseClient) return;

    tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--primary); padding: 20px;">Cargando todos los equipos VIP...</td></tr>`;

    try {
        const { data: dbOficiales, error: errOficiales } = await supabaseClient.from('equipos_registrados').select('*');
        if (errOficiales || !dbOficiales) throw errOficiales;

        let acumuladoVip = {};
        dbOficiales.forEach(eq => {
            let nombreKey = eq.nombre.trim().toUpperCase();
            acumuladoVip[nombreKey] = {
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
            if (acumuladoVip[nombreLimpio]) {
                acumuladoVip[nombreLimpio].totalScore += (fila.total_score || 0);
                acumuladoVip[nombreLimpio].participaciones += 1;
                if (fila.es_booyah || fila.rank === 1) {
                    acumuladoVip[nombreLimpio].booyahs += 1;
                }
            }
        });

        let listaVip = Object.values(acumuladoVip).sort((a, b) => b.totalScore - a.totalScore);

        tbody.innerHTML = '';
        listaVip.forEach((eq, idx) => {
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
        console.error("Error cargando VIP públicos:", err);
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: #ff5555; padding: 20px;">Error al conectar con la base de datos.</td></tr>`;
    }
}

async function procesarSesionUnica(folderPath, titulo, jornada) {
    if (!folderPath || !supabaseClient) {
        alert("Este entrenamiento no tiene carpeta asociada.");
        return;
    }

    let modalDetalle = document.getElementById('modalDetalleSesion');
    let tituloDetalle = document.getElementById('tituloDetalleSesion');
    let subDetalle = document.getElementById('subtituloDetalle');
    let tablaSesionUnica = document.getElementById('tablaGeneralSesionUnica');

    if (modalDetalle) modalDetalle.style.display = 'flex';
    if (tituloDetalle) tituloDetalle.textContent = `TABLA GENERAL: ${titulo}`;
    if (subDetalle) subDetalle.textContent = jornada;
    if (tablaSesionUnica) tablaSesionUnica.innerHTML = `<thead><tr><th colspan="100" style="text-align:center; padding: 30px; color: var(--primary);">Cargando estadísticas de salas...</th></tr></thead>`;

    try {
        const { data: fileList, error: listError } = await supabaseClient.storage
            .from('entrenamientos_logs')
            .list(folderPath);

        if (listError || !fileList || fileList.length === 0) {
            alert("No se encontraron archivos.");
            return;
        }

        fileList.sort((a, b) => a.name.localeCompare(b.name));

        let textosSalas = [];
        for (let file of fileList) {
            const { data: fileData, error: downloadError } = await supabaseClient.storage
                .from('entrenamientos_logs')
                .download(`${folderPath}/${file.name}`);

            if (!downloadError && fileData) {
                let text = await fileData.text();
                textosSalas.push(text);
            }
        }

        let equiposMap = {};
        let numSalas = textosSalas.length;

        textosSalas.forEach((text, salaIndex) => {
            let lines = text.split('\n');
            lines.forEach(line => {
                const teamMatch = line.match(/TeamName:\s*(.+?)\s+Rank:\s*(\d+)\s+KillScore:\s*(\d+)\s+RankScore:\s*(\d+)\s+TotalScore:\s*(\d+)/i);
                if (teamMatch) {
                    let name = teamMatch[1].trim();
                    if (!equiposMap[name]) {
                        equiposMap[name] = { name, totalScore: 0, killScore: 0, salasPuntos: {}, salasJugadas: 0 };
                    }
                    let totalScore = parseInt(teamMatch[5]);
                    let killScore = parseInt(teamMatch[3]);

                    equiposMap[name].totalScore += totalScore;
                    equiposMap[name].killScore += killScore;
                    equiposMap[name].salasPuntos[salaIndex] = totalScore;
                    equiposMap[name].salasJugadas += 1;
                }
            });
        });

        let equiposOrdenados = Object.values(equiposMap).sort((a, b) => b.totalScore - a.totalScore);

        let htmlHeader = `
            <thead>
                <tr style="color: var(--primary); font-family: 'Orbitron'; border-bottom: 2px solid rgba(220,204,156,0.3); font-size: 0.85rem;">
                    <th style="text-align:left; padding: 10px;">#</th>
                    <th style="text-align:left; padding: 10px;">EQUIPO</th>
                    ${Array.from({length: numSalas}).map((_,i) => `<th style="padding: 10px; text-align:center;">S${i+1}</th>`).join('')}
                    <th style="text-align: center; padding: 10px;">SALAS</th>
                    <th style="text-align: center; padding: 10px;">KILL</th>
                    <th style="text-align: center; padding: 10px;">TOTAL</th>
                </tr>
            </thead>
        `;

        let htmlBody = `<tbody>`;
        equiposOrdenados.forEach((eq, i) => {
            let colorFila = "var(--light)";
            if (i === 0) colorFila = '#DCCC9C';
            else if (i === 1) colorFila = '#959595';
            else if (i === 2) colorFila = '#cd7f32';

            htmlBody += `
                <tr style="border-bottom: 1px solid rgba(255,255,255,0.06);">
                    <td style="padding: 10px; font-weight: bold; color:${colorFila};">#${i+1}</td>
                    <td style="padding: 10px; font-weight: bold; max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;"><span style="color: var(--light);">${eq.name}</span></td>
                    ${Array.from({length: numSalas}).map((_,s) => `<td style="text-align:center; padding: 10px; color: var(--secondary);">${eq.salasPuntos[s] !== undefined ? eq.salasPuntos[s] : '-'}</td>`).join('')}
                    <td style="text-align:center; padding: 10px; color: var(--primary); font-weight:bold;">${eq.salasJugadas}</td>
                    <td style="text-align:center; padding: 10px; color: #ff5555; font-weight:bold;">${eq.killScore}</td>
                    <td style="text-align:center; padding: 10px; color:${colorFila}; font-weight:bold; font-family:'Orbitron';">${eq.totalScore}</td>
                </tr>
            `;
        });
        htmlBody += `</tbody>`;

        if (tablaSesionUnica) tablaSesionUnica.innerHTML = htmlHeader + htmlBody;

    } catch (err) {
        console.error("Error:", err);
        alert("Error al cargar los datos de la sesión.");
    }
}

function cerrarModalDetalle() {
    let modal = document.getElementById('modalDetalleSesion');
    if (modal) modal.style.display = 'none';
}

window.addEventListener('DOMContentLoaded', cargarSesiones);