/* =====================================================================
   PUMAS GAMING · Imágenes de resultados 4:5 (1080×1350) para redes
   Fondo hecho con CSS (sin imagen), mismo estilo en todas:
     1) TABLA GENERAL      · posiciones, puntos de cada sala, booyahs, kills y total
     2) MVP DETALLADO      · top jugadores: bajas, daño, primeras sangres, equipos rematados y rival con más bajas
     3) CARA A CARA (×sala)· MVP 1 vs MVP 2 de cada sala, con la imagen del personaje
     4) DUELO DE ESCUADRAS · top 5 de equipos que más eliminaron + líderes por equipo
     5) HABILIDADES, GLOO Y ARMAS · habilidades activas más elegidas, paredes gloo y el arsenal
     5b) BOOYAH (×sala)    · equipo campeón, sus jugadores, el MVP y las escuadras que eliminó
     6) ANALÍTICA DE MAPA (×sala) · cierres de zona (del .bin) y zonas calientes de enfrentamientos (del .json)
   Personajes por defecto: imagenes/personajes/mvp1.png y mvp2.png (se cambian en opts.personajes).
   Uso: PumasImagenes.generar({ salas, r, meta, puntosLog, base: '../', estilo: 'crazy'|'pumas' }) → [{ id, nombre, titulo, html }]
        PumasImagenes.descargar(id, nombreArchivo)   (necesita html2canvas)
   ===================================================================== */
