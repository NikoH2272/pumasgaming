/* =====================================================================
   PUMAS GAMING · Juegos por portal — Snake (sql/33)
   - montar(portal, destino?): monta Snake si tipo='juego' está activo
   ===================================================================== */
(function () {
    const P = window.PumasPortal;
    const esc = P.escaparHtml;

    const GRID = 20, CELL = 20, W = GRID * CELL;

    const MALAS = /\b(puta|puto|culero|pendejo|chingad|mierda|cono|verga|cabron|mamada|pinche|carajo|joder|cojones|ojete|perra|marica|maricon|joto|hdp|imbecil)\b/i;

    function estilos() {
        if (document.getElementById('pgJuegosCss')) return;
        const st = document.createElement('style');
        st.id = 'pgJuegosCss';
        st.textContent = `
.pgj{width:min(100%,1180px);margin:0 auto;padding:clamp(40px,5vw,64px) clamp(18px,4vw,40px)}
.pgj-caja{padding:clamp(18px,3vw,30px);border:1px solid rgba(var(--primary-rgb,216,195,149),.35);
  border-top:3px solid var(--primary,#D8C395);border-radius:3px;
  background:linear-gradient(145deg,rgba(var(--primary-rgb,216,195,149),.07),transparent 45%),#121212;
  color:var(--light,#F4EEDC)}
.pgj h2{margin:0 0 6px;color:var(--primary,#D8C395);font:900 clamp(1.2rem,2.6vw,1.8rem)/1.15 var(--font-display,'Michroma',sans-serif);text-transform:uppercase}
.pgj p.pgj-sub{margin:0 0 18px;color:var(--gray,#B9B2A4);line-height:1.6}
.pgj-layout{display:grid;grid-template-columns:1fr auto;gap:28px;align-items:start}
.pgj-canvas-col{display:flex;flex-direction:column;align-items:center}
.pgj-canvas-col canvas{display:block;border:2px solid rgba(var(--primary-rgb,216,195,149),.35);border-radius:2px;
  width:min(${W}px,88vw);height:min(${W}px,88vw)}
.pgj-score-live{color:var(--primary,#D8C395);font:900 1rem var(--font-display,'Michroma',sans-serif);
  text-align:center;margin:10px 0 0;letter-spacing:.06em}
.pgj-controles{font-size:.72rem;color:var(--gray,#B9B2A4);margin:6px 0 0;text-align:center;display:none}
@media(pointer:fine){.pgj-controles{display:block}}
.pgj-dpad{display:none;flex-direction:column;align-items:center;gap:4px;margin-top:10px;user-select:none}
@media(pointer:coarse){.pgj-dpad{display:flex}}
.pgj-dpad-row{display:flex;gap:4px}
.pgj-dpad button{width:56px;height:56px;border:1px solid rgba(var(--primary-rgb,216,195,149),.5);border-radius:4px;
  background:rgba(var(--primary-rgb,216,195,149),.12);color:var(--primary,#D8C395);
  font-size:1.4rem;cursor:pointer;touch-action:manipulation;-webkit-tap-highlight-color:transparent;
  display:flex;align-items:center;justify-content:center}
.pgj-dpad button:active{background:rgba(var(--primary-rgb,216,195,149),.35)}
.pgj form{display:grid;gap:12px;max-width:320px;margin-bottom:18px}
.pgj label{display:block;margin-bottom:5px;color:var(--primary,#D8C395);
  font:800 .66rem var(--font-display,'Michroma',sans-serif);letter-spacing:.1em;text-transform:uppercase}
.pgj input{width:100%;min-height:46px;padding:10px 12px;
  border:1px solid rgba(var(--primary-rgb,216,195,149),.3);border-radius:2px;
  color:var(--light,#F4EEDC);background:#0c0c0c;font-size:16px;box-sizing:border-box}
.pgj-btn{min-height:48px;border:1px solid var(--primary,#D8C395);border-radius:2px;
  color:var(--on-primary,#0A0A0A);background:var(--primary,#D8C395);
  font:900 .8rem var(--font-display,'Michroma',sans-serif);letter-spacing:.05em;
  text-transform:uppercase;cursor:pointer;transition:opacity .15s;padding:0 20px}
.pgj-btn:disabled{opacity:.5;cursor:not-allowed}
.pgj-btn-sec{background:transparent;color:var(--primary,#D8C395)}
.pgj-msg{min-height:1.2em;color:#ff8a8d;font-size:.9rem;margin:4px 0 0}
.pgj-lb{width:100%;border-collapse:collapse;font-size:.88rem;margin-top:10px}
.pgj-lb th{color:var(--primary,#D8C395);font:700 .7rem var(--font-display,'Michroma',sans-serif);
  letter-spacing:.08em;padding:8px;border-bottom:1px solid rgba(var(--primary-rgb,216,195,149),.25);text-align:left}
.pgj-lb td{padding:8px;border-bottom:1px solid rgba(255,255,255,.06);color:var(--light,#F4EEDC)}
.pgj-lb .pos{font:700 .8rem var(--font-display,'Michroma',sans-serif);color:var(--primary,#D8C395);white-space:nowrap}
.pgj-lb .pts{text-align:right;color:#FFD54A;font-weight:700}
.pgj-info{font-size:.82rem;color:var(--gray,#B9B2A4);margin:4px 0 0}
@media(max-width:720px){.pgj-layout{grid-template-columns:1fr;direction:initial}}`;
        document.head.appendChild(st);
    }

    function contenedor(destino) {
        let c = destino ? document.getElementById(destino) : document.getElementById('pgJuego');
        if (!c) {
            c = document.createElement('section');
            c.id = 'pgJuego';
            const pie = document.querySelector('footer');
            if (pie) pie.before(c); else document.body.appendChild(c);
        }
        c.classList.add('pgj');
        c.hidden = false;
        return c;
    }

    /* ═══════════════════════════════
       MOTOR SNAKE
    ═══════════════════════════════ */
    let _sn, _dir, _nd, _food, _pts, _spd, _tid, _ctx, _running;

    function _rndFood() {
        let f;
        do { f = { x: Math.floor(Math.random() * GRID), y: Math.floor(Math.random() * GRID) }; }
        while (_sn.some(s => s.x === f.x && s.y === f.y));
        return f;
    }

    function _draw() {
        _ctx.fillStyle = '#0a0a0a';
        _ctx.fillRect(0, 0, W, W);
        _ctx.strokeStyle = 'rgba(255,255,255,.04)'; _ctx.lineWidth = .5;
        for (let i = 0; i <= GRID; i++) {
            _ctx.beginPath(); _ctx.moveTo(i * CELL, 0); _ctx.lineTo(i * CELL, W); _ctx.stroke();
            _ctx.beginPath(); _ctx.moveTo(0, i * CELL); _ctx.lineTo(W, i * CELL); _ctx.stroke();
        }
        _ctx.fillStyle = '#e84d4d';
        _ctx.fillRect(_food.x * CELL + 3, _food.y * CELL + 3, CELL - 6, CELL - 6);
        _sn.forEach((s, i) => {
            _ctx.fillStyle = i === 0 ? '#D8C395' : `rgba(216,195,149,${Math.max(.25, .9 - i * .025)})`;
            _ctx.fillRect(s.x * CELL + 1, s.y * CELL + 1, CELL - 2, CELL - 2);
        });
    }

    function _stop() { clearTimeout(_tid); _running = false; }

    function iniciarSnake(canvas, onOver, onScore) {
        _ctx  = canvas.getContext('2d');
        _sn   = [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }];
        _dir  = { x: 1, y: 0 }; _nd = { x: 1, y: 0 };
        _food = _rndFood(); _pts = 0; _spd = 150; _running = true;
        clearTimeout(_tid);

        function step() {
            if (!_running) return;
            _dir = _nd;
            const hd = { x: _sn[0].x + _dir.x, y: _sn[0].y + _dir.y };
            if (hd.x < 0 || hd.x >= GRID || hd.y < 0 || hd.y >= GRID ||
                _sn.some(s => s.x === hd.x && s.y === hd.y)) {
                _running = false; _draw(); onOver(_pts); return;
            }
            _sn.unshift(hd);
            if (hd.x === _food.x && hd.y === _food.y) {
                _pts += 10; _food = _rndFood();
                _spd = Math.max(75, _spd - 2);
                onScore(_pts);
            } else { _sn.pop(); }
            _draw();
            _tid = setTimeout(step, _spd);
        }

        // Teclado
        function onKey(e) {
            const m = { ArrowUp:'u', ArrowDown:'d', ArrowLeft:'l', ArrowRight:'r',
                        w:'u', s:'d', a:'l', d:'r', W:'u', S:'d', A:'l', D:'r' };
            const v = m[e.key]; if (!v) return;
            if (v === 'u' && _dir.y !== 1)  _nd = { x: 0, y: -1 };
            if (v === 'd' && _dir.y !== -1) _nd = { x: 0, y:  1 };
            if (v === 'l' && _dir.x !== 1)  _nd = { x: -1, y: 0 };
            if (v === 'r' && _dir.x !== -1) _nd = { x: 1,  y: 0 };
            e.preventDefault();
        }
        document.addEventListener('keydown', onKey);
        canvas._kclean = () => document.removeEventListener('keydown', onKey);

        // Swipe
        let tx = 0, ty = 0;
        canvas.addEventListener('touchstart', e => { tx = e.touches[0].clientX; ty = e.touches[0].clientY; e.preventDefault(); }, { passive: false });
        canvas.addEventListener('touchend', e => {
            const dx = e.changedTouches[0].clientX - tx, dy = e.changedTouches[0].clientY - ty;
            if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
            if (Math.abs(dx) > Math.abs(dy)) {
                if (dx > 0 && _dir.x !== -1) _nd = { x: 1, y: 0 };
                if (dx < 0 && _dir.x !==  1) _nd = { x: -1, y: 0 };
            } else {
                if (dy > 0 && _dir.y !== -1) _nd = { x: 0, y: 1 };
                if (dy < 0 && _dir.y !==  1) _nd = { x: 0, y: -1 };
            }
            e.preventDefault();
        }, { passive: false });

        step();
    }

    function lbHTML(entradas) {
        if (!entradas || !entradas.length)
            return `<p style="color:#555;font-style:italic;font-size:.85rem">Aún no hay puntuaciones.</p>`;
        return `<table class="pgj-lb"><thead><tr><th>#</th><th>Jugador</th><th style="text-align:right">Pts</th></tr></thead><tbody>
            ${entradas.slice(0, 20).map((r, i) => {
                const m = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
                return `<tr><td class="pos">${m}</td><td>${esc(r.nombre)}</td><td class="pts">${r.puntos}</td></tr>`;
            }).join('')}</tbody></table>`;
    }

    /* ═══════════════════════════════
       RENDER PRINCIPAL
    ═══════════════════════════════ */
    async function montar(portal, destino) {
        estilos();
        const cont = contenedor(destino);
        cont.innerHTML = `<div class="pgj-caja" style="text-align:center;padding:40px;color:var(--gray,#B9B2A4)">
            <i class="fa-solid fa-circle-notch fa-spin" style="font-size:1.6rem;color:var(--primary,#D8C395);display:block;margin-bottom:14px"></i>
            Cargando juego…
        </div>`;

        let cfg;
        try { cfg = await P.dinamica.publico(portal, 'juego'); }
        catch (e) {
            cont.innerHTML = `<div class="pgj-caja pgj-msg" style="padding:30px;text-align:center">⚠️ ${esc(e.message)}</div>`;
            return;
        }
        if (!cfg || !cfg.activo) { cont.innerHTML = ''; return; }

        // Mostrar nav de juegos si existe
        const navJuegos = document.getElementById('navJuegos');
        if (navJuegos) navJuegos.hidden = false;

        const titulo = esc(cfg.titulo || 'Snake · Pumas Gaming');
        let entradas = cfg.entradas || [];
        const clave = 'pg_jug_' + portal;
        let jugador = null;
        try { jugador = JSON.parse(localStorage.getItem(clave) || 'null'); } catch (e) {}

        function renderInicio(gameOverMsg) {
            cont.innerHTML = `<div class="pgj-caja">
                <h2>🎮 ${titulo}</h2>
                <p class="pgj-sub">Snake clásico — muros = Game Over. Tu puntuación queda en el ranking.</p>
                <div class="pgj-layout">
                    <div>
                        ${jugador
                            ? `<p class="pgj-info" style="margin-bottom:12px">Jugando como <b style="color:var(--primary,#D8C395)">${esc(jugador.nombre)}</b> · FF: ${esc(jugador.ig || '—')}
                                <button class="pgj-btn pgj-btn-sec" id="pgjCambiar" style="min-height:30px;padding:2px 10px;font-size:.65rem;margin-left:8px">Cambiar</button></p>
                               ${gameOverMsg ? `<p class="pgj-msg" style="margin-bottom:10px">${esc(gameOverMsg)}</p>` : ''}
                               <button class="pgj-btn" id="pgjJugar" style="margin-bottom:20px;width:100%;max-width:220px">▶ ${gameOverMsg ? 'Jugar otra vez' : 'Jugar'}</button>`
                            : `<form id="pgjForm">
                                <div><label for="pgjNom">Nombre *</label><input id="pgjNom" required maxlength="40" placeholder="Tu nombre" autocomplete="off"></div>
                                <div><label for="pgjFf">ID de Free Fire</label><input id="pgjFf" maxlength="40" placeholder="Ej: 123456789" inputmode="numeric"></div>
                                <button type="submit" class="pgj-btn">Listo para jugar →</button>
                                <p class="pgj-msg" id="pgjMsgForm"></p>
                               </form>`}
                        <h3 style="font:700 .72rem var(--font-display,'Michroma',sans-serif);letter-spacing:.1em;color:var(--primary,#D8C395);text-transform:uppercase;margin:0 0 8px">Top 20</h3>
                        ${lbHTML(entradas)}
                    </div>
                    <div class="pgj-canvas-col">
                        <canvas id="pgjCv" width="${W}" height="${W}" style="opacity:.25"></canvas>
                        <p class="pgj-controles">⬆ ⬇ ⬅ ➡ &nbsp;·&nbsp; WASD &nbsp;·&nbsp; Desliza</p>
                    </div>
                </div>
            </div>`;

            // Dibujar canvas idle
            const cv = document.getElementById('pgjCv');
            if (cv) {
                const cx = cv.getContext('2d');
                cx.fillStyle = '#0a0a0a'; cx.fillRect(0, 0, W, W);
            }

            const form = document.getElementById('pgjForm');
            if (form) {
                form.addEventListener('submit', e => {
                    e.preventDefault();
                    const nombre = document.getElementById('pgjNom').value.trim();
                    const ig = document.getElementById('pgjFf').value.trim();
                    const msgEl = document.getElementById('pgjMsgForm');
                    if (!nombre) { msgEl.textContent = 'El nombre es requerido.'; return; }
                    if (MALAS.test(nombre)) { msgEl.textContent = 'Ese nombre no está permitido.'; return; }
                    try { localStorage.setItem(clave, JSON.stringify({ nombre, ig })); } catch (e) {}
                    jugador = { nombre, ig };
                    renderInicio();
                });
            }

            document.getElementById('pgjCambiar')?.addEventListener('click', () => {
                _stop();
                try { localStorage.removeItem(clave); } catch (e) {}
                jugador = null;
                renderInicio();
            });

            document.getElementById('pgjJugar')?.addEventListener('click', renderJuego);
        }

        function renderJuego() {
            cont.innerHTML = `<div class="pgj-caja">
                <h2>🎮 ${titulo}</h2>
                <p class="pgj-info" style="margin-bottom:14px">
                    Jugador: <b style="color:var(--primary,#D8C395)">${esc(jugador.nombre)}</b>
                    &nbsp;·&nbsp;
                    <button class="pgj-btn pgj-btn-sec" id="pgjSalir" style="min-height:32px;padding:2px 12px;font-size:.7rem">✕ Salir</button>
                </p>
                <div class="pgj-layout">
                    <div>
                        <p class="pgj-score-live" id="pgjScoreLive">PUNTOS: 0</p>
                        <p class="pgj-controles" style="text-align:left;margin-top:16px">Flechas · WASD · Desliza</p>
                    </div>
                    <div class="pgj-canvas-col">
                        <canvas id="pgjCv" width="${W}" height="${W}"></canvas>
                        <p class="pgj-controles">⬆ ⬇ ⬅ ➡ &nbsp;·&nbsp; WASD</p>
                        <div class="pgj-dpad" id="pgjDpad">
                            <div class="pgj-dpad-row"><button data-dir="u">⬆</button></div>
                            <div class="pgj-dpad-row">
                                <button data-dir="l">⬅</button>
                                <button data-dir="d">⬇</button>
                                <button data-dir="r">➡</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>`;

            const cv = document.getElementById('pgjCv');

            document.getElementById('pgjSalir').addEventListener('click', () => {
                _stop(); if (cv && cv._kclean) cv._kclean();
                renderInicio();
            });

            // D-pad táctil
            document.getElementById('pgjDpad')?.addEventListener('pointerdown', e => {
                const btn = e.target.closest('[data-dir]');
                if (!btn) return;
                const v = btn.dataset.dir;
                if (v === 'u' && _dir.y !== 1)  _nd = { x: 0, y: -1 };
                if (v === 'd' && _dir.y !== -1) _nd = { x: 0, y:  1 };
                if (v === 'l' && _dir.x !== 1)  _nd = { x: -1, y: 0 };
                if (v === 'r' && _dir.x !== -1) _nd = { x: 1,  y: 0 };
                e.preventDefault();
            });

            iniciarSnake(cv,
                async (finalPts) => {
                    if (cv && cv._kclean) cv._kclean();
                    const el = document.getElementById('pgjScoreLive');
                    if (el) el.textContent = 'PUNTOS: ' + finalPts;
                    if (finalPts > 0 && jugador) {
                        try {
                            await P.dinamica.registrar(portal, 'juego', {
                                nombre: jugador.nombre,
                                ig: jugador.ig || '',
                                metadata: { puntos: finalPts }
                            });
                            const cfg2 = await P.dinamica.publico(portal, 'juego');
                            if (cfg2 && cfg2.entradas) entradas = cfg2.entradas;
                        } catch (e) {}
                    }
                    renderInicio('Game over · ' + finalPts + ' puntos');
                },
                (pts) => {
                    const el = document.getElementById('pgjScoreLive');
                    if (el) el.textContent = 'PUNTOS: ' + pts;
                }
            );
        }

        renderInicio();
    }

    function autoMontar() {
        if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', autoMontar); return; }
        if (location.pathname.includes('/admin/')) return;
        if (!window.PumasPortal || !window.PumasPortal.PORTALES) return;
        if (!document.getElementById('pgJuego')) return;
        // Detecta portal: 1° por URL path, 2° por data-portal del script de portal.js
        const seg = location.pathname.split('/').filter(Boolean)[0];
        const scriptPortal = document.querySelector('script[data-portal]');
        const portal = (seg && window.PumasPortal.PORTALES[seg]) ? seg
                     : (scriptPortal && scriptPortal.dataset.portal) || null;
        if (!portal || !window.PumasPortal.PORTALES[portal]) return;
        montar(portal, 'pgJuego');
    }
    autoMontar();

    window.PumasPortal = window.PumasPortal || {};
    window.PumasPortal.juegos = { montar };
})();
