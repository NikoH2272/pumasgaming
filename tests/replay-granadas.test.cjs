const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const Bin = require('../portal-kit/replay-bin.js');
const A=16777217, B=33554433, TEAM=16777218;
function vars(values) { return values.flatMap(n=>{const out=[];do {let b=n%128;n=Math.floor(n/128);if(n)b+=128;out.push(b);}while(n);return out;}); }
function packet(type,values) {const data=Buffer.from(vars(values)),header=Buffer.alloc(10);header.writeFloatLE(10,1);header.writeUInt16LE(type,6);header.writeUInt16LE(data.length,8);return Buffer.concat([header,data]);}
function sample(){return Bin.leer(Buffer.concat([
 ...[A,B,TEAM].map(p=>packet(101,[100000000+p,0,p,0])),
 packet(106,[A,B,100,20,601*2,0,0,0]),
 packet(106,[A,77,40,0,601*2,0,0,0]),
 packet(106,[A,TEAM,10,0,601*2,0,0,0]),
 packet(106,[A,A,300,0,601*2,0,0,0]),
 packet(106,[A,B,25,0,608*2,0,0,0]),
 packet(106,[A,B,30,0,999*2,0,0,0]),
 packet(106,[A,B,15,0,6*2,0,0,2]),
 packet(106,[A,B,12,0,182*2,0,0,0])
]));}
function completos(learned={}){const context={window:{},localStorage:{getItem:()=>JSON.stringify(learned)},console};vm.createContext(context);vm.runInContext(fs.readFileSync(require.resolve('../portal-kit/completos.js'),'utf8'),context);return context.window.PumasCompletos;}
test('BIN separa daño rival, objetos y aliados sin sumar daño propio ni cambiar totales',()=>{
 const j=sample().jugadores.get(A);
 assert.equal(j.dano,252);assert.equal(j.danoJug,202);
 assert.deepEqual(j.danoPorArma[601],{dano:170,danoJug:120,eventos:3});
 assert.equal(j.danoPorArma[608].dano,25);assert.equal(j.danoPorArma[999].dano,30);
 assert.equal(j.impactos,1);assert.equal(j.armas[601],170);
});
test('BIN cuenta granadas lanzadas sin las esquirlas y la kill por el arma del último impacto',()=>{
 const pos=[0,0,0,0,0,0];
 const b=Bin.leer(Buffer.concat([
  ...[A,B].map(p=>packet(101,[100000000+p,0,p,0])),
  packet(160,[1,601,13002,...pos,A]),            // lanzamiento
  packet(160,[2,601,0,...pos,A]),                // esquirla: no cuenta
  packet(160,[3,601,0,...pos,A]),
  packet(160,[4,608,13003,...pos,A]),            // Flash Freeze
  packet(160,[5,624,13004,...pos,B]),            // granada tipo 2 de otro jugador
  packet(106,[A,B,50,0,6*2,0,0,2]),              // le pega con arma 6…
  packet(106,[A,B,120,0,601*2,0,0,0]),           // …y lo remata con granada
  packet(107,[B,A])
 ]));
 const a=b.jugadores.get(A);
 assert.deepEqual(a.lanzadas,{601:1,608:1});assert.deepEqual(b.jugadores.get(B).lanzadas,{624:1});
 assert.deepEqual(a.killsArma,{601:1});assert.equal(a.kills,1);
 const C=completos();assert.equal(C.tipoGranada(624),'Granada de dragón');
 const s={sala:1,fuente:'bin',jugadores:[{pid:A,account_id:'1',jugador:'A',equipo:'Pumas',armas:[],extra:{}},{pid:B,account_id:'2',jugador:'B',equipo:'Otro',armas:[],extra:{}}]};
 C.aplicarBin(s,b);
 const t=C.tablasGranadas(C.salasDesdeBD(C.filasBD([s])))[0], col=n=>t.cab.indexOf(n);
 const exp=t.filas.find(f=>f[0]==='Granada explosiva');
 assert.equal(exp[col('LANZADAS')],1);assert.equal(exp[col('KILLS')],1);
 assert.equal(t.filas.find(f=>f[0]==='Granada de dragón')[col('LANZADAS')],1);
});
test('identifica tipos comprobados o aprendidos sin confundir lanzadores o IDs desconocidos',()=>{
 const C=completos({999:'Flame_Grenade'});
 assert.equal(C.tipoGranada(601),'Granada explosiva');assert.equal(C.tipoGranada(608),'Granada de hielo');
 assert.equal(C.tipoGranada(999),'Granada incendiaria');assert.equal(C.tipoGranada(182),'');assert.equal(C.tipoGranada(6),'');assert.equal(C.tipoGranada(888),'');
});
test('combina CSV y BIN preservando daño oficial, guarda desglose y lo recupera sin duplicar',()=>{
 const C=completos(), b=sample();
 const s={sala:1,fuente:'csv',jugadores:[{pid:A,account_id:'',jugador:'Jugador',equipo:'Pumas',dano:999,armas:[],extra:{}}]};
 C.aplicarBin(s,b);assert.equal(s.jugadores[0].dano,999);
 const filas=C.filasBD([s]);assert.equal(filas[0].extra.bin.danoPorArma[601].danoJug,120);
 const restored=C.salasDesdeBD(filas);const tables=C.tablasGranadas(restored);
 assert.equal(tables.length,2);assert.equal(tables[0].filas.length,2);
 assert.equal(tables[0].filas[0][0],'Granada explosiva');assert.equal(tables[0].filas[0][1],'120');
 assert.equal(tables[0].filas[0][2],'170');assert.equal(tables[0].filas[0][4],1);
 assert.equal(C.tablasGranadas([{jugadores:[{extra:{}}]}]).length,0);
});

