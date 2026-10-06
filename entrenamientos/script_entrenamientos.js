let globalEquipos = [];
let globalTopKillers = [];

// Variables globales para el calendario
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();
let sesionesPorFecha = {};

function toggleMenu() {
    const nav = document.getElementById('mainNav');
    if (nav) nav.classList.toggle('is-active');
}

function cambiarPestanaPublica(pestana) {
    const vistaGeneral = document.getElementById('vistaGeneral');
    const vistaVip = document.getElementById('vistaVip');
    const navGlobal = document.getElementById('navGlobal');
    const navVip = document.getElementById('navVip');

    if (pestana === 'global') {
        if (vistaGeneral) vistaGeneral.style.display = 'grid';
        if (vistaVip) vistaVip.style.display = 'none';
        if (navGlobal) navGlobal.style.color = 'var(--primary)';
        if (navVip) navVip.style.color = 'var(--secondary)';
    } else {
        if (vistaGeneral) vistaGeneral.style.display = 'none';
        if (vistaVip) vistaVip.style.display = 'block';
        if (navVip) navVip.style.color = 'var(--primary)';
        if (navGlobal) navGlobal.style.color = 'var(--secondary)';
        cargarResultadosVipPublicos();
    }
}

const SUPABASE_URL = "https://bqemjroiegybdzksddkn.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJxZW1qcm9pZWd5YmR6a3NkZGtuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc1NzgwNDIsImV4cCI6MjEwMzE1NDA0Mn0.49gC204FPWSNxWYa6eZFBgWJgr7ZvFax5mqOM9lyGPo";
const supabaseClient = (typeof supabase !== 'undefined' && supabase.createClient) ? supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

async function cargarSesiones() {
    const contenedor = document.getElementById('calendarContainer');
    if (!contenedor) return;

    if (!supabaseClient) {
        document.getElementById('calendarGrid').innerHTML = `<div style="grid-column: span 7; text-align:center; color: #ff3333; padding: 20px;">Error de conexión con Supabase.</div>`;
        return;
    }

    try {
        const { data: sesiones, error } = await supabaseClient
            .from('entrenamientos_sesiones')
            .select('*')
            .order('fecha', { ascending: false });

        if (error) throw error;

        if (!sesiones || sesiones.length === 0) {
            document.getElementById('calendarGrid').innerHTML = `<div style="grid-column: span 7; text-align:center; color: var(--gray); padding: 20px;">Sin registros disponibles.</div>`;
            return;
        }

        let statEntrenamientos = document.getElementById('statTotalEntrenamientos');
        if (statEntrenamientos) statEntrenamientos.textContent = sesiones.length;

        // Agrupar sesiones por fecha exacta
        sesionesPorFecha = {};
        sesiones.forEach(sesion => {
            // Extrae solo la parte de la fecha (YYYY-MM-DD)
            let dateStr = diaLocal(sesion.fecha); 
            if (!sesionesPorFecha[dateStr]) {
                sesionesPorFecha[dateStr] = [];
            }
            sesionesPorFecha[dateStr].push(sesion);
        });

        // Renderizar el calendario con el mes actual
        renderCalendar(currentMonth, currentYear);
        
        // Calcular topkillers y equipos
        await calcularTablaGlobalAcumulada(sesiones);

    } catch (err) {
        console.error("Error al cargar sesiones públicas:", err);
        document.getElementById('calendarGrid').innerHTML = `<div style="grid-column: span 7; text-align:center; color: #ff3333; padding: 20px;">Error al cargar datos.</div>`;
    }
}

// Función para dibujar los días del calendario
function renderCalendar(month, year) {
    const grid = document.getElementById('calendarGrid');
    const display = document.getElementById('monthYearDisplay');
    if (!grid || !display) return;

    grid.innerHTML = '';
    const date = new Date(year, month, 1);
    const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    display.textContent = `${monthNames[month]} ${year}`;

    const firstDayIndex = date.getDay();
    const lastDay = new Date(year, month + 1, 0).getDate();

    // Espacios vacíos antes del día 1
    for (let i = 0; i < firstDayIndex; i++) {
        grid.innerHTML += `<div class="calendar-day empty"></div>`;
    }

    // Dibujar días del mes
    for (let day = 1; day <= lastDay; day++) {
        let mStr = (month + 1).toString().padStart(2, '0');
        let dStr = day.toString().padStart(2, '0');
        let dateStr = `${year}-${mStr}-${dStr}`;

        let hasSession = sesionesPorFecha[dateStr] ? true : false;
        let classStr = "calendar-day" + (hasSession ? " has-session" : "");

        grid.innerHTML += `<div class="${classStr}" onclick="seleccionarDia('${dateStr}', this)">${day}</div>`;
    }

    // Ocultar la tabla de abajo si se cambia de mes
    document.getElementById('daySessionsContainer').style.display = 'none';
}

