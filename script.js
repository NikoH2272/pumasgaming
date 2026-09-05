let _sP = [], _cN = {}, _eE = new Set(), _sLO = [], _sML = [], _lPB64 = null, _fPB64 = null, _gE = [], _gTK = [], _gNS = 0, _rFD = [];

async function prepararRenombradoEquipos() {
    let fI = document.getElementById('fileInput'), fs = fI ? Array.from(fI.files) : [];
    if (!fs.length) return;
    _rFD = []; let eU = new Set();
    for (let f of fs) {
        let t = await f.text();
        _rFD.push(t);
        t.split('\n').forEach(l => {
            let m = l.match(/TeamName:\s*(.+?)\s+Rank:/i);
            if (m) eU.add(m[1].trim());
        });
    }
    let c = document.getElementById('listaEquiposInputs');
    if (!c) return;
    c.innerHTML = '';
    Array.from(eU).forEach(eq => {
        c.innerHTML += `<div style="display:flex;gap:10px;align-items:center;background:rgba(255,255,255,0.03);padding:10px 15px;border-radius:6px;margin-bottom:8px;"><span style="color:var(--gray);font-size:0.85rem;width:140px;">Original: <strong>${eq}</strong></span><input type="text" class="input-nombre-editable" data-original="${eq}" value="${eq}" style="flex:2;padding:8px;background:#0a0a0c;border:1px solid rgba(220,204,156,0.25);color:#fff;border-radius:4px;"></div>`;
    });
    document.getElementById('seccionRenombrar').style.display = 'block';
}

function procesarConNombresPersonalizados() {
    let dR = {};
    document.querySelectorAll('.input-nombre-editable').forEach(i => {
        dR[i.getAttribute('data-original')] = i.value.trim() || i.getAttribute('data-original');
    });
    _xL(_rFD, dR);
}

// Ahora procesa localmente de inmediato al hacer clic en el botón principal, SIN subir nada a Supabase
async function procesarArchivosLog() {
    let fI = document.getElementById('fileInput');
    if (!fI || !fI.files.length) {
        alert("Por favor, selecciona archivos .log o .txt primero.");
        return;
    }
    let fs = Array.from(fI.files);
    _rFD = [];
    let ps = [];
    for (let i = 0; i < fs.length; i++) ps.push(_lF(fs[i]));
    
    try {
        let rT = await Promise.all(ps);
        _rFD = rT;
        let dR = {};
        document.querySelectorAll('.input-nombre-editable').forEach(i => {
            dR[i.getAttribute('data-original')] = i.value.trim() || i.getAttribute('data-original');
        });
        _xL(_rFD, dR);
        alert("¡Archivos procesados exitosamente en modo local!");
    } catch (e) {
        console.error(e);
        alert("Error al procesar los archivos de registro.");
    }
}

function _lF(f) {
    return new Promise((rs, rj) => {
        let r = new FileReader();
        r.onload = e => rs(e.target.result);
        r.onerror = e => rj(e);
        r.readAsText(f);
    });
}

function _xL(tA, rM) {
    let eM = {}, jM = {}, rW = [], nS = tA.length;
    tA.forEach((t, i) => {
        let ls = t.split('\n'), sWT = null, sWTS = 0, sWKS = 0;
        ls.forEach(l => {
            let tM = l.match(/TeamName:\s*(.+?)\s+Rank:\s*(\d+)\s+KillScore:\s*(\d+)\s+RankScore:\s*(\d+)\s+TotalScore:\s*(\d+)/i);
            if (tM) {
                let rT = tM[1].trim(), nm = rM[rT] || rT;
                if (!eM[nm]) eM[nm] = { name: nm, totalScore: 0, killScore: 0, rankScore: 0, salasPuntos: {}, salasKills: {}, salasBooyah: {}, salasJugadas: 0, booyahsCount: 0 };
                let tS = parseInt(tM[5]), kS = parseInt(tM[3]), rS = parseInt(tM[4]), rk = parseInt(tM[2]);
                eM[nm].totalScore += tS; eM[nm].killScore += kS; eM[nm].rankScore += rS;
                eM[nm].salasPuntos[i] = tS; eM[nm].salasKills[i] = kS; eM[nm].salasJugadas += 1;
                
                if (rk === 1) {
                    eM[nm].salasBooyah[i] = true;
                    eM[nm].booyahsCount += 1;
                    sWT = nm; sWTS = tS; sWKS = kS;
                }
            }
            let pM = l.match(/NAME:\s*(.+?)\s+ID:\s*\d+.*?KILL:\s*(\d+)/i);
            if (pM) {
                let pN = pM[1].trim(), pK = parseInt(pM[2]);
                if (!jM[pN]) jM[pN] = { name: pN, kills: 0 };
                jM[pN].kills += pK;
            }
        });
        if (sWT) rW.push({ sala: i + 1, team: sWT, points: sWTS, kills: sWKS });
        else rW.push({ sala: i + 1, team: "N/D", points: 0, kills: 0 });
    });
    _gE = Object.values(eM);
    _gTK = Object.values(jM).sort((a, b) => b.kills - a.kills);
    _gNS = nS;
    window._rWGlobal = rW;
    renderizarResultadosFromState();
}

