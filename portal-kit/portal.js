/* =====================================================================
   PUMAS GAMING · Kit compartido de portales
   - Sesión de admin (login por usuario, sin @)
   - Protección de páginas por portal
   - Efecto global (iconos, fantasmas, calabazas, nieve)
   - Gestión de usuarios y roles

   Uso en cualquier página (después de supabase-js):
     <script src="../portal-kit/portal.js" data-portal="row" data-modo="protegido"></script>
   Los permisos vienen del ROL del usuario (tabla roles en Supabase).
   El efecto es GLOBAL: lo elige un rol con "personalizar" y sale en todas
   las páginas que cargan este script.
   Modos:
     publico    → solo aplica el efecto
     protegido  → exige sesión con permiso al portal + efecto
     admin      → exige sesión con permiso al portal + efecto (la página hace el resto)
     login      → solo aplica el efecto
   ===================================================================== */
(function () {
    const SUPABASE_URL = "https://bqemjroiegybdzksddkn.supabase.co";
    const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJxZW1qcm9pZWd5YmR6a3NkZGtuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc1NzgwNDIsImV4cCI6MjEwMzE1NDA0Mn0.49gC204FPWSNxWYa6eZFBgWJgr7ZvFax5mqOM9lyGPo";
    const CLAVE_SESION = 'pumas_admin';

    const PORTALES = {
        principal:      { nombre: 'Portal Principal', url: '/' },
        entrenamientos: { nombre: 'Entrenamientos',   url: '/entrenamientos/',  admin: '/entrenamientos/admin.html' },
        ascensosqfd:    { nombre: 'Ascensos QFD',     url: '/ascensosqfd/',     admin: '/ascensosqfd/admin.html' },
        row:            { nombre: 'ROW x Maya',       url: '/row/',             admin: '/row/admin.html' },
        rusheo:         { nombre: 'Rusheo',           url: '/rusheo/',          admin: '/rusheo/admin.html' },
        zmf:            { nombre: 'ZMF',              url: '/zmf/',             admin: '/zmf/admin.html' },
        zmffem:         { nombre: 'ZMF Femenino',     url: '/zmf/femenino.html', admin: '/zmf/admin.html' },
        // Dragon Fest: dos portales públicos (mixto y femenino) con UNA herramienta compartida
        dragonfest:     { nombre: 'Dragon Fest',          url: '/dragonfest/',    admin: '/dragonfest/admin.html' },
        dragonfestfem:  { nombre: 'Dragon Fest Femenino', url: '/dragonfest/femenino.html', admin: '/dragonfest/admin.html' }
    };

    const EFECTOS = {
        ninguno:   { nombre: 'Ninguno' },
        iconos:    { nombre: 'Iconos cayendo (personalizado)' },
        fantasmas: { nombre: 'Fantasmas', icono: '👻' },
        calabazas: { nombre: 'Calabazas', icono: '🎃' },
        nieve:     { nombre: 'Copos de nieve', icono: '❄' }
    };

    /* ---------------- Dirección limpia en la barra del navegador ---------------- */
    // · nunca se muestra "index.html" (la carpeta abre su index)
    // · en producción (GitHub Pages) tampoco ".html": /row/admin.html → /row/admin
    // · los enlaces del menú (#semana, #historico...) bajan a la sección sin ensuciar la dirección
    (function () {
        const prod = /(^|\.)pumasgaming\.com$|github\.io$/i.test(location.hostname);
        let ruta = location.pathname.replace(/\/index\.html$/i, '/');
        if (prod) ruta = ruta.replace(/\.html$/i, '');
        const hash = location.hash;
        if (ruta !== location.pathname || hash) {
            try { history.replaceState(history.state, '', ruta + location.search); } catch (e) { }
        }
        // si se llegó con #sección (ej. desde otra página), se baja a ella y se quita de la dirección
        if (hash && hash.length > 1) {
            // las tablas cargan después y empujan la sección: se re-alinea unos segundos, salvo que el usuario ya haya movido la página
            let quieto = true;
            const parar = () => { quieto = false; };
            ['wheel', 'touchstart', 'keydown', 'mousedown'].forEach(ev => addEventListener(ev, parar, { once: true, passive: true }));
            const ir = () => { if (!quieto) return; const el = document.getElementById(decodeURIComponent(hash.slice(1))); if (el) el.scrollIntoView({ behavior: 'instant', block: 'start' }); };
            const arrancar = () => [60, 500, 1200, 2200, 3500].forEach(t => setTimeout(ir, t));
            if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', arrancar);
            else arrancar();
        }
        document.addEventListener('click', e => {
            const a = e.target.closest && e.target.closest('a[href^="#"]');
            if (!a || a.getAttribute('href') === '#' || e.defaultPrevented) return;
            const el = document.getElementById(decodeURIComponent(a.getAttribute('href').slice(1)));
            if (!el) return;
            e.preventDefault();
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    })();

    const script = document.currentScript;
    const PORTAL = script ? script.dataset.portal : null;
    const MODO = script ? (script.dataset.modo || 'publico') : 'publico';

    let cliente = null;
    function db() {
        if (!cliente && window.supabase && window.supabase.createClient) {
            cliente = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
                auth: { persistSession: false, autoRefreshToken: false, storageKey: 'pumas-portal-kit' }
            });
        }
        return cliente;
    }

    /* ---------------- Sesión ---------------- */
    function leerSesion() {
        try { return JSON.parse(localStorage.getItem(CLAVE_SESION)); } catch (e) { return null; }
    }
    function guardarSesion(s) {
        try {
            localStorage.setItem(CLAVE_SESION, JSON.stringify(s));
            // Compatibilidad con el panel de entrenamientos existente
            if (puede(s, 'entrenamientos')) localStorage.setItem('pumas_user', JSON.stringify({ nombre: s.nombre, usuario: s.usuario }));
        } catch (e) { /* almacenamiento bloqueado */ }
    }
    function borrarSesion() {
        try { localStorage.removeItem(CLAVE_SESION); localStorage.removeItem('pumas_user'); } catch (e) { }
    }
    function puede(s, portal) {
        if (!s || !Array.isArray(s.portales)) return false;
        return s.portales.includes('*') || s.portales.includes(portal);
    }
    // Permisos especiales del rol: 'personalizar' (efecto global) y 'gestionar' (usuarios y roles)
    function tiene(s, permiso) {
        return !!(s && s[permiso] === true);
    }

    async function login(usuario, password) {
        const c = db();
        if (!c) throw new Error('No se pudo conectar con la base de datos.');
        const { data, error } = await c.rpc('login_admin', { p_usuario: usuario, p_password: password });
        if (error) throw new Error(error.message);
        if (!data) return null;
        guardarSesion(data);
        return data;
    }

    async function validar() {
        const s = leerSesion();
        if (!s || !s.token) return null;
        const c = db();
        if (!c) return null;
        const { data, error } = await c.rpc('validar_sesion', { p_token: s.token });
        if (error || !data) { borrarSesion(); return null; }
        guardarSesion(data);
        return data;
    }

    async function logout(destino) {
        const s = leerSesion();
        borrarSesion();
        try { if (s && s.token && db()) await db().rpc('cerrar_sesion', { p_token: s.token }); } catch (e) { }
        window.location.href = destino || 'login.html';
    }

    // A dónde entra cada usuario después del login:
    //  - si todos sus portales usan la MISMA herramienta (ej. row, o dragonfest + dragonfestfem)
    //    → directo a esa herramienta (admin.html)
    //  - superadmin, Pumas, quien personaliza/gestiona o maneja varias herramientas → panel /admin/
    function herramientaUnica(s) {
        const p = (s && s.portales) || [];
        if (!p.length || p.includes('*') || p.includes('principal') || tiene(s, 'personalizar') || tiene(s, 'gestionar')) return null;
        const admins = new Set(p.map(id => PORTALES[id] && PORTALES[id].admin).filter(Boolean));
        return admins.size === 1 ? [...admins][0] : null;
    }
    function inicioDe(s) {
        return herramientaUnica(s) || '/admin/';
    }

    // permiso: undefined → acceso al portal; 'personalizar' o 'gestionar' → ese permiso del rol
    async function guard(portal, loginUrl, permiso) {
        const s = await validar();
        if (!s || !(permiso ? tiene(s, permiso) : puede(s, portal))) {
            const next = encodeURIComponent(location.pathname + location.search);
            window.location.replace((loginUrl || 'login.html') + '?next=' + next + (s ? '&denegado=1' : ''));
            return null;
        }
        document.documentElement.classList.remove('pg-verificando');
        return s;
    }

    /* ---------------- Personalización ---------------- */
    const EFECTO_VACIO = { efecto: 'ninguno', efecto_icono: '🔥', efecto_cantidad: 30 };

    async function leerFila(portal) {
        const c = db();
        if (!c) return null;
        const { data, error } = await c.from('portal_config').select('*').eq('portal', portal).maybeSingle();
        return error ? null : data;
    }

    // Efecto global (fila 'global'), igual para todo el sitio
    async function cargarEfecto() {
        const f = await leerFila('global');
        return f ? { efecto: f.efecto, efecto_icono: f.efecto_icono, efecto_cantidad: f.efecto_cantidad } : { ...EFECTO_VACIO };
    }

    function token() {
        const s = leerSesion();
        if (!s) throw new Error('Tu sesión expiró. Inicia sesión de nuevo.');
        return s.token;
    }

    async function guardarEfecto(cfg) {
        const { error } = await db().rpc('guardar_efecto_global', {
            p_token: token(),
            p_efecto: cfg.efecto,
            p_icono: cfg.efecto_icono,
            p_cantidad: cfg.efecto_cantidad
        });
        if (error) throw new Error(error.message);
    }

    /* ---------------- Usuarios y roles (rol con "gestionar") ---------------- */
    async function rpcAdmin(nombre, params) {
        const { data, error } = await db().rpc(nombre, Object.assign({ p_token: token() }, params || {}));
        if (error) throw new Error(error.message);
        return data;
    }
    const usuarios = {
        listar: () => rpcAdmin('admin_listar'),
        guardarUsuario: u => rpcAdmin('admin_guardar_usuario', {
            p_usuario: u.usuario, p_nombre: u.nombre || null, p_rol: u.rol,
            p_activo: u.activo !== false, p_clave: u.clave || null
        }),
        guardarRol: r => rpcAdmin('admin_guardar_rol', {
            p_id: r.id, p_nombre: r.nombre, p_portales: r.portales || [],
            p_personalizar: !!r.personalizar, p_gestionar: !!r.gestionar
        }),
        eliminarRol: id => rpcAdmin('admin_eliminar_rol', { p_id: id })
    };

    /* ---------------- Entrenos: guardar (herramientas) y corregir (superadmin) ---------------- */
    const entrenos = {
        // d: { portal, titulo, jornada, fecha (Date), moderador, salas: [...], killers: [...] }
        guardar: d => rpcAdmin('guardar_entreno', {
            p_portal: d.portal, p_titulo: d.titulo, p_jornada: d.jornada || null,
            p_fecha: (d.fecha || new Date()).toISOString(), p_moderador: d.moderador || null,
            p_salas: d.salas, p_killers: d.killers
        }),
        listar: portal => rpcAdmin('admin_entrenos', { p_portal: portal }),
        equipos: portal => rpcAdmin('admin_equipos_portal', { p_portal: portal }),
        borrar: (portal, id) => rpcAdmin('admin_borrar_entreno', { p_portal: portal, p_sesion: String(id) }),
        renombrar: (portal, viejo, nuevo, sesion) => rpcAdmin('admin_renombrar_equipo', {
            p_portal: portal, p_viejo: viejo, p_nuevo: nuevo, p_sesion: sesion ? String(sesion) : null
        })
    };

    // Respaldo completo de la base en JSON (superadmin). No incluye contraseñas.
    const respaldo = () => rpcAdmin('admin_respaldo');

    /* ---------------- Ventana de confirmación ---------------- */
    // confirmar({ titulo, html, si, no, peligro }) → Promise<boolean>
    // Si html trae campos con [data-campo], resuelve { ok, campos: {nombre: valor} }
    function confirmar(op) {
        return new Promise(resolve => {
            const capa = document.createElement('div');
            capa.className = 'pg-modal';
            capa.innerHTML = `<div class="pg-modal-caja${op.peligro ? ' peligro' : ''}" role="dialog" aria-modal="true" aria-labelledby="pgModalTitulo">
                <h3 id="pgModalTitulo">${escaparHtml(op.titulo || '¿Confirmas?')}</h3>
                <div class="pg-modal-cuerpo">${op.html || ''}</div>
                <div class="pg-modal-botones">
                    <button type="button" class="btn-access btn-outline" data-r="no">${escaparHtml(op.no || 'No, cancelar')}</button>
                    <button type="button" class="btn-access${op.peligro ? ' btn-peligro' : ''}" data-r="si">${escaparHtml(op.si || 'Sí, confirmar')}</button>
                </div></div>`;
            const antes = document.activeElement;
            const cerrar = ok => {
                const campos = {};
                capa.querySelectorAll('[data-campo]').forEach(i => { campos[i.dataset.campo] = i.value; });
                capa.remove();
                document.removeEventListener('keydown', tecla);
                if (antes && antes.focus) antes.focus();
                resolve(capa.querySelector('[data-campo]') ? { ok, campos } : ok);
            };
            const tecla = e => { if (e.key === 'Escape') cerrar(false); };
            capa.addEventListener('click', e => {
                const b = e.target.closest('[data-r]');
                if (b) cerrar(b.dataset.r === 'si');
                else if (e.target === capa) cerrar(false);
            });
            document.addEventListener('keydown', tecla);
            document.body.appendChild(capa);
            (capa.querySelector('[data-campo]') || capa.querySelector('[data-r="no"]')).focus();
        });
    }

    /* ---------------- Efectos ---------------- */
    function inyectarEstilosBase() {
        if (document.getElementById('pg-kit-estilos')) return;
        const st = document.createElement('style');
        st.id = 'pg-kit-estilos';
        st.textContent = `
html.pg-verificando body{visibility:hidden}
.pg-efectos{position:fixed;inset:0;z-index:900;overflow:hidden;pointer-events:none}
.pg-particula{position:absolute;top:-10vh;display:block;line-height:1;user-select:none;will-change:transform;
  animation:pg-caer var(--dur) linear var(--delay) infinite}
.pg-particula>span{display:block;animation:pg-vaiven var(--sway) ease-in-out infinite alternate}
.pg-particula.sube{top:auto;bottom:-10vh;animation-name:pg-subir}
.pg-particula.gira>span{animation:pg-girar var(--sway) linear infinite}
@keyframes pg-caer{to{transform:translateY(120vh)}}
@keyframes pg-subir{0%{transform:translateY(0);opacity:0}10%{opacity:var(--op)}90%{opacity:var(--op)}100%{transform:translateY(-120vh);opacity:0}}
@keyframes pg-vaiven{from{transform:translateX(calc(var(--amp) * -1))}to{transform:translateX(var(--amp))}}
@keyframes pg-girar{to{transform:rotate(360deg)}}
@media (prefers-reduced-motion:reduce){.pg-efectos{display:none}}`;
        document.head.appendChild(st);
    }

    function escaparHtml(t) {
        return String(t).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
    }

    // "🔥 ⭐ fa-solid fa-crown" → ['🔥','⭐','fa-solid fa-crown']
    function separarIconos(texto) {
        const partes = String(texto || '🔥').split(/[,\s]+/).filter(Boolean);
        const iconos = [];
        for (let i = 0; i < partes.length; i++) {
            if (/^fa-(solid|regular|brands)$/.test(partes[i]) && partes[i + 1] && partes[i + 1].startsWith('fa-')) {
                iconos.push(partes[i] + ' ' + partes[i + 1]); i++;
            } else if (partes[i].startsWith('fa-')) {
                iconos.push('fa-solid ' + partes[i]);
            } else {
                iconos.push(partes[i]);
            }
        }
        return iconos.length ? iconos : ['🔥'];
    }

    function aplicarEfecto(cfg) {
        inyectarEstilosBase();
        document.querySelectorAll('.pg-efectos').forEach(n => n.remove());
        if (!cfg || !cfg.efecto || cfg.efecto === 'ninguno' || !EFECTOS[cfg.efecto]) return;

        const iconos = cfg.efecto === 'iconos' ? separarIconos(cfg.efecto_icono) : [EFECTOS[cfg.efecto].icono];
        const cantidad = Math.max(5, Math.min(120, Number(cfg.efecto_cantidad) || 30));
        const capa = document.createElement('div');
        capa.className = 'pg-efectos';
        capa.setAttribute('aria-hidden', 'true');
        capa.setAttribute('data-html2canvas-ignore', 'true');

        const r = (a, b) => a + Math.random() * (b - a);
        for (let i = 0; i < cantidad; i++) {
            const p = document.createElement('i');
            p.className = 'pg-particula';
            if (cfg.efecto === 'fantasmas') p.classList.add('sube');
            if (cfg.efecto === 'calabazas') p.classList.add('gira');
            const icono = iconos[Math.floor(Math.random() * iconos.length)];
            const esFa = icono.includes('fa-');
            const tam = cfg.efecto === 'nieve' ? r(10, 26) : r(16, 38);
            const op = cfg.efecto === 'fantasmas' ? r(.35, .75) : r(.55, .95);
            p.style.cssText = `left:${r(0, 100)}vw;font-size:${tam}px;opacity:${op};--op:${op};` +
                `--dur:${r(cfg.efecto === 'nieve' ? 9 : 7, cfg.efecto === 'nieve' ? 18 : 15)}s;--delay:${r(-15, 0)}s;` +
                `--sway:${r(2, 4.5)}s;--amp:${r(10, 40)}px;color:var(--primary,#D8C395)`;
            p.innerHTML = esFa ? `<span><i class="${escaparHtml(icono)}"></i></span>` : `<span>${escaparHtml(icono)}</span>`;
            capa.appendChild(p);
        }
        document.body.appendChild(capa);
    }

    /* ---------------- Cabecera con sesión ---------------- */
    function pintarSesionEnCabecera(s) {
        document.querySelectorAll('[data-pg-usuario]').forEach(n => { n.textContent = s.nombre || s.usuario; });
        // Elementos que solo ve quien tiene ese permiso: data-pg-permiso="personalizar|gestionar"
        document.querySelectorAll('[data-pg-permiso]').forEach(n => { n.hidden = !tiene(s, n.dataset.pgPermiso); });
        // Enlace al panel /admin/: solo si el usuario maneja más de un portal
        document.querySelectorAll('[data-pg-hub]').forEach(n => { n.hidden = !!herramientaUnica(s); });
        document.querySelectorAll('[data-pg-salir]').forEach(n => {
            n.addEventListener('click', e => { e.preventDefault(); logout(n.getAttribute('href') && n.getAttribute('href') !== '#' ? n.getAttribute('href') : 'login.html'); });
        });
    }

    /* ---------------- Arranque automático ---------------- */
    if (PORTAL && (MODO === 'protegido' || MODO === 'admin')) {
        document.documentElement.classList.add('pg-verificando');
        inyectarEstilosBase();
    }

    async function iniciar() {
        if (PORTAL && (MODO === 'protegido' || MODO === 'admin')) {
            const sesion = await guard(PORTAL, script.dataset.login);
            if (!sesion) return;
            pintarSesionEnCabecera(sesion);
            window.dispatchEvent(new CustomEvent('pg:sesion', { detail: sesion }));
        }
        if (script && script.dataset.sinEfecto === undefined) aplicarEfecto(await cargarEfecto());
    }

    /* ---------------- Botón "Compartir página" (vista móvil, solo páginas públicas) ---------------- */
    // Aparece al lado del botón del menú (☰) cuando este se ve. En páginas sin ☰ va al final del header en móvil.
    function montarCompartir() {
        if (MODO !== 'publico' || /^\/admin\//.test(location.pathname)) return;
        const header = document.querySelector('header');
        if (!header || header.querySelector('.pg-compartir')) return;
        if (!document.getElementById('pgCompartirCss')) {
            const st = document.createElement('style');
            st.id = 'pgCompartirCss';
            st.textContent = `
.pg-compartir{display:none;flex:0 0 auto;align-items:center;gap:5px;height:40px;margin-left:auto;padding:0 8px;
  border:1px solid var(--line,#333);background:#171717;color:var(--primary,#D8C395);cursor:pointer;
  font:700 .48rem/1.25 var(--font-display,'Michroma',sans-serif);letter-spacing:0;text-align:left;text-transform:uppercase;white-space:nowrap;
  -webkit-tap-highlight-color:transparent}
.pg-compartir.visible{display:inline-flex}
.pg-compartir i{font-size:.85rem}
.pg-compartir + .menu-toggle{margin-left:8px;flex:0 0 auto}
.pg-midiendo > *{flex-shrink:0 !important}
.site-header.pg-apretado,header.pg-apretado{gap:6px !important}
.pg-compartir-aviso{position:fixed;left:50%;bottom:calc(22px + env(safe-area-inset-bottom));transform:translateX(-50%);z-index:3000;
  padding:10px 16px;border:1px solid var(--line,#333);background:#111;color:#f4eedc;font:600 .85rem system-ui,sans-serif;
  box-shadow:0 10px 24px rgba(0,0,0,.5);pointer-events:none}
/* si no cabe el texto junto al logo, queda solo el ícono */
.pg-compartir.compacto span{display:none}.pg-compartir.compacto{width:42px;justify-content:center;padding:0}`;
            document.head.appendChild(st);
        }
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'pg-compartir';
        btn.setAttribute('aria-label', 'Compartir página');
        btn.innerHTML = '<i class="fa-solid fa-share-nodes"></i><span>Compartir<br>página</span>';
        const toggle = header.querySelector('.menu-toggle');
        // sin ☰: justo después del logo, para que se vea aunque el menú de la página sea ancho
        if (toggle) toggle.before(btn); else if (header.firstElementChild) header.firstElementChild.after(btn); else header.appendChild(btn);
        // visible solo cuando el ☰ se muestra (o en pantallas de móvil si la página no tiene ☰)
        const actualizar = () => {
            btn.classList.toggle('visible',
                toggle ? getComputedStyle(toggle).display !== 'none' : matchMedia('(max-width: 760px)').matches);
            btn.classList.remove('compacto');
            header.classList.remove('pg-apretado');
            if (!btn.classList.contains('visible')) return;
            // se mide con nada encogido: si el header se desborda, el texto no cabe
            const desborda = () => {
                header.classList.add('pg-midiendo');
                const ult = toggle || btn;
                const limite = header.getBoundingClientRect().right - parseFloat(getComputedStyle(header).paddingRight || 0);
                const d = header.scrollWidth > header.clientWidth + 1 || ult.getBoundingClientRect().right > limite + 1;
                header.classList.remove('pg-midiendo');
                return d;
            };
            if (desborda()) btn.classList.add('compacto');
            // logos muy anchos (ej. LATAM): aun solo con el ícono, se junta un poco el espacio entre logo y botones
            if (btn.classList.contains('compacto') && desborda()) header.classList.add('pg-apretado');
        };
        actualizar();
        addEventListener('resize', actualizar);
        if (document.fonts && document.fonts.ready) document.fonts.ready.then(actualizar);
        btn.addEventListener('click', async () => {
            const url = location.href.split('#')[0];
            const titulo = document.title;
            if (navigator.share) {
                try { await navigator.share({ title: titulo, url }); } catch (e) { }
                return;
            }
            let ok = false;
            try { await navigator.clipboard.writeText(url); ok = true; } catch (e) { }
            const aviso = document.createElement('div');
            aviso.className = 'pg-compartir-aviso';
            aviso.textContent = ok ? '✔ Enlace copiado' : url;
            document.body.appendChild(aviso);
            setTimeout(() => aviso.remove(), 2200);
        });
    }

    window.PumasPortal = {
        PORTALES, EFECTOS, portal: PORTAL,
        login, logout, validar, guard, puede, tiene, inicioDe, db, sesion: leerSesion,
        cargarEfecto, guardarEfecto, aplicarEfecto, usuarios, entrenos, respaldo, confirmar, escaparHtml
    };

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
    else iniciar();
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', montarCompartir);
    else montarCompartir();
})();
