/* =====================================================================
   Entrenos Pumas · CARGAR ▾ en la herramienta
   1) Cargar con estadísticas: además de los .log se suben, por sala,
        · la repetición ReplayInfo_<id>.json → tiempo vivo, caídas, primera sangre,
          kill más lejana y arma de cada kill
        · la repetición ReplayInfo_<id>.bin  → se lee en el navegador (portal-kit/replay-bin.js):
          daño, impactos, headshots, paredes gloo, reanimaciones, derribos, kills y el
          nombre de cada escuadra (no se sube)
        · los resultados completos <id>.csv  → daño, headshots, revividas, paredes gloo
      Todo se empareja con cada .log por el número de la partida (va en el nombre).
      Genera las imágenes 4:5 (portal-kit/imagenes-resultados.js) y, al "Procesar y guardar",
      se guardan en la base con el id del entreno (si el evento lo tiene habilitado).
   (Generar CSV está en portal-kit/generador-csv.js)
   ===================================================================== */
(function () {
    const C = () => window.PumasCompletos;
    const $ = id => document.getElementById(id);
    const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const mmss = s => { s = Math.round(s || 0); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
    const leerArchivos = async input => Promise.all(Array.from(($(input) || {}).files || []).map(async f => ({ nombre: f.name, texto: await f.text() })));

    let csvs = [], replays = [], bins = [];
    let ultimo = null;          // { salas, resultado }
    let modoStats = false;      // true en "Cargar con estadísticas"
    let habilitado = null;      // el evento tiene habilitados los resultados completos (sql/23)

    function renombres() {
        const r = {};
        document.querySelectorAll('.input-nombre-editable').forEach(i => { r[i.dataset.original] = i.value.trim() || i.dataset.original; });
        return r;
    }
    const nombresLogs = () => Array.from(($('fileInput') || {}).files || []).map(f => f.name);
    const textosLogs = () => (typeof processedFilesTexts !== 'undefined' && processedFilesTexts.length) ? processedFilesTexts
        : (typeof rawFilesData !== 'undefined' ? rawFilesData : []);
    const info = (t, color) => { const n = $('infoCompletos'); if (n) { n.innerHTML = t; n.style.color = color || ''; } };

    /* ---------------- 1) Cargar con estadísticas ---------------- */
    window.modoCargaEstadisticas = on => {
        modoStats = !!on;
        const bloque = $('bloqueCompletos');
        if (bloque) bloque.hidden = !modoStats;
        const titulo = $('tituloCargar');
        if (titulo) titulo.textContent = modoStats ? 'Cargar Resultados con Estadísticas' : 'Cargar Resultados de Entrenamientos';
        const lbl = $('labelLogs');
        if (lbl) lbl.textContent = modoStats ? 'MATCH LOGS (.log) · 4 A 6' : 'SUBIR ARCHIVOS LOGS DE SALAS (.log, .txt)';
        recalcular();
    };

    /* Con estadísticas: de 4 a 6 salas y cada una con su match .log, su replay .json y su .bin */
    const MIN_SALAS = 4, MAX_SALAS = 6;
    function revisarJuego() {
        const logs = nombresLogs();
        const errores = [];
        const rango = (n, tipo) => { if (n < MIN_SALAS || n > MAX_SALAS) errores.push(`Sube de ${MIN_SALAS} a ${MAX_SALAS} ${tipo} (hay ${n}).`); };
        rango(logs.length, 'match .log'); rango(replays.length, 'replays .json'); rango(bins.length, '.bin');
        if (logs.length && (replays.length !== logs.length || bins.length !== logs.length)) errores.push('Debe haber la misma cantidad de .log, .json y .bin (uno de cada uno por sala).');
        // Emparejar por el número de la partida; si el .log no lo trae, por orden
        const idJson = r => (/"MatchID"\s*:\s*(\d+)/.exec(r.texto) || [])[1] || C().idDeArchivo(r.nombre);
        const usadosJ = new Set(), usadosB = new Set();
        const filas = logs.map((n, i) => {
            const id = C().idDeArchivo(n);
            let j = id ? replays.findIndex((r, k) => !usadosJ.has(k) && idJson(r) === id) : -1;
            if (j < 0 && !id && replays.length === logs.length && !usadosJ.has(i)) j = i;
            let b = id ? bins.findIndex((x, k) => !usadosB.has(k) && x.id === id) : -1;
            if (b < 0 && !id && bins.length === logs.length && !usadosB.has(i)) b = i;
            if (j >= 0) usadosJ.add(j);
            if (b >= 0) usadosB.add(b);
            return { sala: i + 1, id: id || '—', log: n, json: j >= 0 ? replays[j].nombre : '', bin: b >= 0 ? bins[b].nombre : '' };
        });
        const incompletas = filas.filter(f => !f.json || !f.bin).map(f => 'S' + f.sala);
        if (incompletas.length) errores.push(`Sin su .json o .bin: ${incompletas.join(', ')} (el número del nombre debe ser el mismo de la sala).`);
        return { ok: !errores.length, errores, filas };
    }

    function pintarChecklist() {
        const cont = $('checklistSalas');
        if (!cont) return null;
        if (!modoStats) { cont.innerHTML = ''; return null; }
        const r = revisarJuego();
        const marca = v => v ? `<i class="fa-solid fa-circle-check si" title="${esc(v)}"></i>` : '<i class="fa-solid fa-circle-xmark no"></i>';
        cont.innerHTML = (r.filas.length ? `<table class="check-salas"><thead><tr><th>SALA</th><th>PARTIDA</th><th>.LOG</th><th>.JSON</th><th>.BIN</th></tr></thead><tbody>
            ${r.filas.map(f => `<tr><td>S${f.sala}</td><td>${esc(f.id)}</td><td>${marca(f.log)}</td><td>${marca(f.json)}</td><td>${marca(f.bin)}</td></tr>`).join('')}</tbody></table>` : '') +
            (r.errores.length ? `<p class="form-hint" style="margin-top:8px;color:#ff8a8d">${r.errores.map(esc).join('<br>')}</p>`
                : `<p class="form-hint" style="margin-top:8px;color:#6ee7a8">✔ ${r.filas.length} salas completas (.log + .json + .bin).</p>`);
        return r;
    }

    // Cada .bin se lee una sola vez (por nombre y tamaño) y se guarda lo que trae
    const binLeidos = new Map();
    let turnoBins = 0;
    async function alCambiarArchivos() {
        const turno = ++turnoBins;
        [csvs, replays] = await Promise.all([leerArchivos('fileCompletos'), leerArchivos('fileReplays')]);
        const files = Array.from(($('fileBins') || {}).files || []);
        bins = files.map(f => ({ nombre: f.name, id: C().idDeArchivo(f.name), mb: f.size / 1048576, datos: null, error: '' }));
        if (window.PumasBin && files.length) {
            info(`Leyendo ${files.length} .bin...`);
            await Promise.all(files.map(async (f, i) => {
                const k = f.name + '|' + f.size;
                try {
                    if (!binLeidos.has(k)) binLeidos.set(k, PumasBin.leer(await f.arrayBuffer()));
                    bins[i].datos = binLeidos.get(k);
                } catch (e) { bins[i].error = e.message; }
            }));
            if (turno !== turnoBins) return;
        }
        recalcular();
    }

    function avisoBins() {
        if (!bins.length) return '';
        const ids = new Set(nombresLogs().map(n => C().idDeArchivo(n)).filter(Boolean));
        const ok = bins.filter(b => b.id && ids.has(b.id)).length, leidos = bins.filter(b => b.datos).length;
        const malos = bins.filter(b => b.error).map(b => b.nombre);
        return ` · ${bins.length} .bin (${ok} de las mismas salas, ${leidos} leídos: daño, headshots, gloo, reanimaciones y derribos)` +
            (malos.length ? `. ⚠ No se pudieron leer: ${esc(malos.join(', '))}` : '');
    }

    // Suma lo del .bin a cada sala (por el número de la partida)
    function aplicarBins(salas) {
        let n = 0;
        salas.forEach(s => {
            // El número de la partida se toma del nombre del replay: el MatchID del .json pierde dígitos al leerlo como número
            const id = C().idDeArchivo(s.archivo) || String(s.match_id || '');
            const b = bins.find(x => x.datos && x.id && x.id === id);
            if (b) { C().aplicarBin(s, b.datos); n++; }
        });
        return n;
    }

    /* Imágenes 4:5 (1080×1350): una pestaña por imagen, vista previa al 50 % */
    let imagenes = [], vista = 0;
    const CSS_IMG = `.cpl-tabs{display:flex;flex-wrap:wrap;justify-content:center;gap:8px}
.cpl-tab{padding:7px 12px;border:1px solid rgba(216,195,149,.35);border-radius:6px;background:transparent;color:#D8C395;font-size:.78rem;cursor:pointer}
.cpl-tab.activa{background:#D8C395;color:#0a0b10;font-weight:bold}
.cpl-prev{width:540px;max-width:100%;height:675px;overflow:hidden;border:1px solid rgba(216,195,149,.3);border-radius:6px}
.cpl-prev[hidden]{display:none}
.cpl-esc{width:1080px;height:1350px;transform:scale(.5);transform-origin:0 0}`;
    function pintarImagenes(out, r, meta, salas) {
        if (!$('pgCplImgCss')) { const st = document.createElement('style'); st.id = 'pgCplImgCss'; st.textContent = CSS_IMG; document.head.appendChild(st); }
        imagenes = PumasImagenes.generar({ salas, r, meta, puntosLog: typeof globalEquipos !== 'undefined' ? globalEquipos : [], base: '../' });
        vista = Math.min(vista, imagenes.length - 1);
        out.innerHTML = `
            <div style="display:flex;flex-direction:column;align-items:center;gap:16px;width:100%;margin-top:30px">
                <h3 style="color:#D8C395;font-family:'Michroma';font-size:.95rem;margin:0"><i class="fa-solid fa-chart-simple"></i> IMÁGENES DE RESULTADOS 4:5</h3>
                ${PumasImagenes.selectorHTML ? PumasImagenes.selectorHTML() : ''}
                <div class="cpl-tabs">${imagenes.map((im, i) => `<button type="button" class="cpl-tab${i === vista ? ' activa' : ''}" data-img="${i}">${esc(im.titulo)}</button>`).join('')}</div>
                ${imagenes.map((im, i) => `<div class="cpl-prev"${i === vista ? '' : ' hidden'} data-prev="${i}"><div class="cpl-esc">${im.html}</div></div>`).join('')}
                <div style="display:flex;flex-wrap:wrap;gap:10px;justify-content:center;margin-bottom:22px">
                    <button type="button" class="btn-generar" data-una style="max-width:320px;padding:12px 25px;font-size:1rem">DESCARGAR ESTA IMAGEN</button>
                    <button type="button" onclick="descargarAvanzadas()" class="btn-generar" style="max-width:420px;padding:12px 25px;font-size:1rem">DESCARGAR TODAS (${imagenes.length})</button>
                </div>
            </div>`;
        out.querySelectorAll('[data-img]').forEach(b => b.onclick = () => {
            vista = +b.dataset.img;
            out.querySelectorAll('[data-img]').forEach(x => x.classList.toggle('activa', x === b));
            out.querySelectorAll('[data-prev]').forEach(x => { x.hidden = +x.dataset.prev !== vista; });
        });
        out.querySelector('[data-una]').onclick = () => descargarImagen(vista);
        if (PumasImagenes.enlazarSelector) PumasImagenes.enlazarSelector(out, () => pintarImagenes(out, r, meta, salas));
    }
    async function descargarImagen(i) {
        const im = imagenes[i], caja = document.querySelector(`[data-prev="${i}"]`);
        if (!im || !caja) return;
        const oculto = caja.hidden;
        caja.hidden = false;   // html2canvas necesita la imagen visible
        try { await PumasImagenes.descargar(im.id, im.nombre); } finally { caja.hidden = oculto; }
    }

    function recalcular() {
        const out = $('outputAvanzado');
        if (!out) return;
        pintarChecklist();
        if (!modoStats) { out.innerHTML = ''; ultimo = null; return; }
        const aviso = habilitado === false ? '<br>⚠ Este evento no tiene habilitados los resultados completos (Admin → Resultados completos): se genera la imagen pero las estadísticas no se guardan.' : '';
        if (!csvs.length && !replays.length) {
            out.innerHTML = ''; ultimo = null;
            info('Sube los replays .json y .bin de cada sala (y si lo tienes, el .csv de resultados completos).' + aviso, habilitado === false ? '#FFD54A' : '');
            return;
        }
        if (typeof globalEquipos === 'undefined' || !globalEquipos.length) {
            out.innerHTML = ''; ultimo = null;
            info(`${replays.length} .json y ${csvs.length} .csv listos. Sube los .log y confirma los nombres para generar las estadísticas.` + avisoBins() + aviso);
            return;
        }
        let res;
        try { res = C().emparejar(nombresLogs(), csvs, renombres(), replays, textosLogs()); }
        catch (e) { out.innerHTML = ''; info('⚠ ' + esc(e.message), '#ff8a8d'); ultimo = null; return; }
        const { salas, sobran } = res;
        if (!salas.length) {
            out.innerHTML = ''; ultimo = null;
            info('⚠ Ningún .json ni .csv coincide con las salas. Revisa que sean de las mismas partidas (el número largo del nombre debe ser igual).' + avisoBins(), '#ff8a8d');
            return;
        }
        const conBin = aplicarBins(salas);
        const r = C().calcular(salas, globalEquipos);
        ultimo = { salas, resultado: r };
        const faltan = globalNumSalas - salas.length;
        const soloJson = salas.filter(s => s.fuente === 'replay').length;
        info(`✔ ${salas.length} de ${globalNumSalas} sala(s) con estadísticas` + (conBin ? ` (${conBin} con el .bin)` : '') + (soloJson ? ` (${soloJson} solo con el .json: sin daño, headshots ni gloo)` : '') + '.' +
            (faltan > 0 ? ` Faltan ${faltan}.` : '') + (sobran.length ? ` No se usaron: ${esc(sobran.join(', '))}.` : '') + avisoBins() + aviso,
            faltan > 0 || sobran.length || habilitado === false ? '#FFD54A' : '#6ee7a8');
        const fInput = $('inputFechaHoraEntreno'), mod = $('inputModerador'), tipo = $('selectTipoPartida');
        if (window.PumasImagenes) {
            pintarImagenes(out, r, {
                marca: 'ENTRENOS PUMAS', encabezado: 'ENTRENO PUMAS' + (tipo && tipo.value ? ' · ' + tipo.value.toUpperCase() : ''),
                fecha: fInput && fInput.value ? fInput.value.replace('T', ' ') : '',
                moderador: mod && mod.value.trim() ? mod.value.trim().toUpperCase() : ''
            }, salas);
            return;
        }
        const meta = {
            fondo: (typeof fondoPersonalizadoBase64 !== 'undefined' && fondoPersonalizadoBase64) || 'imagenes/FONDOS.png',
            fecha: fInput && fInput.value ? fInput.value.replace('T', ' ') : '',
            moderador: mod && mod.value.trim() ? mod.value.trim().toUpperCase() : ''
        };
        out.innerHTML = `
            <div style="display:flex;flex-direction:column;align-items:center;gap:22px;width:100%;margin-top:30px">
                <h3 style="color:#D8C395;font-family:'Michroma';font-size:.95rem;margin:0"><i class="fa-solid fa-chart-simple"></i> ESTADÍSTICAS AVANZADAS</h3>
                ${C().imagenHTML(r, meta)}
                <h3 style="color:#D8C395;font-family:'Michroma';font-size:.95rem;margin:0"><i class="fa-solid fa-table"></i> ANÁLISIS POR SALA</h3>
                ${C().imagenSalasHTML(r, meta)}
                <button onclick="descargarAvanzadas()" class="btn-generar" style="max-width:420px;padding:12px 25px;font-size:1rem;margin-bottom:22px">DESCARGAR LAS 2 IMÁGENES 4:5</button>
            </div>`;
    }

    window.descargarAvanzadas = async () => {
        if (imagenes.length && window.PumasImagenes) {
            for (let i = 0; i < imagenes.length; i++) { await descargarImagen(i); await new Promise(r => setTimeout(r, 400)); }
            return;
        }
        const piezas = [['capturaAvanzada', 'Estadisticas_Avanzadas_Pumas.png'], ['capturaPorSala', 'Analisis_Por_Sala_Pumas.png']];
        for (const [id, nombre] of piezas) {
            const el = $(id);
            if (!el) continue;
            const c = await html2canvas(el, { scale: 2, useCORS: true, allowTaint: true, backgroundColor: null });
            const a = document.createElement('a');
            a.download = nombre;
            a.href = c.toDataURL('image/png');
            a.click();
            await new Promise(r => setTimeout(r, 400));
        }
    };

    // Lo llama guardarEntrenamientoEnSupabase (admin_logica.js) con el id del entreno recién guardado
    window.alGuardarEntreno = async sesionId => {
        if (!modoStats || !ultimo || habilitado === false) return;
        try {
            const fh = $('inputFechaHoraEntreno'), tipo = $('selectTipoPartida');
            const meta = { fecha: fh && fh.value ? new Date(fh.value).toISOString() : new Date().toISOString(),
                titulo: 'ENTRENO PUMAS' + (tipo && tipo.value ? ' · ' + tipo.value : '') };
            const r = await C().guardar('entrenamientos', sesionId, C().filasBD(ultimo.salas, meta));
            info(`✔ Estadísticas avanzadas guardadas (${r.filas} jugadores).`, '#6ee7a8');
        } catch (e) {
            const msg = /extra|column/i.test(e.message) ? 'falta correr de nuevo sql/23_resultados_completos.sql en Supabase.' : e.message;
            info('⚠ El entreno se guardó, pero las estadísticas avanzadas no: ' + esc(msg), '#ff8a8d');
            alert('El entreno se guardó, pero las estadísticas avanzadas no: ' + msg);
        }
    };

    ['fileCompletos', 'fileReplays', 'fileBins'].forEach(id => { const el = $(id); if (el) el.addEventListener('change', alCambiarArchivos); });
    const fileLogs = $('fileInput');
    if (fileLogs) fileLogs.addEventListener('change', () => setTimeout(recalcular, 0));
    // Cada vez que se genera la tabla de los .log, se recalculan las estadísticas
    // Con estadísticas no se guarda hasta que estén las 4 a 6 salas completas (.log + .json + .bin)
    const guardarOriginal = window.procesarArchivosLog;
    if (typeof guardarOriginal === 'function') {
        window.procesarArchivosLog = async function () {
            if (modoStats) {
                const r = revisarJuego();
                if (!r.ok) { alert('Faltan archivos para cargar con estadísticas:' + String.fromCharCode(10, 10) + r.errores.join(String.fromCharCode(10))); pintarChecklist(); return; }
            }
            return guardarOriginal.apply(this, arguments);
        };
    }
    const original = window.procesarLogs;
    if (typeof original === 'function') {
        window.procesarLogs = function () { const x = original.apply(this, arguments); recalcular(); return x; };
    }
    window.addEventListener('pg:sesion', async () => {
        habilitado = !!(C() && await C().habilitado('entrenamientos'));
        recalcular();
    }, { once: true });
})();
