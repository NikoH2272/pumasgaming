/* =====================================================================
   PUMAS GAMING · Imágenes de resultados 4:5 (1080×1350) para redes
   Fondo hecho con CSS (sin imagen), mismo estilo en todas:
     1) TABLA GENERAL      · posiciones, puntos de cada sala, booyahs, kills y total
     2) MVP DETALLADO      · top jugadores: bajas, daño, primeras sangres, equipos rematados y rival con más bajas
     3) CARA A CARA (×sala)· MVP 1 vs MVP 2 de cada sala, con la imagen del personaje
     4) DUELO DE ESCUADRAS · top 5 de equipos que más eliminaron + líderes por equipo
     5) ARMAS Y BOOYAHS    · armas con más kills y la escuadra del booyah de cada sala
   Personajes por defecto: imagenes/personajes/mvp1.png y mvp2.png (se cambian en opts.personajes).
   Uso: PumasImagenes.generar({ salas, r, meta, puntosLog, base: '../' }) → [{ id, nombre, titulo, html }]
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
                const p = jug.get(k) || { jugador: j.jugador, equipo: j.equipo, salas: 0, kills: 0, dano: 0, hs: 0, impactos: 0, derribos: 0, primeras: 0, rematados: 0, vs: {}, vivo: 0, armas: {} };
                p.salas++; p.kills += j.kills || 0; p.dano += j.dano || 0; p.hs += j.headshots || 0; p.impactos += j.hits || 0; p.vivo += j.vivo || 0;
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
                booyah: ganador ? { equipo: ganador, kills: sum(j => j.kills), dano: sum(j => j.dano), hs: sum(j => j.headshots), gloo: sum(j => j.gloo),
                    revividas: sum(j => j.revividos), mvp: mvpEsc ? mvpEsc.jugador : '', mvpKills: mvpEsc ? mvpEsc.kills : 0 } : null };
        });
        return { equipos, jugadores, armas: listaArmas, porSala, conDano: salas.some(s => s.fuente !== 'replay') };
    }

    /* Composición editorial para exportar: medidas fijas, datos legibles y marca común. */
    const PIEL = '#F2F2F2', ORO_P = '#DCCC9C';
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
        return `<div id="${id}" class="pg-poster" style="position:relative;width:1080px;height:1350px;overflow:hidden;box-sizing:border-box;background:#141414;color:${PIEL};font-family:${F_TXT};line-height:1.3;text-align:left;letter-spacing:normal">
            <style>
            #${id} *{font-family:inherit}
            #${id}>header,#${id}>main,#${id}>footer{width:auto;max-width:none;min-width:0;margin:0;padding:0;background:none;border:0;box-shadow:none;backdrop-filter:none;z-index:auto}
            #${id} section{width:auto;max-width:none;margin:0;padding:0}
            #${id} *{box-sizing:border-box}#${id} .pg-title{font-family:${F_TIT};font-weight:800;font-size:88px;line-height:.96;margin:0;letter-spacing:-1px;color:${ORO_P}}
            #${id} .pg-section{font-family:${F_TIT};font-weight:700;font-size:31px;line-height:1.1;margin:0 0 15px;color:${PIEL}}
            #${id} .pg-grid{display:grid;align-items:center;gap:0}#${id} .pg-cell{min-width:0;padding:0 6px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
            #${id} .pg-th{height:44px;font-size:16px;font-weight:700;color:#959595}
            #${id} .pg-row{line-height:1.05;font-family:${F_TIT};font-size:29px;font-weight:600;font-variant-numeric:tabular-nums;background:#1D1D1D;color:${PIEL};margin-bottom:3px}
            #${id} .pg-row:nth-child(2n){background:#242424}#${id} .pg-row.leader{background:${ORO_P};color:#141414;font-weight:800}
            #${id} .pg-sub{display:block;font-family:${F_TXT};font-size:13px;font-weight:500;line-height:1.4;margin-top:3px;opacity:.68;letter-spacing:0}
            #${id} .pg-summary{display:flex;gap:42px;margin-bottom:26px}#${id} .pg-summary strong{font-family:${F_TIT};font-size:44px;font-weight:700;line-height:1;display:block}
            #${id} .pg-summary span{font-size:13px;font-weight:600;color:#959595;display:block;margin-top:7px}
            #${id} .pg-small{font-size:15px;line-height:1.5;color:#959595}#${id} .pg-number{font-family:${F_TIT};font-weight:800;font-variant-numeric:tabular-nums}
            </style>
            <div style="position:absolute;right:-260px;top:55px;width:760px;height:1000px;background:#1A1A1A;transform:rotate(19deg)"></div>
            <img src="${base}imagenes/personajes/logo-blanco.png" alt="" style="position:absolute;right:-85px;top:200px;width:670px;height:670px;object-fit:contain;opacity:.035">
            <div style="position:absolute;top:0;right:0;width:240px;height:12px;background:${ORO_P}"></div>
            <header style="position:absolute;left:52px;right:52px;top:42px;height:100px;display:flex;align-items:center;justify-content:space-between;gap:28px">
                <div style="display:flex;align-items:center;gap:18px"><img src="${base}imagenes/personajes/logo-blanco.png" alt="Pumas" style="width:83px;height:83px;object-fit:contain"><div><div style="font-family:${F_TIT};font-weight:800;font-size:39px;line-height:1">PUMAS GAMING</div><div style="font-size:12px;font-weight:600;letter-spacing:3px;color:${ORO_P};margin-top:10px">ENTRENAMIENTOS OFICIALES</div></div></div>
                <div style="text-align:right;font-size:15px;line-height:1.3;color:#959595;flex-shrink:0"><div style="display:flex;justify-content:flex-end;gap:18px;align-items:baseline"><strong style="font-size:20px;color:${PIEL}">${esc(m.fechaCorta || '')}</strong><span>${esc(m.moderador || 'FREE FIRE')}</span></div>${horas.length?`<div style="display:flex;justify-content:flex-end;gap:22px;margin-top:12px">${horas.map(h=>`<div style="text-align:right"><span style="font-size:12px;font-weight:700;color:#959595">${h.pais}</span> <b style="font-size:21px;color:${ORO_P};font-variant-numeric:tabular-nums">${h.hora}</b></div>`).join('')}</div>`:''}</div>
            </header>
            <div style="position:absolute;left:52px;right:52px;top:171px"><h1 class="pg-title" style="font-size:${o.tamTitulo || 88}px">${esc(o.titulo)}</h1><div style="margin-top:17px;font-size:17px;font-weight:500;color:#959595">${esc(o.subtitulo || m.encabezado || 'Free Fire · Entrenos Pumas')}</div></div>
            <main style="position:absolute;left:52px;right:52px;top:320px;bottom:120px">${cuerpo}</main>
            <footer style="position:absolute;left:52px;right:52px;bottom:35px;border-top:2px solid #363636;padding-top:18px;display:flex;align-items:center;justify-content:space-between;font-size:15px;color:#959595">
                <span style="color:${PIEL};font-weight:600">@${esc(m.instagram || 'pumas.gaming.oficial')}</span><span>${esc(m.demo ? 'DATOS DE PRUEBA' : 'FREE FIRE / PUMAS')}</span><span>Dev por <b style="color:${PIEL}">proyectn.com</b></span>
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
            <div style="display:grid;grid-template-columns:1fr 140px 180px;align-items:center;gap:20px;height:105px;margin-bottom:16px"><div style="min-width:0"><div style="font-size:12px;letter-spacing:2px;color:${ORO_P};font-weight:700;margin-bottom:6px">MVP DEL ENTRENO</div><div class="pg-number" style="font-size:51px;line-height:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(primero?primero.jugador:'—')}</div><div class="pg-small" style="margin-top:5px">${esc(primero?primero.equipo:'')}</div></div><div style="text-align:center"><div class="pg-number" style="font-size:72px;line-height:.95;color:${ORO_P}">${primero?primero.kills:0}</div><div style="font-size:12px;color:#959595;margin-top:5px">KILLS</div></div><div style="background:${ORO_P};padding:16px 15px;text-align:center;color:#141414"><div class="pg-number" style="font-size:43px;line-height:1">${d.conDano&&primero?fmt(primero.dano):d.porSala.length}</div><div style="font-size:12px;font-weight:700;margin-top:5px">${d.conDano?'DAÑO TOTAL':'SALAS'}</div></div></div>
            ${tabla(cols,filas,{fila:52,fs:27,destacar:true})}
            ${sangre.length?`<section style="margin-top:26px">${etiquetaSec('PRIMERA SANGRE POR SALA')}<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:9px">${sangre.map(s=>`<div style="background:#242424;padding:12px 15px;min-width:0"><div style="font-size:20px;color:${ORO_P};font-weight:700;margin-bottom:6px">${esc(s.etiqueta)} · ${mmss(s.primeraSangre.tiempo)}</div><div style="font-family:${F_TIT};font-size:32px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(s.primeraSangre.jugador)}</div><div class="pg-small" style="font-size:18px">${esc(s.primeraSangre.arma||'Primera eliminación')}</div></div>`).join('')}</div></section>`:''}`);
    }
    function imgCara(d,s,o) {
        const a=s.mvp1,b=s.mvp2,p=o.personajes||[o.base+'imagenes/personajes/mvp1.png',o.base+'imagenes/personajes/mvp2.png'];
        const card=(j,i)=>`<div style="position:relative;height:365px;overflow:hidden;background:${i===0?ORO_P:PIEL}"><img src="${esc(o.base)}imagenes/personajes/logo-negro.png" alt="" style="position:absolute;right:-24px;top:5px;width:260px;height:260px;opacity:.08"><img src="${esc(p[i])}" alt="" style="position:absolute;width:100%;height:310px;object-fit:contain;object-position:center bottom;top:-20px"><div style="position:absolute;left:0;right:0;bottom:0;background:#242424;padding:18px 22px"><div style="font-size:12px;color:${ORO_P};font-weight:700;margin-bottom:7px">MVP ${i+1}</div><div style="font-family:${F_TIT};font-size:39px;font-weight:800;line-height:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(j?j.jugador:'Sin segundo jugador')}</div><div class="pg-small" style="margin-top:8px">${esc(j?j.equipo:'—')}</div></div></div>`;
        const metricas=[['KILLS',x=>x.kills||0,fmt],...(s.conDano?[['DAÑO',x=>x.dano||0,fmt],['HEADSHOTS',x=>x.headshots||0,fmt]]:[]),['DERRIBOS',x=>((x.extra||{}).bin||{}).derribos||x.derribos||0,fmt],['TIEMPO VIVO',x=>x.vivo||0,mmss],...(s.conDano?[['PAREDES GLOO',x=>x.gloo||0,fmt]]:[])];
        return lienzo('pgImgCara'+s.sala,{...o,titulo:'CARA A CARA',subtitulo:`Sala ${s.sala} · ${s.mapa||'Free Fire'}${s.duracion?' · '+mmss(s.duracion):''}`},`
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">${card(a,0)}${card(b,1)}</div>
            <div style="margin-top:24px">${metricas.map(([t,f,show],i)=>{const av=a?f(a):0,bv=b?f(b):0;return `<div style="display:grid;grid-template-columns:1fr 230px 1fr;align-items:center;min-height:72px;background:${i%2?'#242424':'#1D1D1D'};padding:8px 24px"><strong class="pg-number" style="font-size:41px;text-align:center;color:${av>=bv?ORO_P:PIEL}">${show(av)}</strong><span style="text-align:center;font-size:15px;font-weight:600;color:#959595">${t}</span><strong class="pg-number" style="font-size:41px;text-align:center;color:${bv>av?ORO_P:PIEL}">${show(bv)}</strong></div>`}).join('')}</div>`);
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
            <section style="margin-top:30px">${etiquetaSec('LÍDERES DEL ENTRENAMIENTO')}<div style="display:grid;grid-template-columns:repeat(${Math.max(1,lideres.length)},1fr);gap:12px">${lideres.map(x=>`<div style="padding:19px 17px;background:#242424;min-width:0"><div style="font-size:12px;font-weight:700;color:#959595">${x.t}</div><div class="pg-number" style="font-size:40px;line-height:1.3;color:${ORO_P}">${x.v}</div><div style="font-family:${F_TIT};font-size:23px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(x.e.equipo)}</div></div>`).join('')}</div></section>`);
    }
    function imgArmas(d,o) {
        const armas=d.armas.slice(0,5),max=Math.max(1,...armas.map(a=>a.kills));
        const cols=[{t:'SALA',w:'60px'},{t:'BOOYAH / MAPA',w:'2fr',al:'left'},{t:'KILLS',w:'72px'},...(d.conDano?[{t:'DAÑO',w:'95px'},{t:'HS',w:'50px'},{t:'GLOO',w:'65px'}]:[]),{t:'MVP DE LA ESCUADRA',w:'1.7fr',al:'left'}];
        const filas=d.porSala.map(s=>{const b=s.booyah;return [esc(s.etiqueta),b?sub(b.equipo,s.mapa):'—',b?b.kills:'—',...(d.conDano?[b?fmt(b.dano):'—',b?b.hs:'—',b?b.gloo:'—']:[]),b?sub(b.mvp,b.mvpKills+' kills'):'—']});
        return lienzo('pgImgArmas',{...o,titulo:'ARMAS Y BOOYAHS',subtitulo:'Armas utilizadas y resultados por sala'},`
            ${etiquetaSec('EL ARSENAL DEL ENTRENAMIENTO')}<div style="display:grid;grid-template-columns:1fr 95px 135px;gap:12px;color:#959595;font-size:13px;font-weight:600;padding-bottom:12px"><span>ARMA</span><span style="text-align:right">KILLS</span><span style="text-align:right">${d.conDano?'DAÑO':'USOS'}</span></div>
            ${armas.map((a,i)=>`<div style="display:grid;grid-template-columns:40px 165px 1fr 80px 135px;gap:12px;align-items:center;height:64px;background:${i%2?'#242424':'#1D1D1D'};padding:0 16px"><span class="pg-number" style="font-size:25px;color:${ORO_P}">${i+1}</span><strong style="font-family:${F_TIT};font-size:31px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(a.arma)}</strong><div style="height:10px;background:#363636"><div style="height:100%;width:${a.kills/max*100}%;background:${ORO_P}"></div></div><span class="pg-number" style="font-size:35px;text-align:right">${a.kills}</span><span class="pg-number" style="font-size:30px;text-align:right;color:#959595">${d.conDano?fmt(a.dano):a.usos}</span></div>`).join('')||'<p class="pg-small">Sin datos de armas disponibles.</p>'}
            <section style="margin-top:37px">${etiquetaSec('BOOYAH POR SALA')}${tabla(cols,filas,{fila:64,fs:25})}</section>`);
    }
    /* ---------------- API ---------------- */
    function generar(x) {
        fuentes();
        const d = datos(x.salas, x.r, x.puntosLog);
        const m = Object.assign({}, x.meta || {});
        if (m.fecha && !m.fechaCorta) { const f = new Date(m.fecha.replace(' ', 'T')); m.fechaCorta = isNaN(f) ? m.fecha : f.toLocaleDateString('es', { day: '2-digit', month: 'short' }).toUpperCase(); }
        const o = { meta: m, base: x.base || '../', personajes: x.personajes };
        const L = [{ id: 'pgImgTabla', nombre: 'Tabla_General.png', titulo: 'Tabla general', html: imgTabla(d, o) },
            { id: 'pgImgMvp', nombre: 'MVP_Detallado.png', titulo: 'MVP detallado', html: imgMvp(d, o) }];
        d.porSala.forEach(s => { if (s.mvp1) L.push({ id: 'pgImgCara' + s.sala, nombre: `Cara_a_cara_Sala_${s.sala}.png`, titulo: 'Cara a cara S' + s.sala, html: imgCara(d, s, o) }); });
        L.push({ id: 'pgImgEquipos', nombre: 'Duelo_de_escuadras.png', titulo: 'Duelo de escuadras', html: imgEquipos(d, o) },
            { id: 'pgImgArmas', nombre: 'Armas_y_Booyahs.png', titulo: 'Armas y booyahs', html: imgArmas(d, o) });
        return L;
    }

    // Captura a 1080×1350 aunque la vista previa esté reducida (se quita la escala en la copia)
    async function descargar(id, nombre) {
        const el = document.getElementById(id);
        if (!el) throw new Error('No se encontró la imagen para descargar.');
        if (typeof html2canvas !== 'function') throw new Error('No se cargó el exportador de imágenes. Recarga el panel.');
        if (document.fonts && document.fonts.ready) await document.fonts.ready;
        await Promise.all(Array.from(el.querySelectorAll('img')).map(im => im.decode ? im.decode().catch(() => {}) : Promise.resolve()));
        const c = await html2canvas(el, { scale: 1, width: W, height: H, useCORS: true, allowTaint: false, backgroundColor: TINTA,
            onclone: doc => {
                const e = doc.getElementById(id);
                for (let p = e && e.parentElement, k = 0; p && k < 2; p = p.parentElement, k++) { p.style.transform = 'none'; p.style.width = W + 'px'; p.style.height = H + 'px'; p.style.overflow = 'visible'; }
            } });
        const a = document.createElement('a');
        a.download = nombre; a.href = c.toDataURL('image/png'); a.click();
        return a.href;
    }

    window.PumasImagenes = { generar, descargar, datos, horarios, W, H };
})();