// Cambiar de mes mediante las flechas
function cambiarMes(dir) {
    currentMonth += dir;
    if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
    } else if (currentMonth < 0) {
        currentMonth = 11;
        currentYear--;
    }
    renderCalendar(currentMonth, currentYear);
}

// Función al dar clic en un día específico
function seleccionarDia(dateStr, el) {
    // Quitar selección previa
    document.querySelectorAll('.calendar-day').forEach(d => d.classList.remove('selected-day'));
    
    // Marcar selección actual
    if (!el.classList.contains('empty')) {
        el.classList.add('selected-day');
    }

    const container = document.getElementById('daySessionsContainer');
    const tbody = document.getElementById('bodySesionesDia');
    const title = document.getElementById('selectedDayTitle');

    // Si el día no tiene sesiones, ocultamos la tabla de abajo
    if (!sesionesPorFecha[dateStr]) {
        container.style.display = 'none';
        return;
    }

    // Mostrar tabla y llenar datos
    container.style.display = 'block';
    
    // Formatear la fecha considerando la zona horaria local
    let fechaFormat = new Date(dateStr + 'T00:00:00').toLocaleDateString();
    title.innerHTML = `<i class="fa-solid fa-list-check"></i> Registro del ${fechaFormat}`;
    tbody.innerHTML = '';

    sesionesPorFecha[dateStr].forEach(sesion => {
        let folderPath = sesion.archivo_url || '';
        tbody.innerHTML += `
            <tr>
                <td style="font-weight: bold; color: var(--light);">${sesion.titulo}</td>
                <td style="text-align: center;">
                    <button class="btn-ver" onclick="procesarSesionUnica('${folderPath}', '${sesion.titulo.replace(/'/g, "\\'")}', '${sesion.jornada}')">
                        <i class="fa-solid fa-table"></i> Ver
                    </button>
                </td>
            </tr>
        `;
    });
}


