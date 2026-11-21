const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function api(){const ctx={window:{PumasCompletos:{tipoGranada:id=>[601,608].includes(+id)?'Granada':''}}};vm.createContext(ctx);vm.runInContext(fs.readFileSync(require.resolve('../portal-kit/imagenes-resultados.js'),'utf8'),ctx);return ctx.window.PumasImagenes;}
test('siete destacados acumulan apoyo, maximizan distancia y suman todos los tipos de granada sin duplicar daño',()=>{
 const I=api(),j={jugador:'Uno',account_id:'11',equipo:'Pumas',asistencias:4,revividos:3,dano:1000,extra:{curacion:200,distancia:150,levantadoCsv:2,bin:{reanimo:3,revivido:2,lanzadas:{601:2,608:1,617:5},danoPorArma:{601:{dano:900,danoJug:300},608:{dano:200,danoJug:100},6:{dano:500,danoJug:500}}}}};
 const salas=[{fuente:'csv',jugadores:[j]},{fuente:'csv',jugadores:[{...j,dano:800,extra:{curacion:50,distancia:120,levantadoCsv:1,bin:{reanimo:1,revivido:1,danoPorArma:{601:{dano:80,danoJug:80}}}}}]}];
 const tops=I.topsDestacados(salas);assert.equal(tops.length,7);
 assert.deepEqual(Array.from(tops,t=>t.campo),['asistencias','lanzadas','dano','distancia','granadas','reanimo','levantado']);
 assert.deepEqual(Array.from(tops,t=>t.valor),[8,3,1800,150,480,4,3]);   // lanzadas: 601+608, no el lanzable 617
});
test('sin asistencias ni granadas en el BIN no inventa líderes con ceros',()=>{
 const tops=api().topsDestacados([{fuente:'bin',jugadores:[{jugador:'A',dano:200,asistencias:0,revividos:0,extra:{bin:{reanimo:0,revivido:0,danoPorArma:{}}}}]}]);
 assert.equal(tops[0].salas,0);assert.equal(tops[1].salas,0);assert.equal(tops[2].valor,200);
 assert.equal(tops[5].salas,1);assert.equal(tops[5].jugador,'');assert.equal(tops[4].jugador,'');
});
test('empates reconocidos y nombres Unicode no se combinan por pérdida de caracteres',()=>{
 const tops=api().topsDestacados([{fuente:'csv',jugadores:[{jugador:'龍',dano:80},{jugador:'虎',dano:80}]}]);
 assert.equal(tops[2].empates,2);assert.equal(tops[2].valor,80);
});
test('sin .csv toma las asistencias estimadas y las granadas lanzadas del BIN',()=>{
 const tops=api().topsDestacados([{fuente:'bin',jugadores:[{jugador:'A',dano:200,extra:{bin:{asistencias:2,lanzadas:{601:3,624:1},reanimo:0,revivido:0,danoPorArma:{}}}},{jugador:'B',dano:100,extra:{bin:{asistencias:1,lanzadas:{},reanimo:0,revivido:0,danoPorArma:{}}}}]}]);
 assert.equal(tops[0].jugador,'A');assert.equal(tops[0].valor,2);
 assert.equal(tops[1].jugador,'A');assert.equal(tops[1].valor,3);   // el stub solo reconoce 601 y 608
});
