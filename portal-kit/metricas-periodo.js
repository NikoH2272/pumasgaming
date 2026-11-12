/* Fechas y cálculos puros. Sin DOM, API ni escrituras. */
(function(root){
  const ZONA='America/Bogota';
  const clave=s=>String(s||'').normalize('NFKC').trim().replace(/\s+/g,' ').toLocaleLowerCase('es');
  const numero=n=>Number.isFinite(Number(n))?Number(n):0;
  const fechaISO=d=>d.toISOString().slice(0,10);
  const sumarDias=(s,n)=>{const d=new Date(s+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return fechaISO(d);};
  function rango(tipo,fecha){
    if(!/^\d{4}-\d{2}-\d{2}$/.test(fecha)||isNaN(new Date(fecha+'T12:00:00Z'))||fechaISO(new Date(fecha+'T12:00:00Z'))!==fecha)throw new Error('Elige una fecha válida.');
    const d=new Date(fecha+'T12:00:00Z');let desde,hasta;
    if(tipo==='mes'){desde=fecha.slice(0,7)+'-01';hasta=fechaISO(new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,1)));}
    else{tipo='semana';desde=sumarDias(fecha,-((d.getUTCDay()+6)%7));hasta=sumarDias(desde,7);}
    const formato=s=>new Date(s+'T12:00:00Z').toLocaleDateString('es-CO',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'});
    return {tipo,desde,hasta,ultimo:sumarDias(hasta,-1),inicio:desde+'T00:00:00-05:00',fin:hasta+'T00:00:00-05:00',etiqueta:formato(desde)+' – '+formato(sumarDias(hasta,-1))};
  }
  function resumir(datos,periodo){
    const sesiones=(datos.sesiones||[]).filter(s=>new Date(s.fecha)>=new Date(periodo.inicio)&&new Date(s.fecha)<new Date(periodo.fin));
    const ids=new Set(sesiones.map(s=>String(s.id))),equipos=new Map(),base=new Map(),avanzados=new Map(),salasSet=new Set(),conResultados=new Set(),conStats=new Set();
    const equipo=n=>{const k=clave(n);if(!k)return null;if(!equipos.has(k))equipos.set(k,{nombre:String(n).trim(),sesiones:new Set(),salas:new Set(),kills:0,puntos:0,booyahs:0});return equipos.get(k);};
    (datos.salas||[]).filter(r=>ids.has(String(r.sesion_id))).forEach(r=>{
      const e=equipo(r.equipo_nombre);if(!e)return;
      const ses=String(r.sesion_id),sala=ses+':'+r.numero_sala;
      e.sesiones.add(ses);e.salas.add(sala);e.kills+=numero(r.kill_score);e.puntos+=numero(r.total_score);e.booyahs+=(r.es_booyah||numero(r.rank)===1)?1:0;
      salasSet.add(sala);conResultados.add(ses);
    });
    (datos.killers||[]).filter(r=>ids.has(String(r.sesion_id))&&clave(r.jugador_nombre)).forEach(r=>{
      const k=String(r.sesion_id)+'|'+clave(r.jugador_nombre),p=base.get(k)||{nombre:r.jugador_nombre.trim(),equipo:r.equipo_nombre||'—',sesion:String(r.sesion_id),kills:0,salas:0};
      p.kills+=numero(r.kills);p.salas++;base.set(k,p);
    });
    // Una fila de estadísticas por jugador y sala. No sumar dos veces kills de logs y stats.
    const vistos=new Set();
    (datos.stats||[]).filter(r=>ids.has(String(r.sesion_id))&&clave(r.jugador)).forEach(r=>{
      const ses=String(r.sesion_id),k=ses+'|'+clave(r.jugador),sala=k+'|'+r.sala;
      if(vistos.has(sala))return;vistos.add(sala);conStats.add(ses);
      const p=avanzados.get(k)||{nombre:r.jugador.trim(),equipo:r.equipo||'—',sesion:ses,kills:0,salas:0,salasDatos:0,dano:0,headshots:0,gloo:0,revividos:0,derribos:0};
      p.kills+=numero(r.kills);p.salas++;
      if((r.extra||{}).fuente!=='replay'){p.salasDatos++;['dano','headshots','gloo','revividos','derribos'].forEach(c=>p[c]+=numero(r[c]));}
      avanzados.set(k,p);
    });
    const jugadores=new Map();
    new Set([...base.keys(),...avanzados.keys()]).forEach(k=>{
      const b=base.get(k),a=avanzados.get(k),r=b||a,id=clave(r.nombre),p=jugadores.get(id)||{nombre:r.nombre,equipo:r.equipo,equipos:new Set(),kills:0,salas:0,sesiones:new Set(),salasStats:0,dano:0,headshots:0,gloo:0,revividos:0,derribos:0};
      p.kills+=r.kills;p.salas+=r.salas;p.sesiones.add(r.sesion);p.equipos.add(r.equipo);p.equipo=p.equipos.size>1?'Varios equipos':r.equipo;
      if(a){p.salasStats+=a.salasDatos;['dano','headshots','gloo','revividos','derribos'].forEach(c=>p[c]+=a[c]);}jugadores.set(id,p);
    });
    const E=[...equipos.values()].map(e=>({...e,entrenos:e.sesiones.size,salas:e.salas.size,asistencia:sesiones.length?e.sesiones.size/sesiones.length*100:0,pr:e.sesiones.size?Math.round(e.puntos/e.sesiones.size):0}));
    const J=[...jugadores.values()].map(p=>({...p,entrenos:p.sesiones.size,kps:p.salas?p.kills/p.salas:0,dps:p.salasStats?p.dano/p.salasStats:null}));
    const nombre=(a,b)=>a.nombre.localeCompare(b.nombre,'es');
    const participacion=[...E].sort((a,b)=>b.entrenos-a.entrenos||b.salas-a.salas||nombre(a,b));
    const killsEquipos=[...E].sort((a,b)=>b.kills-a.kills||b.booyahs-a.booyahs||nombre(a,b));
    const puntos=[...E].sort((a,b)=>b.pr-a.pr||b.booyahs-a.booyahs||b.puntos-a.puntos||nombre(a,b));
    const killsJugadores=[...J].sort((a,b)=>b.kills-a.kills||b.kps-a.kps||nombre(a,b));
    const rendimiento=J.filter(p=>p.salas>=3).sort((a,b)=>b.kps-a.kps||b.kills-a.kills||nombre(a,b));
    return {periodo,sesiones,entrenos:sesiones.length,salas:salasSet.size,equipos:E,jugadores:J,kills:E.reduce((a,e)=>a+e.kills,0),booyahs:E.reduce((a,e)=>a+e.booyahs,0),participacion,killsEquipos,puntos,killsJugadores,rendimiento,conResultados:conResultados.size,conStats:conStats.size};
  }
  const api={rango,resumir,clave,ZONA};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  else root.PumasMetricas=api;
})(typeof window!=='undefined'?window:globalThis);
