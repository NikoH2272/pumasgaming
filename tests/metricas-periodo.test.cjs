const {test}=require('node:test');
const assert=require('node:assert/strict');
const {rango,resumir}=require('../portal-kit/metricas-periodo.js');

test('semana de lunes a domingo y mes bisiesto, con límite exclusivo Colombia',()=>{
  assert.equal(rango('semana','2026-11-15').desde,'2026-11-09');
  assert.equal(rango('semana','2026-11-15').hasta,'2026-11-16');
  assert.equal(rango('mes','2024-02-29').hasta,'2024-03-01');
  assert.equal(rango('semana','2027-01-01').desde,'2026-12-28');
  assert.throws(()=>rango('mes','2026-02-31'),/válida/);
});
const p=rango('semana','2026-11-11');
const sesiones=[{id:'antes',fecha:'2026-11-09T04:59:59Z'},{id:'a',fecha:'2026-11-09T05:00:00Z'},{id:'b',fecha:'2026-11-15T23:00:00Z'},{id:'despues',fecha:'2026-11-16T05:00:00Z'}];
const fila=(sesion_id,numero_sala,equipo_nombre,kills=5)=>({sesion_id,numero_sala,equipo_nombre,kill_score:kills,total_score:12+kills,rank:1});
test('filtra por fecha, cuenta sesiones y salas únicas y normaliza los equipos',()=>{
  const r=resumir({sesiones,salas:[fila('antes',1,'FUERA',999),fila('a',1,'Pumas'),fila('a',1,'Otro'),fila('a',2,' PUMAS '),fila('b',1,'Pumas'),fila('despues',1,'FUERA',999)]},p);
  assert.equal(r.entrenos,2);assert.equal(r.salas,3);assert.equal(r.equipos.length,2);assert.equal(r.kills,20);
  assert.equal(r.participacion[0].entrenos,2);assert.equal(r.participacion[0].salas,3);assert.equal(r.participacion[0].asistencia,100);assert.equal(r.participacion[1].asistencia,50);
  assert.equal(r.participacion[0].pr,Math.round(51/2));
});
test('combina jugadores sin duplicar kills, excluye replay del promedio de daño y exige 3 salas',()=>{
  const killers=[1,2,3].map(()=>({sesion_id:'a',jugador_nombre:'Niko',equipo_nombre:'Pumas',kills:2}));
  const stats=[{sesion_id:'a',sala:1,jugador:'Niko',equipo:'Pumas',kills:2,dano:1000},{sesion_id:'a',sala:2,jugador:'Niko',equipo:'Pumas',kills:2,dano:0,extra:{fuente:'replay'}},{sesion_id:'a',sala:1,jugador:'Nuevo',equipo:'Pumas',kills:4,dano:600}];
  const r=resumir({sesiones,killers,stats:[...stats,stats[0]]},p),n=r.jugadores.find(j=>j.nombre==='Niko');
  assert.equal(n.kills,6);assert.equal(n.salas,3);assert.equal(n.kps,2);assert.equal(n.salasStats,1);assert.equal(n.dps,1000);
  assert.equal(r.rendimiento.length,1);assert.equal(r.killsJugadores.length,2);assert.equal(r.killsJugadores.find(j=>j.nombre==='Nuevo').kills,4);
});
test('periodos vacíos y jugadores sin estadísticas conservan estados honestos',()=>{
  const r=resumir({sesiones:[],salas:[],killers:[],stats:[]},p);assert.equal(r.entrenos,0);assert.equal(r.kills,0);assert.equal(r.rendimiento.length,0);
  const sinStats=resumir({sesiones,killers:[{sesion_id:'a',jugador_nombre:'Niko',kills:3,equipo_nombre:'Pumas'}]},p);
  assert.equal(sinStats.jugadores[0].dps,null);assert.equal(sinStats.conStats,0);
});
