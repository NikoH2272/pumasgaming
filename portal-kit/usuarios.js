/* Gestión de usuarios y roles. Solo roles con permiso "gestionar".
   Necesita <main id="gestionUsuarios"> y portal.js cargado antes. */
(function () {
    const raiz = document.getElementById('gestionUsuarios');
    const loginUrl = raiz.dataset.login || 'login.html';
    const P = window.PumasPortal;
    const esc = P.escaparHtml;

    document.documentElement.classList.add('pg-verificando');

    let datos = { usuarios: [], roles: [], portales: [] };
    let yo = null;

    async function arrancar() {
        yo = await P.guard('principal', loginUrl, 'gestionar');
        if (!yo) return;
        document.querySelectorAll('[data-pg-usuario]').forEach(n => { n.textContent = yo.nombre || yo.usuario; });
        document.querySelectorAll('[data-pg-salir]').forEach(n => n.addEventListener('click', e => { e.preventDefault(); P.logout(loginUrl); }));
        await recargar();
    }

    async function recargar(mensaje) {
        try {
            datos = await P.usuarios.listar();
            pintar();
            if (mensaje) avisar(mensaje, true);
        } catch (err) {
            raiz.innerHTML = `<p class="tool-desc">No se pudo cargar: ${esc(err.message)}</p>`;
        }
    }

    function avisar(t, ok) {
        const n = document.getElementById('gestionMsg');
        n.textContent = t;
        n.className = 'auth-msg' + (ok ? ' ok' : '');
    }

    async function ejecutar(btn, accion, exito) {
        btn.disabled = true;
        avisar('Guardando...', true);
        try { await accion(); await recargar(exito); }
        catch (err) { avisar('Error: ' + err.message); btn.disabled = false; }
    }

    const opcionesRol = sel => datos.roles.map(r =>
        `<option value="${esc(r.id)}" ${r.id === sel ? 'selected' : ''}>${esc(r.nombre)}</option>`).join('');

    function checksPortales(r) {
        const lista = r.portales || [];
        const todos = lista.includes('*');
        return `<label class="chk"><input type="checkbox" value="*" ${todos ? 'checked' : ''}> <b>Todos</b></label>` +
            datos.portales.map(p => `<label class="chk"><input type="checkbox" value="${esc(p.id)}" ${lista.includes(p.id) ? 'checked' : ''}> ${esc(p.nombre)}</label>`).join('');
    }

    function pintar() {
        const filasUsuarios = datos.usuarios.map(u => `
            <tr data-usuario="${esc(u.usuario)}">
                <td><b>${esc(u.usuario)}</b>${u.usuario === yo.usuario ? ' <small class="muted">(tú)</small>' : ''}</td>
                <td><input type="text" data-campo="nombre" value="${esc(u.nombre || '')}" aria-label="Nombre de ${esc(u.usuario)}"></td>
                <td><select data-campo="rol" aria-label="Rol de ${esc(u.usuario)}">${u.rol ? '' : '<option value="">— sin rol —</option>'}${opcionesRol(u.rol)}</select></td>
                <td style="text-align:center"><input type="checkbox" data-campo="activo" ${u.activo ? 'checked' : ''} aria-label="Activo"></td>
                <td><input type="password" data-campo="clave" placeholder="Nueva clave (opcional)" autocomplete="new-password" aria-label="Nueva clave de ${esc(u.usuario)}"></td>
                <td><button class="btn-mini" data-accion="guardar-usuario"><i class="fa-solid fa-floppy-disk"></i> Guardar</button></td>
            </tr>`).join('');

        const tarjetasRoles = datos.roles.map(r => `
            <article class="card-box rol-card" data-rol="${esc(r.id)}">
                <div class="rol-head"><code>${esc(r.id)}</code><small class="muted">${r.usuarios} usuario(s)</small></div>
                <div class="form-group"><label>Nombre</label><input type="text" data-campo="nombre" value="${esc(r.nombre)}"></div>
                <div class="form-group"><label>Portales que puede ver</label><div class="chks" data-campo="portales">${checksPortales(r)}</div></div>
                <div class="chks">
                    <label class="chk"><input type="checkbox" data-campo="personalizar" ${r.personalizar ? 'checked' : ''}> Personalizar efecto</label>
                    <label class="chk"><input type="checkbox" data-campo="gestionar" ${r.gestionar ? 'checked' : ''}> Gestionar usuarios y roles</label>
                </div>
                <div class="acciones">
                    <button class="btn-mini" data-accion="guardar-rol"><i class="fa-solid fa-floppy-disk"></i> Guardar</button>
                    ${r.id !== 'superadmin' && !r.usuarios ? '<button class="btn-mini" data-accion="eliminar-rol"><i class="fa-solid fa-trash"></i> Borrar</button>' : ''}
                </div>
            </article>`).join('');

        raiz.innerHTML = `
        <p id="gestionMsg" class="auth-msg" role="status" style="text-align:center"></p>

        <h3 class="bloque-titulo"><i class="fa-solid fa-users"></i> Usuarios</h3>
        <article class="card-box">
            <form id="formNuevoUsuario" class="form-grid nuevo">
                <div class="form-group"><label for="nuUsuario">Usuario (sin @)</label><input id="nuUsuario" required autocapitalize="none" spellcheck="false" placeholder="adminliga" pattern="[a-zA-Z0-9._\\-]{3,30}"></div>
                <div class="form-group"><label for="nuNombre">Nombre</label><input id="nuNombre" placeholder="Admin Liga"></div>
                <div class="form-group"><label for="nuRol">Rol</label><select id="nuRol" required>${opcionesRol()}</select></div>
                <div class="form-group"><label for="nuClave">Contraseña</label><input id="nuClave" type="password" required minlength="6" autocomplete="new-password"></div>
                <div class="form-group"><label>&nbsp;</label><button class="btn-access" type="submit" style="width:100%"><i class="fa-solid fa-user-plus"></i> Crear</button></div>
            </form>
            <div class="pg-tabla-wrap" style="margin-top:18px">
                <table class="pg-tabla tabla-usuarios">
                    <thead><tr><th>Usuario</th><th>Nombre</th><th>Rol</th><th>Activo</th><th>Cambiar clave</th><th></th></tr></thead>
                    <tbody>${filasUsuarios}</tbody>
                </table>
            </div>
        </article>

        <h3 class="bloque-titulo"><i class="fa-solid fa-id-badge"></i> Roles</h3>
        <div class="roles-grid">
            ${tarjetasRoles}
            <article class="card-box rol-card nuevo-rol" data-rol="">
                <div class="rol-head"><b>Nuevo rol</b></div>
                <div class="form-group"><label>Código (sin espacios)</label><input type="text" data-campo="id" placeholder="liga_staff"></div>
                <div class="form-group"><label>Nombre</label><input type="text" data-campo="nombre" placeholder="Staff de liga"></div>
                <div class="form-group"><label>Portales que puede ver</label><div class="chks" data-campo="portales">${checksPortales({ portales: [] })}</div></div>
                <div class="chks">
                    <label class="chk"><input type="checkbox" data-campo="personalizar"> Personalizar efecto</label>
                    <label class="chk"><input type="checkbox" data-campo="gestionar"> Gestionar usuarios y roles</label>
                </div>
                <div class="acciones"><button class="btn-mini" data-accion="guardar-rol"><i class="fa-solid fa-plus"></i> Crear rol</button></div>
            </article>
        </div>`;

        raiz.querySelector('#formNuevoUsuario').addEventListener('submit', e => {
            e.preventDefault();
            const btn = e.target.querySelector('button');
            const u = {
                usuario: raiz.querySelector('#nuUsuario').value.trim().toLowerCase(),
                nombre: raiz.querySelector('#nuNombre').value.trim(),
                rol: raiz.querySelector('#nuRol').value,
                clave: raiz.querySelector('#nuClave').value
            };
            if (datos.usuarios.some(x => x.usuario.toLowerCase() === u.usuario)) { avisar('Ese usuario ya existe: edítalo en la tabla.'); return; }
            ejecutar(btn, () => P.usuarios.guardarUsuario(u), `Usuario ${u.usuario} creado.`);
        });

        raiz.querySelectorAll('[data-accion="guardar-usuario"]').forEach(btn => btn.addEventListener('click', () => {
            const fila = btn.closest('tr');
            const campo = c => fila.querySelector(`[data-campo="${c}"]`);
            const u = {
                usuario: fila.dataset.usuario,
                nombre: campo('nombre').value.trim(),
                rol: campo('rol').value,
                activo: campo('activo').checked,
                clave: campo('clave').value
            };
            if (!u.rol) { avisar('Elige un rol.'); return; }
            ejecutar(btn, () => P.usuarios.guardarUsuario(u), `Usuario ${u.usuario} actualizado${u.clave ? ' (clave cambiada)' : ''}.`);
        }));

        raiz.querySelectorAll('[data-accion="guardar-rol"]').forEach(btn => btn.addEventListener('click', () => {
            const card = btn.closest('.rol-card');
            const campo = c => card.querySelector(`[data-campo="${c}"]`);
            const r = {
                id: card.dataset.rol || campo('id').value.trim().toLowerCase(),
                nombre: campo('nombre').value.trim(),
                portales: [...campo('portales').querySelectorAll('input:checked')].map(i => i.value),
                personalizar: campo('personalizar').checked,
                gestionar: campo('gestionar').checked
            };
            if (r.portales.includes('*')) r.portales = ['*'];
            if (!card.dataset.rol && datos.roles.some(x => x.id === r.id)) { avisar('Ya existe un rol con ese código.'); return; }
            ejecutar(btn, () => P.usuarios.guardarRol(r), `Rol ${r.id} guardado.`);
        }));

        raiz.querySelectorAll('[data-accion="eliminar-rol"]').forEach(btn => btn.addEventListener('click', () => {
            const id = btn.closest('.rol-card').dataset.rol;
            if (!confirm(`¿Borrar el rol "${id}"?`)) return;
            ejecutar(btn, () => P.usuarios.eliminarRol(id), `Rol ${id} borrado.`);
        }));
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', arrancar);
    else arrancar();
})();
