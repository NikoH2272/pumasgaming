/* =====================================================================
   PUMAS GAMING · Lector del replay .bin (ReplayInfo_<partida>_<fecha>.bin)
   El .bin es la grabación de red de la sala: paquetes
     [u8 0][f32 tiempo][u8 canal][u16 tipo][u16 largo][datos (varints)]
   De ahí salen, por PlayerID (el mismo del .json):
     101 → ficha del jugador (account_id, PlayerID, nick)
     106 → cada impacto: atacante, víctima, daño, daño extra, arma×2, parte del cuerpo (1 cabeza · 2 torso · 3 piernas)
     139 → derribo (víctima, atacante) · 221 → pared gloo colocada · 393 → reanimación (quien levanta, a quien)
     250 → habilidad activa: [PlayerID, habilidad, estado (2 lista · 1 la usa · 4 recarga)…]
           la ficha 101 lleva las 4 habilidades equipadas ([8, h1, h2, h3, h4], terminan en 06)
     117 → zona segura: fase, círculo actual (zz x·1000, zz z·1000, radio), círculo siguiente, estado
           (1 anunciada · 2 cerrando · 6/7 la última, que se mueve) y duración (zz fin − zz inicio) / 500
   Comprobado contra los .csv de resultados completos (6 salas, 241 jugadores):
     paredes gloo, veces revivido, veces derribado, impactos a las piernas: exactos; headshots 240/241;
     daño por arma 1181/1202 (el total puede variar unos puntos del oficial);
     habilidades equipadas y habilidad activa 241/241; veces que usó la activa 237/241.
   Uso: PumasBin.leer(arrayBuffer) → { jugadores: Map(PlayerID → stats), cuentas: Map(account_id → PlayerID) }
   ===================================================================== */
