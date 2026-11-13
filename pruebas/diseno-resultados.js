/* Laboratorio local. Datos ficticios, sin login, API ni escrituras en la base. */
(() => {
  const $ = id => document.getElementById(id);
  const equipos = ['AXE GAMING','M-19 ESPORTS','WASTED FFLA','PUMAS SPARRING','TRIOLOGY','KRAKEN ESPORT','LUKAS GAMER','INTI ESPORTS','NVO ESPORT','RAGNAR FURY','AVIGAL ACDM','VITALITYX','TICOS ESPORT','HAVOK SPORT','V4NDALS GOLD','REIGN'];
  let imagenes = [], seleccion = 0, ocupado = false;
  function datosDemo() {
    const nombres = equipos.slice(0, Number($('equipos').value)).map((n,i)=>$('largos').checked?n+' ACADEMY INTERNACIONAL '+(i+1):n);
    return Array.from({length:Number($('salas').value)},(_,s)=>({
      ...(()=>{const id=[1,3,22,4,29,1][s],z=(window.ZONAS_DEMO||{})[id];return z?{mapa:id,duracion:z.dur,zonas:z.zonas,bajasPos:z.bajas.map(([t,x,zz,ax,az])=>({t,x,z:zz,ax,az}))}:{mapa:s%3+1,duracion:1190+s*17};})(),
      sala:s+1,etiqueta:'S'+(s+1),fuente:$('sinDano').checked?'replay':'bin',
      eliminados:nombres.slice().reverse().map((equipo,i,l)=>({equipo,tiempo:Math.round(110+i*(880/l.length))})),
      primeraSangre:{jugador:['AX.Smoking','M19.Gomez','WAT.Willy','PG.Anyer','TRI.Diego','KRA.Nova'][s],victima:'Rival de prueba',arma:['M1887','SCAR','MP40','UMP','AWM','M4A1'][s],tiempo:43+s*11},
      jugadores:nombres.flatMap((equipo,t)=>Array.from({length:4},(_,p)=>{
        const kills=t<6?Math.max(0,4-Math.floor(t/2)-p+s%2):0;
        const dano=Math.max(200,2600-t*105-p*210+s*91);
        return {account_id:t*4+p+1,jugador:(t===0?['AX.Smoking','AX.Papoi','AX.Renzo','AX.Mateo'][p]:equipo.split(' ')[0]+'.'+['Gomez','Sosa7','Kairi','Zeus'][p])+($('largos').checked?'_NombreLargoDePrueba':''),equipo,kills,dano,headshots:Math.max(0,12-t-p),gloo:12+t%4+p,hits:85-t-p,derribos:Math.max(0,9-t-p),revividos:p%2,vivo:Math.max(80,1170-t*45-p*8),booyah:t===s%5,
          extra:{primeraSangre:t===s&&p===0,fin:t<5&&p===0&&kills>=3?1:0,vs:{[nombres[(t+3)%nombres.length]]:kills},bin:{derribos:Math.max(0,9-t-p)}},armas:[{n:['M1887','SCAR','MP40','UMP'][p],k:kills,d:dano}]};
      }))
    }));
  }
  function ajustar() {
    const escala=Math.min(1,$('stage').clientWidth/1080);
    $('canvas').style.transform=`scale(${escala})`;
    $('stage').style.height=1350*escala+'px';
  }
  function mostrar(i) {
    seleccion=i;
    $('canvas').innerHTML=imagenes[i].html;
    $('tabs').querySelectorAll('button').forEach((b,n)=>{b.setAttribute('aria-selected',String(n===i));b.tabIndex=n===i?0:-1;});
    $('stage').setAttribute('aria-labelledby','imagen-tab-'+i);
    $('meta').textContent=`${i+1} de ${imagenes.length} · ${imagenes[i].titulo} · 1080 × 1350 px · Datos de prueba`;
    ajustar();
  }
  function generar() {
    if(ocupado)return;
    imagenes=PumasImagenes.generar({salas:datosDemo(),r:{},meta:{fecha:$('fecha').value.replace('T',' '),moderador:$('moderador').value,instagram:$('instagram').value.replace(/^@/,''),demo:true,encabezado:'Entreno de prueba · Free Fire'},base:'../'});
    seleccion=Math.min(seleccion,imagenes.length-1);
    $('tabs').replaceChildren(...imagenes.map((im,i)=>{
      const b=document.createElement('button');b.type='button';b.id='imagen-tab-'+i;b.setAttribute('role','tab');b.setAttribute('aria-controls','stage');b.textContent=im.titulo;b.onclick=()=>mostrar(i);
      b.onkeydown=e=>{let next=i;if(e.key==='ArrowRight')next=(i+1)%imagenes.length;else if(e.key==='ArrowLeft')next=(i+imagenes.length-1)%imagenes.length;else if(e.key==='Home')next=0;else if(e.key==='End')next=imagenes.length-1;else return;e.preventDefault();mostrar(next);$('tabs').children[next].focus();};return b;
    }));
    $('descargarTodas').textContent=`Descargar todas (${imagenes.length})`;$('descargarSel').innerHTML=`Descargar seleccionadas (<span data-pg-cuenta>${imagenes.length}</span>)`;
    $('estado').textContent='';mostrar(seleccion);
    const sel=$('estiloImg');if(sel){sel.innerHTML=PumasImagenes.selectorHTML()+'<div style="margin-top:10px">'+PumasImagenes.selectorDescargaHTML(imagenes)+'</div>';PumasImagenes.enlazarSelector(sel,generar);PumasImagenes.enlazarDescarga(document.body,imagenes);}
  }
  function bloquear(on) {
    ocupado=on;
    document.querySelectorAll('button,input,select').forEach(e=>e.disabled=on);
  }
  async function descargar(todas,soloMarcadas) {
    if(ocupado)return;
    const anterior=seleccion;bloquear(true);
    try {
      const indices=soloMarcadas?PumasImagenes.paraDescargar(imagenes):todas?imagenes.map((_,i)=>i):[seleccion];
      for(const i of indices){mostrar(i);$('estado').textContent=`Exportando ${imagenes[i].titulo}…`;await PumasImagenes.descargar(imagenes[i].id,imagenes[i].nombre);}
      $('estado').textContent=todas?'Imágenes generadas. Si el navegador lo solicita, permite las descargas múltiples.':'Imagen generada en PNG.';
    } catch(e){$('estado').textContent='No se pudo descargar: '+e.message;}
    finally{mostrar(anterior);bloquear(false);}
  }
  ['salas','equipos','fecha','moderador','instagram','largos','sinDano'].forEach(id=>$(id).addEventListener('change',generar));
  $('descargar').onclick=()=>descargar(false);$('descargarTodas').onclick=()=>descargar(true);$('descargarSel').onclick=()=>descargar(true,true);$('recargar').onclick=()=>location.reload();
  new ResizeObserver(ajustar).observe($('stage'));
  generar();
})();
