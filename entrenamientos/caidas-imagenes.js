/* Exportaciones 4:5 de las asignaciones. Comparte marca y lienzo con los resultados. */
(() => {
    const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const norm = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().trim();
    const colores = ['#ff8a8d','#8cc8ff','#ffcf88','#dda0ff','#8ce8e1','#ff9ad6','#c8ed86','#ffa967'];
    function generar(filas, opciones = {}) {
        const I = window.PumasImagenes, C = window.PumasCaidas;
        const estilo = opciones.estilo || I.estilo, T = I.TEMAS[estilo] || I.TEMAS.pumas;
        const base = opciones.base || '../', reglas = opciones.reglas || {}, logos = opciones.logos || [];
        const usadas = filas.map((f,i) => ({...f, numero:i+1, logo:logos[i]})).filter(f => f.equipo.trim());
        if (!usadas.length) return [];
        const F = "'Barlow Condensed',sans-serif";
        const clashes = C.MAPAS.map((_,j) => {
            const counts = new Map(), colors = new Map();
            usadas.forEach(f => { const k=norm(f.caidas[j]); if(k) counts.set(k,(counts.get(k)||0)+1); });
            counts.forEach((n,k)=>{if(n>1) colors.set(k,colores[colors.size%colores.length]);});return colors;
        });
        const rules = [reglas.pelea ? `Pelea de caída: <b>${reglas.pelea==='SI'?'SÍ':'NO'}</b>` : '', reglas.zonas ? `Zonas marcadas: <b>${esc(reglas.zonas)}</b>` : ''].filter(Boolean).join(' &nbsp; · &nbsp; ');
        const banda = `<div style="padding:13px 18px;background:${T.fila2};font-size:18px;margin-bottom:18px;min-height:48px">${rules || 'Respetar las caídas asignadas'}${reglas.extra?`<div style="margin-top:6px;font-size:16px;overflow-wrap:anywhere">${esc(reglas.extra)}</div>`:''}</div>`;
        const poster = (id,titulo,sub,cuerpo) => {
            return I.plantilla(id,{estilo,base,titulo,logo:opciones.logo,tamTitulo:80,subtitulo:sub,meta:{encabezado:opciones.titulo, demo:opciones.demo, pagina:'ASIGNACIÓN DE CAÍDAS'}},cuerpo);
        };
        const rows=usadas.map((f,i)=>`<tr style="background:${i%2?T.fila2:T.fila1}"><td style="color:${T.acento};text-align:center">${f.numero}</td><td style="padding:0 8px;font:700 23px/1.05 ${F};overflow-wrap:anywhere">${f.logo?`<img src="${esc(f.logo)}" alt="" style="width:24px;height:24px;object-fit:contain;vertical-align:middle;margin-right:5px">`:''}${esc(f.equipo)}</td>${C.MAPAS.map((_,j)=>`<td style="padding:3px 8px;overflow-wrap:anywhere;color:${clashes[j].get(norm(f.caidas[j])) || T.piel}">${esc(f.caidas[j] || 'Sin asignar')}</td>`).join('')}</tr>`).join('');
        const table=`<table style="border-collapse:separate;border-spacing:0 3px;width:100%;table-layout:fixed;font:600 22px/1.05 ${F}"><colgroup><col style="width:4%"><col style="width:21%">${C.MAPAS.map(()=>'<col style="width:15%">').join('')}</colgroup><thead><tr style="height:38px;text-align:left;color:${T.gris};font:700 15px ${F}"><th>#</th><th>EQUIPO</th>${C.MAPAS.map(m=>`<th>${m}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table>`;
        const rowHeight=usadas.length>12?43:51;
        const tabla=poster('pgCaidasTabla','CAÍDAS OFICIALES',opciones.titulo || `${usadas.length} equipos · Asignación de aterrizaje por mapa`,`${banda}<style>#pgCaidasTabla tbody tr{height:${rowHeight}px}</style>${table}<p style="font-size:16px;color:${T.gris};margin-top:18px">Ubicaciones compartidas: mismo color en la misma columna. Vacío: sin asignar.</p>`);
        const resultado=[{id:'pgCaidasTabla',nombre:'Caidas_Tabla.png',titulo:'Tabla general',tipo:'tabla',html:tabla}];
        C.MAPAS.forEach((mapa,j)=>{
            const enSpot=nombre=>usadas.filter(f=>norm(f.caidas[j])===norm(nombre));
            const colorSpot=nombre=>{const f=enSpot(nombre)[0];return f&&norm(nombre)?C.COLORES_SPOT[(f.numero-1)%C.COLORES_SPOT.length]:T.acento;};
            const archivo=['bermuda','purgatorio','nexterra','kalahari','solara'][j];
            const coords=nombre=>Object.entries(C.COORDENADAS[mapa]).find(([k])=>norm(k)===norm(nombre))?.[1];
            const pins=usadas.map(f=>{
                const c=coords(f.caidas[j]);if(!c)return '';
                const grupo=usadas.filter(x=>norm(x.caidas[j])===norm(f.caidas[j]));
                const angle=grupo.indexOf(f)/grupo.length*2*Math.PI-Math.PI/2;
                const x=c[0]+(grupo.length>1?Math.cos(angle)*3.5:0),y=c[1]+(grupo.length>1?Math.sin(angle)*3.5:0);
                const color=colorSpot(f.caidas[j]);
                return `<div style="position:absolute;left:${x}%;top:${y}%;transform:translate(-50%,-50%);width:38px;height:38px;border-radius:50%;border:3px solid #111;background:${color};color:#111;text-align:center;font:800 20px/32px ${F};overflow:hidden">${f.logo?`<img src="${esc(f.logo)}" alt="" style="width:100%;height:100%;object-fit:cover">`:f.numero}</div>`;
            }).join('');
            const arsenales=reglas.pelea==='NO'?Object.entries(C.ARSENALES[mapa]).filter(([k])=>enSpot(k).length).map(([k,c])=>`<div style="position:absolute;left:${c[0]}%;top:${c[1]}%;transform:translate(-50%,-50%);background:${colorSpot(k)};color:#111;border:3px solid #111;border-radius:5px;padding:2px 6px;font:800 18px/1.1 ${F};white-space:nowrap">A ${enSpot(k).map(f=>f.numero).join('·')}</div>`).join(''):'';
            const listado=usadas.map(f=>`<div style="height:${usadas.length>12?45:55}px;padding:5px 0;border-bottom:1px solid ${T.linea};overflow:hidden"><div style="font:700 24px/1.05 ${F};white-space:nowrap;overflow:hidden;text-overflow:ellipsis"><b style="display:inline-block;min-width:28px;text-align:center;border-radius:5px;background:${colorSpot(f.caidas[j])};color:#111;margin-right:9px">${f.numero}</b>${esc(f.equipo)}</div><div style="font-size:14px;color:${T.gris};margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(f.caidas[j] || 'Sin asignar')}${f.caidas[j]&&!coords(f.caidas[j])?' · sin coordenadas':''}</div></div>`).join('');
            const id='pgCaidasMapa'+j;
            resultado.push({id,nombre:`Caidas_${archivo}.png`,titulo:mapa,tipo:'mapa',html:poster(id,'MAPA DE CAÍDAS',opciones.titulo || `${mapa} · ${usadas.length} equipos`,`${banda}<div style="display:flex;justify-content:space-between;padding:10px 16px;background:${T.acento};color:${T.sobre};font:800 29px ${F};margin-bottom:18px"><span>${mapa}</span><span>SALA ${j+1}</span></div><div style="display:flex;gap:24px;align-items:flex-start"><div style="position:relative;flex:0 0 650px;width:650px;height:650px;overflow:hidden;background:#111"><img src="${esc(base)}imagenes/mapas/${archivo}.png" alt="${mapa}" style="width:650px;height:650px;max-width:none;filter:brightness(.75) saturate(.65)">${pins}${arsenales}</div><div style="width:302px;min-width:0">${listado}</div></div><p style="font-size:16px;color:${T.gris};margin-top:18px">Número = equipo · mismo color = mismo spot${reglas.pelea==='NO'?' · A + número = arsenal de ese equipo':''}.</p>`)});
        });
        return resultado;
    }
    window.PumasCaidasImagenes={generar};
})();