(function (raiz) {
    const T_JUGADOR = 101, T_IMPACTO = 106, T_KILL = 107, T_ZONA = 117, T_DERRIBO = 139, T_GLOO = 221, T_EQUIPOS = 306, T_REANIMA = 393, T_HABILIDAD = 250;
    const QUIERO = new Set([T_JUGADOR, T_IMPACTO, T_KILL, T_ZONA, T_DERRIBO, T_GLOO, T_EQUIPOS, T_REANIMA, T_HABILIDAD]);
    const zz = n => n % 2 ? -(n + 1) / 2 : n / 2;

    // Mensajes 117 → { inicial: {x, z, r}, fases: [{ fase, anuncia, inicio, fin, x, z, r, movil }] } (coordenadas del mundo, metros)
    function zonasDe(msgs) {
        const fases = [];
        msgs.forEach(m => {
            if (![1, 6].includes(m.estado) || !m.sig.r) return;
            const c = msgs.find(x => [2, 7].includes(x.estado) && x.t > m.t && x.fase === m.fase);
            fases.push({ fase: fases.length + 1, anuncia: Math.round(m.t), inicio: Math.round(c ? c.t : m.t + m.dur), fin: Math.round(c ? c.t + c.dur : m.t + m.dur),
                x: m.sig.x, z: m.sig.z, r: m.sig.r, movil: m.estado === 6 });
        });
        const ini = msgs.find(m => m.act.r);
        return fases.length ? { inicial: ini ? ini.act : null, fases } : null;
    }
    const bytesVarint = n => { const o = []; do { let b = n % 128; n = Math.floor(n / 128); if (n) b |= 0x80; o.push(b); } while (n); return o; };
    const contiene = (u8, pat) => {
        outer: for (let i = 0; i + pat.length <= u8.length; i++) { for (let k = 0; k < pat.length; k++) if (u8[i + k] !== pat[k]) continue outer; return true; }
        return false;
    };

    // Varints de hasta 53 bits sin operaciones de bits (los account_id pasan de 32 bits)
    function varints(u8, ini, fin, max) {
        const out = [];
        let p = ini;
        while (p < fin && out.length < max) {
            let n = 0, mul = 1, c;
            do { c = u8[p++]; n += (c & 0x7f) * mul; mul *= 128; } while (c >= 0x80 && p < fin);
            out.push(n);
        }
        return out;
    }
    const texto = (u8, ini, fin) => { try { return new TextDecoder('utf-8').decode(u8.subarray(ini, fin)); } catch (e) { return ''; } };
    const escuadra = pid => Math.floor(pid / 16777216);

    function nuevo(pid) {
        return { pid, account_id: '', nick: '', equipo: '', tag: '', kills: 0, dano: 0, danoJug: 0, impactos: 0, hs: 0, torso: 0, piernas: 0,
            gloo: 0, reanimo: 0, revivido: 0, derribos: 0, derribado: 0, armas: {},
            activa: 0, usos: 0, usosPor: {}, habilidades: [] };
    }

    function leer(buffer) {
        const u8 = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
        const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
        const jug = new Map(), cuentas = new Map(), nombres = new Map(), clanes = new Map(), fichas = [];
        const J = pid => { let j = jug.get(pid); if (!j) { j = nuevo(pid); jug.set(pid, j); } return j; };
        const impactos = [], zonaMsgs = [];
        let p = 0, paquetes = 0, ultimo = 0;
        while (p + 10 <= u8.length) {
            const tipo = dv.getUint16(p + 6, true), largo = dv.getUint16(p + 8, true);
            const ini = p + 10, fin = ini + largo;
            if (fin > u8.length) break;
            paquetes++; ultimo = dv.getFloat32(p + 1, true);
            if (QUIERO.has(tipo) && largo) {
                if (tipo === T_JUGADOR) {
                    // account_id, 0, PlayerID, largo del nick ×2, nick (utf-8)
                    const v = varints(u8, ini, fin, 3);
                    let q = ini, k = 0;
                    while (k < 3 && q < fin) { if (u8[q++] < 0x80) k++; }
                    const l = Math.floor((varints(u8, q, fin, 1)[0] || 0) / 2);
                    while (q < fin && u8[q] >= 0x80) q++;
                    q++;
                    if (v.length === 3 && v[2] >= 16777216) {
                        cuentas.set(String(v[0]), v[2]);
                        nombres.set(v[2], texto(u8, q, Math.min(fin, q + l)));
                        const j = J(v[2]); j.account_id = String(v[0]); j.nick = nombres.get(v[2]);
                        fichas.push([v[2], u8.subarray(ini, fin)]);
                    }
                } else if (tipo === T_EQUIPOS && !clanes.size) {
                    // Equipos de la sala: n×2, y por equipo [orden, puntos, ?, nombre, tag, id del clan]
                    let q = ini;
                    const uno = () => { const r = varints(u8, q, fin, 1); while (q < fin && u8[q] >= 0x80) q++; q++; return r[0] || 0; };
                    const cad = () => { const l = Math.floor(uno() / 2), t = texto(u8, q, Math.min(fin, q + l)); q += l; return t; };
                    const n = Math.floor(uno() / 2);
                    for (let i = 0; i < n && q < fin; i++) {
                        uno(); uno(); uno();
                        const nombre = cad(), tag = cad(), id = uno();
                        if (id) clanes.set(id, { nombre: nombre.trim(), tag: tag.trim(), bytes: bytesVarint(id) });
                    }
                } else if (tipo === T_ZONA) {
                    const f = varints(u8, ini, fin, 10), t = dv.getFloat32(p + 1, true);
                    if (f.length >= 10 && t >= 1) zonaMsgs.push({ t, fase: f[0], estado: f[7], dur: (zz(f[9]) - zz(f[8])) / 500,
                        act: { x: zz(f[1]) / 1000, z: zz(f[2]) / 1000, r: f[3] }, sig: { x: zz(f[4]) / 1000, z: zz(f[5]) / 1000, r: f[6] } });
                } else if (tipo === T_IMPACTO) {
                    impactos.push(varints(u8, ini, fin, 8));
                } else if (tipo === T_KILL) {
                    // eliminación: víctima, quien la hizo (las kills del .bin cuadran con el .csv en 227/241 jugadores)
                    const v = varints(u8, ini, fin, 2);
                    if (v.length === 2 && v[1] !== v[0] && v[1] >= 16777216) J(v[1]).kills++;
                } else if (tipo === T_DERRIBO) {
                    const v = varints(u8, ini, fin, 2);
                    if (v.length === 2) { J(v[0]).derribado++; if (v[1] !== v[0]) J(v[1]).derribos++; }
                } else if (tipo === T_GLOO) {
                    const v = varints(u8, ini, fin, 16);
                    if (v.length === 16 && v[15] >= 16777216) J(v[15]).gloo++;
                } else if (tipo === T_HABILIDAD) {
                    // [PlayerID, habilidad, estado]: estado 1 = la activó
                    const v = varints(u8, ini, fin, 3);
                    if (v.length === 3 && v[0] >= 16777216 && v[1] % 100 === 6) {
                        const j = J(v[0]);
                        if (!j.activa) j.activa = v[1];
                        if (v[2] === 1) { j.usos++; j.usosPor[v[1]] = (j.usosPor[v[1]] || 0) + 1; }
                    }
                } else if (tipo === T_REANIMA) {
                    const v = varints(u8, ini, fin, 2);
                    if (v.length === 2) { J(v[0]).reanimo++; J(v[1]).revivido++; }
                }
            }
            p = fin;
        }
        // Impactos: [atacante, víctima, daño, daño extra, arma×2, ?, ?, parte del cuerpo]
        // atacante = víctima es daño de zona/caída (no cuenta). La víctima puede ser una pared gloo (cuenta como en el .csv oficial).
        const jugadores = new Set([...jug.keys()]);
        impactos.forEach(v => {
            if (v.length < 5) return;
            const [a, vi, d, ex, w] = v, parte = v.length > 7 ? v[7] : 0;
            if (a === vi || a < 16777216) return;
            const j = J(a), dano = d + ex;
            j.dano += dano;
            if (jugadores.has(vi) && escuadra(vi) !== escuadra(a)) j.danoJug += dano;
            if (parte !== 0) j.impactos++;
            if (parte === 1) j.hs++; else if (parte === 2) j.torso++; else if (parte === 3) j.piernas++;
            const arma = Math.floor(w / 2);
            j.armas[arma] = (j.armas[arma] || 0) + dano;
        });
        // Escuadra → nombre del equipo: la ficha de cada jugador (101) lleva el id de su clan (306). Se vota por escuadra.
        const votos = new Map();
        fichas.forEach(([pid, datos]) => {
            for (const c of clanes.values()) {
                if (!contiene(datos, c.bytes)) continue;
                const s = escuadra(pid), v = votos.get(s) || new Map();
                v.set(c.nombre, (v.get(c.nombre) || 0) + 1); votos.set(s, v);
                jug.get(pid).equipo = c.nombre; jug.get(pid).tag = c.tag;
                break;
            }
        });
        // Habilidades equipadas: en la ficha va [8 (=4×2), h1, h2, h3, h4]; todas terminan en 06 (7406 Oscar, 506…)
        fichas.forEach(([pid, datos]) => {
            const j = jug.get(pid);
            if (j.habilidades.length) return;
            const v = varints(datos, 0, datos.length, 600);
            for (let i = 0; i + 4 < v.length; i++) {
                const h = v.slice(i + 1, i + 5);
                if (v[i] === 8 && h.every(x => x > 100 && x < 20000 && x % 100 === 6)) { j.habilidades = h; break; }
            }
        });
        // La activa que más usó (si cambió de personaje en la partida)
        jug.forEach(j => { const top = Object.entries(j.usosPor).sort((a, b) => b[1] - a[1])[0]; if (top) j.activa = +top[0]; });
        const equipos = new Map([...votos].map(([s, v]) => [s, [...v].sort((a, b) => b[1] - a[1])[0][0]]));
        return { jugadores: jug, cuentas, equipos, paquetes, duracion: Math.round(ultimo), zonas: zonasDe(zonaMsgs) };
    }

    const api = { leer };
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    else raiz.PumasBin = api;
})(typeof window !== 'undefined' ? window : globalThis);
