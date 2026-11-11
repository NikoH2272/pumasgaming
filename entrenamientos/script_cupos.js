const SUPABASE_URL = "https://ejgxcuveubgjbvdlnimr.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVqZ3hjdXZldWJnamJ2ZGxuaW1yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM0OTI3NDYsImV4cCI6MjEwOTA2ODc0Nn0.aAYCjQxetfnJpoKMvg9IYtU6dpwIU-CkXCA5mc8Zhgo";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const escH = t => String(t ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const normEquipo = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');

window.addEventListener('DOMContentLoaded', cargarEntrenamientosActivos);

// Contador hasta que se abren las inscripciones ("2d 03:14:22")
function tiempoRestante(ms) {
    const t = Math.max(0, Math.floor(ms / 1000));
    const d = Math.floor(t / 86400), h = Math.floor(t % 86400 / 3600), m = Math.floor(t % 3600 / 60), s = t % 60;
    const z = n => String(n).padStart(2, '0');
    return (d ? d + 'd ' : '') + z(h) + ':' + z(m) + ':' + z(s);
}
let relojCupos = null;
function arrancarRelojCupos() {
    clearInterval(relojCupos);
    const tic = () => {
        let abrio = false;
        document.querySelectorAll('[data-abre]').forEach(el => {
            const falta = Number(el.dataset.abre) - Date.now();
            if (falta <= 0) abrio = true; else el.textContent = tiempoRestante(falta);
        });
        if (abrio) { clearInterval(relojCupos); cargarEntrenamientosActivos(); }
    };
    if (document.querySelector('[data-abre]')) { tic(); relojCupos = setInterval(tic, 1000); }
}

async function cargarEntrenamientosActivos() {
    const contenedor = document.getElementById('contenedorEntrenamientos');
    
    try {
        let { data: entrenamientos, error } = await supabaseClient
            .from('entrenamientos_programados')
            .select('*')
            
            .eq('estado', 'ABIERTO')
            // También los programados (se abren dentro de 7 días) para mostrar su contador
            .or('publicar_en.is.null,publicar_en.lte.' + new Date(Date.now() + 7 * 86400000).toISOString())
            .order('fecha', { ascending: true });

        if (error) throw error;

        // cupos.html muestra solo los PÚBLICOS; cupos-vip.html (oculta, con link) solo los VIP
        const soloVip = window.CUPOS_TIPO === 'VIP';
        entrenamientos = (entrenamientos || []).filter(e => (e.tipo === 'VIP') === soloVip && (!e.cierra_en || new Date(e.cierra_en) > new Date()));

        if (!entrenamientos || entrenamientos.length === 0) {
            contenedor.innerHTML = `<div class="c-cupos-vacio"><i class="fa-regular fa-calendar" aria-hidden="true"></i><p>${window.CUPOS_TIPO === 'VIP' ? 'No hay cupos VIP abiertos en este momento.' : 'No hay entrenamientos programados en este momento.'}</p><small>Los nuevos entrenos se publican en los grupos de la comunidad.</small></div>`;
            return;
        }

        // Consultar TODOS los equipos inscritos (públicos y de staff)
        const { data: registros } = await supabaseClient.from('registro_cupos').select('*');
        
        let equiposPorEntrenamiento = {};
        if (registros) {
            registros.forEach(reg => {
                if (!equiposPorEntrenamiento[reg.entrenamiento_id]) {
                    equiposPorEntrenamiento[reg.entrenamiento_id] = [];
                }
                equiposPorEntrenamiento[reg.entrenamiento_id].push(reg);
            });
        }

        contenedor.innerHTML = entrenamientos.map(ent => {
            const listaEquipos = equiposPorEntrenamiento[ent.id] || [];
            const inscritos = listaEquipos.length; // cuenta los cupos del staff y los públicos
            const cuposRestantes = ent.cupos_totales - inscritos;
            const fechaStr = new Date(ent.fecha).toLocaleString('es-CO', { dateStyle: 'long', timeStyle: 'short' });
            const abre = ent.publicar_en ? new Date(ent.publicar_en).getTime() : 0;
            const pendiente = abre > Date.now();
            const vip = ent.tipo === 'VIP';

            // Equipos confirmados (los del staff van marcados)
            const lista = inscritos ? `<div class="c-cupo-lista">
                    <h4>Equipos confirmados <span>${inscritos} / ${ent.cupos_totales}</span></h4>
                    <div class="c-cupo-equipos">${listaEquipos.map(eq => {
                        const staff = eq.telefono === 'REGISTRO STAFF';
                        return `<span class="c-eq${staff ? ' staff' : ''}">${escH(eq.nombre_jugador)}${staff ? ' <i class="fa-solid fa-shield-halved" title="Asegurado por el staff" aria-label="Asegurado por el staff"></i>' : ''}</span>`;
                    }).join('')}</div></div>` : '';

            const contador = pendiente ? `<div class="c-cupo-cuenta">
                    <small><i class="fa-solid fa-hourglass-half" aria-hidden="true"></i> Las inscripciones se abren en</small>
                    <b data-abre="${abre}">${tiempoRestante(abre - Date.now())}</b>
                    <small>${new Date(abre).toLocaleString('es-CO', { dateStyle: 'long', timeStyle: 'short' })}</small></div>` : '';

            const boton = pendiente
                ? `<button type="button" class="c-btn-cupo espera" disabled><i class="fa-solid fa-lock" aria-hidden="true"></i> Aún no abre</button>`
                : cuposRestantes > 0
                ? `<button type="button" class="btn-access c-btn-cupo" data-inscribir="${escH(ent.id)}" data-titulo="${escH(ent.titulo)}" data-link="${escH(ent.link_grupo)}" data-tipo="${vip ? 'VIP' : 'PUBLICO'}">Inscribir equipo</button>`
                : `<button type="button" class="c-btn-cupo agotado" disabled>Cupos agotados</button>`;

            return `<article class="c-cupo${pendiente ? ' pendiente' : ''}">
                    <div class="c-cupo-cab">
                        <div>
                            <h2 class="c-disp">${vip ? '<span class="c-vip"><i class="fa-solid fa-crown" aria-hidden="true"></i> Solo VIP</span>' : ''}${escH(ent.titulo)}</h2>
                            <p class="c-cupo-dato"><i class="fa-regular fa-clock" aria-hidden="true"></i> ${fechaStr}</p>
                            ${ent.cierra_en ? `<p class="c-cupo-dato aviso"><i class="fa-solid fa-hourglass-end" aria-hidden="true"></i> Inscripciones hasta las ${new Date(ent.cierra_en).toLocaleTimeString('es-CO', { timeZone: 'America/Bogota', hour: 'numeric', minute: '2-digit' })} (hora Colombia)</p>` : ''}
                            <p class="c-cupo-dato"><i class="fa-solid fa-users" aria-hidden="true"></i> Cupos disponibles <b class="c-cupo-num">${Math.max(0, cuposRestantes)} / ${ent.cupos_totales}</b></p>
                        </div>
                        <div class="c-cupo-acc">${boton}</div>
                    </div>
                    ${contador}
                    ${lista}
                </article>`;
        }).join('');
        contenedor.querySelectorAll('[data-inscribir]').forEach(b => b.addEventListener('click', () =>
            abrirModalInscripcion(b.dataset.inscribir, b.dataset.titulo, b.dataset.link, b.dataset.tipo)));
        arrancarRelojCupos();

    } catch (err) {
        console.error("Error al cargar cupos:", err);
        contenedor.innerHTML = `<div class="c-cupos-vacio error"><i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i><p>No se pudieron cargar los entrenos.</p><small>Revisa tu conexión y recarga la página.</small></div>`;
    }
}

function abrirModalInscripcion(id, titulo, link, tipo) {
    document.getElementById('entrenamientoId').value = id;
    // Cupo VIP: avisar que deben usar el mismo nombre y número con que se registraron como VIP
    let nota = document.getElementById('notaVip');
    if (!nota) {
        nota = document.createElement('div');
        nota.id = 'notaVip';
        nota.className = 'c-nota-vip';
        nota.innerHTML = '<i class="fa-solid fa-crown"></i> <b>Cupo solo para VIP:</b> escribe el <b>mismo nombre de equipo</b> y el <b>mismo número</b> con que te registraste como VIP. Si no coinciden, no te da el cupo.';
        document.getElementById('modalTitulo').after(nota);
    }
    nota.style.display = tipo === 'VIP' ? 'block' : 'none';
    document.getElementById('linkGrupoSecreto').value = link;
    document.getElementById('modalTitulo').textContent = `Inscripción: ${titulo}`;
    document.getElementById('modalRegistro').style.display = 'flex';
}

function cerrarModal() {
    document.getElementById('modalRegistro').style.display = 'none';
    document.getElementById('regNombre').value = '';
    document.getElementById('regTelefono').value = '';
}

async function procesarInscripcion() {
    let idEntreno = document.getElementById('entrenamientoId').value;
    let linkGrupo = document.getElementById('linkGrupoSecreto').value;
    let nombre = document.getElementById('regNombre').value.trim();
    let pais = document.getElementById('regPais').value;
    let telefonoNum = document.getElementById('regTelefono').value.trim();

    if (!nombre || !telefonoNum) {
        alert("Por favor completa tu nombre y número de teléfono.");
        return;
    }

    let telefonoCompleto = `${pais} ${telefonoNum}`;

    try {
        // 1. VERIFICACIÓN ANTI-SOBRECUPO (Por si 2 personas se registran al mismo tiempo)
        const { data: checkRegs } = await supabaseClient.from('registro_cupos').select('id, nombre_jugador').eq('entrenamiento_id', idEntreno);
        const { data: checkEnt } = await supabaseClient.from('entrenamientos_programados').select('cupos_totales, estado, publicar_en').eq('id', idEntreno).single();
        
        if (checkEnt.estado === 'CERRADO' || (checkEnt.publicar_en && new Date(checkEnt.publicar_en) > new Date()) || (checkRegs && checkRegs.length >= checkEnt.cupos_totales)) {
            alert("Lo sentimos, los cupos para este entrenamiento se acaban de agotar.");
            cerrarModal();
            cargarEntrenamientosActivos();
            return;
        }

        // 1.5 EVITAR EQUIPOS REPETIDOS (ignora mayúsculas, tildes, espacios y símbolos)
        if ((checkRegs || []).some(r => normEquipo(r.nombre_jugador) === normEquipo(nombre))) {
            alert("Ese equipo ya está inscrito en este entrenamiento.");
            return;
        }

        // 2. REGISTRAR AL EQUIPO EN LA BASE DE DATOS
        const { error: insertError } = await supabaseClient
            .from('registro_cupos')
            .insert([{
                entrenamiento_id: idEntreno,
                nombre_jugador: nombre,
                telefono: telefonoCompleto
            }]);

        if (insertError) throw insertError;

        // 3. AUTO-CIERRE SI SE LLENARON LOS CUPOS CON ESTE ÚLTIMO REGISTRO
        let totalInscritos = (checkRegs ? checkRegs.length : 0) + 1;
        if (totalInscritos >= checkEnt.cupos_totales) {
            await supabaseClient
                .from('entrenamientos_programados')
                .update({ estado: 'CERRADO' })
                .eq('id', idEntreno);
        }

        cerrarModal();
        cargarEntrenamientosActivos();
        // Antes de unirse al grupo: recordar que escriban el nombre del equipo
        mostrarIngresoGrupo(nombre, linkGrupo);

    } catch (err) {
        console.error("Error al registrar:", err);
        const m = (err && err.message) || '';
        alert(err && err.code === "23505" ? "Ese equipo ya está inscrito en este entrenamiento."
            : /baneado|VIP/i.test(m) ? m   // la base no lo dejó: equipo o número baneado, o no es VIP
            : "Ocurrió un error. Es posible que los cupos se hayan agotado.");
    }
}

// Ventana después de inscribirse: aviso del nombre del equipo y botón "ABRIR" para unirse al grupo
function mostrarIngresoGrupo(equipo, link) {
    const esc = t => String(t || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const valido = /^https:\/\//.test(String(link || ''));
    const fondo = document.createElement('div');
    fondo.className = 'c-modal';
    fondo.style.display = 'flex';
    fondo.innerHTML = `
        <div class="c-modal-caja c-exito" role="dialog" aria-modal="true" aria-labelledby="tituloExito">
            <i class="fa-solid fa-circle-check c-exito-icono" aria-hidden="true"></i>
            <h3 id="tituloExito" class="c-disp">Inscripción confirmada</h3>
            <p><b>${esc(equipo)}</b> quedó inscrito.</p>
            ${valido ? `
            <div class="c-nota-vip"><i class="fa-solid fa-circle-exclamation" aria-hidden="true"></i> <b>Antes de unirte:</b> al entrar al grupo escribe el <b>nombre de tu equipo</b> (<b>${esc(equipo)}</b>) para que el staff te identifique y te pase la sala.</div>
            <a href="${esc(link)}" target="_blank" rel="noopener" data-abrir class="btn-access c-btn-cupo"><i class="fa-brands fa-whatsapp" aria-hidden="true"></i> Abrir el grupo</a>` : ''}
            <button type="button" data-cerrar class="c-btn-cupo secundario">Cerrar</button>
        </div>`;
    const cerrar = () => fondo.remove();
    fondo.querySelector('[data-cerrar]').onclick = cerrar;
    const abrir = fondo.querySelector('[data-abrir]');
    if (abrir) abrir.addEventListener('click', () => setTimeout(cerrar, 300));
    document.body.appendChild(fondo);
}
