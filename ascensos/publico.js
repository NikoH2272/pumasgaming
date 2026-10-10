/* =====================================================================
   ASCENSOS · Portal público (AZA y Pruebas)
   Jornadas guardadas con su categoría (colores como en Entrenos LATAM),
   equipos con las categorías en que jugaron, ascendidos, baneados y cupos.
   ===================================================================== */
(function () {
    const P = window.PumasPortal;
    const esc = P.escaparHtml;
    const PORTAL = P.portal;
    const CAT = window.ASC_CATEGORIA;
    const $ = id => document.getElementById(id);
    const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const chip = id => { const c = CAT(id); return `<span class="cat-chip${c.logo ? ' con-logo' : ''}" style="--cat:${c.color}">${c.logo ? `<img src="${c.logo}" alt="">` : ''}${esc(c.nombre)}</span>`; };
    const fecha = iso => new Date(iso).toLocaleDateString('es', { weekday: 'short', day: '2-digit', month: 'short' });

    let jornadas = [];
    let filtro = 'todas';
    let verTodas = false;

    function pintarFiltro() {
        const usadas = [...new Set(jornadas.map(j => j.categoria))];
        const cats = window.ASC_CATEGORIAS.filter(c => usadas.includes(c.id)).concat(usadas.filter(u => !window.ASC_CATEGORIAS.some(c => c.id === u)).map(CAT));
        $('ascFiltro').innerHTML = `<button class="${filtro === 'todas' ? 'on' : ''}" data-c="todas">Todas</button>` +
            cats.map(c => `<button class="${filtro === c.id ? 'on' : ''}" data-c="${esc(c.id)}" style="--c:${c.color}">${esc(c.nombre)}</button>`).join('');
        $('ascFiltro').onclick = e => {
            const b = e.target.closest('[data-c]');
            if (!b) return;
            filtro = b.dataset.c; verTodas = false;
            pintarTodo();
        };
    }

    function visibles() { return filtro === 'todas' ? jornadas : jornadas.filter(j => j.categoria === filtro); }

    function pintarStats() {
        const eqs = new Set(), asc = visibles().reduce((a, j) => a + (j.clasificados || []).length, 0);
        visibles().forEach(j => (j.equipos || []).forEach(e => eqs.add(norm(e.n))));
        $('statJornadas').textContent = visibles().length;
        $('statEquipos').textContent = eqs.size;
        $('statAscensos').textContent = asc;
        $('statCategorias').textContent = new Set(visibles().map(j => j.categoria)).size;
    }

    function tarjetaJornada(j) {
        const c = CAT(j.categoria);
        const sube = new Set((j.clasificados || []).map(x => norm(x.n)));
        const filas = (j.equipos || []).slice().sort((a, b) => b.total - a.total);
        const fila = (e, i) => `<tr class="${sube.has(norm(e.n)) ? 'sube' : ''}"><td>${i + 1}</td><td title="${esc(e.n)}">${sube.has(norm(e.n)) ? '👑 ' : ''}${esc(e.n)}</td><td>${esc(e.t || '')}</td><td>${e.pts}</td><td><b>${e.total}</b></td></tr>`;
        const cab = `<thead><tr><th>#</th><th>EQUIPO</th><th>TAG</th><th>PTS POS</th><th>TOTAL</th></tr></thead>`;
        return `<article class="card-box jornada-card" style="--cat:${c.color}">
            <div class="jornada-head">
                <div>${chip(j.categoria)}<h3>${esc(j.titulo)}</h3><small>${fecha(j.fecha)}${j.horario ? ' · ' + esc(j.horario) : ''} · ${j.salas} salas${j.moderador ? ' · Mod: ' + esc(j.moderador) : ''}</small></div>
            </div>
            <table>${cab}<tbody>${filas.slice(0, 10).map(fila).join('')}</tbody></table>
            ${filas.length > 10 ? `<details><summary>Ver los ${filas.length} equipos</summary><table>${cab}<tbody>${filas.slice(10).map((e, i) => fila(e, i + 10)).join('')}</tbody></table></details>` : ''}
            <div class="clasif">${(j.clasificados || []).length ? j.clasificados.map(x => `<span>👑 ${esc(x.n)} · ${x.pts} pts</span>`).join('') : '<small class="muted">Sin ascensos directos en esta jornada.</small>'}</div>
        </article>`;
    }

    function pintarJornadas() {
        const lista = visibles();
        const cont = $('ascJornadas');
        if (!lista.length) { cont.innerHTML = `<p class="res-vacio"><i class="fa-regular fa-calendar"></i>Todavía no hay jornadas publicadas.</p>`; $('ascVerMas').hidden = true; return; }
        const n = verTodas ? lista.length : Math.min(6, lista.length);
        cont.innerHTML = lista.slice(0, n).map(tarjetaJornada).join('');
        $('ascVerMas').hidden = lista.length <= 6;
        $('ascVerMas').textContent = verTodas ? 'Ver menos' : `Ver las ${lista.length} jornadas`;
    }

    // Equipos: en qué categorías jugaron (y cuántas veces), ascensos y puntos
    function pintarEquipos() {
        const mapa = new Map();
        visibles().forEach(j => {
            const sube = new Set((j.clasificados || []).map(x => norm(x.n)));
            (j.equipos || []).forEach(e => {
                const key = norm(e.n);
                if (!key) return;
                const r = mapa.get(key) || { n: e.n, t: e.t, jornadas: 0, ascensos: 0, pts: 0, total: 0, cats: {} };
                r.jornadas++; r.pts += e.pts || 0; r.total += e.total || 0;
                if (sube.has(key)) r.ascensos++;
                r.cats[j.categoria] = (r.cats[j.categoria] || 0) + 1;
                if (e.t) r.t = e.t;
                mapa.set(key, r);
            });
        });
        const filas = [...mapa.values()].sort((a, b) => b.ascensos - a.ascensos || b.total - a.total).slice(0, 100);
        const tb = $('ascEquiposBody');
        if (!filas.length) { tb.innerHTML = `<tr class="vacio"><td colspan="7"><i class="fa-solid fa-users"></i>Sin equipos todavía.</td></tr>`; return; }
        tb.innerHTML = filas.map((r, i) => `<tr class="${i < 3 ? 'top' + (i + 1) : ''}">
            <td class="c-pos"><b>${i + 1}</b></td><td class="eq-nombre"><b>${esc(r.n)}</b></td><td data-l="Tag">${esc(r.t || '—')}</td>
            <td data-l="Jornadas">${r.jornadas}</td><td data-l="Ascensos">${r.ascensos ? '👑 ' + r.ascensos : '0'}</td><td class="c-pr" data-l="Total">${r.total}</td>
            <td class="cats">${Object.entries(r.cats).sort((a, b) => b[1] - a[1]).map(([c, n]) => { const x = CAT(c); return `<span class="cat-chip" style="--cat:${x.color}" title="${n} jornada(s)">${esc(x.corto)} ×${n}</span>`; }).join('')}</td></tr>`).join('');
    }

    function pintarTodo() { pintarFiltro(); pintarStats(); pintarJornadas(); pintarEquipos(); }

    async function cupos() {
        const n = $('ascCuposInfo');
        if (!n) return;
        try {
            const l = await P.cupos.publicos(PORTAL);
            n.textContent = l.length ? `Hay ${l.length} jornada(s) con cupos abiertos.` : 'Por ahora no hay cupos abiertos. Vuelve pronto.';
        } catch (e) { n.textContent = 'Revisa los cupos disponibles para las próximas jornadas.'; }
    }

    async function iniciar() {
        $('ascVerMas').addEventListener('click', () => { verTodas = !verTodas; pintarJornadas(); });
        try { jornadas = await P.ascensos.jornadas(PORTAL, 300); }
        catch (e) { $('ascJornadas').innerHTML = `<p class="res-vacio">${esc(e.message)}</p>`; jornadas = []; }
        pintarTodo();
        if (window.PumasBaneados) PumasBaneados.montarPublico('ascBaneados', PORTAL);
        cupos();
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
})();