const ZONA_HORARIA='America/Bogota';
const diaLocal=iso=>new Date(iso).toLocaleDateString('en-CA',{timeZone:ZONA_HORARIA});
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function semanaISO(d){const t=new Date(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate())),n=t.getUTCDay()||7;t.setUTCDate(t.getUTCDate()+4-n);const y=t.getUTCFullYear();return y+'-'+Math.ceil(((t-Date.UTC(y,0,1))/864e5+1)/7);}
function rangoSemana(d){const l=new Date(d.getFullYear(),d.getMonth(),d.getDate()-((d.getDay()||7)-1)),f=new Date(l.getFullYear(),l.getMonth(),l.getDate()+6),o={day:'numeric',month:'short'};return l.toLocaleDateString('es',o)+' – '+f.toLocaleDateString('es',o);}
async function parsearSesion(s){
  const vacio={teams:{},players:{},salas:0,kills:0};
  if(!s.archivo_url) return vacio;
  const {data:fl}=await supabaseClient.storage.from('entrenamientos_logs').list(s.archivo_url);
  if(!fl) return vacio;
  const ck='pg_ses_v2_'+s.id;
  try{const c=JSON.parse(localStorage.getItem(ck)); if(c&&c.salas===fl.length) return c;}catch(e){}
  const out={teams:{},players:{},salas:fl.length,kills:0};
  await Promise.all(fl.map(async f=>{
    const {data}=await supabaseClient.storage.from('entrenamientos_logs').download(s.archivo_url+'/'+f.name); if(!data) return;
    (await data.text()).split('\n').forEach(l=>{
      const t=l.match(/TeamName:\s*(.+?)\s+Rank:\s*(\d+)\s+KillScore:\s*(\d+)\s+RankScore:\s*(\d+)\s+TotalScore:\s*(\d+)/i);
      if(t){const e=out.teams[t[1].trim()]=out.teams[t[1].trim()]||{p:0,b:0}; e.p+=+t[5]; if(+t[2]===1) e.b++;}
      const p=l.match(/NAME:\s*(.+?)\s+ID:\s*\d+.*?KILL:\s*(\d+)/i);
      if(p){const e=out.players[p[1].trim()]=out.players[p[1].trim()]||{k:0,s:0}; e.k+=+p[2]; e.s++; out.kills+=+p[2];}
    });
  }));
  try{localStorage.setItem(ck,JSON.stringify(out));}catch(e){}
  return out;
}
function agregar(lista){
  const eq={},pl={}; let salas=0,kills=0;
  lista.forEach(([s,d])=>{salas+=d.salas;kills+=d.kills;
    for(const n in d.teams){const e=eq[n]=eq[n]||{name:n,pts:0,b:0,ses:0};e.pts+=d.teams[n].p;e.b+=d.teams[n].b;e.ses++;}
    for(const n in d.players){const e=pl[n]=pl[n]||{name:n,k:0,s:0};e.k+=d.players[n].k;e.s+=d.players[n].s;}});
  return {eq:Object.values(eq).sort((a,b)=>b.pts-a.pts),pl:Object.values(pl).sort((a,b)=>b.k-a.k),salas,kills};
}
async function parsearTodas(sesiones,alAvanzar){
  const res=[];
  for(let i=0;i<sesiones.length;i+=4){
    const ch=sesiones.slice(i,i+4), r=await Promise.all(ch.map(s=>parsearSesion(s).catch(()=>({teams:{},players:{},salas:0,kills:0}))));
    ch.forEach((s,j)=>res.push([s,r[j]])); if(alAvanzar) alAvanzar(res);
  }
  return res;
}
function semanaObjetivo(parsed){
  const key=p=>semanaISO(new Date(diaLocal(p[0].fecha)+'T00:00:00'));
  let k=semanaISO(new Date()), lista=parsed.filter(p=>key(p)===k), actual=true;
  if(!lista.length&&parsed.length){k=key(parsed[0]);lista=parsed.filter(p=>key(p)===k);actual=false;}
  const f=lista.length?new Date(diaLocal(lista[0][0].fecha)+'T00:00:00'):new Date();
  return {num:k.split('-')[1],lista,actual,rango:rangoSemana(f)};
}

const _col=i=>i===0?'#D8C395':i===1?'#B9B2A4':i===2?'#cd7f32':'var(--light)';
function _filaEq(eq,i){const c=_col(i);return `<tr><td style="font-weight:bold;color:${c};">#${i+1}</td><td style="font-weight:bold;color:var(--light);font-size:.9rem;max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(eq.name)}</td><td style="text-align:center;color:var(--gray);font-weight:bold;">${eq.ses}</td><td style="text-align:center;color:#D8C395;font-weight:bold;">${eq.b}</td><td style="text-align:center;color:${c};font-weight:bold;font-family:'Michroma';">${eq.pts}</td></tr>`;}
function _llenar(idA,idB,lista){
  const A=document.getElementById(idA),B=document.getElementById(idB); if(!A||!B) return;
  if(!lista.length){A.innerHTML='<tr><td colspan="5" style="text-align:center;color:var(--gray);">Sin registros.</td></tr>';B.innerHTML='';return;}
  const m=Math.ceil(lista.length/2);
  A.innerHTML=lista.slice(0,m).map((e,i)=>_filaEq(e,i)).join('');
  B.innerHTML=lista.slice(m).map((e,i)=>_filaEq(e,i+m)).join('');
}
async function calcularTablaGlobalAcumulada(sesiones){
  const parsed=await parsearTodas(sesiones);
  const todo=agregar(parsed), sem=semanaObjetivo(parsed), w=agregar(sem.lista);
  const set=(id,v)=>{const el=document.getElementById(id);if(el)el.textContent=v;};
  set('statTotalEquipos',todo.eq.length);set('statTotalKills',todo.kills);set('statTotalMapas',todo.salas);
  const tit=document.getElementById('tituloTop50');
  if(tit) tit.innerHTML=`Top 50 Equipos · Semana ${sem.num}<span class="wk-range">${sem.rango}${sem.actual?'':' · última semana con datos'}</span>`;
  _llenar('bodyTablaGlobal1','bodyTablaGlobal2',w.eq.slice(0,50));
  _llenar('bodyTop100a','bodyTop100b',todo.eq.slice(0,100));
  const g=document.getElementById('gridTopKillersGlobal');
  if(g) g.innerHTML=todo.pl.slice(0,20).map((tk,i)=>`<div class="killer-card"><div style="display:flex;align-items:center;gap:10px;"><span style="color:${_col(i)};font-weight:bold;font-family:'Michroma';min-width:25px;">#${i+1}</span><span style="color:var(--light);font-weight:bold;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:140px;">${esc(tk.name)}</span></div><div style="display:flex;align-items:center;gap:12px;"><span style="color:var(--gray);font-size:.85rem;" title="Salas Jugadas"><i class="fa-solid fa-gamepad" style="margin-right:4px;"></i>${tk.s}</span><span style="color:var(--primary);font-weight:bold;font-family:'Michroma';font-size:.9rem;"><i class="fa-solid fa-crosshairs" style="margin-right:4px;"></i> ${tk.k}</span></div></div>`).join('')||'<div style="color:var(--gray);text-align:center;padding:20px;">Sin datos de killers.</div>';
}

