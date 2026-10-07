/* Portal público de resultados de un portal (lee la base de datos de ese portal).
   <script src="../portal-kit/resultados.js" data-portal="row"></script>
   Necesita portal.js cargado antes y en la página:
   #tbodyTablaGeneral, #listaSesiones, #listaKillers, #resStats */
(function () {
    const PORTAL = document.currentScript.dataset.portal;
    const P = window.PumasPortal;
    const esc = P.escaparHtml;
    const num = n => Number(n || 0).toLocaleString('es');

    function vacio(texto, colspan) {
        const contenido = `<i class="fa-solid fa-database"></i>${esc(texto)}`;
        return colspan ? `<tr class="vacio"><td colspan="${colspan}">${contenido}</td></tr>` : `<p class="res-vacio">${contenido}</p>`;
    }

    async function tablaGeneral() {
        const tbody = document.getElementById('tbodyTablaGeneral');
        const { data, error } = await P.db().from('v_tabla_general')
            .select('equipo, entrenos, salas, booyahs, kills, puntos')
            .eq('portal', PORTAL).order('puntos', { ascending: false }).limit(100);
        if (error || !data || !data.length) {
            tbody.innerHTML = vacio('Aún no hay resultados guardados en este portal.', 7);
            return [];
        }
        tbody.innerHTML = data.map((e, i) => `
            <tr class="${i < 3 ? 'top' + (i + 1) : ''}">
                <td><b>${i + 1}</b></td><td>${esc(e.equipo)}</td><td>${num(e.entrenos)}</td><td>${num(e.salas)}</td>
                <td>${num(e.booyahs)}</td><td>${num(e.kills)}</td><td><b>${num(e.puntos)}</b></td>
            </tr>`).join('');
        return data;
    }

    async function sesiones() {
        const cont = document.getElementById('listaSesiones');
        const { data, error, count } = await P.db().from('portal_sesiones')
            .select('id, titulo, jornada, fecha, moderador', { count: 'exact' })
            .eq('portal', PORTAL).order('fecha', { ascending: false }).limit(8);
        if (error || !data || !data.length) { cont.innerHTML = vacio('Todavía no hay entrenos registrados.'); return 0; }
        cont.innerHTML = data.map(s => {
            const f = new Date(s.fecha);
            return `<div class="res-row">
                <div><b>${esc(s.titulo)}</b><small>${esc(s.jornada || '')}${s.moderador ? ' · Mod: ' + esc(s.moderador) : ''}</small></div>
                <em>${f.toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' })}</em>
            </div>`;
        }).join('');
        return count || data.length;
    }

    async function killers() {
        const cont = document.getElementById('listaKillers');
        const { data, error } = await P.db().from('portal_killers')
            .select('jugador_nombre, equipo_nombre, kills, portal_sesiones!inner(portal)')
            .eq('portal_sesiones.portal', PORTAL).limit(5000);
        if (error || !data || !data.length) { cont.innerHTML = vacio('Aún no hay kills registradas.'); return; }
        const suma = new Map();
        data.forEach(k => {
            const clave = (k.jugador_nombre || '').trim().toLowerCase();
            const prev = suma.get(clave) || { nombre: k.jugador_nombre, equipo: k.equipo_nombre, kills: 0 };
            prev.kills += k.kills || 0;
            suma.set(clave, prev);
        });
        const top = [...suma.values()].sort((a, b) => b.kills - a.kills).slice(0, 10);
        cont.innerHTML = top.map((k, i) => `<div class="res-row">
                <div><b>${i + 1}. ${esc(k.nombre)}</b><small>${esc(k.equipo || '')}</small></div>
                <em>${num(k.kills)} kills</em>
            </div>`).join('');
    }

    function stats(tabla, totalSesiones) {
        const el = document.getElementById('resStats');
        if (!el) return;
        const t = tabla.reduce((a, e) => ({ kills: a.kills + (e.kills || 0), booyahs: a.booyahs + (e.booyahs || 0) }), { kills: 0, booyahs: 0 });
        const valores = { entrenos: totalSesiones, equipos: tabla.length, kills: t.kills, booyahs: t.booyahs };
        Object.entries(valores).forEach(([k, v]) => { const b = el.querySelector(`[data-stat="${k}"]`); if (b) b.textContent = num(v); });
    }

    async function cargar() {
        if (!P.db()) return;
        const [tabla, totalSesiones] = await Promise.all([tablaGeneral(), sesiones(), killers()]);
        stats(tabla, totalSesiones);
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', cargar);
    else cargar();
})();