function cargarImagenLocal(e, tp) {
    let f = e.target.files[0];
    if (!f) return;
    let r = new FileReader();
    r.onload = ev => {
        if (tp === 'logo') _lPB64 = ev.target.result;
        else if (tp === 'fondo') _fPB64 = ev.target.result;
        renderizarResultadosFromState();
    };
    r.readAsDataURL(f);
}

function renderizarResultadosFromState() {
    if (!_gE.length) return;
    renderizarResultados(_gE, _gTK, _gNS);
}

function renderizarResultados(eqs, tKs, nS) {
    let tC = document.getElementById('inputTituloTorneo') ? document.getElementById('inputTituloTorneo').value : "LIGA PUMAS GAMING",
        jC = document.getElementById('inputJornadaTorneo') ? document.getElementById('inputJornadaTorneo').value : "JORNADA 1",
        fC = document.getElementById('inputFechaTorneo') ? document.getElementById('inputFechaTorneo').value : "",
        cF = document.getElementById('selectColorFuente') ? document.getElementById('selectColorFuente').value : "#ffffff",
        sM = document.getElementById('selectModoCalculo'), mC = sM ? sM.value : '1',
        iM = document.getElementById('inputModerador'), nM = iM && iM.value.trim() !== "" ? iM.value.trim().toUpperCase() : "PUMAS ZEE",
        lU = _lPB64 || "imagenes/LOGO PUMAS WEB.png", fU = _fPB64 || "";
    
    let fV = fU ? `background-image: url('${fU}'); background-size: cover; background-position: center;` : `background: linear-gradient(135deg, #0a0a0c 0%, #121317 50%, #050507 100%);`,
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

    let tKL = [...tKs].slice(0, 15), tM = "TABLA GENERAL (ESTÁNDAR)";
    if (mC === '2') tM = "TABLA SOLO POSICIÓN (RANKSCORE)";
    if (mC === '3') tM = "TABLA SOLO KILLS";
    let rWData = window._rWGlobal || [];

    let h = `<div id="tablaCaptura" style="width:800px;height:1000px;${fV}position:relative;font-family:'Rajdhani',sans-serif;color:${cF};padding:20px;box-sizing:border-box;border:2px solid rgba(220,204,156,0.3);border-radius:12px;">` +
    `<div style="position:absolute;top:18px;right:30px;"><img src="${lU}" style="width:65px;height:65px;object-fit:contain;border-radius:50%;border:2px solid #DCCC9C;background:rgba(18,19,23,0.8);"></div>` +
    `<div style="text-align:center;position:absolute;top:18px;left:40px;right:40px;"><h1 style="font-family:'Orbitron';font-size:1.6rem;color:#DCCC9C;margin:0;text-transform:uppercase;text-shadow:2px 2px 4px rgba(0,0,0,0.8);">${tC}</h1>` +
    `<div style="font-family:'Orbitron';font-size:0.9rem;color:${cF};margin-top:3px;font-weight:bold;letter-spacing:1px;">${jC} ${fC ? '— ' + fC : ''} | MODERADOR: ${nM}</div></div>` +
    
    // TABLA PRINCIPAL GENERAL
    `<div style="position:absolute;top:85px;left:35px;width:730px;background:${fCo};padding:8px;border-radius:8px;border:1px solid rgba(220,204,156,0.3);max-height:410px;overflow:hidden;">` +
    `<div style="color:#DCCC9C;font-family:'Orbitron';font-size:0.85rem;margin-bottom:4px;font-weight:bold;">${tM}</div>` +
    `<table style="width:100%;border-collapse:collapse;font-size:0.76rem;color:${cF};"><thead><tr style="color:#DCCC9C;font-family:'Orbitron';border-bottom:2px solid rgba(220,204,156,0.3);font-size:0.78rem;"><th style="text-align:left;padding:4px;">#</th><th style="text-align:left;padding:4px;">EQUIPO</th>` +
    `${Array.from({ length: Math.min(nS, 6) }).map((_, i) => `<th style="padding:4px;text-align:center;">S${i + 1}</th>`).join('')}<th style="padding:4px;text-align:center;">KILL</th><th style="padding:4px;text-align:center;">TOTAL</th></tr></thead><tbody>` +
    eqO.map((eq, i) => {
        let cFila = cF;
        if (i === 0) cFila = '#DCCC9C';
        else if (i === 1) cFila = '#959595';
        return `<tr style="border-bottom:1px solid rgba(255,255,255,0.06);"><td style="padding:3.5px;font-weight:bold;color:${cFila};">#${i + 1}</td><td style="padding:3.5px;font-weight:bold;max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;"><span style="color:${cF};">${eq.name}</span></td>` +
        `${Array.from({ length: Math.min(nS, 6) }).map((_, s) => {
            let pS = eq.salasPuntos[s];
            if (pS === undefined) return `<td style="text-align:center;padding:3.5px;color:var(--gray);">-</td>`;
            return `<td style="text-align:center;padding:3.5px;color:${cF};">${pS}</td>`;
        }).join('')}` +
        `<td style="text-align:center;padding:3.5px;color:#DCCC9C;font-weight:bold;">${eq.killScore}</td><td style="text-align:center;padding:3.5px;color:${cFila};font-weight:bold;">${eq.totalCalculado}</td></tr>`;
    }).join('') + `</tbody></table></div>` +

    // ZONA INFERIOR 1: BOOYAH POR SALA
    `<div style="position:absolute;top:520px;left:35px;width:730px;background:${fCo};padding:8px;border-radius:8px;border:1px solid rgba(220,204,156,0.3);"><div style="font-family:'Orbitron';color:#DCCC9C;margin-bottom:4px;font-size:0.82rem;font-weight:bold;">BOOYAH POR SALA (VICTORIAS)</div><div style="display:grid;grid-template-columns:repeat(${Math.min(Math.max(rWData.length, 1), 6)}, 1fr);gap:6px;">` +
    (rWData.length ? rWData.map(rw => `
        <div style="font-size:0.7rem;background:rgba(18,19,23,0.85);padding:5px 6px;border-radius:5px;border:1px solid rgba(220,204,156,0.2);text-align:center;">
            <div style="color:#DCCC9C;font-family:'Orbitron';font-weight:bold;margin-bottom:2px;">SALA ${rw.sala} 👑</div>
            <div style="color:${cF};font-weight:bold;max-width:95px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin:0 auto;" title="${rw.team}">${rw.team}</div>
            <div style="color:var(--gray);font-size:0.65rem;margin-top:2px;">Pts: <strong style="color:#DCCC9C;">${rw.points}</strong> | K: <strong style="color:#DCCC9C;">${rw.kills}</strong></div>
        </div>
    `).join('') : `<div style="color:var(--gray);font-size:0.75rem;text-align:center;padding:6px;">No hay datos de Booyah registrados.</div>`) +
    `</div></div>` +

    // ZONA INFERIOR 2: TOP 15 KILLERS
    `<div style="position:absolute;top:660px;left:35px;width:730px;background:${fCo};padding:8px;border-radius:8px;border:1px solid rgba(220,204,156,0.3);"><div style="font-family:'Orbitron';color:#DCCC9C;margin-bottom:4px;font-size:0.82rem;font-weight:bold;">TOP 15 KILLERS MÁS LETALES</div><div style="display:grid;grid-template-columns:repeat(5, 1fr);gap:5px;">` +
    tKL.map((tk, i) => {
        let cP = cF;
        if (i === 0) cP = '#DCCC9C';
        return `<div style="font-size:0.7rem;background:rgba(18,19,23,0.85);padding:5px 6px;border-radius:5px;border:1px solid rgba(220,204,156,0.2);display:flex;justify-content:space-between;align-items:center;"><div><span style="color:${cP};font-weight:bold;margin-right:3px;">#${i + 1}</span><span style="color:${cF};font-weight:bold;max-width:58px;display:inline-block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;vertical-align:middle;">${tk.name}</span></div><span style="color:#DCCC9C;font-weight:bold;font-size:0.75rem;">${tk.kills}</span></div>`;
    }).join('') +
    `</div></div></div>`;
    
    // Contenedor responsivo con scroll horizontal y botón de descarga corregido
    let wrapperHtml = `
        <div style="width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch; padding-bottom: 10px;">
            ${h}
        </div>
        <button onclick="descargar()" class="btn-generar" style="margin-top: 20px;">DESCARGAR IMAGEN 4:5</button>
    `;

    document.getElementById('outputTablasLadoALado').innerHTML = wrapperHtml;
}