test('CSV de equipos, jugadores y detalle exporta tipos y daño con columnas alineadas',()=>{
 const C=completos(), b=sample().jugadores.get(A);
 const context={window:{PumasCompletos:C},console};vm.createContext(context);
 const source=fs.readFileSync(require.resolve('../portal-kit/generador-csv.js'),'utf8').replace('window.PumasGenerador = { montar };','window.PumasGenerador = { montar, filasEquipos, filasJugadores, filasDetalle, setDatos: d => gen=d };');
 vm.runInContext(source,context);const G=context.window.PumasGenerador;
 const e={nombre:'Pumas',salas:1,booyahs:0,kills:0,rankPts:0,porSala:{},posSala:{},total:0,fuentes:new Set(),nVivo:0,bin:b,suma:{}};
 const j={jugador:'A',id:'1',equipo:'Pumas',salas:1,porSala:{},kills:0,booyahs:0,vivo:0,salasBin:1,bin:b,armasBin:{GRENADE:170}};
 const d={sala:1,partida:'123',equipo:'Pumas',jugador:'A',id:'1',vivo:0,b};
 G.setDatos({numSalas:1,conBin:true,conCsv:false,conReplay:false,conHab:false,equipos:[e],jugadores:[j],detalle:[d]});
 for(const f of [G.filasEquipos,G.filasJugadores,G.filasDetalle]){
   const t=f(), row=t.filas[0];assert.equal(row.length,t.cab.length);
   assert.equal(row[t.cab.indexOf('DAÑO CON GRANADAS')],195);
   assert.equal(row[t.cab.indexOf('DAÑO CON GRANADAS A RIVALES')],145);
   assert.match(row[t.cab.indexOf('TIPOS DE GRANADA Y DAÑO')],/Granada explosiva: 170 daño \/ 120 a rivales/);
 }
});

test('CSV completo conserva apoyo y ceros al combinar replay, BIN y guardar/recuperar',()=>{
 const C=completos(),b=sample();
 const csv=C.partidaDesdeCSV('nickname,damage,assists,healing_to_teammates,grenade_use,account_id,team_name\nJugador,1500,7,820,4,'+(100000000+A)+',Pumas\nCero,0,0,0,0,999,Pumas');
 const rep={fuente:'replay',jugadores:[{jugador:'Jugador',vivo:300,extra:{levantado:2,distancia:140}}]};
 C.combinar(csv,rep);C.aplicarBin(csv,b);
 const salas=C.salasDesdeBD(C.filasBD([csv]));
 const ctx={window:{PumasCompletos:C}};vm.createContext(ctx);vm.runInContext(fs.readFileSync(require.resolve('../portal-kit/imagenes-resultados.js'),'utf8'),ctx);
 const I=ctx.window.PumasImagenes,tops=I.topsDestacados(salas),d=I.datos(salas);
 assert.equal(tops[0].valor,7);assert.equal(tops[1].campo,'lanzadas');assert.equal(tops[1].valor,4);
 assert.equal(d.jugadores.find(j=>j.jugador==='Jugador').asistencias,7);
 assert.equal(d.jugadores.find(j=>j.jugador==='Jugador').curacion,820);
 assert.equal(d.jugadores.find(j=>j.jugador==='Jugador').granadas,4);
 const cero=I.apoyoJugador(salas[0].jugadores.find(j=>j.jugador==='Cero'),salas[0]);
 assert.equal(cero.curacion,0);assert.equal(cero.granadas,0);assert.equal(cero.asistencias,0);
});

test('columnas CSV ausentes no se convierten en cero confirmado en apoyo',()=>{
 const C=completos(),s=C.partidaDesdeCSV('nickname,damage,account_id,team_name\nSin apoyo,100,1,Pumas');
 const ctx={window:{PumasCompletos:C}};vm.createContext(ctx);vm.runInContext(fs.readFileSync(require.resolve('../portal-kit/imagenes-resultados.js'),'utf8'),ctx);
 const apoyo=ctx.window.PumasImagenes.apoyoJugador(s.jugadores[0],s);
 assert.equal(apoyo.asistencias,null);assert.equal(apoyo.curacion,null);assert.equal(apoyo.granadas,null);
});
