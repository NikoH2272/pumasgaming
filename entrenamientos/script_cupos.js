const SUPABASE_URL = "https://bqemjroiegybdzksddkn.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJxZW1qcm9pZWd5YmR6a3NkZGtuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc1NzgwNDIsImV4cCI6MjEwMzE1NDA0Mn0.49gC204FPWSNxWYa6eZFBgWJgr7ZvFax5mqOM9lyGPo";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

window.addEventListener('DOMContentLoaded', cargarEntrenamientosActivos);

async function cargarEntrenamientosActivos() {
    const contenedor = document.getElementById('contenedorEntrenamientos');
    
    try {
        const { data: entrenamientos, error } = await supabaseClient
            .from('entrenamientos_programados')
            .select('*')
            .eq('estado', 'ABIERTO')
            .order('fecha', { ascending: true });

        if (error) throw error;

        if (!entrenamientos || entrenamientos.length === 0) {
            contenedor.innerHTML = `<div style="text-align:center; color:var(--gray); padding:40px; background: var(--dark-card); border-radius: 10px; border: 1px solid rgba(255,255,255,0.05);">No hay entrenamientos programados en este momento. Vuelve pronto.</div>`;
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

        contenedor.innerHTML = '';
        entrenamientos.forEach(ent => {
            let listaEquipos = equiposPorEntrenamiento[ent.id] || [];
            let inscritos = listaEquipos.length; // Resta automáticamente los cupos del staff y los públicos
            let cuposRestantes = ent.cupos_totales - inscritos;
            let fechaStr = new Date(ent.fecha).toLocaleString('es-CO', { dateStyle: 'long', timeStyle: 'short' });
            
            // Generar el bloque visual de los equipos confirmados
            let listaHTML = '';
            if (listaEquipos.length > 0) {
                listaHTML = `<div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid rgba(255,255,255,0.1);">
                    <h4 style="color: var(--primary); font-family: 'Orbitron'; font-size: 0.9rem; margin-bottom: 10px;">📋 EQUIPOS CONFIRMADOS (${inscritos}/${ent.cupos_totales}):</h4>
                    <div style="display: flex; flex-wrap: wrap; gap: 8px;">`;
                
                listaEquipos.forEach(eq => {
                    let esStaff = eq.telefono === 'REGISTRO STAFF';
                    let badge = esStaff ? `<i class="fa-solid fa-shield-halved" style="color: var(--primary); margin-left: 5px;" title="Asegurado por Staff"></i>` : '';
                    let colorFondo = esStaff ? 'rgba(220, 204, 156, 0.15)' : 'rgba(255,255,255,0.05)';
                    let borde = esStaff ? '1px solid var(--primary)' : '1px solid rgba(255,255,255,0.1)';
                    
                    listaHTML += `<span style="background: ${colorFondo}; border: ${borde}; padding: 5px 10px; border-radius: 4px; font-size: 0.85rem; color: #fff;">${eq.nombre_jugador} ${badge}</span>`;
                });
                
                listaHTML += `</div></div>`;
            }

            let btnInscribir = cuposRestantes > 0 
                ? `<button onclick="abrirModalInscripcion('${ent.id}', '${ent.titulo.replace(/'/g, "\\'")}', '${ent.link_grupo}')" class="btn-access" style="padding: 10px 20px; border:none; cursor:pointer;">INSCRIBIR EQUIPO</button>`
                : `<button disabled style="background: var(--secondary); color: var(--dark); padding: 10px 20px; border-radius: 6px; font-family: 'Orbitron'; font-weight: bold; border:none;">CUPOS AGOTADOS</button>`;

            contenedor.innerHTML += `
                <div style="background: var(--dark-card); border: 1px solid rgba(220, 204, 156, 0.2); border-left: 4px solid var(--primary); border-radius: 10px; padding: 25px; margin-bottom: 20px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 20px;">
                        <div>
                            <h2 style="color: var(--light); font-family: 'Orbitron'; font-size: 1.4rem; margin:0 0 10px 0;">${ent.titulo}</h2>
                            <div style="color: var(--gray); font-size: 0.95rem; margin-bottom: 5px;"><i class="fa-regular fa-clock" style="color: var(--primary);"></i> ${fechaStr}</div>
                            <div style="color: var(--gray); font-size: 0.95rem;"><i class="fa-solid fa-users" style="color: var(--primary);"></i> Cupos disponibles: <strong style="color: #DCCC9C; font-family:'Orbitron'; font-size:1.1rem;">${cuposRestantes} / ${ent.cupos_totales}</strong></div>
                        </div>
                        <div>${btnInscribir}</div>
                    </div>
                    ${listaHTML}
                </div>
            `;
        });

    } catch (err) {
        console.error("Error al cargar cupos:", err);
        contenedor.innerHTML = `<div style="text-align:center; color:#ff3333; padding:40px;">Error al cargar la información de la base de datos.</div>`;
    }
}

function abrirModalInscripcion(id, titulo, link) {
    document.getElementById('entrenamientoId').value = id;
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
        alert("Por favor completa tu nombre y teléfono.");
        return;
    }

    let telefonoCompleto = `${pais} ${telefonoNum}`;

    try {
        const { error } = await supabaseClient
            .from('registro_cupos')
            .insert([{
                entrenamiento_id: idEntreno,
                nombre_jugador: nombre,
                telefono: telefonoCompleto
            }]);

        if (error) throw error;

        alert("¡Inscripción exitosa! Haz clic en Aceptar para unirte al grupo de coordinación.");
        cerrarModal();
        cargarEntrenamientosActivos(); // Actualizar contador de cupos
        
        // Redirigir al usuario al grupo de WhatsApp/Discord
        window.open(linkGrupo, '_blank');

    } catch (err) {
        console.error("Error al registrar:", err);
        alert("Ocurrió un error. Es posible que los cupos se hayan agotado.");
    }
}