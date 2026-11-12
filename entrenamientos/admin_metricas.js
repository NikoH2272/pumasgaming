/* Resúmenes de Instagram: lectura por periodo, carrusel 4:5 y texto editable. */
(function(){
  const $=id=>document.getElementById(id),M=window.PumasMetricas;
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmt=n=>Math.round(n||0).toLocaleString('es-CO'),decimal=n=>Number(n||0).toLocaleString('es-CO',{minimumFractionDigits:2,maximumFractionDigits:2});
  let imagenes=[],vista=0,ocupado=false;
  const estado=(texto,error=false)=>{const e=$('metricasEstado');e.textContent=texto;e.classList.toggle('error',error);};
  const periodo=()=>M.rango($('metricasPeriodo').value,$('metricasFecha').value);
  function fechas(){
    try{const p=periodo();$('metricasRango').textContent=p.etiqueta+' · Hora Colombia';}
    catch{$('metricasRango').textContent='Selecciona una fecha para calcular el periodo.';}
  }
  function bloquear(on){ocupado=on;['metricasGenerar','metricasPeriodo','metricasFecha','metricasDescargar','metricasTodas','metricasImagen','metricasAnterior','metricasSiguiente'].forEach(id=>$(id).disabled=on);}
  async function paginas(crear){
    const filas=[];
    for(let desde=0;;desde+=1000){const {data,error}=await crear().order('id',{ascending:true}).range(desde,desde+999);if(error)throw error;filas.push(...(data||[]));if(!data||data.length<1000)return filas;}
  }
  async function cargar(p){
    const db=PumasPortal.db();if(!db)throw new Error('No hay conexión con la base de datos. Recarga el panel.');
    const sesiones=await paginas(()=>db.from('entrenamientos_sesiones').select('id,fecha,titulo').gte('fecha',p.inicio).lt('fecha',p.fin));
    const datos={sesiones,salas:[],killers:[],stats:[],aviso:''},ids=sesiones.map(s=>String(s.id));
    for(let i=0;i<ids.length;i+=50){
      const lote=ids.slice(i,i+50);
      const [salas,killers]=await Promise.all([
        paginas(()=>db.from('salas_resultados').select('id,sesion_id,numero_sala,equipo_nombre,rank,kill_score,total_score,es_booyah').in('sesion_id',lote)),
        paginas(()=>db.from('top_killers').select('id,sesion_id,jugador_nombre,equipo_nombre,kills').in('sesion_id',lote))
      ]);datos.salas.push(...salas);datos.killers.push(...killers);
      try{datos.stats.push(...await paginas(()=>db.from('stats_jugadores').select('id,sesion_id,sala,jugador,equipo,kills,dano,headshots,gloo,revividos,derribos,extra').eq('portal','entrenamientos').in('sesion_id',lote)));}
      catch(e){datos.aviso='No se pudieron consultar las estadísticas avanzadas. Se muestran los resultados y kills guardados; daño y otros datos avanzados quedan pendientes.';console.warn('Métricas: estadísticas avanzadas',e);}
    }
    return datos;
  }
  const sub=(a,b)=>`${esc(a)}<span class="pg-sub">${esc(b)}</span>`;
  const nota=t=>`<p class="pg-small" style="font-size:19px;margin-top:22px;line-height:1.55">${esc(t)}</p>`;
  function carrusel(r){
    PumasImagenes.fuentes();
    const p=r.periodo,tipo=p.tipo==='mes'?'MENSUAL':'SEMANAL';
    const opciones={base:'../',meta:{fechaCorta:p.tipo==='mes'?'MES':'SEMANA',encabezado:p.etiqueta,instagram:'pumas.gaming.oficial',logoDev:true},tamTitulo:78};
    const slides=[];
    const hoy=new Date().toLocaleDateString('en-CA',{timeZone:M.ZONA});
    const corte=hoy>=p.desde&&hoy<p.hasta?' Periodo en curso; datos al '+new Date().toLocaleDateString('es-CO',{day:'numeric',month:'short',year:'numeric',timeZone:M.ZONA})+'.':'';
    const agregar=(id,titulo,cuerpo)=>slides.push({id,nombre:`Pumas_${p.tipo}_${p.desde}_${slides.length+1}.png`,titulo,cuerpo});
    const tabla=(cols,rows,opt={})=>PumasImagenes.tabla(cols,rows,{fila:58,fs:30,...opt});
    const seccion=t=>`<h2 class="pg-section" style="font-size:33px;margin-bottom:22px">${esc(t)}</h2>`;
    const primerBoo=[...r.equipos].sort((a,b)=>b.booyahs-a.booyahs||b.kills-a.kills)[0];
    agregar('pgMetricasResumen','RESUMEN '+tipo,`
      <div style="display:grid;grid-template-columns:1fr 1fr;column-gap:62px;row-gap:34px">
        ${[[r.equipos.length,'equipos participaron'],[r.jugadores.length,'jugadores en resultados'],[r.entrenos,'entrenos registrados'],[r.salas,'salas jugadas']].map(([n,t])=>`<div style="padding:14px 0 23px;border-bottom:1px solid #414141"><div class="pg-number" style="font-size:99px;line-height:1;color:#DCCC9C">${fmt(n)}</div><div style="font-size:23px;margin-top:10px;color:#f2f2f2">${t}</div></div>`).join('')}
      </div>
      <div style="display:flex;gap:26px;align-items:baseline;margin-top:36px"><strong class="pg-number" style="font-size:100px;line-height:1">${fmt(r.kills)}</strong><span style="font-size:25px;color:#DCCC9C">kills en el periodo</span></div>
      <div style="margin-top:40px;padding:25px 28px;background:#242424"><div style="font-size:18px;color:#b5b5b5;margin-bottom:12px">MÁS BOOYAHS</div><div class="pg-number" style="font-size:43px;line-height:1.1">${primerBoo&&primerBoo.booyahs?esc(primerBoo.nombre):'Sin booyahs registrados'}</div>${primerBoo&&primerBoo.booyahs?`<p style="font-size:21px;margin-top:12px;color:#DCCC9C">${primerBoo.booyahs} victorias en ${primerBoo.salas} salas</p>`:''}</div>
      ${nota('Resultados guardados del '+p.etiqueta+'. Periodo en hora Colombia.'+corte)}`);
    const lider=r.killsEquipos[0];
    agregar('pgMetricasKills','EQUIPOS CON MÁS KILLS',`
      ${seccion(lider?lider.nombre:'Sin equipos')}
      <div style="display:flex;gap:20px;align-items:baseline;margin-bottom:28px"><strong class="pg-number" style="font-size:85px;color:#DCCC9C;line-height:1">${fmt(lider?lider.kills:0)}</strong><span style="font-size:23px">kills · ${lider?lider.entrenos:0} entrenos · ${lider?lider.salas:0} salas</span></div>
      ${tabla([{t:'#',w:'54px'},{t:'EQUIPO',w:'2.5fr',al:'left'},{t:'ENTRENOS',w:'108px'},{t:'SALAS',w:'84px'},{t:'BOO',w:'76px'},{t:'KILLS',w:'92px'}],r.killsEquipos.slice(0,10).map((e,i)=>[i+1,esc(e.nombre),e.entrenos,e.salas,e.booyahs,e.kills]),{destacar:true})}
      ${nota('Orden por kills totales. BOO = booyahs. No se mezclan resultados de otros periodos.')}`);
    const destacados=r.participacion.slice(0,20);
    const paginasParticipacion=Math.ceil(destacados.length/10);
    for(let i=0;i<paginasParticipacion;i++){
      const filas=destacados.slice(i*10,i*10+10);
      agregar('pgMetricasParticipacion'+i,'TOP 20 · PARTICIPACIÓN',`
        ${seccion('Los 20 con más participación · '+r.entrenos+' entrenos')}
        ${tabla([{t:'#',w:'54px'},{t:'EQUIPO',w:'2.7fr',al:'left'},{t:'ENTRENOS',w:'110px'},{t:'SALAS',w:'92px'},{t:'ASISTENCIA',w:'138px'}],filas.map((e,j)=>[i*10+j+1,esc(e.nombre),e.entrenos,e.salas,Math.round(e.asistencia)+'%']),{fila:55})}
        ${nota('Asistencia = entrenos jugados por el equipo ÷ '+r.entrenos+' entrenos del periodo. Top 20 por entrenos y salas jugadas'+(paginasParticipacion>1?' · Parte '+(i+1)+' de '+paginasParticipacion:'')+'.')}`);
    }
    agregar('pgMetricasJugadores','JUGADORES CON MÁS KILLS',`
      ${seccion('Kills totales y participación')}
      ${tabla([{t:'#',w:'53px'},{t:'JUGADOR / EQUIPO',w:'2.8fr',al:'left'},{t:'ENTRENOS',w:'110px'},{t:'SALAS',w:'90px'},{t:'KILLS',w:'95px'},{t:'K / SALA',w:'105px'}],r.killsJugadores.slice(0,10).map((j,i)=>[i+1,sub(j.nombre,j.equipo),j.entrenos,j.salas,j.kills,decimal(j.kps)]),{fila:65,fs:30,destacar:true})}
      ${nota('Cada jugador se cuenta una vez en el periodo. El total de kills de los equipos se calcula desde los resultados de sala.')}`);
    agregar('pgMetricasRendimiento','RENDIMIENTO DE JUGADORES',`
      ${seccion('Kills por sala · Mínimo 3 salas')}
      ${r.rendimiento.length?tabla([{t:'#',w:'50px'},{t:'JUGADOR / EQUIPO',w:'2.6fr',al:'left'},{t:'SALAS',w:'78px'},{t:'KILLS',w:'82px'},{t:'K / SALA',w:'105px'},{t:'DAÑO / SALA',w:'175px'}],r.rendimiento.slice(0,10).map((j,i)=>[i+1,sub(j.nombre,j.equipo),j.salas,j.kills,decimal(j.kps),j.dps===null?'—':sub(fmt(j.dps),j.salasStats+'/'+j.salas+' salas con datos')]),{fila:65,fs:29,destacar:true}):`<p style="font-family:'Barlow Condensed',sans-serif;font-size:51px;line-height:1.2;margin-top:45px;max-width:700px">Todavía no hay jugadores con 3 salas en este periodo.</p>`}
      ${nota('El daño se promedia solo entre las salas con estadísticas avanzadas disponibles. «—» significa que no hay datos de daño guardados.')}`);
    return slides.map(({cuerpo,...im},i)=>({...im,html:PumasImagenes.plantilla(im.id,{...opciones,titulo:im.titulo,meta:{...opciones.meta,pagina:(i+1)+' / '+slides.length+' · '+tipo}},cuerpo)}));
  }
  function texto(r){
    const p=r.periodo,tipo=p.tipo==='mes'?'MENSUAL':'SEMANAL';
    const lineas=[`PUMAS GAMING | RESUMEN ${tipo}`,p.etiqueta,'',`${r.entrenos} entrenos · ${r.salas} salas`,`${r.equipos.length} equipos · ${r.jugadores.length} jugadores`,`${fmt(r.kills)} kills totales`,'','EQUIPOS CON MÁS KILLS'];
    r.killsEquipos.slice(0,3).forEach((e,i)=>lineas.push(`${i+1}. ${e.nombre}: ${e.kills} kills y ${e.booyahs} ${e.booyahs===1?'booyah':'booyahs'}.`));
    lineas.push('','MÁS PARTICIPACIÓN');r.participacion.slice(0,3).forEach(e=>lineas.push(`${e.nombre}: ${e.entrenos}/${r.entrenos} entrenos, ${e.salas} salas (${Math.round(e.asistencia)}% de asistencia).`));
    lineas.push('','JUGADORES CON MÁS KILLS');r.killsJugadores.slice(0,3).forEach((j,i)=>lineas.push(`${i+1}. ${j.nombre} (${j.equipo}): ${j.kills} kills en ${j.salas} salas.`));
    lineas.push('','RENDIMIENTO · MÍNIMO 3 SALAS');
    if(r.rendimiento.length)r.rendimiento.slice(0,3).forEach(j=>lineas.push(`${j.nombre}: ${decimal(j.kps)} kills/sala en ${j.salas} salas.`));else lineas.push('Aún no hay jugadores con 3 salas en este periodo.');
    if(r.conResultados<r.entrenos)lineas.push('',`Resultados disponibles de ${r.conResultados} de ${r.entrenos} entrenos.`);
    const hoy=new Date().toLocaleDateString('en-CA',{timeZone:M.ZONA});
    if(hoy>=p.desde&&hoy<p.hasta)lineas.push('','Periodo en curso. Corte: '+new Date().toLocaleDateString('es-CO',{day:'numeric',month:'short',year:'numeric',timeZone:M.ZONA})+' (hora Colombia).');
    lineas.push('','Datos guardados en Pumas. Periodo en hora Colombia.','@pumas.gaming.oficial','Dev por proyectn.com','#PumasGaming #FreeFire #EntrenosPumas');
    return lineas.join('\n');
  }
  function ajustar(){if(!$('metricasLienzo'))return;const escala=Math.min(1,$('metricasVista').clientWidth/1080);$('metricasLienzo').style.transform=`scale(${escala})`;$('metricasVista').style.height=1350*escala+'px';}
  function mostrar(i){
    vista=i;$('metricasLienzo').innerHTML=imagenes[i].html;
    $('metricasImagen').value=String(i);
    $('metricasAnterior').disabled=ocupado||i===0;$('metricasSiguiente').disabled=ocupado||i===imagenes.length-1;
    $('metricasVista').setAttribute('aria-label',imagenes[i].titulo);
    $('metricasPagina').textContent=`${i+1} de ${imagenes.length} · ${imagenes[i].titulo} · 1080 × 1350 px`;
    ajustar();
  }
  function render(r){
    imagenes=carrusel(r);vista=0;
    $('metricasCifras').innerHTML=[[r.entrenos,'Entrenos'],[r.salas,'Salas'],[r.equipos.length,'Equipos'],[r.jugadores.length,'Jugadores'],[r.kills,'Kills']].map(([n,t])=>`<div><strong>${fmt(n)}</strong><span>${t}</span></div>`).join('');
    $('metricasImagen').replaceChildren(...imagenes.map((im,i)=>{const op=document.createElement('option');op.value=String(i);op.textContent=(i+1)+'. '+im.titulo.toLocaleLowerCase('es').replace(/^./,c=>c.toUpperCase());if(im.id.startsWith('pgMetricasParticipacion'))op.textContent+=' · Parte '+(Number(im.id.replace('pgMetricasParticipacion',''))+1);return op;}));
    $('metricasTodas').textContent='Descargar carrusel ('+imagenes.length+')';
    $('inputTextoMetricasCopiable').value=texto(r);contarTexto();
    $('metricasParticipantesTitulo').textContent='Top 20 por participación ('+Math.min(20,r.participacion.length)+' de '+r.equipos.length+' equipos)';
    $('metricasParticipantes').innerHTML='<table><thead><tr><th>Equipo</th><th>Entrenos</th><th>Salas</th><th>Asistencia</th><th>Kills</th><th>PR</th></tr></thead><tbody>'+r.participacion.slice(0,20).map(e=>`<tr><td>${esc(e.nombre)}</td><td>${e.entrenos}</td><td>${e.salas}</td><td>${Math.round(e.asistencia)}%</td><td>${e.kills}</td><td>${e.pr}</td></tr>`).join('')+'</tbody></table>';
    $('metricasResultados').hidden=false;mostrar(0);
  }
  function contarTexto(){$('metricasCaracteres').textContent=$('inputTextoMetricasCopiable').value.length+' caracteres';}
  async function generar(){
    if(ocupado)return;let p;try{p=periodo();}catch(e){estado(e.message,true);return;}
    bloquear(true);$('metricasResultados').hidden=true;$('metricasPNG').hidden=true;estado('Consultando los entrenamientos de '+p.etiqueta+'…');
    try{
      const datos=await cargar(p),r=M.resumir(datos,p);
      if(!r.entrenos){estado('No hay entrenamientos en este periodo. Elige otra fecha y vuelve a generar.');return;}
      if(!r.equipos.length){estado(`Hay ${r.entrenos} entrenos, pero todavía no tienen resultados de equipos guardados. Consulta o carga los resultados antes de generar el carrusel.`);return;}
      render(r);
      const notas=[`${imagenes.length} imágenes listas · ${p.etiqueta}.`];
      if(r.conResultados<r.entrenos)notas.push(`Resultados disponibles de ${r.conResultados} de ${r.entrenos} entrenos; la asistencia usa todos los entrenos registrados.`);
      if(datos.aviso)notas.push(datos.aviso);else notas.push(`Estadísticas avanzadas en ${r.conStats} de ${r.entrenos} entrenos.`);
      estado(notas.join(' '));
    }catch(e){console.error('Métricas del periodo',e);estado('No se pudo generar el resumen: '+(e.message||'Error de conexión')+'. Revisa la conexión y vuelve a intentarlo.',true);}
    finally{bloquear(false);if(imagenes.length){$('metricasAnterior').disabled=vista===0;$('metricasSiguiente').disabled=vista===imagenes.length-1;}}
  }
  async function descargar(todas){
    if(ocupado||!imagenes.length)return;const anterior=vista;bloquear(true);
    try{for(const i of todas?imagenes.map((_,j)=>j):[vista]){mostrar(i);estado('Exportando '+imagenes[i].titulo+'…');const png=await PumasImagenes.descargar(imagenes[i].id,imagenes[i].nombre);$('metricasPNG').href=png;$('metricasPNG').download=imagenes[i].nombre;$('metricasPNG').textContent='Guardar PNG: '+imagenes[i].titulo.toLocaleLowerCase('es');$('metricasPNG').hidden=false;}estado(todas?'Carrusel generado. Si el navegador lo solicita, permite las descargas múltiples.':'Imagen generada en PNG.');}
    catch(e){estado('No se pudo descargar: '+e.message,true);}finally{bloquear(false);mostrar(anterior);}
  }
  async function copiar(){const t=$('inputTextoMetricasCopiable');try{await navigator.clipboard.writeText(t.value);estado('Texto copiado.');}catch{t.focus();t.select();estado('Seleccioné el texto. Usa Ctrl+C para copiarlo.');}}
  function iniciar(){
    if(!$('metricasGenerar'))return;
    $('metricasFecha').value=new Date().toLocaleDateString('en-CA',{timeZone:M.ZONA});fechas();
    ['metricasFecha','metricasPeriodo'].forEach(id=>$(id).addEventListener('change',()=>{fechas();$('metricasResultados').hidden=true;$('metricasPNG').hidden=true;imagenes=[];estado('Periodo cambiado. Pulsa «Generar resumen» para consultar sus resultados.');}));
    $('metricasImagen').onchange=()=>mostrar(Number($('metricasImagen').value));$('metricasAnterior').onclick=()=>mostrar(Math.max(0,vista-1));$('metricasSiguiente').onclick=()=>mostrar(Math.min(imagenes.length-1,vista+1));
    $('metricasGenerar').onclick=generar;$('metricasDescargar').onclick=()=>descargar(false);$('metricasTodas').onclick=()=>descargar(true);$('metricasCopiar').onclick=copiar;$('inputTextoMetricasCopiable').oninput=contarTexto;
    new ResizeObserver(ajustar).observe($('metricasVista'));
  }
  window.PumasMetricasAdmin={generar,carrusel,texto};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',iniciar);else iniciar();
})();
