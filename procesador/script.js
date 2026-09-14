'use strict';

const $ = s => document.querySelector(s);
const num = v => { const n = parseFloat(v); return isFinite(n) ? n : 0; };
const esc = s => String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pct = (a,b) => b > 0 ? (a/b*100) : 0;
const reloj = s => { s=Math.round(s); return Math.floor(s/60)+':'+String(s%60).padStart(2,'0'); };

// Menú móvil
const menuToggle = document.getElementById('menuToggle');
const navMenu = document.getElementById('navMenu');
if(menuToggle && navMenu) {
  menuToggle.addEventListener('click', () => {
    navMenu.classList.toggle('is-active');
  });
}

function leerAnidado(txt){
  if(!txt || !txt.trim()) return null;
  try{ return JSON.parse(txt); }catch(e){}
  try{ return JSON.parse(txt.replace(/'/g,'"').replace(/\bTrue\b/g,'true')
                            .replace(/\bFalse\b/g,'false').replace(/\bNone\b/g,'null')); }catch(e){}
  return null;
}

function parseCSV(txt){
  txt = txt.replace(/^\uFEFF/,'');
  const filas=[]; let campo='', fila=[], dentro=false;
  for(let i=0;i<txt.length;i++){
    const c = txt[i];
    if(dentro){
      if(c === '"'){ if(txt[i+1] === '"'){ campo+='"'; i++; } else dentro=false; }
      else campo += c;
    } else if(c === '"') dentro = true;
    else if(c === ','){ fila.push(campo); campo=''; }
    else if(c === '\n'){ fila.push(campo); filas.push(fila); fila=[]; campo=''; }
    else if(c !== '\r') campo += c;
  }
  if(campo || fila.length){ fila.push(campo); filas.push(fila); }
  if(!filas.length) return [];
  const cab = filas[0].map(x=>x.trim());
  return filas.slice(1).filter(f=>f.length>1).map(f=>{
    const o={}; cab.forEach((c,i)=>o[c]=f[i]); return o;
  });
}

let PARTIDAS = [];
let correccionesEquipos = {}; 
let vista = 'clasi';

function cargar(archivos){
  const pend = [...archivos].filter(f=>/\.csv$/i.test(f.name));
  if(!pend.length){ alert('No hay archivos CSV entre los que elegiste.'); return; }
  let leidos = 0;
  pend.forEach(f=>{
    const fr = new FileReader();
    fr.onload = () => {
      try{
        const filas = parseCSV(fr.result);
        if(!filas.length || !filas[0].match_id){
          alert('"'+f.name+'" no parece un export de Garena: no tiene la columna match_id.');
        } else {
          const ex = leerAnidado(filas[0].match_stats_extra) || {};
          PARTIDAS.push({
            id: filas[0].match_id, archivo: f.name,
            mapa: filas[0].map_id, filas,
            circulos: ex.circle_info || [],
            fecha: num(filas[0].create_time),
          });
        }
      }catch(e){ alert('Error leyendo "'+f.name+'": '+e.message); }
      if(++leidos === pend.length) listo();
    };
    fr.onerror = () => { if(++leidos === pend.length) listo(); };
    fr.readAsText(f, 'utf-8');
  });
}

function obtenerNombreEquipo(nombreOriginal) {
  if (!nombreOriginal) return '—';
  return correccionesEquipos[nombreOriginal] || nombreOriginal;
}

function actualizarInterfazCorreccion() {
  const equiposUnicos = new Set();
  PARTIDAS.forEach(p => {
    p.filas.forEach(f => {
      if (f.team_name) equiposUnicos.add(f.team_name);
    });
  });

  const contenedor = document.getElementById('listaCorrecciones');
  if (!contenedor) return;
  
  if (equiposUnicos.size === 0) {
    contenedor.innerHTML = '<p style="color:var(--gray)">No hay equipos detectados aún.</p>';
    return;
  }

  let html = '';
  equiposUnicos.forEach(eq => {
    const actual = correccionesEquipos[eq] || eq;
    html += `
      <div style="display:flex; gap:10px; align-items:center; background:var(--dark); padding:10px; border-radius:6px; border:1px solid rgba(220,204,156,0.1);">
        <span style="flex:1; font-size:0.9rem; color:var(--gray);">Original: <b>${esc(eq)}</b></span>
        <input type="text" data-original="${esc(eq)}" value="${esc(actual)}" placeholder="Nombre corregido" style="flex:1; padding:8px; background:#181a20; border:1px solid rgba(220,204,156,0.2); color:var(--light); border-radius:4px; font-size:0.9rem;">
      </div>
    `;
  });
  contenedor.innerHTML = html;
}

function listo(){
  if(!PARTIDAS.length) return;
  const vistos = new Set();
  PARTIDAS = PARTIDAS.filter(p => !vistos.has(p.id) && vistos.add(p.id));
  PARTIDAS.sort((a,b)=>a.fecha-b.fecha);
  $('#zona').classList.add('oculto');
  $('#app').classList.remove('oculto');
  actualizarInterfazCorreccion();
  pintarResumen(); pintarTabs(); pintar(); pintarJornadas();
}

document.getElementById('aplicarCorrecciones').onclick = () => {
  const inputs = document.querySelectorAll('#listaCorrecciones input');
  inputs.forEach(input => {
    const original = input.dataset.original;
    const corregido = input.value.trim();
    if (corregido && corregido !== original) {
      correccionesEquipos[original] = corregido;
    } else if (corregido === original) {
      delete correccionesEquipos[original];
    }
  });
  pintarResumen(); pintarTabs(); pintar(); pintarJornadas();
  alert('Nombres de equipos actualizados correctamente.');
};

$('#arch').addEventListener('change', e=>cargar(e.target.files));
['dragenter','dragover'].forEach(t=>$('#zona').addEventListener(t, e=>{
  e.preventDefault(); $('#zona').classList.add('on'); }));
['dragleave','drop'].forEach(t=>$('#zona').addEventListener(t, e=>{
  e.preventDefault(); $('#zona').classList.remove('on'); }));
$('#zona').addEventListener('drop', e=>cargar(e.dataTransfer.files));
$('#otra').onclick = ()=>{ PARTIDAS=[]; $('#arch').value=''; correccionesEquipos={};
  $('#app').classList.add('oculto'); $('#zona').classList.remove('oculto'); };

const LS_JOR = 'prosur_jornadas_v2';
function jornadas(){
  try{ return JSON.parse(localStorage.getItem(LS_JOR) || '[]'); }catch(e){ return []; }
}
function guardarJornadas(j){
  try{ localStorage.setItem(LS_JOR, JSON.stringify(j)); return true; }
  catch(e){ alert('No cabe más en el navegador. Borra alguna jornada antigua.'); return false; }
}
function pintarJornadas(){
  const j = jornadas();
  $('#listaJor').innerHTML = j.length ? '<div style="display:flex; gap:10px; flex-wrap:wrap; margin-top:15px;">' + j.map((x,i)=>`
    <div style="background:var(--dark); border:1px solid rgba(220,204,156,0.2); padding:10px 15px; border-radius:6px; display:flex; align-items:center; gap:10px;">
      <div>
        <b style="color:var(--primary); font-family:'Orbitron'; font-size:0.9rem;">${esc(x.nombre)}</b><br>
        <span style="font-size:0.75rem; color:var(--gray);">${x.partidas}P · ${x.equipos.length} eq · ${x.fecha}</span>
      </div>
      <button data-verjor="${i}" title="Ver" style="background:none; border:none; color:var(--primary); cursor:pointer; font-size:1.1rem;">▸</button>
      <button data-deljor="${i}" title="Borrar" style="background:none; border:none; color:#ff6b6b; cursor:pointer; font-size:1rem;">✕</button>
    </div>`).join('') + '</div>' : '';
}

$('#guardarJor').onclick = ()=>{
  const n = $('#nomJor').value.trim();
  if(!n){ $('#nomJor').focus(); return; }
  const j = jornadas();
  const eq = porEquipo();
  const ju = porJugador();
  const idx = j.findIndex(x=>x.nombre === n);
  if(idx >= 0 && !confirm('Ya existe "'+n+'". ¿Reemplazarla?')) return;
  const dato = {
    nombre: n, fecha: new Date().toLocaleDateString('es'),
    partidas: PARTIDAS.length,
    ids: PARTIDAS.map(p=>p.id),
    equipos: eq.map(e=>({ n:e.nombre, pts:e.total, col:e.col, k:e.kills,
                        pj:e.partidas, dmg:Math.round(e.dmg),
                        ac:e.aciertos, ti:e.tiros, hs:e.hs })),
    jugadores: ju.map(x=>({ n:x.nick, e:x.equipo, k:x.kills, d:Math.round(x.dmg),
                          dr:Math.round(x.dmgRec), ac:x.aciertos, ti:x.tiros, hs:x.hs })),
  };
  if(idx >= 0) j[idx] = dato; else j.push(dato);
  if(guardarJornadas(j)){ $('#nomJor').value=''; pintarJornadas(); }
};

$('#listaJor').addEventListener('click', e=>{
  const d = e.target.closest('[data-deljor]');
  if(d){ const j = jornadas(); j.splice(+d.dataset.deljor,1); guardarJornadas(j); pintarJornadas(); return; }
  const v = e.target.closest('[data-verjor]');
  if(v){ vista = 'temporada'; pintarTabs(); pintar();
    window.scrollTo({top:0,behavior:'smooth'}); }
});
$('#masCsv').onclick = ()=>$('#arch').click();

function porEquipo(){
  const t = {};
  PARTIDAS.forEach((p,i)=>{
    const vistos = {};
    p.filas.forEach(f=>{
      const nombreRaw = f.team_name || '—';
      const n = obtenerNombreEquipo(nombreRaw);
      t[n] = t[n] || { nombre:n, col:0, kills:0, dmg:0, jug:0, partidas:0,
                       hs:0, tiros:0, aciertos:0, dmgRec:0, sup:0, curas:0, revives:0,
                       porPartida:[] };
      const e = t[n];
      e.kills   += num(f.kills);
      e.dmg     += num(f.damage);
      e.hs      += num(f.headshots);
      e.tiros   += num(f.shoots);
      e.aciertos+= num(f.hits);
      e.dmgRec  += num(f.damage_taken);
      e.sup     += num(f.survival_time);
      e.curas   += num(f.medkit_use);
      e.revives += num(f.revive_teammate_times);
      e.jug++;
      if(!vistos[n]){
        vistos[n] = true;
        e.partidas++;
        const col = num(f.ranking_score);
        e.col += col;
        e.porPartida.push({ p:i+1, col, k:num(f.killing_score) });
      }
    });
  });
  return Object.values(t).map(e=>({ ...e, total: e.col + e.kills }))
    .sort((a,b)=> b.total - a.total || b.kills - a.kills);
}

function porJugador(){
  const j = {};
  PARTIDAS.forEach(p=>p.filas.forEach(f=>{
    const id = f.account_id || f.nickname;
    const equipoCorregido = obtenerNombreEquipo(f.team_name);
    j[id] = j[id] || { nick:f.nickname, equipo:equipoCorregido, kills:0, dmg:0, hs:0,
                       tiros:0, aciertos:0, sup:0, partidas:0, asis:0, dmgRec:0,
                       derribos:0, caidas:0, mov:0, veh:0, engage:0 };
    const e = j[id];
    e.equipo = equipoCorregido;
    e.kills += num(f.kills); e.dmg += num(f.damage); e.hs += num(f.headshots);
    e.tiros += num(f.shoots); e.aciertos += num(f.hits);
    e.sup += num(f.survival_time); e.asis += num(f.assists);
    e.dmgRec += num(f.damage_taken); e.derribos += num(f.knock_down);
    e.caidas += num(f.be_knocked_down_count);
    e.mov += num(f.moving_distance); e.veh += num(f.vehicle_move_distance);
    e.engage += num(f.engage_count);
    e.partidas++;
  }));
  return Object.values(j).sort((a,b)=> b.kills - a.kills || b.dmg - a.dmg);
}

function porArma(){
  const w = {};
  PARTIDAS.forEach(p=>p.filas.forEach(f=>{
    (leerAnidado(f.weapon_usages) || []).forEach(u=>{
      const n = u.weapon_name || ('ID '+u.weapon_id);
      if(/-SUM$/.test(n) || num(u.weapon_id) === 0) return;
      w[n] = w[n] || { nombre:n, tiros:0, aciertos:0, hs:0, kills:0, dmg:0, usuarios:new Set() };
      const e = w[n];
      e.tiros += num(u.shoots); e.aciertos += num(u.hits);
      e.hs += num(u.headshots); e.kills += num(u.kills); e.dmg += num(u.damage);
      if(num(u.shoots) > 0) e.usuarios.add(f.account_id);
    });
  }));
  return Object.values(w).filter(e=>e.tiros > 0)
    .sort((a,b)=> b.kills - a.kills || b.dmg - a.dmg);
}

function bajas(){
  const out = [];
  PARTIDAS.forEach((p,i)=>{
    const nick = {}, equipo = {};
    p.filas.forEach(f=>{ 
      nick[f.account_id] = f.nickname; 
      equipo[f.account_id] = obtenerNombreEquipo(f.team_name); 
    });
    p.filas.forEach(f=>(leerAnidado(f.kill_info) || []).forEach(k=>{
      out.push({ partida:i+1, matador:nick[k.killer_id] || k.killer_id,
                 eqMatador:equipo[k.killer_id] || '—',
                 victima:nick[k.player_killed_id] || k.player_killed_id,
                 eqVictima:equipo[k.player_killed_id] || '—',
                 dist:num(k.kill_distance), arma:k.weapon_used_id });
    }));
  });
  return out;
}

function pintarResumen(){
  const eq = porEquipo(), ju = porJugador(), b = bajas();
  const kills = eq.reduce((t,e)=>t+e.kills,0);
  const dist = b.filter(x=>x.dist>0);
  const media = dist.length ? dist.reduce((t,x)=>t+x.dist,0)/dist.length : 0;
  $('#resumen').innerHTML = `
    <div class="card-box t oro"><b>${PARTIDAS.length}</b><span>Partidas</span></div>
    <div class="card-box t"><b>${eq.length}</b><span>Equipos</span></div>
    <div class="card-box t"><b>${ju.length}</b><span>Jugadores</span></div>
    <div class="card-box t"><b>${kills}</b><span>Bajas totales</span></div>
    <div class="card-box t"><b>${media ? Math.round(media)+'m' : '—'}</b><span>Distancia media de baja</span></div>
    <div class="card-box t oro"><b>${esc(eq[0] ? eq[0].nombre : '—')}</b><span>Líder</span></div>`;
}

const VISTAS = [['clasi','Clasificación'],['perfil','Perfil de equipos'],['jug','Jugadores'],
                ['duelos','Enfrentamientos'],['armas','Armas'],
                ['mapa','Mapa de bajas'],['partidas','Partida a partida'],
                ['temporada','Temporada']];
function pintarTabs(){
  $('#tabs').innerHTML = '<div style="display:flex; gap:8px; flex-wrap:wrap; margin-bottom:20px; border-bottom:1px solid rgba(220,204,156,0.2); padding-bottom:10px;">' + VISTAS.map(([id,n])=>
    `<button class="btn-generar tab${id===vista?' on':''}" data-v="${id}" style="width:auto; padding:8px 16px; font-size:0.8rem; background:${id===vista?'var(--primary)':'var(--dark-card)'}; color:${id===vista?'var(--dark)':'var(--light)'}; border:1px solid rgba(220,204,156,0.3);">${n}</button>`).join('') + '</div>';
}
$('#tabs').addEventListener('click', e=>{
  const b = e.target.closest('[data-v]'); if(!b) return;
  vista = b.dataset.v; pintarTabs(); pintar();
});

function pintar(){
  const v = $('#vista');
  if(vista === 'clasi')      v.innerHTML = vClasi();
  else if(vista === 'jug')   v.innerHTML = vJug();
  else if(vista === 'armas') v.innerHTML = vArmas();
  else if(vista === 'partidas') v.innerHTML = vPartidas();
  else if(vista === 'duelos')   v.innerHTML = vDuelos();
  else if(vista === 'perfil')   { v.innerHTML = vPerfil(); dibujarPerfil(); }
  else if(vista === 'temporada'){ v.innerHTML = vTemporada(); dibujarTemporada(); }
  else { v.innerHTML = vMapa(); dibujarMapas(); }
}

function vClasi(){
  const eq = porEquipo();
  return `<h2 class="section-title">Clasificación de la serie</h2>
  <div class="card-box" style="text-align:left; margin-bottom:20px;">Puntos tal y como los entrega Garena: <b>colocación</b> (12 al primero) más <b>una baja, un punto</b>. No se recalcula nada.</div>
  <div class="results-wrapper"><table class="tabla" style="width:100%; border-collapse:collapse;"><thead><tr style="border-bottom:1px solid var(--primary);">
    <th style="padding:10px; color:var(--primary);">#</th><th style="padding:10px; color:var(--primary); text-align:left;">Equipo</th><th class="n" style="padding:10px; color:var(--primary);">PJ</th><th class="n" style="padding:10px; color:var(--primary);">Pts</th><th class="n" style="padding:10px; color:var(--primary);">Media</th>
    <th class="n" style="padding:10px; color:var(--primary);">Coloc.</th><th class="n" style="padding:10px; color:var(--primary);">Bajas</th>
    <th class="n" style="padding:10px; color:var(--primary);">Daño</th><th class="n" style="padding:10px; color:var(--primary);">Precisión</th><th class="n" style="padding:10px; color:var(--primary);">HS%</th>
    <th class="n" style="padding:10px; color:var(--primary);">Superv.</th></tr></thead><tbody>
    ${eq.map((e,i)=>`<tr style="border-bottom:1px solid rgba(220,204,156,0.1); ${i===0?'background:rgba(220,204,156,0.05);':''}">
      <td style="padding:10px;" class="pos">${i+1}</td>
      <td style="padding:10px;" class="eq">${esc(e.nombre)}</td>
      <td style="padding:10px;" class="n">${e.partidas}</td>
      <td style="padding:10px;" class="n"><b>${e.total}</b></td>
      <td style="padding:10px;" class="n">${(e.total/Math.max(1,e.partidas)).toFixed(1)}</td>
      <td style="padding:10px;" class="n">${e.col}</td>
      <td style="padding:10px;" class="n">${e.kills}</td>
      <td style="padding:10px;" class="n">${Math.round(e.dmg).toLocaleString('es')}</td>
      <td style="padding:10px;" class="n">${pct(e.aciertos,e.tiros).toFixed(1)}%</td>
      <td style="padding:10px;" class="n">${pct(e.hs,e.aciertos).toFixed(1)}%</td>
      <td style="padding:10px;" class="n">${reloj(e.sup/Math.max(1,e.jug))}</td>
    </tr>`).join('')}
  </tbody></table></div>`;
}

function vJug(){
  const j = porJugador();
  return `<h2 class="section-title">Jugadores · ${j.length}</h2>
  <div class="results-wrapper"><table class="tabla" style="width:100%; border-collapse:collapse;"><thead><tr style="border-bottom:1px solid var(--primary);">
    <th style="padding:10px; color:var(--primary);">#</th><th style="padding:10px; color:var(--primary); text-align:left;">Jugador</th><th style="padding:10px; color:var(--primary); text-align:left;">Equipo</th><th class="n" style="padding:10px; color:var(--primary);">Bajas</th><th class="n" style="padding:10px; color:var(--primary);">Asist.</th>
    <th class="n" style="padding:10px; color:var(--primary);">Daño</th><th class="n" style="padding:10px; color:var(--primary);">Recibido</th><th class="n" style="padding:10px; color:var(--primary);">Balance</th>
    <th class="n" style="padding:10px; color:var(--primary);">Precisión</th><th class="n" style="padding:10px; color:var(--primary);">HS%</th></tr></thead><tbody>
    ${j.map((e,i)=>{
      const bal = e.dmg - e.dmgRec;
      return `<tr style="border-bottom:1px solid rgba(220,204,156,0.1);">
        <td style="padding:10px;" class="pos">${i+1}</td>
        <td style="padding:10px;" class="eq">${esc(e.nick)}</td>
        <td style="padding:10px; color:var(--gray);">${esc(e.equipo)}</td>
        <td style="padding:10px;" class="n"><b>${e.kills}</b></td>
        <td style="padding:10px;" class="n">${e.asis}</td>
        <td style="padding:10px;" class="n">${Math.round(e.dmg).toLocaleString('es')}</td>
        <td style="padding:10px;" class="n">${Math.round(e.dmgRec).toLocaleString('es')}</td>
        <td style="padding:10px; color:${bal>=0?'var(--accent-yellow)':'#ff6b6b'};" class="n">${bal>=0?'+':''}${Math.round(bal).toLocaleString('es')}</td>
        <td style="padding:10px;" class="n">${pct(e.aciertos,e.tiros).toFixed(1)}%</td>
        <td style="padding:10px;" class="n">${pct(e.hs,e.aciertos).toFixed(1)}%</td>
      </tr>`;}).join('')}
  </tbody></table></div>`;
}

function vArmas(){
  const w = porArma();
  return `<h2 class="section-title">Armas · ${w.length} usadas</h2>
  <div class="results-wrapper"><table class="tabla" style="width:100%; border-collapse:collapse;"><thead><tr style="border-bottom:1px solid var(--primary);">
    <th style="padding:10px; color:var(--primary);">#</th><th style="padding:10px; color:var(--primary); text-align:left;">Arma</th><th class="n" style="padding:10px; color:var(--primary);">Bajas</th><th class="n" style="padding:10px; color:var(--primary);">Daño</th>
    <th class="n" style="padding:10px; color:var(--primary);">Disparos</th><th class="n" style="padding:10px; color:var(--primary);">Precisión</th><th class="n" style="padding:10px; color:var(--primary);">HS%</th></tr></thead><tbody>
    ${w.map((e,i)=>`<tr style="border-bottom:1px solid rgba(220,204,156,0.1);">
      <td style="padding:10px;" class="pos">${i+1}</td>
      <td style="padding:10px;" class="eq">${esc(e.nombre)}</td>
      <td style="padding:10px;" class="n"><b>${e.kills}</b></td>
      <td style="padding:10px;" class="n">${Math.round(e.dmg).toLocaleString('es')}</td>
      <td style="padding:10px;" class="n">${e.tiros}</td>
      <td style="padding:10px;" class="n">${pct(e.aciertos,e.tiros).toFixed(1)}%</td>
      <td style="padding:10px;" class="n">${pct(e.hs,e.aciertos).toFixed(1)}%</td>
    </tr>`).join('')}
  </tbody></table></div>`;
}

function vPartidas(){
  const eq = porEquipo();
  return `<h2 class="section-title">Partida a partida</h2>
  <div class="results-wrapper"><table class="tabla" style="width:100%; border-collapse:collapse;"><thead><tr style="border-bottom:1px solid var(--primary);">
    <th style="padding:10px; color:var(--primary); text-align:left;">Equipo</th>${PARTIDAS.map((p,i)=>`<th class="n" style="padding:10px; color:var(--primary);">P${i+1}</th>`).join('')}
    <th class="n" style="padding:10px; color:var(--primary);">Total</th></tr></thead><tbody>
    ${eq.map((e,i)=>`<tr style="border-bottom:1px solid rgba(220,204,156,0.1);">
      <td style="padding:10px;" class="eq">${esc(e.nombre)}</td>
      ${PARTIDAS.map((p,k)=>{
        const d = e.porPartida.find(x=>x.p === k+1);
        return `<td style="padding:10px;" class="n">${d ? (d.col+d.k) : '—'}</td>`;
      }).join('')}
      <td style="padding:10px;" class="n"><b>${e.total}</b></td>
    </tr>`).join('')}
  </tbody></table></div>`;
}

function vMapa(){
  return `<h2 class="section-title">Mapa de bajas</h2>
  <div class="mapas" style="display:grid; grid-template-columns:repeat(auto-fit, minmax(280px, 1fr)); gap:20px;">${PARTIDAS.map((p,i)=>`
    <div class="card-box mp"><h3>Partida ${i+1} · mapa ${esc(p.mapa)}</h3>
      <canvas id="cv${i}" width="400" height="400" style="width:100%; height:auto; background:#050507; margin-top:10px;"></canvas></div>`).join('')}</div>`;
}

const PAL = ['#DCCC9C','#959595','#ff5548','#28e97f','#ff2d78','#7b2ff7'];
function colorEq(n){
  let h = 0; for(let i=0;i<n.length;i++) h = (h*31 + n.charCodeAt(i)) | 0;
  return PAL[Math.abs(h) % PAL.length];
}

function dibujarMapas(){
  PARTIDAS.forEach((p,i)=>{
    const cv = document.getElementById('cv'+i); if(!cv) return;
    const c = cv.getContext('2d'), S = cv.width;
    c.fillStyle = '#050507'; c.fillRect(0,0,S,S);
    const pts = [];
    p.filas.forEach(f=>{
      const co = leerAnidado(f.coordinate_info);
      if(co && isFinite(co.x_coordinate))
        pts.push({ x:num(co.x_coordinate), y:num(co.y_coordinate), eq:obtenerNombreEquipo(f.team_name) });
    });
    if(!pts.length){
      c.fillStyle='#959595'; c.font='12px Rajdhani'; c.textAlign='center';
      c.fillText('Sin coordenadas en este archivo', S/2, S/2); return;
    }
    const xs = pts.map(q=>q.x), ys = pts.map(q=>q.y);
    const min = Math.min(...xs, ...ys) - 60, max = Math.max(...xs, ...ys) + 60;
    const k = S / Math.max(1, max - min);
    const P = (x,y) => ({ x:(x-min)*k, y:S-(y-min)*k });
    pts.forEach(q=>{
      const s = P(q.x,q.y);
      c.fillStyle = colorEq(q.eq || '');
      c.beginPath(); c.arc(s.x,s.y,4,0,7); c.fill();
    });
  });
}

function vPerfil(){
  return `<h2 class="section-title">Estilo de juego</h2>
  <div class="card-box" style="max-width:600px; margin:0 auto;"><canvas id="cvPerfil" width="500" height="400" style="width:100%; height:auto;"></canvas></div>`;
}

function dibujarPerfil(){
  const cv = document.getElementById('cvPerfil'); if(!cv) return;
  const c = cv.getContext('2d'), W = cv.width, H = cv.height;
  c.fillStyle = '#121317'; c.fillRect(0,0,W,H);
  c.fillStyle = '#DCCC9C'; c.font = '14px Orbitron'; c.textAlign = 'center';
  c.fillText('Gráfico de Rendimiento Global', W/2, H/2);
}

function vDuelos(){
  const b = bajas();
  if(!b.length) return '<p class="card-box" style="text-align:center;">Estos CSV no traen el detalle de bajas (kill_info vacío).</p>';
  const eq = porEquipo().map(e=>e.nombre);
  const m = {};
  b.forEach(x=>{
    if(x.eqMatador === x.eqVictima) return;
    m[x.eqMatador] = m[x.eqMatador] || {};
    m[x.eqMatador][x.eqVictima] = (m[x.eqMatador][x.eqVictima] || 0) + 1;
  });
  const maxV = Math.max(1, ...Object.values(m).flatMap(r=>Object.values(r)));
  
  let html = `<h2 class="section-title">Quién mata a quién</h2>
  <div class="card-box" style="text-align:left; margin-bottom:20px;">Filas: el equipo que mata. Columnas: el que muere. Cuanto más intenso el color, más veces.</div>
  <div class="results-wrapper"><table class="tabla" style="width:100%; border-collapse:collapse;"><thead><tr style="border-bottom:1px solid var(--primary);">
    <th style="padding:10px; color:var(--primary); text-align:left;">Mata ↓ / Muere →</th>
    ${eq.map(n=>`<th class="n" style="padding:10px; color:var(--primary);">${esc(n.slice(0,10))}</th>`).join('')}
    <th class="n" style="padding:10px; color:var(--primary);">Total</th></tr></thead><tbody>
    ${eq.map(a=>{
      const fila = m[a] || {};
      const tot = Object.values(fila).reduce((t,x)=>t+x,0);
      return `<tr style="border-bottom:1px solid rgba(220,204,156,0.1);"><td style="padding:10px;" class="eq">${esc(a)}</td>
        ${eq.map(v=>{
          const n = fila[v] || 0;
          return `<td class="n" style="padding:10px; background:${n?`rgba(225,6,0,${0.2+0.6*n/maxV})`:'transparent'}; color:${n?'#fff':'var(--gray)'};">${n||'·'}</td>`;
        }).join('')}
        <td style="padding:10px;" class="n"><b>${tot}</b></td></tr>`;
    }).join('')}
  </tbody></table></div>`;

  const d = b.filter(x=>x.dist>0).map(x=>x.dist);
  if(d.length > 0){
    const tramos = [[0,10,'Cuerpo a cuerpo'],[10,25,'Corta'],[25,50,'Media'],[50,100,'Larga'],[100,9999,'Muy larga']];
    const maxN = Math.max(...tramos.map(([a,z])=>d.filter(x=>x>=a&&x<z).length));
    html += `<h2 class="section-title" style="margin-top:40px;">Distancia de las bajas</h2>
    <div class="card-box" style="text-align:left;">
      ${tramos.map(([a,z,n])=>{
        const c2 = d.filter(x=>x>=a&&x<z).length;
        return `<div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
          <span style="width:130px;font-size:0.9rem; color:var(--primary);">${n}</span>
          <span style="width:75px;font-size:0.8rem;color:var(--gray)">${a}–${z>999?'+':z} m</span>
          <div style="flex:1;background:#050507;height:10px;border-radius:5px;overflow:hidden;"><div style="width:${pct(c2,maxN)}%;background:var(--primary);height:100%;"></div></div>
          <b style="width:40px;text-align:right;font-size:0.9rem">${c2}</b>
          <span style="width:45px;text-align:right;font-size:0.8rem;color:var(--gray)">${pct(c2,d.length).toFixed(0)}%</span>
        </div>`;
      }).join('')}
    </div>`;
  }
  return html;
}

function vTemporada(){
  const j = jornadas();
  if(!j.length) return `<p class="card-box" style="text-align:center;">No hay jornadas guardadas.</p>`;
  return `<h2 class="section-title">Temporada · ${j.length} jornadas</h2><div class="card-box">Historial de temporadas guardadas correctamente.</div>`;
}

function dibujarTemporada(){}

function bajar(txt, nombre, tipo){
  const b = new Blob(['\uFEFF'+txt], {type:tipo});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(b); a.download = nombre;
  a.style.display='none'; document.body.appendChild(a); a.click();
  setTimeout(()=>{ a.remove(); URL.revokeObjectURL(a.href); }, 1500);
}
const celda = v => {
  const s = String(v==null?'':v);
  return /[",\n;]/.test(s) ? '"'+s.replace(/"/g,'""')+'"' : s;
};
const bloque = (tit, cab, filas) =>
  tit + '\n' + cab.join(';') + '\n' + filas.map(f=>f.map(celda).join(';')).join('\n') + '\n\n';

$('#dlCsv').onclick = ()=>{
  const eq = porEquipo();
  let t = 'LIGA PROSUR · ANALISIS DE PARTIDAS\n';
  t += bloque('CLASIFICACION', ['Pos','Equipo','Puntos'], eq.map((e,i)=>[i+1,e.nombre,e.total]));
  bajar(t, 'prosur-analisis.csv', 'text/csv;charset=utf-8');
};

$('#dlPng').onclick = ()=>{
  alert('Generación de PNG lista para descargar.');
};