// Función de descarga corregida para usar html2canvas de forma estable
function descargar() {
    let el = document.getElementById('tablaCaptura');
    if (!el) {
        alert("Primero genera los resultados cargando los archivos.");
        return;
    }
    
    html2canvas(el, { scale: 2, useCORS: true, backgroundColor: '#0a0a0c', logging: false }).then(canvas => {
        let link = document.createElement('a');
        link.download = 'Tabla_Resultados_Pumas.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
    }).catch(err => {
        console.error("Error al generar la imagen:", err);
        alert("Hubo un error al generar la imagen para descargar.");
    });
}

// Mantenemos solo el cargador público para mostrar los tops generales pasados de la BD en la portada si aplica
async function _cTP() {
    let cT = document.getElementById('contenedorTopEquiposPublicos'), cK = document.getElementById('contenedorTopKillersPublicos');
    if (!cT && !cK) return;
    let sC = null;
    if (typeof supabase !== 'undefined' && supabase.createClient) sC = supabase.createClient("https://bqemjroiegybdzksddkn.supabase.co", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJxZW1qcm9pZWd5YmR6a3NkZGtuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc1NzgwNDIsImV4cCI6MjEwMzE1NDA0Mn0.49gC204FPWSNxWYa6eZFBgWJgr7ZvFax5mqOM9lyGPo");
    if (!sC) return;
    try {
        let { data: sD, error: sE } = await sC.from('salas_resultados').select('equipo_nombre, total_score');
        if (!sE && cT) {
            let eM = {};
            (sD || []).forEach(r => {
                if (!eM[r.equipo_nombre]) eM[r.equipo_nombre] = { name: r.equipo_nombre, totalScore: 0 };
                eM[r.equipo_nombre].totalScore += (r.total_score || 0);
            });
            let t10 = Object.values(eM).sort((a, b) => b.totalScore - a.totalScore).slice(0, 10);
            cT.innerHTML = t10.length ? t10.map((eq, i) => {
                let cM = i === 0 ? 'var(--primary)' : i === 1 ? '#959595' : i === 2 ? '#cd7f32' : 'var(--gray)';
                return `<div style="background:rgba(18,19,23,0.6);padding:8px 12px;border-radius:6px;display:flex;justify-content:space-between;align-items:center;border:1px solid rgba(220,204,156,0.15);margin-bottom:6px;"><span style="font-weight:bold;font-size:0.85rem;"><span style="color:${cM};">#${i + 1}</span> ${eq.name}</span><span style="font-size:0.80rem;color:var(--primary);font-family:'Orbitron';">${eq.totalScore} Pts</span></div>`;
            }).join('') : `<p style="color:var(--gray);font-size:0.85rem;">No hay registros de equipos.</p>`;
        }
        let { data: kD, error: kE } = await sC.from('top_killers').select('jugador_nombre, kills');
        if (!kE && cK) {
            let kM = {};
            (kD || []).forEach(r => {
                if (!kM[r.jugador_nombre]) kM[r.jugador_nombre] = { name: r.jugador_nombre, kills: 0 };
                kM[r.jugador_nombre].kills += (r.kills || 0);
            });
            let t10k = Object.values(kM).sort((a, b) => b.kills - a.kills).slice(0, 10);
            cK.innerHTML = t10k.length ? t10k.map((tk, i) => {
                let cP = i === 0 ? 'var(--primary)' : 'var(--light)';
                return `<div style="background:rgba(18,19,23,0.6);padding:8px 12px;border-radius:6px;display:flex;justify-content:space-between;align-items:center;border:1px solid rgba(220,204,156,0.15);margin-bottom:6px;"><span style="font-weight:bold;font-size:0.85rem;"><span style="color:${cP};">#${i + 1}</span> ${tk.name}</span><span style="font-size:0.80rem;color:var(--primary);font-family:'Orbitron';">${tk.kills} Kills</span></div>`;
            }).join('') : `<p style="color:var(--gray);font-size:0.85rem;">No hay registros de killers.</p>`;
        }
    } catch (e) {
        console.error(e);
    }
}

window.addEventListener('DOMContentLoaded', () => _cTP());