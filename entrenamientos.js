/* Entrenamientos del portal: calendario + listado + estadísticas (Supabase) */
(function(){
  const sb=supabase.createClient("https://bqemjroiegybdzksddkn.supabase.co","eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJxZW1qcm9pZWd5YmR6a3NkZGtuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc1NzgwNDIsImV4cCI6MjEwMzE1NDA0Mn0.49gC204FPWSNxWYa6eZFBgWJgr7ZvFax5mqOM9lyGPo");
  const $=id=>document.getElementById(id);
  const MES=["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
  const ZONA_HORARIA='America/Bogota';
const diaLocal=iso=>new Date(iso).toLocaleDateString('en-CA',{timeZone:ZONA_HORARIA});
const esc0=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const fmt=d=>new Date(d+"T00:00:00").toLocaleDateString("es",{day:"numeric",month:"short",year:"numeric"});
  let mes=new Date().getMonth(), anio=new Date().getFullYear(), porFecha={}, todas=[], sel=null;

  function pintar(){
    const first=new Date(anio,mes,1).getDay(), dias=new Date(anio,mes+1,0).getDate();
    let g="<div class='calendar-day empty'></div>".repeat(first);
    for(let d=1;d<=dias;d++){
      const k=`${anio}-${String(mes+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
      g+=`<div class="calendar-day${porFecha[k]?" has-session":""}${k===sel?" selected-day":""}" data-d="${k}">${d}</div>`;
    }
    const lista=sel&&porFecha[sel]?porFecha[sel]:todas.slice(0,8);
    const titulo=sel&&porFecha[sel]?`Entrenamientos del ${fmt(sel)}`:"Últimos entrenamientos";
    $("trainMain").innerHTML=`
      <div class="header-card-title"><i class="fa-solid fa-calendar-days"></i><h3>Calendario de Sesiones</h3></div>
      <div class="calendar-container">
        <div class="calendar-header"><button class="btn-ver" data-nav="-1">&lt;</button><h4>${MES[mes]} ${anio}</h4><button class="btn-ver" data-nav="1">&gt;</button></div>
        <div class="calendar-weekdays"><div>Dom</div><div>Lun</div><div>Mar</div><div>Mié</div><div>Jue</div><div>Vie</div><div>Sáb</div></div>
        <div class="calendar-grid">${g}</div>
      </div>
      <div class="ses-head"><h4>${titulo}</h4>${sel?'<button class="btn-ver" data-all="1">Ver todos</button>':""}</div>
      <div class="ses-list">${lista.length?lista.map(s=>`<div class="ses-row"><div><b>${esc(s.titulo)}</b><small>${fmt(diaLocal(s.fecha))}${s.jornada?" · "+esc(s.jornada):""}</small></div><a class="btn-ver" href="entrenamientos/index.html">Ver</a></div>`).join(""):"<p>Aún no hay entrenamientos registrados.</p>"}</div>`;
  }
  $("trainMain").addEventListener("click",e=>{
    const n=e.target.closest("[data-nav]"), d=e.target.closest("[data-d]"), a=e.target.closest("[data-all]");
    if(n){mes+=+n.dataset.nav; if(mes>11){mes=0;anio++;} if(mes<0){mes=11;anio--;} pintar();}
    else if(d){sel=porFecha[d.dataset.d]?d.dataset.d:null; pintar();}
    else if(a){sel=null; pintar();}
  });


const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function semanaISO(d){const t=new Date(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate())),n=t.getUTCDay()||7;t.setUTCDate(t.getUTCDate()+4-n);const y=t.getUTCFullYear();return y+'-'+Math.ceil(((t-Date.UTC(y,0,1))/864e5+1)/7);}
function rangoSemana(d){const l=new Date(d.getFullYear(),d.getMonth(),d.getDate()-((d.getDay()||7)-1)),f=new Date(l.getFullYear(),l.getMonth(),l.getDate()+6),o={day:'numeric',month:'short'};return l.toLocaleDateString('es',o)+' – '+f.toLocaleDateString('es',o);}
async function parsearSesion(s){
  const vacio={teams:{},players:{},salas:0,kills:0};
  if(!s.archivo_url) return vacio;
  const {data:fl}=await sb.storage.from('entrenamientos_logs').list(s.archivo_url);
  if(!fl) return vacio;
  const ck='pg_ses_v2_'+s.id;
  try{const c=JSON.parse(localStorage.getItem(ck)); if(c&&c.salas===fl.length) return c;}catch(e){}
  const out={teams:{},players:{},salas:fl.length,kills:0};
  await Promise.all(fl.map(async f=>{
    const {data}=await sb.storage.from('entrenamientos_logs').download(s.archivo_url+'/'+f.name); if(!data) return;
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

  const set=(id,v)=>{const el=$(id); if(el) el.textContent=v;};
  const colr=i=>i===0?'var(--primary)':i===1?'#B9B2A4':i===2?'#cd7f32':'var(--gray)';
  function rank(id,arr,val,vacio){const el=$(id); if(el) el.innerHTML=arr.length?arr.map((x,i)=>`<div class="rank-row"><span><b style="color:${colr(i)};">#${i+1}</b> ${esc(x.name)}</span><em>${val(x)}</em></div>`).join(''):`<p>${vacio}</p>`;}
  function pintarStats(parsed){const t=agregar(parsed);set('stEntrenos',parsed.length);set('stKills',t.kills);set('stSalas',t.salas);set('stEquipos',t.eq.length);}
  async function estadisticas(ses){
    set('stEntrenos',ses.length);
    const parsed=await parsearTodas(ses,pintarStats);
    pintarStats(parsed);
    const sem=semanaObjetivo(parsed), w=agregar(sem.lista), nota=sem.actual?'':' · última con datos';
    const te=$('tituloTopEq'), tk=$('tituloTopKill');
    if(te) te.innerHTML=`Top 10 Equipos · Semana ${sem.num}<span class="wk-range">${sem.rango}${nota}</span>`;
    if(tk) tk.innerHTML=`Top 10 Killers · Semana ${sem.num}<span class="wk-range">${sem.rango}${nota}</span>`;
    rank('contenedorTopEquiposPublicos',w.eq.slice(0,10),x=>x.pts+' pts','Aún no hay entrenamientos esta semana.');
    rank('contenedorTopKillersPublicos',w.pl.slice(0,10),x=>x.k+' kills','Aún no hay entrenamientos esta semana.');
  }

  document.addEventListener("DOMContentLoaded",async()=>{
    if(!$("trainMain")) return;
    try{
      const {data,error}=await sb.from("entrenamientos_sesiones").select("*").order("fecha",{ascending:false});
      if(error) throw error;
      todas=data||[];
      todas.forEach(s=>{const k=diaLocal(s.fecha); (porFecha[k]=porFecha[k]||[]).push(s);});
      if(todas.length&&!todas.some(s=>diaLocal(s.fecha).startsWith(`${anio}-${String(mes+1).padStart(2,"0")}`))){
        const f=diaLocal(todas[0].fecha); anio=+f.slice(0,4); mes=+f.slice(5,7)-1;
      }
      pintar(); estadisticas(todas);
    }catch(e){console.error(e); $("trainMain").innerHTML="<p>No se pudieron cargar los entrenamientos.</p>";}
  });
})();