(function () {
    const C = () => window.PumasCompletos;
    const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const fmt = n => Math.round(n || 0).toLocaleString('es');
    const mmss = s => { s = Math.round(s || 0); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
    const W = 1080, H = 1350;
    const TINTA = '#141414';
    const PTS_POSICION = { 1: 12, 2: 9, 3: 8, 4: 7, 5: 6, 6: 5, 7: 4, 8: 3, 9: 2, 10: 1 };

    // Fuentes (las mismas en la vista previa y en la captura)
    function fuentes() {
        if (document.getElementById('pgImgFuentes')) return;
        const l = document.createElement('link');
        l.id = 'pgImgFuentes'; l.rel = 'stylesheet';
        l.href = 'https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700;800&family=Inter:wght@400;500;600;700;800&display=swap';
        document.head.appendChild(l);
    }
    const F_TIT = "'Barlow Condensed', 'Arial Narrow', sans-serif", F_TXT = "'Inter', Arial, sans-serif";

    /* ---------------- Datos ---------------- */
    function datos(salas, r, puntosLog) {
        const eq = new Map(), jug = new Map();
        const E = nombre => { const k = norm(nombre); let e = eq.get(k); if (!e) { e = { equipo: nombre, salas: 0, booyahs: 0, kills: 0, dano: 0, hs: 0, derribos: 0, gloo: 0,
            vivo: 0, nVivo: 0, rematados: 0, vs: {}, pts: 0, rankPts: 0, porSala: {} }; eq.set(k, e); } return e; };
        const conLog = puntosLog && puntosLog.length;
        salas.forEach((s, i) => {
            // Posición de cada equipo en la sala: booyah primero, luego al revés del orden en que los eliminaron
            const enSala = new Map();
            s.jugadores.forEach(j => { const e = E(j.equipo); if (!enSala.has(norm(j.equipo))) { enSala.set(norm(j.equipo), { e, kills: 0, booyah: false, vivo: 0 }); e.salas++; }
                const x = enSala.get(norm(j.equipo)); x.kills += j.kills || 0; x.booyah = x.booyah || !!j.booyah; x.vivo = Math.max(x.vivo, j.vivo || 0); });
            const elim = (s.eliminados || []).map(x => norm(x.equipo));
            const orden = [...enSala.entries()].sort(([ka, a], [kb, b]) => (b.booyah - a.booyah)
                || ((elim.indexOf(kb) < 0 ? 1e9 : elim.indexOf(kb)) - (elim.indexOf(ka) < 0 ? 1e9 : elim.indexOf(ka))) || b.vivo - a.vivo || b.kills - a.kills);
            orden.forEach(([k, x], pos) => {
                const e = x.e, log = conLog ? puntosLog.find(p => norm(p.name) === k) : null;
                const ns = (s.sala || i + 1) - 1, pts = log && log.salasPuntos[ns] !== undefined ? log.salasPuntos[ns] : (PTS_POSICION[pos + 1] || 0) + x.kills;
                e.pts += pts; e.porSala[i] = { pos: pos + 1, pts };
                if (x.booyah) e.booyahs++;
            });
            s.jugadores.forEach(j => {
                const e = E(j.equipo), x = j.extra || {}, b = x.bin || {};
                e.kills += j.kills || 0; e.dano += j.dano || 0; e.hs += j.headshots || 0; e.gloo += j.gloo || 0;
                e.derribos += b.derribos !== undefined ? b.derribos : (j.derribos || 0);
                e.vivo += j.vivo || 0; e.nVivo++;
                e.rematados += x.fin || 0;
                Object.entries(x.vs || {}).forEach(([rv, n]) => { e.vs[rv] = (e.vs[rv] || 0) + n; });
                const k = norm(j.account_id || j.jugador);
                const p = jug.get(k) || { jugador: j.jugador, equipo: j.equipo, salas: 0, kills: 0, dano: 0, hs: 0, impactos: 0, derribos: 0, primeras: 0, rematados: 0, vs: {}, vivo: 0, gloo: 0, armas: {} };
                p.salas++; p.gloo += j.gloo || 0; p.kills += j.kills || 0; p.dano += j.dano || 0; p.hs += j.headshots || 0; p.impactos += j.hits || 0; p.vivo += j.vivo || 0;
                p.derribos += b.derribos !== undefined ? b.derribos : (j.derribos || 0);
                p.primeras += x.primeraSangre ? 1 : 0; p.rematados += x.fin || 0; p.equipo = j.equipo;
                Object.entries(x.vs || {}).forEach(([rv, n]) => { p.vs[rv] = (p.vs[rv] || 0) + n; });
                (j.armas || []).forEach(a => { const y = p.armas[a.n] = p.armas[a.n] || { k: 0, d: 0 }; y.k += a.k || 0; y.d += a.d || 0; });
                jug.set(k, p);
            });
        });
        const top = o => Object.entries(o || {}).sort((a, b) => b[1] - a[1])[0] || null;
        const equipos = [...eq.values()].map(e => Object.assign(e, { vivoProm: e.nVivo ? e.vivo / e.nVivo : 0, rival: top(e.vs) }))
            .sort((a, b) => b.pts - a.pts || b.booyahs - a.booyahs || b.kills - a.kills);
        const jugadores = [...jug.values()].map(p => Object.assign(p, { rival: top(p.vs), arma: (Object.entries(p.armas).sort((a, b) => b[1].k - a[1].k || b[1].d - a[1].d)[0] || [''])[0] }))
            .sort((a, b) => b.kills - a.kills || b.dano - a.dano);

        // Armas: kills, daño y cuántos jugadores la usaron
        const armas = {};
        salas.forEach(s => s.jugadores.forEach(j => (j.armas || []).forEach(a => {
            if (/^(FIST|PUÑO|ARMA #\d+)$/i.test(a.n) || /-SUM$/.test(a.n)) return;
            const x = armas[a.n] = armas[a.n] || { arma: a.n, kills: 0, dano: 0, usos: 0 };
            x.kills += a.k || 0; x.dano += a.d || 0; x.usos++;
        })));
        const listaArmas = Object.values(armas).filter(a => a.kills || a.dano).sort((a, b) => b.kills - a.kills || b.dano - a.dano);

        // Por sala: MVP 1 y 2, y la escuadra del booyah con sus números
        const porSala = salas.map((s, i) => {
            const orden = s.jugadores.slice().sort((a, b) => b.kills - a.kills || (b.dano || 0) - (a.dano || 0) || (b.headshots || 0) - (a.headshots || 0) || (b.vivo || 0) - (a.vivo || 0));
            const ps = r && r.porSala ? r.porSala[i] : null;
            const ganador = (s.jugadores.find(j => j.booyah) || {}).equipo || (ps && ps.booyah) || '';
            const esc_ = s.jugadores.filter(j => ganador && norm(j.equipo) === norm(ganador));
            const sum = f => esc_.reduce((a, j) => a + (f(j) || 0), 0);
            const mvpEsc = esc_.slice().sort((a, b) => b.kills - a.kills || (b.dano || 0) - (a.dano || 0))[0];
            return { sala: i + 1, etiqueta: s.etiqueta || 'S' + (i + 1), mapa: (C().MAPAS || {})[s.mapa] || (s.mapa ? 'MAPA ' + s.mapa : ''), duracion: s.duracion || 0,
                mvp1: orden[0] || null, mvp2: orden[1] || null, conDano: s.fuente !== 'replay', primeraSangre: s.primeraSangre || null,
                mapaId: +s.mapa || 0, zonas: s.zonas || null, combates: s.bajasPos || [], eliminados: s.eliminados || [],
                ganadores: esc_, rematadas: ganador ? (s.eliminados || []).filter(e => e.por && norm(e.por) === norm(ganador)) : [],
                booyah: ganador ? { equipo: ganador, kills: sum(j => j.kills), dano: sum(j => j.dano), hs: sum(j => j.headshots), gloo: sum(j => j.gloo),
                    revividas: sum(j => j.revividos), mvp: mvpEsc ? mvpEsc.jugador : '', mvpKills: mvpEsc ? mvpEsc.kills : 0 } : null };
        });
        return { equipos, jugadores, armas: listaArmas, porSala, salas, conDano: salas.some(s => s.fuente !== 'replay') };
    }

    /* Composición editorial para exportar: medidas fijas, datos legibles y marca común.
       Dos estilos (PumasImagenes.estilo): 'crazy' (Crazy Pumas, por defecto) y 'pumas' (el clásico negro y oro). */
    const TEMAS = {
        pumas: { nombre: 'Pumas', marca: 'PUMAS GAMING', instagram: 'pumas.gaming.oficial', logo: 'imagenes/personajes/logo-blanco.png', tamLogo: 83,
            logoAgua: 'imagenes/personajes/logo-blanco.png', opAgua: .035,
            fondo: '#141414', franja: '#1A1A1A', fila1: '#1D1D1D', fila2: '#242424', linea: '#363636', gris: '#959595',
            acento: '#DCCC9C', sobre: '#141414', piel: '#F2F2F2' },
        crazy: { nombre: 'Crazy Pumas', marca: 'CRAZY PUMAS', instagram: 'pumas.gaming.oficial', logo: 'imagenes/crazy-pumas.png', tamLogo: 96,
            logoAgua: 'imagenes/crazy-pumas.png', opAgua: .06,
            fondo: '#0B0B0C', franja: '#1C0A0C', fila1: '#161617', fila2: '#1F1F21', linea: '#3A1A1D', gris: '#9C9C9F',
            acento: '#E3121B', sobre: '#FFFFFF', piel: '#F5F5F5' },
        // Oculto: solo lo ve el superadmin en el selector (soloSuper)
        rowmaya: { nombre: 'ROW × MAYA', marca: 'ROW × MAYA', lema: 'SCRIMS · SALAS DE LIGA PARA COMUNIDAD', soloSuper: true, instagram: '', pie: 'FREE FIRE / SCRIMS', encabezado: 'Free Fire · Scrims ROW × MAYA', logoCarta: 'imagenes/maya.png',
            logo: 'imagenes/row.png', logo2: 'imagenes/maya.png', tamLogo: 78, logoAgua: 'imagenes/maya.png', opAgua: .06,
            fondoCss: 'linear-gradient(165deg,#2335C9 0%,#141C8E 30%,#0C1056 62%,#080A2E 100%)',
            fondo: '#0C1056', franja: 'rgba(143,216,255,.07)', fila1: '#0B0F4A', fila2: '#151D7A', linea: '#3442A8', gris: '#AEB8EC',
            acento: '#9EE3FF', sobre: '#080A2E', piel: '#F4F6FF' }
    };
    // ¿El usuario de la sesión es superadmin? (solo cambia qué botones de estilo se ven)
    const esSuper = () => { try { const x = window.PumasPortal && PumasPortal.sesion && PumasPortal.sesion(); return !!(x && x.rol === 'superadmin'); } catch (e) { return false; } };
    let estilo = 'crazy';   // siempre arranca en Crazy Pumas; el botón cambia solo mientras la página esté abierta
    let T = TEMAS.pumas;   // tema activo mientras se arma el HTML (plantilla() suelta usa el clásico)
    function horarios(fecha) {
        if (!fecha) return [];
        let valor = String(fecha).replace(' ', 'T');
        // El campo de fecha del entreno está expresado en hora Colombia.
        if (/^\d{4}-\d\d-\d\dT\d\d:\d\d(?::\d\d)?$/.test(valor)) valor += '-05:00';
        const d = new Date(valor);
        if (isNaN(d.getTime())) return [];
        return [['MX','America/Mexico_City'],['COL','America/Bogota'],['ARG','America/Argentina/Buenos_Aires']].map(([pais,timeZone])=>({pais,hora:new Intl.DateTimeFormat('es',{timeZone,hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(d)}));
    }
    function lienzo(id, o, cuerpo) {
        const m = o.meta || {}, base = esc(o.base || '../');
        const horas = horarios(m.fechaISO || m.fecha);
        return `<div id="${id}" class="pg-poster" style="position:relative;width:1080px;height:1350px;overflow:hidden;box-sizing:border-box;background:${T.fondoCss || T.fondo};color:${T.piel};font-family:${F_TXT};line-height:1.3;text-align:left;letter-spacing:normal">
            <style>
            #${id} *{font-family:inherit}
            #${id}>header,#${id}>main,#${id}>footer{width:auto;max-width:none;min-width:0;margin:0;padding:0;background:none;border:0;box-shadow:none;backdrop-filter:none;z-index:auto}
            #${id} section{width:auto;max-width:none;margin:0;padding:0}
            #${id} *{box-sizing:border-box}#${id} .pg-title{font-family:${F_TIT};font-weight:800;font-size:88px;line-height:.96;margin:0;letter-spacing:-1px;color:${T.acento}}
            #${id} .pg-section{font-family:${F_TIT};font-weight:700;font-size:31px;line-height:1.1;margin:0 0 15px;color:${T.piel}}
            #${id} .pg-grid{display:grid;align-items:center;gap:0}#${id} .pg-cell{min-width:0;padding:0 6px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
            #${id} .pg-th{height:44px;font-size:16px;font-weight:700;color:${T.gris}}
            #${id} .pg-row{line-height:1.05;font-family:${F_TIT};font-size:29px;font-weight:600;background:${T.fila1};color:${T.piel};margin-bottom:3px}
            #${id} .pg-row:nth-child(2n){background:${T.fila2}}#${id} .pg-row.leader{background:${T.acento};color:${T.sobre};font-weight:800}
            #${id} .pg-sub{display:block;font-family:${F_TXT};font-size:13px;font-weight:500;line-height:1.4;margin-top:3px;opacity:.68;letter-spacing:0}
            #${id} .pg-summary{display:flex;gap:42px;margin-bottom:26px}#${id} .pg-summary strong{font-family:${F_TIT};font-size:44px;font-weight:700;line-height:1;display:block}
            #${id} .pg-summary span{font-size:13px;font-weight:600;color:${T.gris};display:block;margin-top:7px}
            #${id} .pg-small{font-size:15px;line-height:1.5;color:${T.gris}}#${id} .pg-number{font-family:${F_TIT};font-weight:800}
            </style>
            <div style="position:absolute;right:-260px;top:55px;width:760px;height:1000px;background:${T.franja};transform:rotate(19deg)"></div>
            <img src="${base}${T.logoAgua}" alt="" onerror="this.remove()" style="position:absolute;right:-85px;top:200px;height:670px;width:auto;max-width:none;opacity:${T.opAgua}">
            <div style="position:absolute;top:0;right:0;width:240px;height:12px;background:${T.acento}"></div>
            <header style="position:absolute;left:52px;right:52px;top:42px;height:100px;display:flex;align-items:center;justify-content:space-between;gap:28px">
                <div style="display:flex;align-items:center;gap:18px"><img src="${base}${T.logo}" alt="" onerror="this.remove()" style="height:${T.tamLogo}px;width:auto;max-width:none">${T.logo2 ? `<span style="font-family:${F_TIT};font-weight:800;font-size:34px;color:${T.acento}">×</span><img src="${base}${T.logo2}" alt="" onerror="this.remove()" style="height:${T.tamLogo}px;width:auto;max-width:none">` : ''}<div><div style="font-family:${F_TIT};font-weight:800;font-size:39px;line-height:1">${esc(T.marca)}</div><div style="font-size:12px;font-weight:600;letter-spacing:3px;color:${T.acento};margin-top:10px">${esc(T.lema || 'ENTRENAMIENTOS OFICIALES')}</div></div></div>
                <div style="text-align:right;font-size:15px;line-height:1.3;color:${T.gris};flex-shrink:0"><div style="display:flex;justify-content:flex-end;gap:18px;align-items:baseline"><strong style="font-size:20px;color:${T.piel}">${esc(m.fechaCorta || '')}</strong><span>${esc(m.moderador || 'FREE FIRE')}</span></div>${horas.length?`<div style="display:flex;justify-content:flex-end;gap:22px;margin-top:12px">${horas.map(h=>`<div style="text-align:right"><span style="font-size:12px;font-weight:700;color:${T.gris}">${h.pais}</span> <b style="font-size:21px;color:${T.acento}">${h.hora}</b></div>`).join('')}</div>`:''}</div>
            </header>
            <div style="position:absolute;left:52px;right:52px;top:171px"><h1 class="pg-title" style="font-size:${o.tamTitulo || 88}px">${esc(o.titulo)}</h1><div style="margin-top:17px;font-size:17px;font-weight:500;color:${T.gris}">${esc(o.subtitulo || m.encabezado || T.encabezado || 'Free Fire · Entrenos Pumas')}</div></div>
            <main style="position:absolute;left:52px;right:52px;top:320px;bottom:120px">${cuerpo}</main>
            <footer style="position:absolute;left:52px;right:52px;bottom:35px;border-top:2px solid ${T.linea};padding-top:18px;display:flex;align-items:center;justify-content:space-between;font-size:15px;color:${T.gris}">
                <span style="color:${T.piel};font-weight:600">${T.instagram === '' ? esc(T.marca) : '@' + esc(m.instagram || T.instagram)}</span><span>${esc(m.demo ? 'DATOS DE PRUEBA' : m.pagina || T.pie || 'FREE FIRE / PUMAS')}</span><span style="display:flex;align-items:center;gap:9px">${m.logoDev?`<img src="${base}imagenes/personajes/proyectn.png" alt="" style="height:30px;width:auto;max-width:none">`:''}Dev por <b style="color:${T.piel}">proyectn.com</b></span>
            </footer>
        </div>`;
    }
    const sub = (t, s) => `${esc(t)}<span class="pg-sub">${esc(s || '')}</span>`;
    const etiquetaSec = t => `<h2 class="pg-section">${esc(t)}</h2>`;
    function tabla(cols, filas, opt = {}) {
        const grid = cols.map(c => c.w || '1fr').join(' '), h = opt.fila || 52;
        const cell = (c,v) => `<div class="pg-cell" style="text-align:${c.al || 'center'};${c.total ? 'font-weight:800;' : ''}">${v}</div>`;
        return `<div data-poster-table><div class="pg-grid pg-th" style="grid-template-columns:${grid}">${cols.map(c=>cell(c,esc(c.t))).join('')}</div>${filas.map((f,i)=>`<div class="pg-grid pg-row${opt.destacar && i===0 ? ' leader' : ''}" style="grid-template-columns:${grid};height:${h}px;font-size:${opt.fs || 29}px">${cols.map((c,k)=>cell(c,f[k])).join('')}</div>`).join('')}</div>`;
    }
    const resumen = items => `<div class="pg-summary">${items.map(([v,t])=>`<div><strong>${esc(v)}</strong><span>${esc(t)}</span></div>`).join('')}</div>`;

    function imgTabla(d,o) {
        const n=d.porSala.length, lista=d.equipos.slice(0,16);
        const cols=[{t:'#',w:'56px'},{t:'EQUIPO',w:'minmax(180px,1fr)',al:'left'},...d.porSala.map((s,i)=>({t:'S'+(i+1),w:n>5?'57px':'65px'})),{t:'BOO',w:'56px'},{t:'KILLS',w:'65px'},{t:'TOTAL',w:'82px',total:true}];
        const filas=lista.map((e,i)=>[String(i+1).padStart(2,'0'),esc(e.equipo),...d.porSala.map((_,k)=>e.porSala[k] ? e.porSala[k].pts : '—'),e.booyahs,e.kills,e.pts]);
        return lienzo('pgImgTabla',{...o,titulo:'TABLA GENERAL',subtitulo:`${n} salas · Puntos por sala y clasificación final`},`
            ${resumen([[d.equipos.length,'EQUIPOS'],[n,'SALAS JUGADAS'],[fmt(d.equipos.reduce((a,e)=>a+e.kills,0)),'KILLS TOTALES']])}
            ${tabla(cols,filas,{fila:lista.length>14?43:52,fs:n>5?25:28,destacar:true})}
            <p class="pg-small" style="margin-top:16px">S1–S${n}: puntos por sala · BOO: booyahs · Total: puntos acumulados.</p>`);
    }
    function imgMvp(d,o) {
        const lista=d.jugadores.slice(0,8), primero=lista[0];
        const cols=[{t:'#',w:'48px'},{t:'JUGADOR / EQUIPO',w:'2.1fr',al:'left'},{t:'KILLS',w:'68px'},...(d.conDano?[{t:'DAÑO',w:'110px'}]:[]),{t:'1ª S.',w:'60px'},{t:'REM.',w:'78px'},{t:'MÁS BAJAS A',w:'1.6fr',al:'left'}];
        const filas=lista.map((p,i)=>[String(i+1).padStart(2,'0'),sub(p.jugador,p.equipo),p.kills,...(d.conDano?[fmt(p.dano)]:[]),p.primeras||'—',p.rematados||'—',p.rival?sub(p.rival[0],p.rival[1]+' bajas'):'—']);
        const sangre=d.porSala.filter(s=>s.primeraSangre).slice(0,6);
        return lienzo('pgImgMvp',{...o,titulo:'MVP DETALLADO',subtitulo:'Top jugadores · Kills, daño y primeras sangres'},`
            <div style="display:grid;grid-template-columns:1fr 140px 180px;align-items:center;gap:20px;height:105px;margin-bottom:16px"><div style="min-width:0"><div style="font-size:12px;letter-spacing:2px;color:${T.acento};font-weight:700;margin-bottom:6px">MVP DEL ENTRENO</div><div class="pg-number" style="font-size:51px;line-height:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(primero?primero.jugador:'—')}</div><div class="pg-small" style="margin-top:5px">${esc(primero?primero.equipo:'')}</div></div><div style="text-align:center"><div class="pg-number" style="font-size:72px;line-height:.95;color:${T.acento}">${primero?primero.kills:0}</div><div style="font-size:12px;color:${T.gris};margin-top:5px">KILLS</div></div><div style="background:${T.acento};padding:16px 15px;text-align:center;color:${T.sobre}"><div class="pg-number" style="font-size:43px;line-height:1">${d.conDano&&primero?fmt(primero.dano):d.porSala.length}</div><div style="font-size:12px;font-weight:700;margin-top:5px">${d.conDano?'DAÑO TOTAL':'SALAS'}</div></div></div>
            ${tabla(cols,filas,{fila:52,fs:27,destacar:true})}
            ${sangre.length?`<section style="margin-top:26px">${etiquetaSec('PRIMERA SANGRE POR SALA')}<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:9px">${sangre.map(s=>`<div style="background:${T.fila2};padding:12px 15px;min-width:0"><div style="font-size:20px;color:${T.acento};font-weight:700;margin-bottom:6px">${esc(s.etiqueta)} · ${mmss(s.primeraSangre.tiempo)}</div><div style="font-family:${F_TIT};font-size:32px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(s.primeraSangre.jugador)}</div><div class="pg-small" style="font-size:18px">${esc(s.primeraSangre.arma||'Primera eliminación')}</div></div>`).join('')}</div></section>`:''}`);
    }
    function imgCara(d,s,o) {
        const a=s.mvp1,b=s.mvp2,p=o.personajes||[o.base+'imagenes/personajes/mvp1.png',o.base+'imagenes/personajes/mvp2.png'];
        const card=(j,i)=>`<div style="position:relative;height:365px;overflow:hidden;background:${i===0?T.acento:T.piel}"><img src="${esc(o.base)}${T.logoCarta || 'imagenes/personajes/logo-negro.png'}" alt="" onerror="this.remove()" style="position:absolute;right:-24px;top:5px;height:260px;width:auto;max-width:none;opacity:.08"><img src="${esc(p[i])}" alt="" style="position:absolute;left:50%;top:-20px;height:310px;width:auto;max-width:none;transform:translateX(-50%)"><div style="position:absolute;left:0;right:0;bottom:0;background:${T.fila2};padding:18px 22px"><div style="font-size:12px;color:${T.acento};font-weight:700;margin-bottom:7px">MVP ${i+1}</div><div style="font-family:${F_TIT};font-size:39px;font-weight:800;line-height:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(j?j.jugador:'Sin segundo jugador')}</div><div class="pg-small" style="margin-top:8px">${esc(j?j.equipo:'—')}</div></div></div>`;
        const metricas=[['KILLS',x=>x.kills||0,fmt],...(s.conDano?[['DAÑO',x=>x.dano||0,fmt],['HEADSHOTS',x=>x.headshots||0,fmt]]:[]),['DERRIBOS',x=>((x.extra||{}).bin||{}).derribos||x.derribos||0,fmt],['TIEMPO VIVO',x=>x.vivo||0,mmss],...(s.conDano?[['PAREDES GLOO',x=>x.gloo||0,fmt]]:[])];
        return lienzo('pgImgCara'+s.sala,{...o,titulo:'CARA A CARA',subtitulo:`Sala ${s.sala} · ${s.mapa||'Free Fire'}${s.duracion?' · '+mmss(s.duracion):''}`},`
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">${card(a,0)}${card(b,1)}</div>
            <div style="margin-top:24px">${metricas.map(([t,f,show],i)=>{const av=a?f(a):0,bv=b?f(b):0;return `<div style="display:grid;grid-template-columns:1fr 230px 1fr;align-items:center;min-height:72px;background:${i%2?T.fila2:T.fila1};padding:8px 24px"><strong class="pg-number" style="font-size:41px;text-align:center;color:${av>=bv?T.acento:T.piel}">${show(av)}</strong><span style="text-align:center;font-size:15px;font-weight:600;color:${T.gris}">${t}</span><strong class="pg-number" style="font-size:41px;text-align:center;color:${bv>av?T.acento:T.piel}">${show(bv)}</strong></div>`}).join('')}</div>`);
    }
    function imgEquipos(d,o) {
        const top=d.equipos.slice().sort((a,b)=>b.rematados-a.rematados||b.kills-a.kills).slice(0,5),max=Math.max(1,...top.map(e=>e.rematados));
        const cols=[{t:'#',w:'55px'},{t:'ESCUADRA',w:'2fr',al:'left'},{t:'ELIMINÓ',w:'100px'},{t:'KILLS',w:'80px'},{t:'RIVAL MÁS CASTIGADO',w:'2fr',al:'left'}];
        const filas=top.map((e,i)=>[String(i+1).padStart(2,'0'),esc(e.equipo),e.rematados,e.kills,e.rival?sub(e.rival[0],e.rival[1]+' bajas'):'—']);
        const stats=[['MÁS TIEMPO VIVO',e=>e.vivoProm,mmss],['MÁS DAÑO',e=>e.dano,fmt],['MÁS HEADSHOTS',e=>e.hs,fmt],['MÁS GLOO',e=>e.gloo,fmt],['MÁS DERRIBOS',e=>e.derribos,fmt]].filter(([t])=>d.conDano||t==='MÁS DERRIBOS'||t==='MÁS TIEMPO VIVO');
        const lideres=stats.map(([t,f,show])=>{const e=d.equipos.slice().sort((a,b)=>f(b)-f(a))[0];return e?{t,e,v:show(f(e))}:null}).filter(Boolean);
        return lienzo('pgImgEquipos',{...o,titulo:'DUELO DE ESCUADRAS',tamTitulo:78,subtitulo:'Eliminaciones, rivales y líderes del entrenamiento'},`
            ${etiquetaSec('LAS CINCO ESCUADRAS MÁS LETALES')}${tabla(cols,filas,{fila:62,destacar:true})}
            <section style="margin-top:26px">${etiquetaSec('CARA A CARA · LAS DOS PRIMERAS')}${tabla([{t:'ESCUADRA',w:'2fr',al:'left'},{t:'KILLS',w:'80px'},{t:'BOOYAH',w:'95px'},...(d.conDano?[{t:'DAÑO',w:'125px'}]:[]),{t:'VIVO PROM.',w:'125px'}],top.slice(0,2).map(e=>[esc(e.equipo),e.kills,e.booyahs,...(d.conDano?[fmt(e.dano)]:[]),mmss(e.vivoProm)]),{fila:53,fs:27})}</section>
            <section style="margin-top:30px">${etiquetaSec('LÍDERES DEL ENTRENAMIENTO')}<div style="display:grid;grid-template-columns:repeat(${Math.max(1,lideres.length)},1fr);gap:12px">${lideres.map(x=>`<div style="padding:19px 17px;background:${T.fila2};min-width:0"><div style="font-size:12px;font-weight:700;color:${T.gris}">${x.t}</div><div class="pg-number" style="font-size:40px;line-height:1.3;color:${T.acento}">${x.v}</div><div style="font-family:${F_TIT};font-size:23px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(x.e.equipo)}</div></div>`).join('')}</div></section>`);
    }
    /* ---------------- Habilidad activa de cada jugador (del .bin o del .csv, vía PumasCompletos) ---------------- */
    const habDe = j => {
        const c = C() || {};
        if (c.habilidadDe) return c.habilidadDe(j);
        const x = (j && j.extra) || {}, b = x.bin || {};
        return b.activa ? { activa: b.activa, usos: b.usos || 0 } : x.activa ? { activa: x.activa, usos: x.usos || 0 } : null;
    };
    const habNombre = id => { const c = C() || {}; return c.nombreHabilidad ? c.nombreHabilidad(id) : 'HABILIDAD #' + id; };
    const habFoto = id => { const c = C() || {}; return c.fotoHabilidad ? c.fotoHabilidad(id) : ''; };

    // HABILIDADES, GLOO Y ARMAS: habilidades activas más elegidas, paredes gloo y el arsenal
    function imgArmas(d, o) {
        const habs = {};
        d.salas.forEach(s => s.jugadores.forEach(j => {
            const h = habDe(j); if (!h || !h.activa) return;
            const k = habNombre(h.activa), y = habs[k] = habs[k] || { id: h.activa, veces: 0, usos: 0, kills: 0 };   // por nombre: un personaje puede tener 2 ids (Chrono 3806/7306)
            y.veces++; y.usos += h.usos || 0; y.kills += j.kills || 0;
        }));
        const sinNombre = y => /^HABILIDAD #/.test(habNombre(y.id));
        const lh = Object.values(habs).sort((a, b) => sinNombre(a) - sinNombre(b) || b.veces - a.veces || b.usos - a.usos).slice(0, 6);   // las que aún no tienen nombre, al final
        const totalGloo = d.jugadores.reduce((a, p) => a + (p.gloo || 0), 0);
        const topGloo = d.jugadores.filter(p => p.gloo).sort((a, b) => b.gloo - a.gloo).slice(0, 5);
        const eqGloo = d.equipos.slice().sort((a, b) => b.gloo - a.gloo)[0];
        const armas = d.armas.slice(0, 5), max = Math.max(1, ...armas.map(a => a.kills));
        const cartaHab = y => { const f = habFoto(y.id); return `<div style="position:relative;height:196px;background:${T.fila1};overflow:hidden;min-width:0">
            ${f ? `<img src="${esc(f)}" alt="" onerror="this.remove()" style="position:absolute;left:0;top:0;width:100%;height:auto">` : ''}
            <div style="position:absolute;left:0;right:0;bottom:0;background:${T.fila2};padding:8px 10px;line-height:1.1">
                <div style="font-family:${F_TIT};font-size:22px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(habNombre(y.id))}</div>
                <div style="font-size:11px;color:${T.gris};margin-top:3px"><b style="color:${T.acento}">${y.veces}</b> elegida · ${y.usos} usos</div></div></div>`; };
        return lienzo('pgImgArmas', { ...o, titulo: 'HABILIDADES, GLOO Y ARMAS', tamTitulo: 66, subtitulo: 'Habilidades activas, paredes gloo y armas del entrenamiento' }, `
            ${etiquetaSec('HABILIDADES ACTIVAS MÁS ELEGIDAS')}
            ${lh.length ? `<div style="display:grid;grid-template-columns:repeat(6,1fr);gap:9px">${lh.map(cartaHab).join('')}</div>` : '<p class="pg-small" style="height:196px">Sin datos de habilidades (vienen del .bin o del .csv de resultados completos).</p>'}
            <section style="margin-top:24px">${etiquetaSec('PAREDES GLOO')}
                <div style="display:grid;grid-template-columns:250px 1fr;gap:16px">
                    <div style="background:${T.acento};color:${T.sobre};padding:20px 22px;display:flex;flex-direction:column;justify-content:center">
                        <div class="pg-number" style="font-size:70px;line-height:.95">${fmt(totalGloo)}</div><div style="font-size:13px;font-weight:700;margin-top:6px">PAREDES PUESTAS</div>
                        ${eqGloo && eqGloo.gloo ? `<div style="font-size:12px;font-weight:600;margin-top:14px;opacity:.8">Equipo que más puso</div><div style="font-family:${F_TIT};font-size:24px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(eqGloo.equipo)} · ${eqGloo.gloo}</div>` : ''}
                    </div>
                    ${tabla([{ t: '#', w: '44px' }, { t: 'JUGADOR / EQUIPO', w: '1fr', al: 'left' }, { t: 'GLOO', w: '90px', total: true }],
                        topGloo.map((p, i) => [String(i + 1).padStart(2, '0'), sub(p.jugador, p.equipo), p.gloo]), { fila: 50, fs: 22, destacar: true })}
                </div></section>
            <section style="margin-top:24px">${etiquetaSec('EL ARSENAL DEL ENTRENAMIENTO')}
                ${armas.map((a, i) => `<div style="display:grid;grid-template-columns:40px 165px 1fr 80px 135px;gap:12px;align-items:center;height:44px;background:${i % 2 ? T.fila2 : T.fila1};padding:0 16px;margin-bottom:3px"><span class="pg-number" style="font-size:23px;color:${T.acento}">${i + 1}</span><strong style="font-family:${F_TIT};font-size:27px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(a.arma)}</strong><div style="height:9px;background:${T.linea}"><div style="height:100%;width:${a.kills / max * 100}%;background:${T.acento}"></div></div><span class="pg-number" style="font-size:30px;text-align:right">${a.kills}<span style="font-size:13px;color:${T.gris}"> K</span></span><span class="pg-number" style="font-size:24px;text-align:right;color:${T.gris}">${d.conDano ? fmt(a.dano) : a.usos + ' usos'}</span></div>`).join('') || '<p class="pg-small">Sin datos de armas disponibles.</p>'}
            </section>`);
    }

    // BOOYAH (×sala): el equipo campeón, sus jugadores con estadísticas, el MVP y las escuadras que eliminó
    function imgBooyah(d, s, o) {
        const b = s.booyah, jug = s.ganadores.slice().sort((a, c) => (c.kills || 0) - (a.kills || 0) || (c.dano || 0) - (a.dano || 0));
        const mvp = jug[0], hm = mvp ? habDe(mvp) : null, foto = hm && hm.activa ? habFoto(hm.activa) : '';
        const derr = j => ((j.extra || {}).bin || {}).derribos !== undefined ? j.extra.bin.derribos : (j.derribos || 0);
        const rem = s.rematadas;
        const resumenB = [[b.kills, 'KILLS'], [rem.length, 'ESCUADRAS ELIMINADAS'], ...(s.conDano ? [[fmt(b.dano), 'DAÑO'], [b.hs, 'HEADSHOTS']] : []), [b.gloo || 0, 'PAREDES GLOO'], [b.revividas || 0, 'REVIVIDAS']];
        const cols = [{ t: 'JUGADOR', w: '1.6fr', al: 'left' }, { t: 'KILLS', w: '70px' }, ...(s.conDano ? [{ t: 'DAÑO', w: '92px' }, { t: 'HS', w: '56px' }] : []), { t: 'DERR.', w: '64px' }, { t: 'GLOO', w: '62px' }, { t: 'REV.', w: '56px' }, { t: 'HABILIDAD', w: '1.1fr', al: 'left' }];
        const filas = jug.map(j => { const h = habDe(j); return [esc(j.jugador), j.kills || 0, ...(s.conDano ? [fmt(j.dano), j.headshots || 0] : []), derr(j), j.gloo || 0, j.revividos || 0, h && h.activa ? sub(habNombre(h.activa), (h.usos || 0) + ' usos') : '—']; });
        return lienzo('pgImgBooyah' + s.sala, { ...o, titulo: 'BOOYAH', subtitulo: `Sala ${s.sala} · ${s.mapa || 'Free Fire'}${s.duracion ? ' · ' + mmss(s.duracion) : ''} · El equipo campeón de la sala` }, `
            <div style="display:flex;align-items:flex-end;justify-content:space-between;gap:20px;margin-bottom:18px">
                <div style="min-width:0"><div style="font-size:12px;letter-spacing:2px;color:${T.acento};font-weight:700;margin-bottom:6px">CAMPEÓN DE LA SALA ${s.sala}</div>
                <div class="pg-number" style="font-size:74px;line-height:.95;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(b.equipo)}</div></div>
                <div style="flex-shrink:0;background:${T.acento};color:${T.sobre};padding:10px 18px;font-family:${F_TIT};font-size:30px;font-weight:800;letter-spacing:1px">#1 BOOYAH</div>
            </div>
            ${resumen(resumenB)}
            <div style="display:grid;grid-template-columns:250px 1fr;height:250px;background:${T.fila1};margin-bottom:22px;overflow:hidden">
                <div style="position:relative;background:${T.acento};overflow:hidden">
                    <img src="${esc(foto || (o.base + 'imagenes/personajes/mvp1.png'))}" alt="" onerror="this.remove()" style="position:absolute;left:0;top:0;width:100%;height:auto">
                </div>
                <div style="padding:22px 26px;min-width:0">
                    <div style="font-size:12px;letter-spacing:2px;color:${T.acento};font-weight:700">MVP DEL BOOYAH</div>
                    <div class="pg-number" style="font-size:54px;line-height:1.05;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(mvp ? mvp.jugador : '—')}</div>
                    <div class="pg-small" style="margin-bottom:14px">${hm && hm.activa ? 'Habilidad activa: ' + esc(habNombre(hm.activa)) + ' · ' + (hm.usos || 0) + ' usos' : esc(b.equipo)}</div>
                    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px">${[['KILLS', mvp ? mvp.kills || 0 : 0], ...(s.conDano ? [['DAÑO', fmt(mvp ? mvp.dano : 0)], ['HEADSHOTS', mvp ? mvp.headshots || 0 : 0]] : [['GLOO', mvp ? mvp.gloo || 0 : 0], ['REVIVIDAS', mvp ? mvp.revividos || 0 : 0]]), ['DERRIBOS', mvp ? derr(mvp) : 0]]
                        .map(([t, v]) => `<div style="background:${T.fila2};padding:10px 12px"><div class="pg-number" style="font-size:34px;line-height:1;color:${T.acento}">${v}</div><div style="font-size:11px;font-weight:700;color:${T.gris};margin-top:5px">${t}</div></div>`).join('')}</div>
                </div>
            </div>
            ${etiquetaSec('LOS JUGADORES DEL BOOYAH')}${tabla(cols, filas, { fila: 52, fs: 25 })}
            <section style="margin-top:22px">${etiquetaSec(`ESCUADRAS QUE ELIMINARON · ${rem.length}`)}
                <div style="display:flex;flex-wrap:wrap;gap:8px">${rem.map(e => `<span style="background:${T.fila2};border-left:4px solid ${T.acento};padding:7px 12px;font-family:${F_TIT};font-size:21px;font-weight:700">${esc(e.equipo)} <span style="font-family:${F_TXT};font-size:12px;color:${T.gris};font-weight:600">${mmss(e.tiempo)}</span></span>`).join('') || '<p class="pg-small">No remataron escuadras en esta sala.</p>'}</div>
            </section>`);
    }

    /* ---------------- Todas las salas en una sola imagen ---------------- */
    // Alto de cada fila según cuántas salas hay (caben hasta 6 en los 910 px del cuerpo)
    const altoFila = (n, max) => Math.min(max, Math.floor((900 - 10 * (n - 1)) / Math.max(1, n)));
    const etiquetaSala = s => `<div style="display:flex;flex-direction:column;justify-content:center;gap:4px;background:${T.acento};color:${T.sobre};padding:0 14px;min-width:0">
        <b style="font:800 30px/1 ${F_TIT}">SALA ${s.sala}</b><span style="font:700 13px ${F_TXT};letter-spacing:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(String(s.mapa || '').toUpperCase())}</span>
        ${s.duracion ? `<span style="font:600 12px ${F_TXT};opacity:.75">${mmss(s.duracion)}</span>` : ''}</div>`;

    // CARA A CARA: MVP 1 contra MVP 2 de cada sala
    function imgCaras(d, o) {
        const salas = d.porSala.filter(s => s.mvp1).slice(0, 6);
        if (!salas.length) return '';
        const h = altoFila(salas.length, 160);
        const derr = j => (((j || {}).extra || {}).bin || {}).derribos !== undefined ? j.extra.bin.derribos : ((j || {}).derribos || 0);
        const datosJ = (s, j) => [['K', j ? j.kills || 0 : 0, fmt], ...(s.conDano ? [['DAÑO', j ? j.dano || 0 : 0, fmt], ['HS', j ? j.headshots || 0 : 0, fmt]] : [['DERR.', derr(j), fmt]]), ['VIVO', j ? j.vivo || 0 : 0, mmss]];
        const jugador = (s, j, rival, lado) => {
            const a = datosJ(s, j), b = datosJ(s, rival);
            return `<div style="min-width:0;padding:14px 18px;display:flex;flex-direction:column;justify-content:center;text-align:${lado}">
                <div style="font-size:11px;font-weight:700;letter-spacing:2px;color:${T.acento}">MVP ${lado === 'left' ? 1 : 2}</div>
                <div class="pg-number" style="font-size:${h > 130 ? 34 : 28}px;line-height:1.05;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(j ? j.jugador : '—')}</div>
                <div class="pg-small" style="font-size:13px;line-height:1.3;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(j ? j.equipo : 'Sin segundo jugador')}</div>
                <div style="display:flex;gap:16px;margin-top:8px;justify-content:${lado === 'left' ? 'flex-start' : 'flex-end'}">${a.map(([t, v, f], k) => `<div><div class="pg-number" style="font-size:24px;line-height:1;color:${v >= b[k][1] && j ? T.acento : T.piel}">${f(v)}</div><div style="font-size:10px;font-weight:700;color:${T.gris};margin-top:3px">${t}</div></div>`).join('')}</div>
            </div>`;
        };
        return lienzo('pgImgCaras', { ...o, titulo: 'CARA A CARA', subtitulo: `${salas.length} salas · El MVP 1 contra el MVP 2 de cada sala` }, `
            <div style="display:flex;flex-direction:column;gap:10px">${salas.map((s, i) => `<div style="display:grid;grid-template-columns:150px 1fr 54px 1fr;height:${h}px;background:${i % 2 ? T.fila2 : T.fila1}">
                ${etiquetaSala(s)}${jugador(s, s.mvp1, s.mvp2, 'left')}
                <div style="display:flex;align-items:center;justify-content:center;font:800 26px ${F_TIT};color:${T.gris}">VS</div>
                ${jugador(s, s.mvp2, s.mvp1, 'right')}</div>`).join('')}</div>`);
    }

    // BOOYAH: el campeón de cada sala con sus números, el MVP y sus jugadores
    function imgBooyahs(d, o) {
        const salas = d.porSala.filter(s => s.booyah && s.ganadores.length).slice(0, 6);
        if (!salas.length) return '';
        const h = altoFila(salas.length, 168);
        const fila = (s, i) => {
            const b = s.booyah, jug = s.ganadores.slice().sort((a, c) => (c.kills || 0) - (a.kills || 0) || (c.dano || 0) - (a.dano || 0));
            const mvp = jug[0], hm = mvp ? habDe(mvp) : null, foto = hm && hm.activa ? habFoto(hm.activa) : '';
            const nums = [[b.kills, 'KILLS'], [s.rematadas.length, 'ESC. ELIMINADAS'], ...(s.conDano ? [[fmt(b.dano), 'DAÑO']] : [[b.gloo || 0, 'GLOO']])];
            return `<div style="display:grid;grid-template-columns:150px 1fr 290px;height:${h}px;background:${i % 2 ? T.fila2 : T.fila1};overflow:hidden">
                ${etiquetaSala(s)}
                <div style="min-width:0;padding:12px 18px;display:flex;flex-direction:column;justify-content:center">
                    <div class="pg-number" style="font-size:${h > 140 ? 38 : 30}px;line-height:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(b.equipo)}</div>
                    <div style="display:flex;gap:22px;margin-top:8px">${nums.map(([v, t]) => `<div><div class="pg-number" style="font-size:26px;line-height:1;color:${T.acento}">${v}</div><div style="font-size:10px;font-weight:700;color:${T.gris};margin-top:3px">${t}</div></div>`).join('')}</div>
                    <div style="font-size:12px;color:${T.gris};margin-top:8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${jug.map(j => esc(j.jugador) + ' <b style="color:' + T.piel + '">' + (j.kills || 0) + '</b>').join(' · ')}</div>
                </div>
                <div style="position:relative;display:grid;grid-template-columns:${Math.round(h * .62)}px 1fr;background:${T.fondo}">
                    <div style="position:relative;overflow:hidden;background:${T.acento}">${foto ? `<img src="${esc(foto)}" alt="" onerror="this.remove()" style="position:absolute;left:0;top:0;width:100%;height:auto">` : ''}</div>
                    <div style="padding:12px 14px;min-width:0;display:flex;flex-direction:column;justify-content:center">
                        <div style="font-size:10px;font-weight:700;letter-spacing:2px;color:${T.acento}">MVP</div>
                        <div class="pg-number" style="font-size:24px;line-height:1.05;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(mvp ? mvp.jugador : '—')}</div>
                        <div style="font-size:12px;color:${T.gris};margin-top:4px">${mvp ? (mvp.kills || 0) + ' kills' + (s.conDano ? ' · ' + fmt(mvp.dano) + ' daño' : '') : ''}</div>
                        ${hm && hm.activa ? `<div style="font-size:12px;color:${T.gris}">${esc(habNombre(hm.activa))}</div>` : ''}
                    </div>
                </div></div>`;
        };
        return lienzo('pgImgBooyahs', { ...o, titulo: 'BOOYAH', subtitulo: `${salas.length} salas · El equipo campeón de cada sala` }, `
            <div style="display:flex;flex-direction:column;gap:10px">${salas.map(fila).join('')}</div>`);
    }

    // ANALÍTICA DE MAPA: los cierres y zonas calientes de cada sala (sin la caída)
    function imgMapas(d, o) {
        const paneles = d.porSala.filter(s => PLANOS[s.mapaId] && fasesValidas(s).length).slice(0, 6)
            .map(s => ({ s, z: imgMapa(d, s, o, 'zonasPanel') })).filter(x => x.z);
        if (!paneles.length) return '';
        const cols = paneles.length <= 4 && paneles.length !== 3 ? 2 : 3, gap = 18, ANCHO = 976, px = Math.floor((ANCHO - gap * (cols - 1)) / cols);
        const tam = cols === 2 ? Math.min(px, 340) : px;
        const panel = ({ s, z }) => `<div style="min-width:0;background:${T.fila1}">
            <div style="display:flex;justify-content:space-between;align-items:center;height:34px;padding:0 12px;background:${T.acento};color:${T.sobre}">
                <b style="font:800 20px ${F_TIT}">SALA ${s.sala}</b><span style="font:700 15px ${F_TIT};letter-spacing:.5px">${esc(String(s.mapa || '').toUpperCase())}</span></div>
            <div style="position:relative;width:${tam}px;height:${tam}px;overflow:hidden;margin:0 auto;background:#0d1a22">${z.html(tam)}</div>
            <div style="padding:10px 12px 12px;line-height:1.25">
                <div style="font-family:${F_TIT};font-size:21px;font-weight:700">Z${z.fin.fase} · ${z.fin.r} m <span style="color:${T.gris};font-size:15px">· cerró ${mmss(z.fin.fin)}</span></div>
                <div style="font-size:12px;color:${T.gris};margin-top:3px">${z.enfr} enfrentamientos · ${z.pct}% mientras cerraba${z.top[0] ? ' · punto 1: ' + z.top[0].n : ''}</div>
            </div></div>`;
        return lienzo('pgImgMapas', { ...o, titulo: 'ANALÍTICA DE MAPA', tamTitulo: 80, subtitulo: `${paneles.length} salas · Cierres de zona y zonas calientes (sin la caída)` }, `
            <div style="display:grid;grid-template-columns:repeat(${cols},${px}px);gap:${gap}px">${paneles.map(panel).join('')}</div>
            <p class="pg-small" style="margin-top:14px">Círculos: cada cierre de zona (la final en color) · calor: enfrentamientos desde que cierra la Z1 · números: puntos más calientes.</p>`);
    }

    // ZONAS DE CAÍDA (todas las salas en una imagen): dónde se pelearon al aterrizar, hasta que cierra la Z1
    function imgCaidas(d, o) {
        const paneles = d.porSala.filter(s => PLANOS[s.mapaId] && fasesValidas(s).length).slice(0, 6)
            .map(s => ({ s, z: imgMapa(d, s, o, 'caidaPanel') })).filter(x => x.z);
        if (!paneles.length) return '';
        const cols = paneles.length <= 4 && paneles.length !== 3 ? 2 : 3, gap = 18, ANCHO = 976, px = Math.floor((ANCHO - gap * (cols - 1)) / cols);
        const tam = cols === 2 ? Math.min(px, 340) : px;
        const panel = ({ s, z }) => `<div style="min-width:0;background:${T.fila1}">
            <div style="display:flex;justify-content:space-between;align-items:center;height:34px;padding:0 12px;background:${T.acento};color:${T.sobre}">
                <b style="font:800 20px ${F_TIT}">SALA ${s.sala}</b><span style="font:700 15px ${F_TIT};letter-spacing:.5px">${esc(String(s.mapa || '').toUpperCase())}</span></div>
            <div style="position:relative;width:${tam}px;height:${tam}px;overflow:hidden;margin:0 auto;background:#0d1a22">${z.html(tam)}</div>
            <div style="padding:10px 12px 12px;line-height:1.25">
                <div style="font-family:${F_TIT};font-size:21px;font-weight:700">${z.enfr} enfrentamientos <span style="color:${T.gris};font-size:15px">· hasta ${mmss(z.corte)}</span></div>
                <div style="font-size:12px;color:${T.gris};margin-top:3px">${z.elim} eq. eliminados en la caída${z.top[0] ? ' · punto 1: ' + z.top[0].n + ' enfr.' : ''}</div>
            </div></div>`;
        return lienzo('pgImgCaidas', { ...o, titulo: 'ZONAS DE CAÍDA', tamTitulo: 80, subtitulo: `${paneles.length} salas · Las peleas al aterrizar, hasta que cierra la Z1` }, `
            <div style="display:grid;grid-template-columns:repeat(${cols},${px}px);gap:${gap}px">${paneles.map(panel).join('')}</div>
            <p class="pg-small" style="margin-top:14px">El círculo blanco es dónde cae la Z1 · los números son los puntos más calientes de cada caída.</p>`);
    }

    /* ---------------- Analítica de mapa ---------------- */
    // MapID → imagen del plano (1200 px = plano 0–1000) y calibración mundo → plano:
    //   u = (x − x0) / lado · 1000 ;  v = (z0 + lado − z) / lado · 1000   (validado con replays de FFWS)
    const PLANOS = {
        1:  { img: 'bermuda',    x0: -397.9,  z0: -816.8,  lado: 1840.0 },
        3:  { img: 'purgatorio', x0: -1000.3, z0: -1079.8, lado: 1826.7 },
        4:  { img: 'kalahari',   x0: -710.2,  z0: -709.3,  lado: 1419.8 },
        22: { img: 'nexterra',   x0: -632.9,  z0: -632.4,  lado: 1268.9 },
        29: { img: 'solara',     x0: -709.7,  z0: -716.9,  lado: 1496.3 }
    };
    const fasesValidas = s => (s.zonas && s.zonas.fases || []).filter(f => !s.duracion || f.anuncia < s.duracion);
    // Fase en la que pasó algo: hasta que termina de cerrar la zona n (lo de después de la última, en la última)
    const faseDe = (fases, t) => { const i = fases.findIndex(f => t <= f.fin); return i < 0 ? fases.length - 1 : i; };

    // Mapa de calor como PNG (el exportador copia bien las <img>; los degradados radiales no siempre)
    function calor(puntos, lado, radio) {
        if (typeof document === 'undefined' || !puntos.length) return '';
        const c = document.createElement('canvas'); c.width = c.height = lado;
        const g = c.getContext('2d');
        puntos.forEach(([x, y]) => {
            const r = g.createRadialGradient(x, y, 0, x, y, radio);
            r.addColorStop(0, 'rgba(0,0,0,.20)'); r.addColorStop(1, 'rgba(0,0,0,0)');
            g.fillStyle = r; g.beginPath(); g.arc(x, y, radio, 0, 7); g.fill();
        });
        const im = g.getImageData(0, 0, lado, lado), px = im.data;
        let max = 0;
        for (let i = 3; i < px.length; i += 4) if (px[i] > max) max = px[i];
        if (!max) return '';
        // Rampa: amarillo → naranja → rojo, más opaco donde hubo más enfrentamientos
        const rampa = [[255, 236, 120], [255, 160, 40], [235, 40, 30], [150, 0, 20]];
        for (let i = 0; i < px.length; i += 4) {
            const a = Math.sqrt(px[i + 3] / max);   // raíz: las zonas con pocas peleas también se ven
            if (a < .06) { px[i + 3] = 0; continue; }
            const k = Math.min(rampa.length - 1.001, a * (rampa.length - 1)), j = Math.floor(k), f = k - j, A = rampa[j], B = rampa[j + 1];
            px[i] = A[0] + (B[0] - A[0]) * f; px[i + 1] = A[1] + (B[1] - A[1]) * f; px[i + 2] = A[2] + (B[2] - A[2]) * f;
            px[i + 3] = Math.round(Math.min(1, .25 + a * .85) * 215);
        }
        g.putImageData(im, 0, 0);
        return c.toDataURL('image/png');
    }

    // Puntos calientes: el sitio con más enfrentamientos alrededor, se quita y se busca el siguiente
    function calientes(pts, radio, n) {
        let quedan = pts.slice();
        const out = [];
        while (out.length < n && quedan.length) {
            let mejor = null;
            quedan.forEach(p => {
                const cerca = quedan.filter(q => Math.hypot(q.u - p.u, q.v - p.v) <= radio);
                if (!mejor || cerca.length > mejor.cerca.length) mejor = { p, cerca };
            });
            if (!mejor || mejor.cerca.length < 4) break;
            const u = mejor.cerca.reduce((a, q) => a + q.u, 0) / mejor.cerca.length, v = mejor.cerca.reduce((a, q) => a + q.v, 0) / mejor.cerca.length;
            const ts = mejor.cerca.map(q => q.t).sort((a, b) => a - b);
            out.push({ u, v, n: mejor.cerca.length, desde: ts[0], hasta: ts[ts.length - 1], fases: mejor.cerca.map(q => q.fase) });
            quedan = quedan.filter(q => Math.hypot(q.u - u, q.v - v) > radio * 1.6);
        }
        return out;
    }

    function imgMapa(d, s, o, modo) {
        const P = PLANOS[s.mapaId], fases = fasesValidas(s), base = esc(o.base || '../'), caida = modo === 'caida' || modo === 'caidaPanel';
        const aU = x => (x - P.x0) / P.lado * 1000, aV = z => (P.z0 + P.lado - z) / P.lado * 1000, aR = r => r / P.lado * 1000;
        // Corte: cuando empieza a cerrar la Z1. Antes son las peleas de la caída (van en su propia imagen, opcional)
        const corte = fases[0] ? fases[0].inicio : 0;
        const todos = s.combates.map(c => ({ t: c.t, u: aU(c.x), v: aV(c.z), fase: faseDe(fases, c.t) }))
            .filter(p => p.u > -20 && p.u < 1020 && p.v > -20 && p.v < 1020);
        const pts = todos.filter(p => caida ? p.t < corte : p.t >= corte);
        const dib = caida ? fases.slice(0, 1) : fases;   // en la caída solo se marca dónde cae la Z1

        // Mapa completo (sin recortes) + recuadro con zoom de las últimas zonas, que en el mapa entero quedan chicas
        const ultimo = fases.length - 1, PX = 600;
        const top = calientes(pts, caida ? 40 : 50, caida ? 5 : 3);
        function vista(vx, vy, lado, px, radioPlano, conMarcas, lista = pts) {
            const k = px / lado, X = u => (u - vx) * k, Y = v => (v - vy) * k;
            const urlCalor = calor(lista.map(p => [X(p.u), Y(p.v)]).filter(([x, y]) => x > -40 && y > -40 && x < px + 40 && y < px + 40), px, Math.max(6, radioPlano * k));
            // Círculos de zona (div redondos: el exportador los copia sin problemas)
            const circulos = dib.map((f, i) => {
                const u = aU(f.x), v = aV(f.z), r = aR(f.r), fin = i === ultimo || (i === ultimo - 1 && fases[ultimo].movil);
                const borde = f.movil ? `border:3px dashed ${T.acento}` : fin ? `border:3px solid ${T.acento};background:${T.acento}2E` : `border:2px solid rgba(255,255,255,${.45 + i * .1})`;
                const tag = r * k > 18 && r * k < px * .9 ? `<span style="position:absolute;left:50%;top:-12px;transform:translateX(-50%);background:${fin || f.movil ? T.acento : T.piel};color:${fin || f.movil ? T.sobre : '#111'};font:800 13px ${F_TIT};padding:1px 5px;line-height:1.2;white-space:nowrap">Z${f.fase}</span>` : '';
                return `<div style="position:absolute;left:${X(u - r)}px;top:${Y(v - r)}px;width:${2 * r * k}px;height:${2 * r * k}px;border-radius:50%;box-sizing:border-box;${borde}">${tag}</div>`;
            }).join('');
            const marcas = conMarcas ? top.map((h, i) => `<div style="position:absolute;left:${X(h.u) - 15}px;top:${Y(h.v) - 15}px;width:30px;height:30px;border-radius:50%;background:${T.fondo};border:3px solid #FFD54A;color:#FFD54A;font:800 18px/24px ${F_TIT};text-align:center">${i + 1}</div>`).join('') : '';
            return `<img src="${base}imagenes/mapas/${P.img}.png" alt="" style="position:absolute;left:${-vx * k}px;top:${-vy * k}px;width:${1000 * k}px;height:${1000 * k}px;max-width:none;filter:saturate(.55) brightness(.62)">
                ${urlCalor ? `<img src="${urlCalor}" alt="" style="position:absolute;left:0;top:0;width:${px}px;height:${px}px;max-width:none">` : ''}${circulos}${marcas}`;
        }
        // Zoom de las zonas finales: un panel de la imagen "Zonas finales" (todas las salas juntas)
        if (modo === 'zoom') {
            const iz = Math.max(0, ultimo - 3), zf = fases[iz];
            if (!zf) return null;
            const ladoZ = Math.min(1000, aR(zf.r) * 2.4), zx = Math.min(1000 - ladoZ, Math.max(0, aU(zf.x) - ladoZ / 2)), zy = Math.min(1000 - ladoZ, Math.max(0, aV(zf.z) - ladoZ / 2));
            const tarde = pts.filter(p => p.fase >= iz), fin = fases.filter(f => !f.movil).slice(-1)[0] || fases[ultimo];
            return { zf, fin, movil: fases.find(f => f.movil) || null, enfr: tarde.length,
                elim: s.eliminados.filter(e => faseDe(fases, e.tiempo) >= iz).length,
                html: px => vista(zx, zy, ladoZ, px, Math.max(4, ladoZ * .03), false, tarde) };
        }
        const zoom = '';
        if (modo === 'zonasPanel') {
            const fin = fases.filter(f => !f.movil).slice(-1)[0] || fases[ultimo];
            const cierre = pts.filter(p => fases.some(f => p.t >= f.inicio && p.t < f.fin)).length;
            return { fin, top, enfr: pts.length, pct: pts.length ? Math.round(cierre / pts.length * 100) : 0, html: px => vista(0, 0, 1000, px, 45, true) };
        }
        if (modo === 'caidaPanel') return { corte, top, enfr: pts.length, elim: s.eliminados.filter(e => e.tiempo < corte).length, html: px => vista(0, 0, 1000, px, 62, true) };

        const mapa = `<div style="position:relative;width:${PX}px;height:${PX}px;overflow:hidden;background:#0d1a22;border:1px solid ${T.linea}">
            ${vista(0, 0, 1000, PX, caida ? 40 : 28, true)}${zoom}
            <div style="position:absolute;left:12px;bottom:10px;display:flex;align-items:center;gap:8px;background:rgba(0,0,0,.6);padding:6px 10px;font-size:12px;font-weight:600;color:#ddd">Menos<span style="display:inline-block;width:90px;height:9px;background:linear-gradient(90deg,#ffec78,#ffa028,#eb281e,#960014)"></span>Más enfrentamientos</div>
        </div>`;

        // Lista de cierres
        const cuenta = (l, i) => l.filter(x => x === i).length;
        const fasesPts = pts.map(p => p.fase), fasesElim = s.eliminados.map(e => faseDe(fases, e.tiempo));
        const filaZ = (f, i) => `<div style="display:grid;grid-template-columns:52px 1fr 64px;align-items:center;gap:8px;height:54px;padding:0 12px;background:${i % 2 ? T.fila2 : T.fila1};margin-bottom:3px">
            <span class="pg-number" style="font-size:27px;color:${f.movil || i === ultimo ? T.acento : T.piel}">Z${f.fase}</span>
            <div style="min-width:0;line-height:1.15"><div style="font-family:${F_TIT};font-size:21px;font-weight:700;white-space:nowrap">${f.movil ? 'ZONA MÓVIL' : f.r + ' m'} <span style="color:${T.gris};font-size:16px;font-weight:600">· ${f.movil ? 'se mueve desde ' + mmss(f.anuncia) : 'cierra ' + mmss(f.inicio) + '–' + mmss(f.fin)}</span></div>
            <div style="font-size:12px;color:${T.gris};margin-top:2px;white-space:nowrap">${f.movil ? '' : 'Aviso ' + mmss(f.anuncia) + ' · espera ' + mmss(f.inicio - f.anuncia) + ' · '}${cuenta(fasesElim, i)} eq. eliminados</div></div>
            <div style="text-align:right"><div class="pg-number" style="font-size:25px;line-height:1">${cuenta(fasesPts, i)}</div><div style="font-size:10px;color:${T.gris};font-weight:700">ENFR.</div></div></div>`;
        const filaH = (h, i) => {
            const fz = h.fases.reduce((m, x) => (m[x] = (m[x] || 0) + 1, m), {}), dom = +Object.entries(fz).sort((a, b) => b[1] - a[1])[0][0];
            return `<div style="display:grid;grid-template-columns:40px 1fr;align-items:center;gap:10px;height:50px;padding:0 12px;background:${i % 2 ? T.fila2 : T.fila1};margin-bottom:3px">
            <span style="width:30px;height:30px;border-radius:50%;border:3px solid #FFD54A;color:#FFD54A;font:800 18px/24px ${F_TIT};text-align:center">${i + 1}</span>
            <div style="line-height:1.15"><div style="font-family:${F_TIT};font-size:22px;font-weight:700">${h.n} enfrentamientos</div><div style="font-size:12px;color:${T.gris}">Min ${mmss(h.desde)}–${mmss(h.hasta)} · sobre todo en Z${fases[dom] ? fases[dom].fase : dom + 1}</div></div></div>`;
        };

        // Línea de tiempo: enfrentamientos por minuto + espera / cierre de cada zona + equipos eliminados
        const dur = Math.max(s.duracion || 0, ...fases.map(f => f.fin), ...pts.map(p => p.t), 60), ANCHO = 976, tx = t => Math.min(ANCHO, t / dur * ANCHO);
        const nb = Math.ceil(dur / 60), barras = Array.from({ length: nb }, (_, i) => todos.filter(p => p.t >= i * 60 && p.t < (i + 1) * 60).length), mb = Math.max(1, ...barras);
        const cierreEn = t => fases.some(f => t >= f.inicio && t < f.fin);
        const linea = `<div style="position:relative;width:${ANCHO}px;height:205px">
            ${barras.map((n, i) => `<div style="position:absolute;left:${tx(i * 60) + 1}px;width:${Math.max(2, tx(60) - 3)}px;bottom:70px;height:${Math.round(n / mb * 115)}px;background:${cierreEn(i * 60 + 30) ? T.acento : T.gris};opacity:${(i + 1) * 60 <= corte ? .2 : cierreEn(i * 60 + 30) ? .95 : .55}"></div>`).join('')}
            <div style="position:absolute;left:0;right:0;bottom:44px;height:22px;background:${T.fila1}"></div>
            ${fases.map(f => `<div style="position:absolute;left:${tx(f.anuncia)}px;width:${tx(f.inicio) - tx(f.anuncia)}px;bottom:44px;height:22px;background:${T.linea}"></div><div style="position:absolute;left:${tx(f.inicio)}px;width:${Math.max(2, tx(f.fin) - tx(f.inicio))}px;bottom:44px;height:22px;background:${T.acento};color:${T.sobre};font:800 13px/22px ${F_TIT};text-align:center;overflow:hidden">${tx(f.fin) - tx(f.inicio) > 26 ? 'Z' + f.fase : ''}</div>`).join('')}
            ${s.eliminados.map(e => `<div style="position:absolute;left:${tx(e.tiempo) - 5}px;bottom:30px;width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-bottom:9px solid ${T.piel}"></div>`).join('')}
            ${Array.from({ length: Math.floor(dur / 120) + 1 }, (_, i) => `<span style="position:absolute;left:${tx(i * 120)}px;bottom:4px;transform:translateX(${i ? '-50%' : '0'});font-size:12px;color:${T.gris};font-weight:600">${i * 2}:00</span>`).join('')}
        </div>`;


        // Imagen de la caída: dónde se pelearon los equipos al aterrizar, hasta que empezó a cerrar la Z1
        function cuerpoCaida() {
            const elim = s.eliminados.filter(e => e.tiempo < corte);
            const filaC = (h, i) => `<div style="display:grid;grid-template-columns:44px 1fr 70px;align-items:center;gap:10px;height:62px;padding:0 12px;background:${i % 2 ? T.fila2 : T.fila1};margin-bottom:3px">
                <span style="width:32px;height:32px;border-radius:50%;border:3px solid #FFD54A;color:#FFD54A;font:800 19px/26px ${F_TIT};text-align:center">${i + 1}</span>
                <div style="line-height:1.15"><div style="font-family:${F_TIT};font-size:23px;font-weight:700">Punto caliente ${i + 1}</div><div style="font-size:12px;color:${T.gris}">Min ${mmss(h.desde)}–${mmss(h.hasta)}</div></div>
                <div style="text-align:right"><div class="pg-number" style="font-size:28px;line-height:1">${h.n}</div><div style="font-size:10px;color:${T.gris};font-weight:700">ENFR.</div></div></div>`;
            const primero = pts.slice().sort((a, b) => a.t - b.t)[0];
            // Enfrentamientos cada 20 s hasta que cierra la Z1
            const fin = Math.max(60, corte), paso = 20, nb = Math.ceil(fin / paso), ANCHO = 976, tx = t => Math.min(ANCHO, t / fin * ANCHO);
            const barras = Array.from({ length: nb }, (_, i) => pts.filter(p => p.t >= i * paso && p.t < (i + 1) * paso).length), mb = Math.max(1, ...barras);
            const z1 = fases[0];
            const linea = `<div style="position:relative;width:${ANCHO}px;height:205px">
                ${barras.map((n, i) => `<div style="position:absolute;left:${tx(i * paso) + 1}px;width:${Math.max(2, tx(paso) - 3)}px;bottom:70px;height:${Math.round(n / mb * 115)}px;background:${T.acento};opacity:.9"></div>`).join('')}
                <div style="position:absolute;left:0;right:0;bottom:44px;height:22px;background:${T.fila1}"></div>
                ${z1 ? `<div style="position:absolute;left:${tx(z1.anuncia)}px;right:0;bottom:44px;height:22px;background:${T.linea};color:${T.piel};font:700 13px/22px ${F_TIT};padding-left:8px;white-space:nowrap;overflow:hidden">AVISO Z1 · cierra en ${mmss(z1.inicio - z1.anuncia)}</div>` : ''}
                ${elim.map(e => `<div style="position:absolute;left:${tx(e.tiempo) - 5}px;bottom:30px;width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-bottom:9px solid ${T.piel}"></div>`).join('')}
                ${Array.from({ length: Math.floor(fin / 60) + 1 }, (_, i) => `<span style="position:absolute;left:${tx(i * 60)}px;bottom:4px;transform:translateX(${i ? '-50%' : '0'});font-size:12px;color:${T.gris};font-weight:600">${i}:00</span>`).join('')}
            </div>`;
            return lienzo('pgImgCaida' + s.sala, { ...o, titulo: 'ZONAS DE CAÍDA', tamTitulo: 80, subtitulo: `Sala ${s.sala} · ${s.mapa || 'Free Fire'} · Peleas al aterrizar, hasta que cierra la Z1 (${mmss(corte)})` }, `
                <div style="display:grid;grid-template-columns:${PX}px 1fr;gap:22px">
                    ${mapa}
                    <div style="min-width:0">
                        ${resumen([[pts.length, 'ENFRENTAMIENTOS'], [elim.length, 'EQUIPOS FUERA']])}
                        <div style="margin:-8px 0 22px" class="pg-small">${primero ? 'Primer enfrentamiento: ' + mmss(primero.t) : 'Sin enfrentamientos en la caída'}${z1 ? ' · La Z1 cae en el círculo blanco' : ''}</div>
                        ${etiquetaSec('PUNTOS MÁS CALIENTES')}${top.map(filaC).join('') || '<p class="pg-small">Pocos enfrentamientos para marcar puntos calientes.</p>'}
                    </div>
                </div>
                <div style="display:flex;justify-content:space-between;align-items:baseline;margin:22px 0 4px"><h2 class="pg-section" style="margin:0">ENFRENTAMIENTOS CADA 20 SEGUNDOS</h2>
                    <span class="pg-small">▲ equipo eliminado en la caída</span></div>
                ${linea}`);
        }
        if (caida) return cuerpoCaida();
        const enCierre = pts.filter(p => cierreEn(p.t)).length;
        return lienzo('pgImgMapa' + s.sala, { ...o, titulo: 'ANALÍTICA DE MAPA', tamTitulo: 80, subtitulo: `Sala ${s.sala} · ${s.mapa || 'Free Fire'}${s.duracion ? ' · ' + mmss(s.duracion) : ''} · Cierres de zona y zonas calientes` }, `
            <div style="display:grid;grid-template-columns:${PX}px 1fr;gap:22px">
                ${mapa}
                <div style="min-width:0">
                    ${etiquetaSec('CIERRES DE ZONA')}${fases.map(filaZ).join('')}
                    <section style="margin-top:18px">${etiquetaSec('ZONAS CALIENTES')}${top.map(filaH).join('') || `<p class="pg-small">Pocos enfrentamientos para marcar puntos calientes.</p>`}</section>
                </div>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:baseline;margin:22px 0 4px"><h2 class="pg-section" style="margin:0">ENFRENTAMIENTOS POR MINUTO Y ZONA</h2>
                <span class="pg-small">${pts.length} enfrentamientos desde ${mmss(corte)} (sin la caída) · ${pts.length ? Math.round(enCierre / pts.length * 100) : 0}% mientras cerraba la zona · ▲ equipo eliminado</span></div>
            ${linea}`);
    }
    function imgFinales(d, o) {
        const paneles = d.porSala.filter(s => PLANOS[s.mapaId] && fasesValidas(s).length > 2).slice(0, 6)
            .map(s => ({ s, z: imgMapa(d, s, o, 'zoom') })).filter(x => x.z);
        if (!paneles.length) return '';
        const cols = paneles.length <= 4 && paneles.length !== 3 ? 2 : 3, gap = 18, ANCHO = 976, px = Math.floor((ANCHO - gap * (cols - 1)) / cols);
        const tam = cols === 2 ? Math.min(px, 340) : px;
        const panel = ({ s, z }) => `<div style="min-width:0;background:${T.fila1}">
            <div style="display:flex;justify-content:space-between;align-items:center;height:34px;padding:0 12px;background:${T.acento};color:${T.sobre}">
                <b style="font:800 20px ${F_TIT}">SALA ${s.sala}</b><span style="font:700 15px ${F_TIT};letter-spacing:.5px">${esc(String(s.mapa || '').toUpperCase())}</span></div>
            <div style="position:relative;width:${tam}px;height:${tam}px;overflow:hidden;margin:0 auto;background:#0d1a22">${z.html(tam)}</div>
            <div style="padding:10px 12px 12px;line-height:1.25">
                <div style="font-family:${F_TIT};font-size:21px;font-weight:700">Z${z.fin.fase} · ${z.fin.r} m <span style="color:${T.gris};font-size:15px">· cerró ${mmss(z.fin.fin)}</span></div>
                <div style="font-size:12px;color:${T.gris};margin-top:3px">${z.enfr} enfrentamientos y ${z.elim} eq. eliminados desde Z${z.zf.fase}${z.movil ? ' · zona móvil ' + mmss(z.movil.anuncia) : ''}</div>
            </div></div>`;
        return lienzo('pgImgFinales', { ...o, titulo: 'ZONAS FINALES', tamTitulo: 80, subtitulo: `${paneles.length} salas · Dónde cerró la zona y las peleas del final de cada partida` }, `
            <div style="display:grid;grid-template-columns:repeat(${cols},${px}px);gap:${gap}px">${paneles.map(panel).join('')}</div>
            <p class="pg-small" style="margin-top:14px">Cada recuadro muestra las últimas zonas de la sala (desde la que dice abajo) · la zona final en rojo · el calor son los enfrentamientos de ese tramo.</p>`);
    }

    /* ---------------- API ---------------- */
    function generar(x) {
        fuentes();
        const prev = T;
        T = TEMAS[x.estilo] || TEMAS[estilo];
        try { return armar(x); } finally { T = prev; }
    }
    function armar(x) {
        const d = datos(x.salas, x.r, x.puntosLog);
        const m = Object.assign({}, x.meta || {});
        if (m.fecha && !m.fechaCorta) { const f = new Date(m.fecha.replace(' ', 'T')); m.fechaCorta = isNaN(f) ? m.fecha : f.toLocaleDateString('es', { day: '2-digit', month: 'short' }).toUpperCase(); }
        const o = { meta: m, base: x.base || '../', personajes: x.personajes };
        const L = [{ id: 'pgImgTabla', nombre: 'Tabla_General.png', titulo: 'Tabla general', html: imgTabla(d, o) },
            { id: 'pgImgMvp', nombre: 'MVP_Detallado.png', titulo: 'MVP detallado', html: imgMvp(d, o) }];
        // Cara a cara: todas las salas en una imagen
        const caras = imgCaras(d, o);
        if (caras) L.push({ id: 'pgImgCaras', nombre: 'Cara_a_cara.png', titulo: 'Cara a cara', html: caras });
        L.push({ id: 'pgImgEquipos', nombre: 'Duelo_de_escuadras.png', titulo: 'Duelo de escuadras', html: imgEquipos(d, o) },
            { id: 'pgImgArmas', nombre: 'Habilidades_gloo_y_armas.png', titulo: 'Habilidades y armas', html: imgArmas(d, o) });
        // Booyah: el campeón de cada sala, todas las salas en una imagen
        const booyahs = imgBooyahs(d, o);
        if (booyahs) L.push({ id: 'pgImgBooyahs', nombre: 'Booyah.png', titulo: 'Booyah', html: booyahs });
        // Analítica de mapa: las salas con zonas del .bin y un mapa conocido, todas en una imagen (opcional)
        const mapas = imgMapas(d, o);
        if (mapas) L.push({ id: 'pgImgMapas', nombre: 'Analitica_de_mapa.png', titulo: 'Mapa', opcional: true, html: mapas });
        // Zonas finales: el zoom de las últimas zonas de todas las salas en una sola imagen (opcional)
        const finales = imgFinales(d, o);
        if (finales) L.push({ id: 'pgImgFinales', nombre: 'Zonas_finales.png', titulo: 'Zonas finales', opcional: true, html: finales });
        // Zonas de caída: todas las salas en una imagen (opcional)
        const caidas = imgCaidas(d, o);
        if (caidas) L.push({ id: 'pgImgCaidas', nombre: 'Zonas_de_caida.png', titulo: 'Caídas', opcional: true, html: caidas });
        return L;
    }

    // Captura a 1080×1350 aunque la vista previa esté reducida (se quita la escala en la copia)
    async function descargar(id, nombre) {
        const el = document.getElementById(id);
        if (!el) throw new Error('No se encontró la imagen para descargar.');
        if (typeof html2canvas !== 'function') throw new Error('No se cargó el exportador de imágenes. Recarga el panel.');
        if (document.fonts && document.fonts.ready) await document.fonts.ready;
        await Promise.all(Array.from(el.querySelectorAll('img')).map(im => im.decode ? im.decode().catch(() => {}) : Promise.resolve()));
        const c = await html2canvas(el, { scale: 1, width: W, height: H, useCORS: true, allowTaint: false, backgroundColor: getComputedStyle(el).backgroundColor || TINTA,
            onclone: doc => {
                const e = doc.getElementById(id);
                for (let p = e && e.parentElement, k = 0; p && k < 2; p = p.parentElement, k++) { p.style.transform = 'none'; p.style.width = W + 'px'; p.style.height = H + 'px'; p.style.overflow = 'visible'; }
            } });
        const a = document.createElement('a');
        a.download = nombre; a.href = c.toDataURL('image/png'); a.click();
        return a.href;
    }

    /* Qué imágenes entran en "Descargar seleccionadas": todas marcadas menos las opcionales (mapa, zonas finales, caída); se recuerda mientras la página esté abierta */
    const marcadas = new Map();
    const incluida = im => marcadas.has(im.id) ? marcadas.get(im.id) : !im.opcional;
    const paraDescargar = imagenes => imagenes.map((im, i) => incluida(im) ? i : -1).filter(i => i >= 0);
    function selectorDescargaHTML(imagenes) {
        const chip = im => `<label style="display:inline-flex;align-items:center;gap:6px;padding:5px 10px;border:1px solid rgba(255,255,255,.18);border-radius:6px;font-size:.78rem;color:#ddd;cursor:pointer;user-select:none"><input type="checkbox" data-pg-inc="${esc(im.id)}"${incluida(im) ? ' checked' : ''} style="accent-color:${TEMAS[estilo].acento};width:15px;height:15px;margin:0">${esc(im.titulo)}</label>`;
        return `<details open class="pg-sel-descarga" style="width:100%;max-width:760px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.1);border-radius:8px;padding:10px 14px">
            <summary style="cursor:pointer;font-size:.85rem;color:#ccc">Elige qué bajar con “Descargar seleccionadas” · <b data-pg-cuenta>${paraDescargar(imagenes).length}</b> de ${imagenes.length} marcadas</summary>
            <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:10px">${imagenes.map(chip).join('')}</div>
            <div style="display:flex;gap:12px;margin-top:8px;font-size:.78rem"><a href="#" data-pg-todas="1" style="color:#aaa">Marcar todas</a><a href="#" data-pg-todas="0" style="color:#aaa">Quitar todas</a></div>
        </details>`;
    }
    function enlazarDescarga(raiz, imagenes) {
        if (!raiz) return;
        const contar = () => raiz.querySelectorAll('[data-pg-cuenta]').forEach(e => { e.textContent = paraDescargar(imagenes).length; });
        raiz.querySelectorAll('[data-pg-inc]').forEach(c => c.onchange = () => { marcadas.set(c.dataset.pgInc, c.checked); contar(); });
        raiz.querySelectorAll('[data-pg-todas]').forEach(a => a.onclick = e => {
            e.preventDefault();
            const si = a.dataset.pgTodas === '1';
            raiz.querySelectorAll('[data-pg-inc]').forEach(c => { c.checked = si; marcadas.set(c.dataset.pgInc, si); });
            contar();
        });
        contar();
    }

    /* Selector de estilo (Crazy Pumas / Pumas) para poner encima de las imágenes */
    function selectorHTML() {
        const b = (k, t) => `<button type="button" data-pg-estilo="${k}" aria-pressed="${estilo === k}" style="padding:9px 18px;border-radius:6px;cursor:pointer;font-weight:700;font-size:.85rem;letter-spacing:.5px;border:1px solid ${t.acento};background:${estilo === k ? t.acento : 'transparent'};color:${estilo === k ? t.sobre : t.acento}">${esc(t.nombre.toUpperCase())}</button>`;
        return `<div class="pg-selector-estilo" role="group" aria-label="Estilo de las imágenes" style="display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:8px"><span style="font-size:.8rem;color:#9a9a9a;margin-right:4px">Estilo:</span>${b('crazy', TEMAS.crazy)}${b('pumas', TEMAS.pumas)}${esSuper() ? b('rowmaya', TEMAS.rowmaya) : ''}</div>`;
    }
    function enlazarSelector(raiz, alCambiar) {
        if (!raiz) return;
        raiz.querySelectorAll('[data-pg-estilo]').forEach(b => b.onclick = () => {
            if (b.dataset.pgEstilo === estilo) return;
            setEstilo(b.dataset.pgEstilo);
            if (alCambiar) alCambiar(estilo);
        });
    }
    function setEstilo(k) {
        if (!TEMAS[k] || (TEMAS[k].soloSuper && !esSuper())) return;
        estilo = k;
    }

    window.PumasImagenes = { generar, descargar, datos, horarios, W, H, plantilla:lienzo, tabla, fuentes, TEMAS, selectorHTML, enlazarSelector, setEstilo, selectorDescargaHTML, enlazarDescarga, paraDescargar,
        get estilo() { return estilo; } };
})();
