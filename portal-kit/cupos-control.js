/* =====================================================================
   PUMAS GAMING · Control de cupos: VIP, baneados y "Generar baneo" (sql/25)
   Solo en Entrenos Pumas y en el módulo de Pruebas.
   PumasControl.montarVip(contId, portal)      → lista VIP (equipo + número)
   PumasControl.montarBaneos(contId, portal)   → baneo por equipo y/o número
   PumasControl.revisarSalas(portal, equipos)  → ventana GENERAR BANEO con los
        equipos que no jugaron 2 salas o no jugaron la última.
        equipos: [{ equipo, salas: [true/false por sala] }]
   ===================================================================== */
(function () {
    const P = window.PumasPortal;
    const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const PAISES = ['+57', '+52', '+54', '+56', '+51', '+593', '+58', '+591', '+595', '+598', '+502', '+504', '+503', '+505', '+506', '+507', '+1', '+34'];
    const fecha = d => d ? new Date(String(d).length === 10 ? d + 'T12:00:00' : d).toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Indefinido';
    const hoy = () => new Date().toISOString().slice(0, 10);
    // Páginas ocultas de cupos VIP (solo con el link, como Registrar VIP)
    const LINK_VIP = { entrenamientos: '/entrenamientos/cupos-vip.html', pruebas: '/pruebas/cupos-vip.html' };
    const errorSql = e => /admin_vip|admin_baneo|PGRST202|Could not find/i.test(e.message) ? 'Falta correr sql/25_cupos_vip_y_baneos.sql en Supabase.' : e.message;

    const CSS = `
.cc-form{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,190px),1fr));gap:12px;align-items:end}
.cc-tel{display:grid;grid-template-columns:96px 1fr;gap:8px}
.cc-form input,.cc-form select{width:100%}
.cc-msg{margin:10px 0 0;font-size:.88rem}
.cc-link{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:10px;margin-bottom:16px;padding:12px 14px;border:1px solid rgba(255,213,74,.55);border-radius:8px;background:rgba(255,213,74,.07)}
.cc-link small{display:block;color:#FFE38A;font-size:.72rem;letter-spacing:.04em;margin-bottom:4px}
.cc-link code{color:#fff;font-size:.9rem;word-break:break-all}
.cc-h{display:flex;align-items:center;gap:8px;margin:24px 0 10px;color:#D8C395;font-size:.85rem;letter-spacing:.06em}
.cc-h small{color:#9a9a9a;letter-spacing:0}
.cc-tabla-wrap{overflow-x:auto;border:1px solid rgba(216,195,149,.2);border-radius:6px}
.cc-tabla{width:100%;border-collapse:collapse;font-size:.86rem}
.cc-tabla th{padding:8px;color:#D8C395;font-size:.62rem;letter-spacing:.06em;text-align:left;background:rgba(0,0,0,.35);white-space:nowrap}
.cc-tabla td{padding:8px;border-top:1px solid rgba(255,255,255,.06);color:#ddd;vertical-align:middle}
.cc-tabla tr.vencido td{opacity:.5}
.cc-vacio{padding:14px;color:#9a9a9a;text-align:center}
.cc-btn{display:inline-flex;align-items:center;gap:6px;padding:6px 10px;border:1px solid rgba(216,195,149,.35);border-radius:4px;background:transparent;color:#D8C395;font-size:.78rem;cursor:pointer}
.cc-btn:hover{background:rgba(216,195,149,.1)}
.cc-btn.rojo{border-color:rgba(255,85,85,.5);color:#ff8a8d}
.cc-btn.verde{border-color:rgba(110,231,168,.5);color:#6ee7a8}
.cc-btn.lleno{background:#D8C395;color:#0a0b10;border-color:#D8C395;font-weight:bold}
.cc-btn:disabled{opacity:.5;cursor:default}
.cc-chip{display:inline-block;padding:2px 7px;border-radius:3px;font-size:.66rem;font-weight:bold;letter-spacing:.05em}
.cc-chip.vip{background:#FFD54A;color:#1a1400}
.cc-chip.pub{background:rgba(255,255,255,.12);color:#ddd}
.cc-capa{position:fixed;inset:0;z-index:3000;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(0,0,0,.82);backdrop-filter:blur(4px)}
.cc-ventana{width:100%;max-width:640px;max-height:92vh;overflow:auto;padding:22px;background:#121317;border:1px solid rgba(255,85,85,.5);border-radius:10px;color:#eee}
.cc-ventana h3{margin:0 0 6px;color:#ff8a8d;font-size:1.1rem;letter-spacing:.06em}
.cc-ventana p{margin:0 0 12px;color:#bbb;font-size:.9rem}
.cc-item{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:10px;padding:10px 12px;margin-bottom:8px;border:1px solid rgba(255,255,255,.1);border-radius:6px;background:rgba(0,0,0,.3)}
.cc-item b{color:#fff}.cc-item small{display:block;color:#FFD54A;font-size:.78rem}
.cc-item.hecho{opacity:.55}
.cc-pie{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:10px;margin-top:14px}`;
    function estilos() {
        if (document.getElementById('pgControlCss')) return;
        const st = document.createElement('style'); st.id = 'pgControlCss'; st.textContent = CSS; document.head.appendChild(st);
    }
    const campoTel = (pref) => `<div class="cc-tel"><select data-${pref}="pais">${PAISES.map(p => `<option>${p}</option>`).join('')}</select>
        <input data-${pref}="tel" inputmode="tel" maxlength="16" placeholder="Número sin espacios"></div>`;

    /* ---------------- VIP ---------------- */
    async function montarVip(contId, portal) {
        const cont = document.getElementById(contId);
        if (!cont) return;
        estilos();
        cont.innerHTML = `
            ${LINK_VIP[portal] ? `<div class="cc-link"><div><small><i class="fa-solid fa-link"></i> LINK OCULTO DE CUPOS VIP · no sale en el portal ni en el menú: compártelo solo con los VIP</small>
                <code data-v="link">${esc(location.origin + LINK_VIP[portal])}</code></div>
                <div style="display:flex;gap:6px"><button class="cc-btn lleno" data-v="copiar" type="button"><i class="fa-solid fa-copy"></i> Copiar</button>
                <a class="cc-btn" href="${esc(LINK_VIP[portal])}" target="_blank" rel="noopener"><i class="fa-solid fa-arrow-up-right-from-square"></i> Abrir</a></div></div>` : ''}
            <p class="tool-desc">Equipos que pueden inscribirse a los cupos <b>VIP</b>. Al inscribirse deben usar <b>el mismo nombre de equipo y el mismo número</b> que están aquí${portal === 'entrenamientos' ? ' (o los de su registro VIP aprobado)' : ''}; si no coinciden, no les da el cupo.</p>
            <div class="cc-form">
                <div class="form-group"><label>Nombre del equipo</label><input data-v="equipo" maxlength="60" placeholder="Ej: LOS TIGRES"></div>
                <div class="form-group"><label>Número con el que se anotó</label>${campoTel('v')}</div>
                <div class="form-group"><button class="btn-generar" data-v="agregar" type="button"><i class="fa-solid fa-crown"></i> Agregar a VIP</button></div>
            </div>
            <p class="cc-msg" data-v="msg" role="status"></p>
            <div data-v="lista"><p class="cc-vacio">Cargando...</p></div>`;
        const $ = k => cont.querySelector(`[data-v="${k}"]`);
        const msg = (t, c) => { $('msg').textContent = t; $('msg').style.color = c || ''; };
        if ($('copiar')) $('copiar').onclick = async () => {
            try { await navigator.clipboard.writeText($('link').textContent); msg('✔ Link copiado.', '#6ee7a8'); }
            catch (e) { msg('Copia el link a mano: ' + $('link').textContent); }
        };
        async function pintar() {
            let r;
            try { r = await P.control.vipLista(portal); } catch (e) { $('lista').innerHTML = `<p class="cc-vacio">${esc(errorSql(e))}</p>`; return; }
            const tabla = (filas, borrar) => filas.length ? `<div class="cc-tabla-wrap"><table class="cc-tabla"><thead><tr><th>#</th><th>EQUIPO</th>${filas.some(f => f.tag) ? '<th>TAG</th>' : ''}<th>NÚMERO</th>${borrar ? '<th></th>' : ''}</tr></thead><tbody>
                ${filas.map((f, i) => `<tr><td>${i + 1}</td><td><b>${esc(f.equipo)}</b></td>${filas.some(x => x.tag) ? `<td>${esc(f.tag || '')}</td>` : ''}<td>${esc(f.telefono)}</td>
                ${borrar ? `<td style="text-align:right"><button class="cc-btn rojo" data-borrar="${f.id}"><i class="fa-solid fa-trash"></i> Quitar</button></td>` : ''}</tr>`).join('')}</tbody></table></div>`
                : '<p class="cc-vacio">Todavía no hay equipos en esta lista.</p>';
            $('lista').innerHTML = `<div class="cc-h"><i class="fa-solid fa-crown"></i> LISTA VIP <small>(${r.lista.length})</small></div>${tabla(r.lista, true)}
                ${portal === 'entrenamientos' ? `<div class="cc-h"><i class="fa-solid fa-id-card"></i> REGISTROS VIP APROBADOS <small>(${r.registros.length}) · también pueden entrar a los cupos VIP · se manejan en VIP → Registrar VIP</small></div>${tabla(r.registros, false)}` : ''}`;
            $('lista').querySelectorAll('[data-borrar]').forEach(b => b.onclick = async () => {
                if (!confirm('¿Quitar este equipo de la lista VIP?')) return;
                try { await P.control.vipBorrar(portal, Number(b.dataset.borrar)); pintar(); } catch (e) { msg(errorSql(e), '#ff8a8d'); }
            });
        }
        $('agregar').onclick = async () => {
            const equipo = $('equipo').value.trim(), tel = $('tel').value.replace(/[^\d]/g, '');
            if (!equipo || tel.length < 7) { msg('Escribe el nombre del equipo y un número válido.', '#ff8a8d'); return; }
            try {
                await P.control.vipGuardar(portal, equipo, $('pais').value + ' ' + tel);
                $('equipo').value = ''; $('tel').value = '';
                msg('✔ Agregado a VIP.', '#6ee7a8'); pintar();
            } catch (e) { msg(errorSql(e), '#ff8a8d'); }
        };
        pintar();
    }

    /* ---------------- Baneados (equipo y número) ---------------- */
    async function montarBaneos(contId, portal, alCambiar) {
        const cont = document.getElementById(contId);
        if (!cont) return;
        estilos();
        cont.innerHTML = `
            <p class="tool-desc">Un equipo o un número baneado <b>no consigue cupo</b>, ni público ni VIP. Puedes banear el equipo, el número o los dos a la vez.
                La lista de equipos sale en el portal; los números nunca se muestran en público.</p>
            <div class="cc-form">
                <div class="form-group"><label>Equipo</label><input data-b="equipo" maxlength="60" placeholder="Nombre del equipo"></div>
                <div class="form-group"><label>Número (opcional)</label>${campoTel('b')}</div>
                <div class="form-group"><label>Motivo</label><input data-b="motivo" maxlength="200" placeholder="Ej: No jugó la última sala"></div>
                <div class="form-group"><label>Hasta (vacío = indefinido)</label><input data-b="hasta" type="date"></div>
                <div class="form-group"><button class="btn-generar" data-b="agregar" type="button"><i class="fa-solid fa-ban"></i> Banear</button></div>
            </div>
            <p class="cc-msg" data-b="msg" role="status"></p>
            <div data-b="lista"><p class="cc-vacio">Cargando...</p></div>`;
        const $ = k => cont.querySelector(`[data-b="${k}"]`);
        const msg = (t, c) => { $('msg').textContent = t; $('msg').style.color = c || ''; };
        const vencido = b => b.hasta && b.hasta < hoy();
        async function pintar() {
            let r;
            try { r = await P.control.baneos(portal); } catch (e) { $('lista').innerHTML = `<p class="cc-vacio">${esc(errorSql(e))}</p>`; return; }
            const tabla = (filas, tipo) => filas.length ? `<div class="cc-tabla-wrap"><table class="cc-tabla"><thead><tr><th>${tipo === 'telefono' ? 'NÚMERO' : 'EQUIPO'}</th>
                <th>${tipo === 'telefono' ? 'EQUIPO' : 'TAG'}</th><th>MOTIVO</th><th>HASTA</th><th></th></tr></thead><tbody>
                ${filas.map(f => `<tr class="${vencido(f) ? 'vencido' : ''}"><td><b>${esc(tipo === 'telefono' ? f.telefono : f.equipo)}</b></td><td>${esc((tipo === 'telefono' ? f.equipo : f.tag) || '—')}</td>
                    <td>${esc(f.motivo || '—')}</td><td>${fecha(f.hasta)}${vencido(f) ? ' · vencido' : ''}</td>
                    <td style="text-align:right"><button class="cc-btn verde" data-quitar="${f.id}" data-tipo="${tipo}"><i class="fa-solid fa-hand-holding-heart"></i> Desbanear</button></td></tr>`).join('')}</tbody></table></div>`
                : '<p class="cc-vacio">Nadie baneado.</p>';
            $('lista').innerHTML = `<div class="cc-h"><i class="fa-solid fa-users-slash"></i> EQUIPOS BANEADOS <small>(${r.equipos.length})</small></div>${tabla(r.equipos, 'equipo')}
                <div class="cc-h"><i class="fa-solid fa-phone-slash"></i> NÚMEROS BANEADOS <small>(${r.telefonos.length}) · privados</small></div>${tabla(r.telefonos, 'telefono')}`;
            $('lista').querySelectorAll('[data-quitar]').forEach(b => b.onclick = async () => {
                if (!confirm('¿Quitar este baneo? Podrá volver a inscribirse a los cupos.')) return;
                try { await P.control.desbanear(portal, b.dataset.tipo, Number(b.dataset.quitar)); pintar(); if (alCambiar) alCambiar(); } catch (e) { msg(errorSql(e), '#ff8a8d'); }
            });
        }
        $('agregar').onclick = async () => {
            const equipo = $('equipo').value.trim(), tel = $('tel').value.replace(/[^\d]/g, '');
            if (!equipo && tel.length < 7) { msg('Escribe el equipo, el número o los dos.', '#ff8a8d'); return; }
            try {
                await P.control.banear(portal, { equipo, telefono: tel ? $('pais').value + ' ' + tel : null, motivo: $('motivo').value.trim(), hasta: $('hasta').value || null });
                ['equipo', 'tel', 'motivo', 'hasta'].forEach(k => { $(k).value = ''; });
                msg('✔ Baneado.', '#6ee7a8'); pintar(); if (alCambiar) alCambiar();
            } catch (e) { msg(errorSql(e), '#ff8a8d'); }
        };
        pintar();
    }

    /* ---------------- GENERAR BANEO (al cargar resultados) ---------------- */
    // equipos: [{ equipo, salas: [bool...] }] → los que jugaron menos de 2 salas o no jugaron la última
    function candidatos(equipos) {
        return (equipos || []).map(e => {
            const n = e.salas.length, jugadas = e.salas.filter(Boolean).length;
            const motivos = [];
            if (n >= 2 && jugadas < 2) motivos.push(`Jugó ${jugadas} de ${n} salas`);
            if (n >= 2 && !e.salas[n - 1]) motivos.push('No jugó la última sala');
            return { equipo: e.equipo, jugadas, total: n, motivos };
        }).filter(c => c.motivos.length);
    }

    function revisarSalas(portal, equipos) {
        const lista = candidatos(equipos);
        if (!lista.length) return false;
        estilos();
        const capa = document.createElement('div');
        capa.className = 'cc-capa';
        capa.innerHTML = `<div class="cc-ventana" role="dialog" aria-modal="true" aria-labelledby="ccTitulo">
            <h3 id="ccTitulo"><i class="fa-solid fa-gavel"></i> GENERAR BANEO</h3>
            <p>Estos equipos <b>no jugaron 2 salas</b> o <b>no jugaron la última</b>. <b>Banear</b> los saca de los cupos (equipo y el número con que se inscribieron);
               <b>Perdonar</b> los quita de esta lista sin banearlos.</p>
            <div class="cc-g-lista">${lista.map((c, i) => `<div class="cc-item" data-i="${i}">
                <div><b>${esc(c.equipo)}</b><small><i class="fa-solid fa-triangle-exclamation"></i> ${esc(c.motivos.join(' · '))}</small></div>
                <div style="display:flex;gap:6px"><button class="cc-btn rojo" data-banear="${i}"><i class="fa-solid fa-ban"></i> Banear</button>
                    <button class="cc-btn verde" data-perdonar="${i}"><i class="fa-solid fa-hand-holding-heart"></i> Perdonar</button></div></div>`).join('')}</div>
            <div class="cc-form" style="margin-top:6px"><div class="form-group"><label>Baneo hasta (vacío = indefinido)</label><input type="date" data-g="hasta"></div></div>
            <div class="cc-pie"><span class="cc-msg" data-g="msg" role="status"></span>
                <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="cc-btn rojo" data-g="todos"><i class="fa-solid fa-ban"></i> Banear a todos</button>
                <button class="cc-btn lleno" data-g="cerrar">Cerrar</button></div></div></div>`;
        document.body.appendChild(capa);
        const msg = (t, c) => { const m = capa.querySelector('[data-g="msg"]'); m.textContent = t; m.style.color = c || ''; };
        const cerrar = () => { capa.remove(); document.removeEventListener('keydown', tecla); };
        const tecla = e => { if (e.key === 'Escape') cerrar(); };
        document.addEventListener('keydown', tecla);
        const quedan = () => capa.querySelectorAll('.cc-item:not(.hecho)').length;
        const listo = (fila, texto) => {
            fila.classList.add('hecho');
            fila.querySelector('div:last-child').innerHTML = `<span style="color:#9a9a9a;font-size:.8rem">${texto}</span>`;
            if (!quedan()) msg('✔ Lista revisada.', '#6ee7a8');
        };
        async function banear(i) {
            const c = lista[i], fila = capa.querySelector(`.cc-item[data-i="${i}"]`);
            if (!fila || fila.classList.contains('hecho')) return;
            fila.querySelectorAll('button').forEach(b => { b.disabled = true; });
            try {
                const r = await P.control.banearResultados(portal, c.equipo, c.motivos.join(' · '), capa.querySelector('[data-g="hasta"]').value || null);
                listo(fila, `<i class="fa-solid fa-ban" style="color:#ff8a8d"></i> Baneado${r && r.telefonos ? ` (+${r.telefonos} número${r.telefonos === 1 ? '' : 's'})` : ''}`);
            } catch (e) { fila.querySelectorAll('button').forEach(b => { b.disabled = false; }); msg(errorSql(e), '#ff8a8d'); }
        }
        capa.addEventListener('click', e => {
            const b = e.target.closest('[data-banear]'), p = e.target.closest('[data-perdonar]');
            if (b) banear(Number(b.dataset.banear));
            if (p) listo(capa.querySelector(`.cc-item[data-i="${p.dataset.perdonar}"]`), '<i class="fa-solid fa-hand-holding-heart" style="color:#6ee7a8"></i> Perdonado');
            if (e.target.closest('[data-g="cerrar"]')) cerrar();
        });
        capa.querySelector('[data-g="todos"]').onclick = async () => {
            if (!confirm(`¿Banear a los ${quedan()} equipos que quedan en la lista?`)) return;
            for (let i = 0; i < lista.length; i++) await banear(i);
        };
        return true;
    }

    window.PumasControl = { montarVip, montarBaneos, revisarSalas, candidatos };
})();