async function cargarResultadosVipPublicos() {
    const tbody = document.getElementById('bodyTablaVip');
    if (!tbody || !supabaseClient) return;

    tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--primary); padding: 20px;">Cargando todos los equipos VIP...</td></tr>`;

    try {
        const { data: dbOficiales, error: errOficiales } = await supabaseClient.from('equipos_registrados').select('*');
        if (errOficiales || !dbOficiales) throw errOficiales;

        let acumuladoVip = {};
        dbOficiales.forEach(eq => {
            let nombreKey = eq.nombre.trim().toUpperCase();
            acumuladoVip[nombreKey] = {
                nombre: eq.nombre.trim(),
                totalScore: 0,
                booyahs: 0,
                participaciones: 0
            };
        });

        const { data: dbSalas, error: errSalas } = await supabaseClient.from('salas_resultados').select('*');
        if (errSalas || !dbSalas) throw errSalas;

        dbSalas.forEach(fila => {
            let nombreLimpio = fila.equipo_nombre.trim().toUpperCase();
            if (acumuladoVip[nombreLimpio]) {
                acumuladoVip[nombreLimpio].totalScore += Number(fila.total_score || 0);
                acumuladoVip[nombreLimpio].participaciones += 1;
                if (fila.es_booyah === true || Number(fila.rank) === 1) {
                    acumuladoVip[nombreLimpio].booyahs += 1;
                }
            }
        });

        let listaVip = Object.values(acumuladoVip).sort((a, b) => b.totalScore - a.totalScore);
        tbody.innerHTML = '';

        listaVip.forEach((eq, idx) => {
            let colorPos = idx === 0 && eq.totalScore > 0 ? '#D8C395' : (idx === 1 && eq.totalScore > 0 ? '#B9B2A4' : (idx === 2 && eq.totalScore > 0 ? '#cd7f32' : '#fff'));
            tbody.innerHTML += `
                <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
                    <td style="padding: 10px; font-weight: bold; color: ${colorPos};">#${idx+1}</td>
                    <td style="padding: 10px; font-weight: bold; color: #fff;">${eq.nombre}</td>
                    <td style="text-align: center; padding: 10px; color: #D8C395; font-weight: bold;">${eq.booyahs}</td>
                    <td style="text-align: center; padding: 10px; color: ${colorPos}; font-weight: bold; font-family: 'Michroma';">${eq.totalScore}</td>
                </tr>
            `;
        });
    } catch (err) {
        console.error("Error al cargar VIP públicos:", err);
        tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: #ff5555; padding: 20px;">Error al conectar con la base de datos.</td></tr>`;
    }
}

