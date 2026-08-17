const TABLA_PUNTOS_TOP = {
    1: 12, 2: 9, 3: 8, 4: 7, 5: 6, 6: 5,
    7: 4, 8: 3, 9: 2, 10: 1, 11: 0, 12: 0
};

function obtenerEquiposLista() {
    const inputArea = document.getElementById('inputEquipos');
    if (!inputArea) return [];
    
    const rawText = inputArea.value;
    if (!rawText.trim()) return [];
    
    let lineas = rawText.split('\n');
    let equiposObj = [];

    lineas.forEach(linea => {
        if (!linea.trim()) return;
        let lastIndex = linea.lastIndexOf('-');
        let nombre = "", tag = "";

        if (lastIndex !== -1) {
            nombre = linea.substring(0, lastIndex).trim();
            tag = linea.substring(lastIndex + 1).trim();
        } else {
            nombre = linea.trim();
        }
        if (nombre) { equiposObj.push({ name: nombre, tag: tag }); }
    });
    return equiposObj;
}

function actualizarEstructuraEquipos() {
    const equipos = obtenerEquiposLista();
    const salasInput = document.getElementById('inputCantidadSalas');
    const totalSalas = salasInput ? (parseInt(salasInput.value) || 9) : 9;
    const contenedor = document.getElementById('contenedorSalasManuales');
    
    if (!contenedor) return;

    if (equipos.length === 0) {
        contenedor.innerHTML = `<p style="color: var(--gray); text-align: center;">Ingresa al menos un equipo en la lista.</p>`;
        return;
    }

    let html = `
    <h3 style="color: var(--accent-yellow); font-size: 1.1rem; margin-bottom: 15px;"><i class="fa-solid fa-table"></i> Registro de Puntuación por Sala</h3>
    <div class="table-input-container">
        <table>
            <thead>
                <tr>
                    <th>No</th>
                    <th>Equipo</th>
                    <th>Tag</th>`;
    
    for (let s = 1; s <= totalSalas; s++) {
        html += `<th>S${s} (Top)</th><th>K${s}</th>`;
    }
    html += `</tr></thead><tbody>`;

    equipos.forEach((eq, index) => {
        let safeName = eq.name.replace(/"/g, '&quot;');
        let safeTag = eq.tag.replace(/"/g, '&quot;');
        
        html += `
            <tr>
                <td>${index + 1}</td>
                <td>${eq.name}</td>
                <td><input type="text" class="input-tag input-cell-box" data-team="${safeName}" value="${safeTag}" style="width: 100%; max-width: 50px;" oninput="renderizarResultados()"></td>`;
        
        for (let s = 1; s <= totalSalas; s++) {
            html += `
                <td><input type="number" class="input-pos input-cell-box" data-sala="${s}" data-team="${safeName}" placeholder="Top" min="0" max="12" oninput="renderizarResultados()"></td>
                <td><input type="number" class="input-kill input-cell-box" data-sala="${s}" data-team="${safeName}" placeholder="Kill" min="0" oninput="renderizarResultados()"></td>`;
        }
        html += `</tr>`;
    });

    html += `</tbody></table></div>`;
    contenedor.innerHTML = html;
    renderizarResultados();
}

function renderizarResultados() {
    const equipos = obtenerEquiposLista();
    const outputDiv = document.getElementById('outputTablaReducida');
    if (!outputDiv || equipos.length === 0) return;

    const salasInput = document.getElementById('inputCantidadSalas');
    const totalSalas = salasInput ? (parseInt(salasInput.value) || 9) : 9;
    const moderadorInput = document.getElementById('inputModerador');
    const moderadorVal = moderadorInput ? moderadorInput.value : "";
    
    let datosEquipos = {};

    equipos.forEach(eq => {
        const tagInput = document.querySelector(`.input-tag[data-team="${eq.name.replace(/"/g, '\\"')}"]`);
        let tagVal = tagInput ? tagInput.value : eq.tag;

        datosEquipos[eq.name] = {
            name: eq.name, 
            tag: tagVal, 
            ptsPosicion: 0, 
            ptsKills: 0, 
            booyahs: 0
        };
    });

    for (let s = 1; s <= totalSalas; s++) {
        equipos.forEach(eq => {
            const safeTeam = eq.name.replace(/"/g, '\\"');
            const inputPos = document.querySelector(`.input-pos[data-sala="${s}"][data-team="${safeTeam}"]`);
            const inputKill = document.querySelector(`.input-kill[data-sala="${s}"][data-team="${safeTeam}"]`);

            if (inputPos && inputKill) {
                let topVal = parseInt(inputPos.value);
                let killVal = parseInt(inputKill.value) || 0;
                
                let ptsTop = TABLA_PUNTOS_TOP[topVal] || 0;

                if (!isNaN(topVal) || killVal > 0) {
                    datosEquipos[eq.name].ptsPosicion += ptsTop;
                    datosEquipos[eq.name].ptsKills += killVal;

                    if (topVal === 1) {
                        datosEquipos[eq.name].booyahs += 1;
                    }
                }
            }
        });
    }

    let processedData = Object.values(datosEquipos).map(item => ({
        ...item,
        totalGeneral: item.ptsPosicion + item.ptsKills
    }));

    processedData.sort((a, b) => b.totalGeneral - a.totalGeneral);

    let displayData = processedData.slice(0, 18);
    while (displayData.length < 18) { 
        displayData.push({ name: "", tag: "", booyahs: "", ptsPosicion: "", ptsKills: "", totalGeneral: "" }); 
    }

    let thead = `<tr><th>TOP</th><th>EQUIPO (TAG)</th><th>BOOYAHS</th><th>PTS POS</th><th>PTS KILLS</th><th>TOTAL</th></tr>`;
    let tbody = ``;

    displayData.forEach((item, index) => {
        let rankStr = item.name !== "" ? `#${index + 1}` : "";
        let nameTagStr = item.name !== "" ? `<strong>${item.name}</strong> <span style="color:var(--gray);">[${item.tag}]</span>` : "";
        let booyahsStr = item.name !== "" ? item.booyahs : "";
        let posStr = item.ptsPosicion !== "" ? item.ptsPosicion : "";
        let killsStr = item.ptsKills !== "" ? item.ptsKills : "";
        let totalStr = item.totalGeneral !== "" ? `<strong>${item.totalGeneral}</strong>` : "";
        
        tbody += `<tr>
            <td>${rankStr}</td>
            <td>${nameTagStr}</td>
            <td>${booyahsStr}</td>
            <td>${posStr}</td>
            <td>${killsStr}</td>
            <td>${totalStr}</td>
        </tr>`;
    });

    let htmlModerador = moderadorVal ? `<p style="font-family: 'Orbitron'; font-size: 1.1rem; color: var(--primary); text-align: center; margin-bottom: 8px;">MODERADOR: ${moderadorVal}</p>` : '';

    // Lienzo configurado estrictamente a 1000x1000 píxeles con proporción 1:1
    let htmlFinal = `
        <div id="tablaReducidaCaptura" style="
            width: 1000px !important;
            height: 1000px !important;
            min-width: 1000px !important;
            min-height: 1000px !important;
            max-width: 1000px !important;
            max-height: 1000px !important;
            aspect-ratio: 1 / 1 !important;
            margin: 0 auto;
            padding: 40px;
            border-radius: 20px;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            background: radial-gradient(circle at center, #1b2238 0%, #0a0b10 80%);
            box-shadow: 0 0 50px rgba(0,0,0,0.95);
            transform: scale(0.85);
            transform-origin: top center;
            box-sizing: border-box;
        ">
            <div class="reduced-general" style="width: 95%; padding: 20px;">
                <h3 style="font-family: 'Orbitron'; font-size: 1.4rem; color: #ffffff; text-align: center; margin-bottom: 5px;">TABLA GENERAL - PUMAS GAMING</h3>
                ${htmlModerador}
                <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
                    <thead>
                        <tr style="background: rgba(255, 204, 0, 0.2); color: var(--accent-yellow); font-family: 'Orbitron'; font-size: 1rem;">
                            <th style="padding: 8px; border-bottom: 1px solid rgba(255,255,255,0.1);">TOP</th>
                            <th style="padding: 8px; border-bottom: 1px solid rgba(255,255,255,0.1); text-align: left; padding-left: 15px;">EQUIPO (TAG)</th>
                            <th style="padding: 8px; border-bottom: 1px solid rgba(255,255,255,0.1);">BOOYAHS</th>
                            <th style="padding: 8px; border-bottom: 1px solid rgba(255,255,255,0.1);">PTS POS</th>
                            <th style="padding: 8px; border-bottom: 1px solid rgba(255,255,255,0.1);">PTS KILLS</th>
                            <th style="padding: 8px; border-bottom: 1px solid rgba(255,255,255,0.1);">TOTAL</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tbody.replace(/padding: 10px 12px;/g, 'padding: 5px 8px; font-size: 0.95rem;')}
                    </tbody>
                </table>
            </div>
        </div>`;

    outputDiv.innerHTML = htmlFinal;
}

function descargarTablaReducida() {
    const elemento = document.getElementById('tablaReducidaCaptura');
    if (!elemento) { alert("Genera los resultados primero."); return; }

    html2canvas(elemento, { scale: 1, useCORS: true, backgroundColor: null }).then(canvas => {
        let enlace = document.createElement('a');
        enlace.download = 'resultados-pumas-gaming-1000x1000.png';
        enlace.href = canvas.toDataURL('image/png');
        enlace.click();
    });
}

window.onload = function() { actualizarEstructuraEquipos(); };
