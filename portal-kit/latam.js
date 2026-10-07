/* =====================================================================
   PUMAS GAMING · Entrenos LATAM
   Junta los entrenos de Pumas, Rusheo, ROW, QFD, Dragon Fest y ZMF leyendo
   las vistas v_latam_* (no copian datos). Misma fórmula que el portal de Pumas:
     PG  = puntos generales (total)
     PR  = PG ÷ sesiones (entero)  · orden: PR → booyah → PG
     KDA = kills ÷ salas jugadas    · orden: KDA → kills
   Al tocar un equipo o jugador se despliega en qué entrenos jugó (% con colores).
   Necesita portal.js cargado antes.
   ===================================================================== */
(function () {
    const P = window.PumasPortal;
    const esc = P.escaparHtml;
    const ZONA = 'America/Bogota';

    // Orden: Pumas, Rusheo, ROW, QFD, Dragon Fest, ZMF.
    // `color` es el del % de participación (ROW usa su verde para no confundirse con ZMF).
    const PORTALES = [
        { id: 'entrenamientos', nombre: 'Pumas',           color: '#D8C395', logo: '/imagenes/LOGO PUMAS WEB.png',          url: '/entrenamientos/' },
        { id: 'rusheo',         nombre: 'Rusheo',          color: '#FF8A00', logo: '/rusheo/imagenes/rusheo.png',            url: '/rusheo/' },
        { id: 'row',            nombre: 'ROW x Maya',      color: '#2ECC71', logo: '/row/imagenes/row.png',                  url: '/row/' },
        { id: 'ascensosqfd',    nombre: 'Ascensos QFD',    color: '#4FC3F7', logo: '/ascensosqfd/imagenes/qfd.png',          url: '/ascensosqfd/' },
        { id: 'dragonfest',     nombre: 'Dragon Fest',     color: '#2E6BFF', logo: '/dragonfest/imagenes/dragonfest.png',    url: '/dragonfest/' },
        { id: 'dragonfestfem',  nombre: 'Dragon Fest Fem', color: '#FF4FA3', logo: '/dragonfest/imagenes/dragonfestfem.png', url: '/dragonfest/femenino.html' },
        { id: 'zmf',            nombre: 'ZMF',             color: '#E10600', logo: '/zmf/imagenes/zmf.png',                  url: '/zmf/' },
        { id: 'zmffem',         nombre: 'ZMF Fem',         color: '#B620E0', logo: '/zmf/imagenes/zmffem.png',               url: '/zmf/femenino.html' }
    ];
    const POR_ID = Object.fromEntries(PORTALES.map(p => [p.id, p]));
    const LOGO_PUMAS = '/imagenes/LOGO PUMAS WEB.png';
    const LINKS_POR_DEFECTO = { entrenamientos: 'https://chat.whatsapp.com/DW7DWlsOKKDENaW3S8aZCd' };
    // Instagram de cada entreno (por ahora solo Pumas)
    const INSTAGRAM = { entrenamientos: 'https://www.instagram.com/entrenos.pumas.gg/' };

    /* ---------------- Datos ---------------- */
    // Supabase devuelve máx. 1000 filas por consulta: se pide por páginas
    async function todas(vista, columnas, orden) {
        const filas = [];
        for (let desde = 0; ; desde += 1000) {
            let q = P.db().from(vista).select(columnas).range(desde, desde + 999);
            if (orden) q = q.order(orden, { ascending: false });
            const { data, error } = await q;
            if (error) throw error;
            filas.push(...data);
            if (data.length < 1000) return filas;
        }
    }

    async function cargarDatos() {
        const [sesiones, equipos, killers] = await Promise.all([
            todas('v_latam_sesiones', 'id, portal, titulo, jornada, fecha, moderador', 'fecha'),
            todas('v_latam_equipos', 'sesion_id, portal, fecha, equipo, salas, pts, kills, booyahs'),
            todas('v_latam_killers', 'sesion_id, portal, fecha, jugador, equipo, kills, salas')
        ]);
        return { sesiones, equipos, killers };
    }

    async function cargarLinks() {
        try {
            const { data, error } = await P.db().from('portales').select('id, link').eq('latam', true);
            if (error) return { ...LINKS_POR_DEFECTO };
            return { ...LINKS_POR_DEFECTO, ...Object.fromEntries((data || []).filter(r => r.link).map(r => [r.id, r.link])) };
        } catch (e) { return { ...LINKS_POR_DEFECTO }; }
    }

    /* ---------------- Fórmulas (iguales a Pumas) ---------------- */
    const clave = t => String(t || '').trim().toLowerCase();
    const idSesion = r => r.portal + ':' + r.sesion_id;   // los ids se repiten entre portales

    function agregarEquipos(filas) {
        const eq = {};
        filas.forEach(r => {
            const e = eq[clave(r.equipo)] = eq[clave(r.equipo)] || { name: r.equipo, ses: 0, b: 0, k: 0, pts: 0, salas: 0, porPortal: {} };
            e.ses++; e.b += r.booyahs || 0; e.k += r.kills || 0; e.pts += r.pts || 0; e.salas += r.salas || 0;
            e.porPortal[r.portal] = (e.porPortal[r.portal] || 0) + 1;
        });
        return Object.values(eq)
            .map(e => ({ ...e, pr: Math.round(e.pts / e.ses), kps: e.k / e.ses, entrenos: Object.keys(e.porPortal).length }))
            .sort((a, b) => b.pr - a.pr || b.b - a.b || b.pts - a.pts || a.name.localeCompare(b.name));
    }

    function agregarKillers(filas) {
        const pl = {};
        filas.forEach(r => {
            const e = pl[clave(r.jugador)] = pl[clave(r.jugador)] || { name: r.jugador, equipo: r.equipo, k: 0, s: 0, porPortal: {} };
            e.k += r.kills || 0; e.s += r.salas || 0;
            e.porPortal[r.portal] = (e.porPortal[r.portal] || 0) + 1;
        });
        return Object.values(pl).filter(x => x.s > 0)
            .map(x => ({ ...x, kda: x.k / x.s }))
            .sort((a, b) => b.kda - a.kda || b.k - a.k);
    }

    /* ---------------- Semana (ISO, hora Colombia, igual que Pumas) ---------------- */
    const diaLocal = iso => new Date(iso).toLocaleDateString('en-CA', { timeZone: ZONA });
    function semanaISO(d) {
        const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())), n = t.getUTCDay() || 7;
        t.setUTCDate(t.getUTCDate() + 4 - n);
        const y = t.getUTCFullYear();
        return y + '-' + Math.ceil(((t - Date.UTC(y, 0, 1)) / 864e5 + 1) / 7);
    }
    function rangoSemana(d) {
        const l = new Date(d.getFullYear(), d.getMonth(), d.getDate() - ((d.getDay() || 7) - 1));
        const f = new Date(l.getFullYear(), l.getMonth(), l.getDate() + 6), o = { day: 'numeric', month: 'short' };
        return l.toLocaleDateString('es', o) + ' – ' + f.toLocaleDateString('es', o);
    }
    const semanaDe = fecha => semanaISO(new Date(diaLocal(fecha) + 'T00:00:00'));
    // Semana actual; si no tiene datos, la última semana con entrenos
    function semanaObjetivo(sesiones) {
        let k = semanaISO(new Date()), actual = true;
        if (!sesiones.some(s => semanaDe(s.fecha) === k) && sesiones.length) { k = semanaDe(sesiones[0].fecha); actual = false; }
        const una = sesiones.find(s => semanaDe(s.fecha) === k);
        return { clave: k, num: k.split('-')[1], actual, rango: rangoSemana(una ? new Date(diaLocal(una.fecha) + 'T00:00:00') : new Date()) };
    }

    /* ---------------- Participación: se ve al tocar la fila ---------------- */
    // Cada fila guarda sus sesiones por entreno en data-part; al tocarla se despliega el detalle.
    const dataPart = porPortal => `data-part='${esc(JSON.stringify(porPortal || {}))}'`;

    function detalleHTML(porPortal, nombre) {
        const total = Object.values(porPortal).reduce((a, b) => a + b, 0);
        if (!total) return '';
        const lista = PORTALES.filter(p => porPortal[p.id]).map(p => ({ p, n: porPortal[p.id], pct: porPortal[p.id] / total * 100 }));
        return `<div class="part-caja">
            <div class="part-titulo">${esc(nombre)} · ${total} ${total === 1 ? 'sesión' : 'sesiones'} en ${lista.length} entreno${lista.length === 1 ? '' : 's'}</div>
            <div class="part-barra">${lista.map(x => `<i style="width:${x.pct}%;background:${x.p.color}" title="${esc(x.p.nombre)} ${Math.round(x.pct)}%"></i>`).join('')}</div>
            <div class="part-lista">${lista.map(x => `<span><i style="background:${x.p.color}"></i>${esc(x.p.nombre)} <b>${Math.round(x.pct)}%</b> <small>(${x.n})</small></span>`).join('')}</div>
        </div>`;
    }

    // Un solo manejador para todas las filas tocables (tablas y listas)
    document.addEventListener('click', e => {
        const fila = e.target.closest('[data-part]');
        if (!fila || e.target.closest('a, button')) return;
        const sig = fila.nextElementSibling;
        if (sig && sig.classList.contains('part-det')) { sig.remove(); fila.classList.remove('abierta'); return; }
        const porPortal = JSON.parse(fila.dataset.part || '{}');
        const nombre = fila.dataset.nombre || '';
        let det;
        if (fila.tagName === 'TR') {
            det = document.createElement('tr');
            det.innerHTML = `<td colspan="${fila.children.length}">${detalleHTML(porPortal, nombre)}</td>`;
        } else {
            det = document.createElement('div');
            det.innerHTML = detalleHTML(porPortal, nombre);
        }
        det.className = 'part-det';
        fila.after(det);
        fila.classList.add('abierta');
    });
    // Accesible con teclado
    document.addEventListener('keydown', e => {
        if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('[data-part]')) { e.preventDefault(); e.target.click(); }
    });

    function leyendaHTML() {
        return `<div class="latam-leyenda">` + PORTALES.map(p =>
            `<span><i style="background:${p.color}"></i>${esc(p.nombre)}</span>`).join('') +
            `<small><i class="fa-solid fa-hand-pointer"></i> Toca un equipo o jugador para ver en qué entrenos jugó.</small></div>`;
    }

    const colPuesto = i => i === 0 ? '#D8C395' : i === 1 ? '#B9B2A4' : i === 2 ? '#cd7f32' : null;
    const imgLogo = (src, alt) => `<img src="${esc(src)}" alt="${esc(alt)}" onerror="this.onerror=null;this.src='${LOGO_PUMAS}'">`;
    const tocable = (x) => `${dataPart(x.porPortal)} data-nombre="${esc(x.name)}" tabindex="0" role="button" aria-label="${esc(x.name)}: ver participación por entreno"`;

    /* ---------------- Tarjetas de cada entreno (index principal) ---------------- */
    function tarjetasPortales(links) {
        const grupos = [['entrenamientos'], ['rusheo'], ['row'], ['ascensosqfd'], ['dragonfest', 'dragonfestfem'], ['zmf', 'zmffem']];
        return grupos.map(ids => {
            const p = POR_ID[ids[0]];
            const doble = ids.length > 1;   // Dragon Fest y ZMF: mixto + femenino
            const fem = doble ? POR_ID[ids[1]] : null;
            const botones = doble
                ? `<a class="btn-access" href="${p.url}"><i class="fa-solid fa-trophy"></i> Mixto</a>` +
                  `<a class="btn-access" href="${fem.url}" style="--c:${fem.color}"><i class="fa-solid fa-trophy"></i> Femenino</a>`
                : `<a class="btn-access" href="${p.url}"><i class="fa-solid fa-trophy"></i> Portal</a>`;
            const link = links[ids[0]];
            const grupo = link
                ? `<a class="btn-access btn-outline" href="${esc(link)}" target="_blank" rel="noopener"><i class="fa-brands fa-whatsapp"></i> Unirse</a>`
                : `<span class="btn-access btn-outline latam-pronto" title="Link pendiente: Supabase → portales → link">Link pronto</span>`;
            return `<article class="card-box latam-card" style="--c:${p.color}">
                <div class="latam-logo">${imgLogo(p.logo, p.nombre)}</div>
                <h3>${esc(p.id === 'entrenamientos' ? 'Pumas Gaming' : p.nombre)}</h3>
                <p class="latam-sub">${doble ? 'Mixto y femenino' : p.id === 'entrenamientos' ? 'Entrenos oficiales' : 'Entrenos by Pumas'}</p>
                <div class="latam-acciones">${botones}${grupo}${INSTAGRAM[ids[0]]
                    ? `<a class="btn-access btn-outline" href="${INSTAGRAM[ids[0]]}" target="_blank" rel="noopener"><i class="fa-brands fa-instagram"></i> Instagram</a>` : ''}</div>
            </article>`;
        }).join('');
    }

    /* ---------------- Rankings (index principal) ---------------- */
    function filaRank(x, i, valor) {
        const c = colPuesto(i) || 'var(--gray)';
        return `<div class="rank-row latam-row" ${tocable(x)}>
            <span><b style="color:${c}">#${i + 1}</b> ${esc(x.name)}</span><em>${valor} <i class="fa-solid fa-chevron-down part-flecha"></i></em></div>`;
    }

    async function iniciarIndex() {
        const cont = document.getElementById('latamPortales');
        if (cont) cont.innerHTML = tarjetasPortales(LINKS_POR_DEFECTO);
        cargarLinks().then(links => { if (cont) cont.innerHTML = tarjetasPortales(links); });

        const eqEl = document.getElementById('latamTopEquipos'), klEl = document.getElementById('latamTopKillers');
        const ley = document.getElementById('latamLeyenda');
        if (ley) ley.innerHTML = leyendaHTML();
        if (!eqEl && !klEl) return;
        try {
            const d = await cargarDatos();
            const sem = semanaObjetivo(d.sesiones);
            const enSemana = r => semanaDe(r.fecha) === sem.clave;
            const eq = agregarEquipos(d.equipos.filter(enSemana)).slice(0, 10);
            const kl = agregarKillers(d.killers.filter(enSemana)).slice(0, 10);
            const nota = sem.actual ? '' : ' · última con datos';
            const t1 = document.getElementById('latamTituloEq'), t2 = document.getElementById('latamTituloKill');
            if (t1) t1.innerHTML = `Top 10 Equipos LATAM · Semana ${sem.num}<span class="wk-range">${sem.rango}${nota} · PR</span>`;
            if (t2) t2.innerHTML = `Top 10 Killers LATAM · Semana ${sem.num}<span class="wk-range">${sem.rango}${nota} · KDA</span>`;
            eqEl.innerHTML = eq.length ? eq.map((x, i) => filaRank(x, i, `${x.pr} PR`)).join('') : '<p>Aún no hay entrenos LATAM registrados.</p>';
            klEl.innerHTML = kl.length ? kl.map((x, i) => filaRank(x, i, `${x.kda.toFixed(2)} KDA`)).join('') : '<p>Aún no hay entrenos LATAM registrados.</p>';
        } catch (e) {
            console.warn('LATAM:', e);
            const msg = '<p>Los resultados LATAM estarán disponibles pronto.</p>';
            eqEl.innerHTML = msg; klEl.innerHTML = msg;
        }
    }

    /* ---------------- Portal /entrenoslatam/ ---------------- */
    const MES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const fmtDia = d => new Date(d + 'T00:00:00').toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' });
    const VACIO = '<tr class="vacio"><td colspan="7"><i class="fa-solid fa-database"></i>Sin registros todavía.</td></tr>';

    function filaTabla(e, i) {
        const c = colPuesto(i);
        return `<tr class="latam-row" ${tocable(e)}>
            <td style="color:${c || 'inherit'}"><b>#${i + 1}</b></td>
            <td class="eq-nombre">${esc(e.name)} <i class="fa-solid fa-chevron-down part-flecha"></i></td>
            <td>${e.ses}</td><td class="c-b">${e.b}</td><td>${e.k}</td><td class="c-pg">${e.pts}</td>
            <td style="color:${c || 'var(--light)'}"><b>${e.pr}</b></td></tr>`;
    }
    function llenarDoble(idA, idB, lista) {
        const A = document.getElementById(idA), B = document.getElementById(idB);
        if (!A || !B) return;
        if (!lista.length) { A.innerHTML = VACIO; B.innerHTML = ''; B.closest('table').hidden = true; A.closest('table').caption.textContent = ''; return; }
        const m = Math.ceil(lista.length / 2);
        A.innerHTML = lista.slice(0, m).map(filaTabla).join('');
        B.innerHTML = lista.slice(m).map((e, i) => filaTabla(e, i + m)).join('');
        B.closest('table').hidden = lista.length <= m;
        A.closest('table').caption.textContent = `PUESTOS 1 – ${m}`;
        B.closest('table').caption.textContent = lista.length > m ? `PUESTOS ${m + 1} – ${lista.length}` : '';
    }

    function filaKiller(k, i) {
        const c = colPuesto(i);
        return `<div class="killer-card latam-row" ${tocable(k)}>
            <span style="color:${c || 'inherit'}"><b>#${i + 1}</b></span><span class="k-name">${esc(k.name)}</span>
            <span>${k.s}</span><span>${k.k}</span><span style="color:${c || 'inherit'}"><b>${k.kda.toFixed(2)}</b></span></div>`;
    }

    // Destacados: equipos más letales, que más participan y jugador más letal
    function destacados(equipos, killers) {
        const cont = document.getElementById('latamDestacados');
        if (!cont) return;
        const letales = [...equipos].sort((a, b) => b.k - a.k || b.kps - a.kps).slice(0, 5);
        const activos = [...equipos].sort((a, b) => b.ses - a.ses || b.entrenos - a.entrenos || b.pr - a.pr).slice(0, 5);
        const jugadores = [...killers].sort((a, b) => b.k - a.k || b.kda - a.kda).slice(0, 5);
        const fila = (x, i, valor, sub) => `<div class="dest-fila latam-row" ${tocable(x)}>
            <b style="color:${colPuesto(i) || 'var(--gray)'}">#${i + 1}</b>
            <span class="dest-nombre">${esc(x.name)}${sub ? `<small>${sub}</small>` : ''}</span>
            <em>${valor}</em></div>`;
        const vacio = '<p class="res-vacio">Sin datos todavía.</p>';
        const top = jugadores[0];
        cont.innerHTML = `
            <article class="card-box dest-card">
                <h3 class="subtitulo-bloque"><i class="fa-solid fa-fire"></i> Equipos más letales</h3>
                <p class="muted">Más kills en todos los entrenos.</p>
                ${letales.length ? letales.map((x, i) => fila(x, i, `${x.k} kills`, `${x.kps.toFixed(1)} kills por sesión`)).join('') : vacio}
            </article>
            <article class="card-box dest-card">
                <h3 class="subtitulo-bloque"><i class="fa-solid fa-people-group"></i> Equipos que más participan</h3>
                <p class="muted">Más sesiones jugadas.</p>
                ${activos.length ? activos.map((x, i) => fila(x, i, `${x.ses} ses.`, `en ${x.entrenos} entreno${x.entrenos === 1 ? '' : 's'}`)).join('') : vacio}
            </article>
            <article class="card-box dest-card dest-mvp">
                <h3 class="subtitulo-bloque"><i class="fa-solid fa-crosshairs"></i> Jugador más letal</h3>
                ${top ? `<div class="mvp latam-row" ${tocable(top)}>
                        <i class="fa-solid fa-skull mvp-icono"></i>
                        <div><b class="mvp-nombre">${esc(top.name)}</b><small>${esc(top.equipo || '')}</small></div>
                        <div class="mvp-datos"><span><b>${top.k}</b>kills</span><span><b>${top.s}</b>salas</span><span><b>${top.kda.toFixed(2)}</b>KDA</span></div>
                    </div>
                    ${jugadores.slice(1).map((x, i) => fila(x, i + 1, `${x.k} kills`, `KDA ${x.kda.toFixed(2)}`)).join('')}` : vacio}
            </article>`;
    }

    // Tablas individuales: un Top 10 (por PR) de cada entreno
    function individuales(d, filtro) {
        const cont = document.getElementById('latamIndividuales');
        if (!cont) return;
        const lista = PORTALES.filter(p => filtro === 'todos' || p.id === filtro);
        cont.innerHTML = lista.map(p => {
            const eqs = agregarEquipos(d.equipos.filter(r => r.portal === p.id)).slice(0, 10);
            const nSes = d.sesiones.filter(s => s.portal === p.id).length;
            return `<article class="card-box ind-card" style="--c:${p.color}">
                <div class="ind-head">${imgLogo(p.logo, p.nombre)}<div><h3>${esc(p.nombre)}</h3><small>${nSes} entreno${nSes === 1 ? '' : 's'}</small></div>
                    <a class="btn-mini" href="${p.url}">Portal</a></div>
                <table class="pg-tabla lt-tabla ind-tabla">
                    <thead><tr><th>#</th><th>Equipo</th><th>SES</th><th>BOO</th><th>PG</th><th>PR</th></tr></thead>
                    <tbody>${eqs.length ? eqs.map((e, i) => `<tr><td style="color:${colPuesto(i) || 'inherit'}"><b>#${i + 1}</b></td>
                        <td class="eq-nombre">${esc(e.name)}</td><td>${e.ses}</td><td class="c-b">${e.b}</td><td class="c-pg">${e.pts}</td>
                        <td style="color:${colPuesto(i) || 'var(--light)'}"><b>${e.pr}</b></td></tr>`).join('')
                        : '<tr class="vacio"><td colspan="6">Sin entrenos todavía.</td></tr>'}</tbody>
                </table>
            </article>`;
        }).join('');
    }

    async function iniciarPortal() {
        const ley = document.getElementById('latamLeyenda');
        if (ley) ley.innerHTML = leyendaHTML();
        const chips = document.getElementById('latamFiltro');
        let d;
        try { d = await cargarDatos(); }
        catch (e) {
            console.warn('LATAM:', e);
            document.querySelectorAll('[data-latam-vacio]').forEach(n => { n.innerHTML = '<tr class="vacio"><td colspan="7"><i class="fa-solid fa-database"></i>Los resultados LATAM estarán disponibles cuando se active la base (sql/07 y 08).</td></tr>'; });
            pintarCalendario([]);
            return;
        }

        // Si este mes no tiene entrenos, el calendario abre en el mes del último
        if (d.sesiones.length) {
            const hoy = `${calAnio}-${String(calMes + 1).padStart(2, '0')}`;
            if (!d.sesiones.some(s => diaLocal(s.fecha).startsWith(hoy))) {
                const f = diaLocal(d.sesiones[0].fecha); calAnio = +f.slice(0, 4); calMes = +f.slice(5, 7) - 1;
            }
        }

        let filtro = 'todos';
        if (chips) {
            chips.innerHTML = `<button class="chip on" data-p="todos">Todos</button>` + PORTALES.map(p =>
                `<button class="chip" data-p="${p.id}" style="--c:${p.color}">${esc(p.nombre)}</button>`).join('');
            chips.onclick = e => {
                const b = e.target.closest('[data-p]'); if (!b) return;
                filtro = b.dataset.p;
                chips.querySelectorAll('.chip').forEach(c => c.classList.toggle('on', c === b));
                pintar();
            };
        }

        function pintar() {
            const f = r => filtro === 'todos' || r.portal === filtro;
            const ses = d.sesiones.filter(f), eqs = d.equipos.filter(f), kls = d.killers.filter(f);
            const todo = agregarEquipos(eqs), killers = agregarKillers(kls);
            const sem = semanaObjetivo(ses);
            const semana = agregarEquipos(eqs.filter(r => semanaDe(r.fecha) === sem.clave));
            const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = Number(v).toLocaleString('es'); };
            set('statEquipos', todo.length);
            set('statKills', kls.reduce((a, r) => a + (r.kills || 0), 0));
            // Mapas jugados = salas de cada entreno (la mayor cantidad que jugó algún equipo en ese entreno)
            const mapas = Object.values(eqs.reduce((m, r) => { m[idSesion(r)] = Math.max(m[idSesion(r)] || 0, r.salas); return m; }, {})).reduce((a, b) => a + b, 0);
            set('statMapas', mapas);
            set('statEntrenos', ses.length);

            const tit = document.getElementById('tituloTop50');
            if (tit) tit.innerHTML = `Top 50 Equipos · Semana ${sem.num}<span class="wk-range">${sem.rango}${sem.actual ? '' : ' · última semana con datos'} · Orden: PR → booyah</span>`;
            llenarDoble('bodySemanaA', 'bodySemanaB', semana.slice(0, 50));
            llenarDoble('bodyTop100A', 'bodyTop100B', todo.slice(0, 100));

            const g = document.getElementById('gridKillers');
            if (g) g.innerHTML = killers.length
                ? `<div class="killer-head"><span>#</span><span>JUGADOR</span><span>SALAS</span><span>KILLS</span><span>KDA</span></div>` + killers.slice(0, 10).map(filaKiller).join('')
                : '<p class="res-vacio"><i class="fa-solid fa-skull"></i>Sin datos de killers todavía.</p>';

            destacados(todo, killers);
            individuales(d, filtro);
            pintarCalendario(ses);
        }
        pintar();
    }

    // Calendario igual al de Pumas, con un punto del color de cada entreno
    let calMes = new Date().getMonth(), calAnio = new Date().getFullYear(), calSel = null, calSes = [];
    function pintarCalendario(sesiones) {
        calSes = sesiones;
        const cont = document.getElementById('latamCalendario');
        if (!cont) return;
        const porDia = {};
        sesiones.forEach(s => { (porDia[diaLocal(s.fecha)] = porDia[diaLocal(s.fecha)] || []).push(s); });
        const first = new Date(calAnio, calMes, 1).getDay(), dias = new Date(calAnio, calMes + 1, 0).getDate();
        let g = '<div class="calendar-day empty"></div>'.repeat(first);
        for (let d = 1; d <= dias; d++) {
            const k = `${calAnio}-${String(calMes + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const del = porDia[k] || [];
            const puntos = [...new Set(del.map(s => s.portal))].map(p => `<i style="background:${(POR_ID[p] || {}).color || '#999'}"></i>`).join('');
            g += `<div class="calendar-day${del.length ? ' has-session' : ''}${k === calSel ? ' selected-day' : ''}" data-d="${k}">${d}<span class="cal-puntos">${puntos}</span></div>`;
        }
        const lista = calSel && porDia[calSel] ? porDia[calSel] : sesiones.slice(0, 8);
        cont.innerHTML = `
            <div class="calendar-container">
                <div class="calendar-header"><button class="btn-mini" data-nav="-1" aria-label="Mes anterior">&lt;</button><h4>${MES[calMes]} ${calAnio}</h4><button class="btn-mini" data-nav="1" aria-label="Mes siguiente">&gt;</button></div>
                <div class="calendar-weekdays"><div>Dom</div><div>Lun</div><div>Mar</div><div>Mié</div><div>Jue</div><div>Vie</div><div>Sáb</div></div>
                <div class="calendar-grid">${g}</div>
            </div>
            <h4 class="ses-titulo">${calSel && porDia[calSel] ? 'Entrenos del ' + fmtDia(calSel) : 'Últimos entrenos'}${calSel ? ' <button class="btn-mini" data-all="1">Ver todos</button>' : ''}</h4>
            <div class="res-lista">${lista.length ? lista.map(s => {
                const p = POR_ID[s.portal] || { nombre: s.portal, color: '#999', url: '#' };
                return `<div class="res-row" style="border-left-color:${p.color}">
                    <div><b>${esc(s.titulo)}</b><small>${esc(p.nombre)} · ${fmtDia(diaLocal(s.fecha))}${s.jornada ? ' · ' + esc(s.jornada) : ''}</small></div>
                    <a class="btn-mini" href="${p.url}">Ver</a></div>`;
            }).join('') : '<p class="res-vacio"><i class="fa-solid fa-calendar-xmark"></i>Aún no hay entrenos LATAM registrados.</p>'}</div>`;
    }
    document.addEventListener('click', e => {
        const cont = document.getElementById('latamCalendario');
        if (!cont || !cont.contains(e.target)) return;
        const n = e.target.closest('[data-nav]'), dd = e.target.closest('[data-d]'), a = e.target.closest('[data-all]');
        if (n) { calMes += +n.dataset.nav; if (calMes > 11) { calMes = 0; calAnio++; } if (calMes < 0) { calMes = 11; calAnio--; } }
        else if (dd) { calSel = dd.classList.contains('has-session') ? dd.dataset.d : null; }
        else if (a) { calSel = null; }
        else return;
        pintarCalendario(calSes);
    });

    window.Latam = { PORTALES, cargarDatos, agregarEquipos, agregarKillers, iniciarIndex, iniciarPortal };
})();