async function procesarSesionUnica(folderPath, titulo, jornada) {
    if (!folderPath || !supabaseClient) {
        alert("Este entrenamiento no tiene carpeta asociada.");
        return;
    }

    let modalDetalle = document.getElementById('modalDetalleSesion');
    let tituloDetalle = document.getElementById('tituloDetalleSesion');
    let subDetalle = document.getElementById('subtituloDetalle');
    let tablaSesionUnica = document.getElementById('tablaGeneralSesionUnica');

    if (modalDetalle) modalDetalle.style.display = 'flex';
    if (tituloDetalle) tituloDetalle.textContent = `TABLA GENERAL: ${titulo}`;
    if (subDetalle) subDetalle.textContent = jornada;
    if (tablaSesionUnica) tablaSesionUnica.innerHTML = `<thead><tr><th colspan="100" style="text-align:center; padding: 30px; color: var(--primary);">Cargando estadísticas de salas...</th></tr></thead>`;

    try {
        const { data: fileList, error: listError } = await supabaseClient.storage
            .from('entrenamientos_logs')
            .list(folderPath);

        if (listError || !fileList || fileList.length === 0) {
            alert("No se encontraron archivos.");
            return;
        }

        fileList.sort((a, b) => a.name.localeCompare(b.name));
        let textosSalas = [];

        for (let file of fileList) {
            const { data: fileData, error: downloadError } = await supabaseClient.storage
                .from('entrenamientos_logs')
                .download(`${folderPath}/${file.name}`);

            if (!downloadError && fileData) {
                let texto = await fileData.text();
                textosSalas.push(texto);
            }
        }

        let equiposMap = {};
        let numSalas = textosSalas.length;

        textosSalas.forEach((texto, salaIndex) => {
            let lines = texto.split('\n');
            lines.forEach(line => {
                const teamMatch = line.match(/TeamName:\s*(.+?)\s+Rank:\s*(\d+)\s+KillScore:\s*(\d+)\s+RankScore:\s*(\d+)\s+TotalScore:\s*(\d+)/i);
                if (teamMatch) {
                    let name = teamMatch[1].trim();
                    if (!equiposMap[name]) {
                        equiposMap[name] = { name, totalScore: 0, killScore: 0, salasPuntos: {}, salasJugadas: 0 };
                    }
                    let totalScore = parseInt(teamMatch[5]);
                    let killScore = parseInt(teamMatch[3]);
                    equiposMap[name].totalScore += totalScore;
                    equiposMap[name].killScore += killScore;
                    equiposMap[name].salasPuntos[salaIndex] = totalScore;
                    equiposMap[name].salasJugadas += 1;
                }
            });
        });

        let equiposOrdenados = Object.values(equiposMap).sort((a, b) => b.totalScore - a.totalScore);

        let htmlHeader = `
            <thead>
                <tr style="color: var(--primary); font-family: 'Michroma'; border-bottom: 2px solid rgba(216,195,149,0.3); font-size: 0.85rem;">
                    <th style="text-align:left; padding: 10px;">#</th>
                    <th style="text-align:left; padding: 10px;">EQUIPO</th>
                    ${Array.from({length: numSalas}).map((_,i) => `<th style="padding: 10px; text-align:center;">S${i+1}</th>`).join('')}
                    <th style="text-align: center; padding: 10px;">SALAS</th>
                    <th style="text-align: center; padding: 10px;">KILL</th>
                    <th style="text-align: center; padding: 10px;">TOTAL</th>
                </tr>
            </thead>
        `;

        let htmlBody = `<tbody>`;
        equiposOrdenados.forEach((eq, i) => {
            let colorFila = "var(--light)";
            if (i === 0) colorFila = '#D8C395';
            else if (i === 1) colorFila = '#B9B2A4';
            else if (i === 2) colorFila = '#cd7f32';

            htmlBody += `
                <tr style="border-bottom: 1px solid rgba(255,255,255,0.06);">
                    <td style="padding: 10px; font-weight: bold; color:${colorFila};">#${i+1}</td>
                    <td style="padding: 10px; font-weight: bold; max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;"><span style="color: var(--light);">${eq.name}</span></td>
                    ${Array.from({length: numSalas}).map((_,s) => `<td style="text-align:center; padding: 10px; color: var(--secondary);">${eq.salasPuntos[s] !== undefined ? eq.salasPuntos[s] : '-'}</td>`).join('')}
                    <td style="text-align:center; padding: 10px; color: var(--primary); font-weight:bold;">${eq.salasJugadas}</td>
                    <td style="text-align:center; padding: 10px; color: #ff5555; font-weight:bold;">${eq.killScore}</td>
                    <td style="text-align:center; padding: 10px; color:${colorFila}; font-weight:bold; font-family:'Michroma';">${eq.totalScore}</td>
                </tr>
            `;
        });
        htmlBody += `</tbody>`;

        if (tablaSesionUnica) tablaSesionUnica.innerHTML = htmlHeader + htmlBody;
    } catch (err) {
        console.error("Error:", err);
        alert("Error al cargar los datos de la sesión.");
    }
}

function cerrarModalDetalle() {
    let modal = document.getElementById('modalDetalleSesion');
    if (modal) modal.style.display = 'none';
}

window.addEventListener('DOMContentLoaded', cargarSesiones);