/* =====================================================================
   PUMAS GAMING · Juegos por portal — Snake · Tetris · 3 en Línea
   - montar(portal, destino, tipo?): monta el juego activo
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
.pgj+.pgj{padding-top:0}
.pgj-caja{padding:clamp(18px,3vw,30px);border:1px solid rgba(var(--primary-rgb,216,195,149),.35);
  border-top:3px solid var(--primary,#D8C395);border-radius:3px;
  background:linear-gradient(145deg,rgba(var(--primary-rgb,216,195,149),.07),transparent 45%),#121212;
  color:var(--light,#F4EEDC)}
.pgj h2{margin:0 0 6px;color:var(--primary,#D8C395);font:900 clamp(1.2rem,2.6vw,1.8rem)/1.15 var(--font-display,'Michroma',sans-serif);text-transform:uppercase}
.pgj p.pgj-sub{margin:0 0 18px;color:var(--gray,#B9B2A4);line-height:1.6}
.pgj-layout{display:grid;grid-template-columns:1fr auto;gap:28px;align-items:start}
.pgj-canvas-col{display:flex;flex-direction:column;align-items:center}
.pgj-canvas-col canvas{display:block;border:2px solid rgba(var(--primary-rgb,216,195,149),.35);border-radius:2px;max-width:min(88vw,400px)}
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
.pgj-tetris-body{display:flex;gap:20px;align-items:flex-start;justify-content:center}
.pgj-tetris-side{display:none;min-width:150px;flex-shrink:0}
@media(pointer:fine){.pgj-tetris-side{display:block}}
.pgj-dpad-tetris{gap:8px;margin-top:16px;width:100%}
.pgj-dpad-tetris .pgj-dpad-row{justify-content:center;gap:8px}
.pgj-dpad-tetris button{width:82px;height:82px;font-size:1.7rem;border-radius:10px;border-width:2px;flex-direction:column;gap:2px}
.pgj-dpad-tetris button small{font-size:.55rem;display:block;font-family:var(--font-display,'Michroma',sans-serif);letter-spacing:.05em;opacity:.8}
.pgj-dpad-tetris button[data-act="rot"]{width:110px;height:74px}
.pgj-dpad-tetris button[data-act="drp"]{width:260px;height:64px;font-size:.9rem;letter-spacing:.06em}
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
.pgj-3-result{font:900 1.1rem var(--font-display,'Michroma',sans-serif);text-align:center;margin:10px 0;min-height:1.4em}
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
        _ctx.fillStyle = '#0a0a0a'; _ctx.fillRect(0, 0, W, W);
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
                _pts += 10; _food = _rndFood(); _spd = Math.max(75, _spd - 2); onScore(_pts);
            } else { _sn.pop(); }
            _draw();
            _tid = setTimeout(step, _spd);
        }

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

    /* ═══════════════════════════════
       MOTOR TETRIS
    ═══════════════════════════════ */
    const T_COLS = 10, T_ROWS = 20, T_CELL = 24;
    const T_W = T_COLS * T_CELL, T_H = T_ROWS * T_CELL;
    const T_PIEZAS = [
        { s: [[1,1,1,1]],           c: '#00E5FF' },
        { s: [[1,1],[1,1]],         c: '#FFD740' },
        { s: [[0,1,0],[1,1,1]],     c: '#CE93D8' },
        { s: [[0,1,1],[1,1,0]],     c: '#69F0AE' },
        { s: [[1,1,0],[0,1,1]],     c: '#EF5350' },
        { s: [[1,0,0],[1,1,1]],     c: '#448AFF' },
        { s: [[0,0,1],[1,1,1]],     c: '#FFA726' },
    ];

    function iniciarTetris(canvas, onOver, onScore) {
        const ctx = canvas.getContext('2d');
        let board, pieza, sig, px, py, pts, lineas, nivel, _tid, running;

        function nuevaPieza() {
            const d = T_PIEZAS[Math.floor(Math.random() * T_PIEZAS.length)];
            return { s: d.s.map(r => [...r]), c: d.c };
        }

        function rotar(s) {
            const rows = s.length, cols = s[0].length;
            const r = Array.from({ length: cols }, () => Array(rows).fill(0));
            for (let i = 0; i < rows; i++)
                for (let j = 0; j < cols; j++) r[j][rows - 1 - i] = s[i][j];
            return r;
        }

        function colisiona(s, ox, oy) {
            for (let r = 0; r < s.length; r++)
                for (let c = 0; c < s[r].length; c++)
                    if (s[r][c]) {
                        const nx = ox + c, ny = oy + r;
                        if (nx < 0 || nx >= T_COLS || ny >= T_ROWS) return true;
                        if (ny >= 0 && board[ny][nx]) return true;
                    }
            return false;
        }

        function fijar() {
            for (let r = 0; r < pieza.s.length; r++)
                for (let c = 0; c < pieza.s[r].length; c++)
                    if (pieza.s[r][c]) {
                        if (py + r < 0) { running = false; clearTimeout(_tid); onOver(pts); return; }
                        board[py + r][px + c] = pieza.c;
                    }
            let limpias = 0;
            for (let r = T_ROWS - 1; r >= 0; r--) {
                if (board[r].every(c => c)) {
                    board.splice(r, 1);
                    board.unshift(Array(T_COLS).fill(0));
                    limpias++; r++;
                }
            }
            if (limpias > 0) {
                pts += ([0, 100, 300, 500, 800][limpias] || 800) * (nivel + 1);
                lineas += limpias; nivel = Math.floor(lineas / 10); onScore(pts);
            }
            pieza = sig; sig = nuevaPieza();
            px = Math.floor(T_COLS / 2) - Math.floor(pieza.s[0].length / 2);
            py = 0;
            if (colisiona(pieza.s, px, py)) { running = false; clearTimeout(_tid); onOver(pts); return; }
        }

        function dibujar() {
            ctx.fillStyle = '#0a0a0a'; ctx.fillRect(0, 0, T_W, T_H);
            ctx.strokeStyle = 'rgba(255,255,255,.04)'; ctx.lineWidth = .5;
            for (let c = 0; c <= T_COLS; c++) { ctx.beginPath(); ctx.moveTo(c*T_CELL,0); ctx.lineTo(c*T_CELL,T_H); ctx.stroke(); }
            for (let r = 0; r <= T_ROWS; r++) { ctx.beginPath(); ctx.moveTo(0,r*T_CELL); ctx.lineTo(T_W,r*T_CELL); ctx.stroke(); }
            for (let r = 0; r < T_ROWS; r++)
                for (let c = 0; c < T_COLS; c++)
                    if (board[r][c]) { ctx.fillStyle = board[r][c]; ctx.fillRect(c*T_CELL+1, r*T_CELL+1, T_CELL-2, T_CELL-2); }
            if (pieza) {
                ctx.fillStyle = pieza.c;
                // Ghost piece
                let gy = py;
                while (!colisiona(pieza.s, px, gy + 1)) gy++;
                ctx.globalAlpha = .2;
                for (let r = 0; r < pieza.s.length; r++)
                    for (let c = 0; c < pieza.s[r].length; c++)
                        if (pieza.s[r][c]) ctx.fillRect((px+c)*T_CELL+1, (gy+r)*T_CELL+1, T_CELL-2, T_CELL-2);
                ctx.globalAlpha = 1;
                for (let r = 0; r < pieza.s.length; r++)
                    for (let c = 0; c < pieza.s[r].length; c++)
                        if (pieza.s[r][c]) ctx.fillRect((px+c)*T_CELL+1, (py+r)*T_CELL+1, T_CELL-2, T_CELL-2);
            }
        }

        function step() {
            if (!running) return;
            if (colisiona(pieza.s, px, py + 1)) fijar();
            else py++;
            dibujar();
            if (running) _tid = setTimeout(step, Math.max(80, 500 - nivel * 40));
        }

        function iniciar() {
            board = Array.from({ length: T_ROWS }, () => Array(T_COLS).fill(0));
            pts = 0; lineas = 0; nivel = 0; running = true;
            pieza = nuevaPieza(); sig = nuevaPieza();
            px = Math.floor(T_COLS / 2) - Math.floor(pieza.s[0].length / 2);
            py = 0; clearTimeout(_tid); step();
        }

        function onKey(e) {
            if (!running) return;
            if (e.key === 'ArrowLeft')  { if (!colisiona(pieza.s, px-1, py)) { px--; dibujar(); } }
            if (e.key === 'ArrowRight') { if (!colisiona(pieza.s, px+1, py)) { px++; dibujar(); } }
            if (e.key === 'ArrowDown')  { if (!colisiona(pieza.s, px, py+1)) { py++; } else fijar(); dibujar(); }
            if (e.key === 'ArrowUp') {
                const nr = rotar(pieza.s);
                if (!colisiona(nr, px, py)) { pieza.s = nr; dibujar(); }
            }
            if (e.key === ' ') {
                while (!colisiona(pieza.s, px, py + 1)) py++;
                fijar(); dibujar();
            }
            e.preventDefault();
        }
        document.addEventListener('keydown', onKey);
        canvas._tclean = () => { document.removeEventListener('keydown', onKey); clearTimeout(_tid); };

        // Touch swipe + tap-rotate
        let _tx = 0, _ty = 0;
        canvas.addEventListener('touchstart', e => { _tx = e.touches[0].clientX; _ty = e.touches[0].clientY; e.preventDefault(); }, { passive: false });
        canvas.addEventListener('touchend', e => {
            if (!running) return;
            const dx = e.changedTouches[0].clientX - _tx;
            const dy = e.changedTouches[0].clientY - _ty;
            if (Math.abs(dx) < 8 && Math.abs(dy) < 8) {
                const nr = rotar(pieza.s);
                if (!colisiona(nr, px, py)) { pieza.s = nr; dibujar(); }
                return;
            }
            if (Math.abs(dx) > Math.abs(dy)) {
                if (dx > 0 && !colisiona(pieza.s, px+1, py)) { px++; dibujar(); }
                if (dx < 0 && !colisiona(pieza.s, px-1, py)) { px--; dibujar(); }
            } else if (dy > 0) {
                while (!colisiona(pieza.s, px, py + 1)) py++;
                fijar(); dibujar();
            }
            e.preventDefault();
        }, { passive: false });

        iniciar();
    }

    /* ═══════════════════════════════
       MOTOR 3 EN LÍNEA
    ═══════════════════════════════ */
    const TL_SIZE = 270;
    const TL_CELL = TL_SIZE / 3;
    const TL_LINES = [
        [[0,0],[0,1],[0,2]], [[1,0],[1,1],[1,2]], [[2,0],[2,1],[2,2]],
        [[0,0],[1,0],[2,0]], [[0,1],[1,1],[2,1]], [[0,2],[1,2],[2,2]],
        [[0,0],[1,1],[2,2]], [[0,2],[1,1],[2,0]]
    ];

    function iniciar3enLinea(canvas, onResult) {
        const ctx = canvas.getContext('2d');
        let board, turno, over, wins = 0, partidas = 0;

        function checkWin(sym) {
            return TL_LINES.find(l => l.every(([r, c]) => board[r][c] === sym)) || null;
        }

        function minimax(b, isMax, depth) {
            if (depth > 8) return 0;
            if (TL_LINES.some(l => l.every(([r,c]) => b[r][c] === 'O'))) return 10 - depth;
            if (TL_LINES.some(l => l.every(([r,c]) => b[r][c] === 'X'))) return depth - 10;
            const empty = [];
            for (let r = 0; r < 3; r++)
                for (let c = 0; c < 3; c++)
                    if (!b[r][c]) empty.push([r, c]);
            if (!empty.length) return 0;
            if (isMax) {
                let best = -Infinity;
                for (const [r, c] of empty) {
                    b[r][c] = 'O';
                    best = Math.max(best, minimax(b, false, depth + 1));
                    b[r][c] = null;
                }
                return best;
            } else {
                let best = Infinity;
                for (const [r, c] of empty) {
                    b[r][c] = 'X';
                    best = Math.min(best, minimax(b, true, depth + 1));
                    b[r][c] = null;
                }
                return best;
            }
        }

        function cpuMove() {
            const empty = [];
            for (let r = 0; r < 3; r++)
                for (let c = 0; c < 3; c++)
                    if (!board[r][c]) empty.push([r, c]);
            if (!empty.length) return;
            // 25% random para que sea beatable
            if (Math.random() < 0.25) {
                const [r, c] = empty[Math.floor(Math.random() * empty.length)];
                board[r][c] = 'O'; return;
            }
            const copy = board.map(row => [...row]);
            let best = -Infinity, bm = empty[0];
            for (const [r, c] of empty) {
                copy[r][c] = 'O';
                const s = minimax(copy, false, 0);
                copy[r][c] = null;
                if (s > best) { best = s; bm = [r, c]; }
            }
            board[bm[0]][bm[1]] = 'O';
        }

        function dibujar(wl) {
            ctx.fillStyle = '#0a0a0a'; ctx.fillRect(0, 0, TL_SIZE, TL_SIZE);
            ctx.strokeStyle = 'rgba(216,195,149,.4)'; ctx.lineWidth = 3;
            for (let i = 1; i < 3; i++) {
                ctx.beginPath(); ctx.moveTo(i*TL_CELL, 12); ctx.lineTo(i*TL_CELL, TL_SIZE-12); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(12, i*TL_CELL); ctx.lineTo(TL_SIZE-12, i*TL_CELL); ctx.stroke();
            }
            for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
                const cx = c*TL_CELL + TL_CELL/2, cy = r*TL_CELL + TL_CELL/2, p = TL_CELL/3.5;
                if (board[r][c] === 'X') {
                    ctx.strokeStyle = '#D8C395'; ctx.lineWidth = 5;
                    ctx.beginPath(); ctx.moveTo(cx-p,cy-p); ctx.lineTo(cx+p,cy+p); ctx.stroke();
                    ctx.beginPath(); ctx.moveTo(cx+p,cy-p); ctx.lineTo(cx-p,cy+p); ctx.stroke();
                } else if (board[r][c] === 'O') {
                    ctx.strokeStyle = '#4dff91'; ctx.lineWidth = 5;
                    ctx.beginPath(); ctx.arc(cx, cy, p, 0, Math.PI*2); ctx.stroke();
                }
            }
            if (wl) {
                const [r0,c0] = wl[0], [r2,c2] = wl[2];
                ctx.strokeStyle = '#FFD54A'; ctx.lineWidth = 6;
                ctx.beginPath();
                ctx.moveTo(c0*TL_CELL + TL_CELL/2, r0*TL_CELL + TL_CELL/2);
                ctx.lineTo(c2*TL_CELL + TL_CELL/2, r2*TL_CELL + TL_CELL/2);
                ctx.stroke();
            }
        }

        function reset() {
            board = Array.from({ length: 3 }, () => Array(3).fill(null));
            turno = 'X'; over = false; dibujar(null);
        }

        canvas.addEventListener('click', e => {
            if (over || turno !== 'X') return;
            const rect = canvas.getBoundingClientRect();
            const x = (e.clientX - rect.left) * (TL_SIZE / rect.width);
            const y = (e.clientY - rect.top) * (TL_SIZE / rect.height);
            const c = Math.min(2, Math.floor(x / TL_CELL));
            const r = Math.min(2, Math.floor(y / TL_CELL));
            if (board[r][c]) return;
            board[r][c] = 'X';
            const wl = checkWin('X');
            dibujar(wl);
            if (wl)  { over = true; partidas++; wins++; onResult('win', wins, partidas); return; }
            const isFull = board.every(row => row.every(v => v !== null));
            if (isFull) { over = true; partidas++; onResult('tie', wins, partidas); return; }
            turno = 'O';
            setTimeout(() => {
                cpuMove();
                const wlO = checkWin('O');
                dibujar(wlO);
                if (wlO) { over = true; partidas++; onResult('loss', wins, partidas); return; }
                if (board.every(row => row.every(v => v !== null))) { over = true; partidas++; onResult('tie', wins, partidas); return; }
                turno = 'X';
            }, 350);
        });

        reset();
        return { reset, wins: () => wins, partidas: () => partidas };
    }

    /* ═══════════════════════════════
       LEADERBOARD HTML
    ═══════════════════════════════ */
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
       RENDER GENÉRICO (registro + LB)
    ═══════════════════════════════ */
    function renderBase(cont, cfg, portal, tipo, { titulo, subtitulo, idLabel, canvasHtml, canvasW, canvasH, controles, dpadHtml }, jugador, entradas, renderJuego) {
        cont.innerHTML = `<div class="pgj-caja"${cfg.config && cfg.config.fondo ? ` style="background-image:url('${cfg.config.fondo}');background-size:cover;background-blend-mode:overlay"` : ''}>
            <h2>${titulo}</h2>
            <p class="pgj-sub">${subtitulo}</p>
            <div class="pgj-layout">
                <div>
                    ${jugador
                        ? `<p class="pgj-info" style="margin-bottom:12px">Jugando como <b style="color:var(--primary,#D8C395)">${esc(jugador.nombre)}</b>${jugador.ig ? ` · ${idLabel}: ${esc(jugador.ig)}` : ''}
                            <button class="pgj-btn pgj-btn-sec" id="pgjCambiar" style="min-height:30px;padding:2px 10px;font-size:.65rem;margin-left:8px">Cambiar</button></p>
                           <button class="pgj-btn" id="pgjJugar" style="margin-bottom:20px;width:100%;max-width:220px">▶ Jugar</button>`
                        : `<form id="pgjForm">
                            <div><label for="pgjNom">Nombre *</label><input id="pgjNom" required maxlength="40" placeholder="Tu nombre" autocomplete="off"></div>
                            <div><label for="pgjId">${idLabel} de Free Fire</label><input id="pgjId" maxlength="40" placeholder="Ej: 123456789" inputmode="numeric"></div>
                            <button type="submit" class="pgj-btn">Listo para jugar →</button>
                            <p class="pgj-msg" id="pgjMsgForm"></p>
                           </form>`}
                    <h3 style="font:700 .72rem var(--font-display,'Michroma',sans-serif);letter-spacing:.1em;color:var(--primary,#D8C395);text-transform:uppercase;margin:0 0 8px">Top 20</h3>
                    ${lbHTML(entradas)}
                </div>
                <div class="pgj-canvas-col">
                    ${canvasHtml}
                    ${controles ? `<p class="pgj-controles">${controles}</p>` : ''}
                    ${dpadHtml || ''}
                </div>
            </div>
        </div>`;

        document.getElementById('pgjForm')?.addEventListener('submit', e => {
            e.preventDefault();
            const nombre = document.getElementById('pgjNom').value.trim();
            const ig = document.getElementById('pgjId').value.trim();
            const msgEl = document.getElementById('pgjMsgForm');
            if (!nombre) { msgEl.textContent = 'El nombre es requerido.'; return; }
            if (MALAS.test(nombre)) { msgEl.textContent = 'Ese nombre no está permitido.'; return; }
            const clave = 'pg_jug_' + portal + '_' + tipo;
            try { localStorage.setItem(clave, JSON.stringify({ nombre, ig })); } catch (_) {}
            jugador = { nombre, ig };
            renderBase(cont, cfg, portal, tipo, { titulo, subtitulo, idLabel, canvasHtml, canvasW, canvasH, controles, dpadHtml }, jugador, entradas, renderJuego);
        });

        document.getElementById('pgjCambiar')?.addEventListener('click', () => {
            _stop();
            const clave = 'pg_jug_' + portal + '_' + tipo;
            try { localStorage.removeItem(clave); } catch (_) {}
            jugador = null;
            renderBase(cont, cfg, portal, tipo, { titulo, subtitulo, idLabel, canvasHtml, canvasW, canvasH, controles, dpadHtml }, jugador, entradas, renderJuego);
        });

        document.getElementById('pgjJugar')?.addEventListener('click', () => renderJuego(jugador));
    }

    /* ═══════════════════════════════
       RENDER SNAKE
    ═══════════════════════════════ */
    async function montarSnake(portal, cont, cfg) {
        let entradas = cfg.entradas || [];
        const titulo = esc(cfg.titulo || '🐍 Snake');
        const clave = 'pg_jug_' + portal + '_juego';
        let jugador = null;
        try { jugador = JSON.parse(localStorage.getItem(clave) || 'null'); } catch (_) {}

        function renderJuego(jug) {
            cont.innerHTML = `<div class="pgj-caja"${cfg.config?.fondo ? ` style="background-image:url('${cfg.config.fondo}');background-size:cover;background-blend-mode:overlay"` : ''}>
                <h2>${titulo}</h2>
                <p class="pgj-info" style="margin-bottom:14px">
                    Jugador: <b style="color:var(--primary,#D8C395)">${esc(jug.nombre)}</b>
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
            document.getElementById('pgjSalir').addEventListener('click', () => { _stop(); if (cv?._kclean) cv._kclean(); inicioSnake(); });
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
                    if (cv?._kclean) cv._kclean();
                    const el = document.getElementById('pgjScoreLive');
                    if (el) el.textContent = 'PUNTOS: ' + finalPts;
                    if (finalPts > 0 && jug) {
                        try {
                            await P.dinamica.registrar(portal, 'juego', { nombre: jug.nombre, ig: jug.ig || '', metadata: { puntos: finalPts } });
                            const cfg2 = await P.dinamica.publico(portal, 'juego');
                            if (cfg2?.entradas) entradas = cfg2.entradas;
                        } catch (e) { console.error('[PG Snake]', e?.message || e); }
                    }
                    inicioSnake('Game over · ' + finalPts + ' puntos');
                },
                (pts) => { const el = document.getElementById('pgjScoreLive'); if (el) el.textContent = 'PUNTOS: ' + pts; }
            );
        }

        function inicioSnake(msg) {
            cont.innerHTML = `<div class="pgj-caja"${cfg.config?.fondo ? ` style="background-image:url('${cfg.config.fondo}');background-size:cover;background-blend-mode:overlay"` : ''}>
                <h2>${titulo}</h2>
                <p class="pgj-sub">Snake clásico — muros = Game Over. Tu puntuación queda en el ranking.</p>
                <div class="pgj-layout">
                    <div>
                        ${jugador
                            ? `<p class="pgj-info" style="margin-bottom:12px">Jugando como <b style="color:var(--primary,#D8C395)">${esc(jugador.nombre)}</b>
                                <button class="pgj-btn pgj-btn-sec" id="pgjCambiar" style="min-height:30px;padding:2px 10px;font-size:.65rem;margin-left:8px">Cambiar</button></p>
                               ${msg ? `<p class="pgj-msg" style="margin-bottom:10px">${esc(msg)}</p>` : ''}
                               <button class="pgj-btn" id="pgjJugar" style="margin-bottom:20px;width:100%;max-width:220px">▶ ${msg ? 'Jugar otra vez' : 'Jugar'}</button>`
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
            const cv = document.getElementById('pgjCv');
            if (cv) { const cx = cv.getContext('2d'); cx.fillStyle = '#0a0a0a'; cx.fillRect(0, 0, W, W); }
            document.getElementById('pgjForm')?.addEventListener('submit', e => {
                e.preventDefault();
                const nombre = document.getElementById('pgjNom').value.trim();
                const ig = document.getElementById('pgjFf').value.trim();
                const msgEl = document.getElementById('pgjMsgForm');
                if (!nombre) { msgEl.textContent = 'El nombre es requerido.'; return; }
                if (MALAS.test(nombre)) { msgEl.textContent = 'Ese nombre no está permitido.'; return; }
                try { localStorage.setItem(clave, JSON.stringify({ nombre, ig })); } catch (_) {}
                jugador = { nombre, ig }; inicioSnake();
            });
            document.getElementById('pgjCambiar')?.addEventListener('click', () => {
                _stop(); try { localStorage.removeItem(clave); } catch (_) {} jugador = null; inicioSnake();
            });
            document.getElementById('pgjJugar')?.addEventListener('click', () => renderJuego(jugador));
        }

        inicioSnake();
    }

    /* ═══════════════════════════════
       RENDER TETRIS
    ═══════════════════════════════ */
    async function montarTetris(portal, cont, cfg) {
        let entradas = cfg.entradas || [];
        const titulo = esc(cfg.titulo || '🟦 Tetris');
        const clave = 'pg_jug_' + portal + '_juego_tetris';
        let jugador = null;
        try { jugador = JSON.parse(localStorage.getItem(clave) || 'null'); } catch (_) {}

        function renderJuego(jug) {
            cont.innerHTML = `<div class="pgj-caja"${cfg.config?.fondo ? ` style="background-image:url('${cfg.config.fondo}');background-size:cover;background-blend-mode:overlay"` : ''}>
                <h2>${titulo}</h2>
                <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:8px">
                    <span class="pgj-info">Jugador: <b style="color:var(--primary,#D8C395)">${esc(jug.nombre)}</b></span>
                    <button class="pgj-btn pgj-btn-sec" id="pgjSalir" style="min-height:30px;padding:2px 12px;font-size:.7rem">✕ Salir</button>
                </div>
                <p class="pgj-score-live" id="pgjScoreLive" style="margin:0 0 12px;text-align:center;font-size:1.1rem">PUNTOS: 0</p>
                <div class="pgj-tetris-body">
                    <div class="pgj-tetris-side">
                        <p style="font-size:.72rem;color:#888;margin:0 0 10px">⬆ Rotar · ⬇ Bajar<br>Espacio = Drop rápido</p>
                        <h3 style="font:700 .72rem var(--font-display,'Michroma',sans-serif);letter-spacing:.1em;color:var(--primary,#D8C395);text-transform:uppercase;margin:0 0 8px">Top 20</h3>
                        <div id="pgjLbWrap">${lbHTML(entradas)}</div>
                    </div>
                    <div class="pgj-canvas-col">
                        <canvas id="pgjCv" width="${T_W}" height="${T_H}" style="max-height:min(72vh,460px)"></canvas>
                        <p class="pgj-controles">← → Mover · ↑ Rotar · ↓ Bajar · Espacio = Drop</p>
                    </div>
                </div>
                <div class="pgj-dpad pgj-dpad-tetris" id="pgjDpad">
                    <div class="pgj-dpad-row">
                        <button data-act="rot">🔄<small>ROTAR</small></button>
                    </div>
                    <div class="pgj-dpad-row">
                        <button data-act="lft">⬅</button>
                        <button data-act="dwn">⬇<small>BAJAR</small></button>
                        <button data-act="rgt">➡</button>
                    </div>
                    <div class="pgj-dpad-row">
                        <button data-act="drp">⬇⬇ DROP RÁPIDO ⬇⬇</button>
                    </div>
                </div>
            </div>`;
            const cv = document.getElementById('pgjCv');
            document.getElementById('pgjSalir').addEventListener('click', () => { if (cv?._tclean) cv._tclean(); inicioTetris(); });
            let _dpadInterval = null;
            document.getElementById('pgjDpad')?.addEventListener('pointerdown', e => {
                const btn = e.target.closest('[data-act]');
                if (!btn) return;
                e.preventDefault();
                const fireAct = (a) => {
                    if (a === 'lft') document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft',  bubbles: true }));
                    if (a === 'rgt') document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
                    if (a === 'dwn') document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown',  bubbles: true }));
                    if (a === 'rot') document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp',    bubbles: true }));
                    if (a === 'drp') document.dispatchEvent(new KeyboardEvent('keydown', { key: ' ',          bubbles: true }));
                };
                const a = btn.dataset.act;
                fireAct(a);
                if (a === 'lft' || a === 'rgt' || a === 'dwn') {
                    clearInterval(_dpadInterval);
                    _dpadInterval = setInterval(() => fireAct(a), 120);
                }
            });
            document.getElementById('pgjDpad')?.addEventListener('pointerup',    () => clearInterval(_dpadInterval));
            document.getElementById('pgjDpad')?.addEventListener('pointerleave', () => clearInterval(_dpadInterval));
            iniciarTetris(cv,
                async (finalPts) => {
                    if (cv?._tclean) cv._tclean();
                    if (finalPts > 0 && jug) {
                        try {
                            await P.dinamica.registrar(portal, 'juego_tetris', { nombre: jug.nombre, ig: jug.ig || '', metadata: { puntos: finalPts } });
                            const cfg2 = await P.dinamica.publico(portal, 'juego_tetris');
                            if (cfg2?.entradas) {
                                entradas = cfg2.entradas;
                                const lb = document.getElementById('pgjLbWrap');
                                if (lb) lb.innerHTML = lbHTML(entradas);
                            }
                        } catch (e) { console.error('[PG Tetris]', e?.message || e); }
                    }
                    inicioTetris('Game over · ' + finalPts + ' pts');
                },
                (pts) => { const el = document.getElementById('pgjScoreLive'); if (el) el.textContent = 'PUNTOS: ' + pts; }
            );
        }

        function inicioTetris(msg) {
            cont.innerHTML = `<div class="pgj-caja"${cfg.config?.fondo ? ` style="background-image:url('${cfg.config.fondo}');background-size:cover;background-blend-mode:overlay"` : ''}>
                <h2>${titulo}</h2>
                <p class="pgj-sub">Tetris clásico — completa líneas para sumar puntos. Tu mejor puntaje queda en el ranking.</p>
                <div class="pgj-layout">
                    <div>
                        ${jugador
                            ? `<p class="pgj-info" style="margin-bottom:12px">Jugando como <b style="color:var(--primary,#D8C395)">${esc(jugador.nombre)}</b>
                                <button class="pgj-btn pgj-btn-sec" id="pgjCambiar" style="min-height:30px;padding:2px 10px;font-size:.65rem;margin-left:8px">Cambiar</button></p>
                               ${msg ? `<p class="pgj-msg" style="margin-bottom:10px">${esc(msg)}</p>` : ''}
                               <button class="pgj-btn" id="pgjJugar" style="margin-bottom:20px;width:100%;max-width:220px">▶ ${msg ? 'Jugar otra vez' : 'Jugar'}</button>`
                            : `<form id="pgjForm">
                                <div><label for="pgjNom">Nombre *</label><input id="pgjNom" required maxlength="40" placeholder="Tu nombre" autocomplete="off"></div>
                                <div><label for="pgjId">ID de Free Fire</label><input id="pgjId" maxlength="40" placeholder="Ej: 123456789" inputmode="numeric"></div>
                                <button type="submit" class="pgj-btn">Listo para jugar →</button>
                                <p class="pgj-msg" id="pgjMsgForm"></p>
                               </form>`}
                        <h3 style="font:700 .72rem var(--font-display,'Michroma',sans-serif);letter-spacing:.1em;color:var(--primary,#D8C395);text-transform:uppercase;margin:0 0 8px">Top 20</h3>
                        ${lbHTML(entradas)}
                    </div>
                    <div class="pgj-canvas-col">
                        <canvas id="pgjCvPrev" width="${T_W}" height="${T_H}" style="opacity:.2;max-height:min(82vh,480px)"></canvas>
                        <p class="pgj-controles">← → Mover · ↑ Rotar · Espacio = Drop</p>
                    </div>
                </div>
            </div>`;
            const cv = document.getElementById('pgjCvPrev');
            if (cv) { const cx = cv.getContext('2d'); cx.fillStyle = '#0a0a0a'; cx.fillRect(0, 0, T_W, T_H); }
            document.getElementById('pgjForm')?.addEventListener('submit', e => {
                e.preventDefault();
                const nombre = document.getElementById('pgjNom').value.trim();
                const ig = document.getElementById('pgjId').value.trim();
                const msgEl = document.getElementById('pgjMsgForm');
                if (!nombre) { msgEl.textContent = 'El nombre es requerido.'; return; }
                if (MALAS.test(nombre)) { msgEl.textContent = 'Ese nombre no está permitido.'; return; }
                try { localStorage.setItem(clave, JSON.stringify({ nombre, ig })); } catch (_) {}
                jugador = { nombre, ig }; inicioTetris();
            });
            document.getElementById('pgjCambiar')?.addEventListener('click', () => {
                try { localStorage.removeItem(clave); } catch (_) {} jugador = null; inicioTetris();
            });
            document.getElementById('pgjJugar')?.addEventListener('click', () => renderJuego(jugador));
        }

        inicioTetris();
    }

    /* ═══════════════════════════════
       RENDER 3 EN LÍNEA
    ═══════════════════════════════ */
    async function montar3enLinea(portal, cont, cfg) {
        let entradas = cfg.entradas || [];
        const titulo = esc(cfg.titulo || '✕○ Tres en Línea');
        const clave = 'pg_jug_' + portal + '_juego_3lineas';
        let jugador = null;
        try { jugador = JSON.parse(localStorage.getItem(clave) || 'null'); } catch (_) {}

        function renderJuego(jug) {
            let motor = null;
            cont.innerHTML = `<div class="pgj-caja"${cfg.config?.fondo ? ` style="background-image:url('${cfg.config.fondo}');background-size:cover;background-blend-mode:overlay"` : ''}>
                <h2>${titulo}</h2>
                <p class="pgj-info" style="margin-bottom:10px">
                    Jugador: <b style="color:var(--primary,#D8C395)">${esc(jug.nombre)}</b>
                    &nbsp;·&nbsp;
                    <button class="pgj-btn pgj-btn-sec" id="pgjSalir" style="min-height:32px;padding:2px 12px;font-size:.7rem">✕ Salir</button>
                </p>
                <div class="pgj-layout">
                    <div>
                        <p class="pgj-score-live" id="pgjWins">VICTORIAS: 0</p>
                        <p class="pgj-3-result" id="pgjResult" style="color:#aaa">Tú: ✕ &nbsp; CPU: ○</p>
                        <button class="pgj-btn pgj-btn-sec" id="pgjSigRonda" style="margin:12px 0;min-height:38px;padding:0 16px;font-size:.75rem" hidden>▶ Siguiente ronda</button>
                        <h3 style="font:700 .72rem var(--font-display,'Michroma',sans-serif);letter-spacing:.1em;color:var(--primary,#D8C395);text-transform:uppercase;margin:0 0 8px">Top 20</h3>
                        <div id="pgjLbWrap">${lbHTML(entradas)}</div>
                    </div>
                    <div class="pgj-canvas-col">
                        <canvas id="pgjCv" width="${TL_SIZE}" height="${TL_SIZE}" style="cursor:pointer;max-width:min(88vw,${TL_SIZE}px)"></canvas>
                        <p class="pgj-controles">Haz clic para colocar tu pieza</p>
                    </div>
                </div>
            </div>`;
            const cv = document.getElementById('pgjCv');
            let wins = 0;
            motor = iniciar3enLinea(cv, async (resultado, w, partidas) => {
                wins = w;
                const wEl = document.getElementById('pgjWins');
                const rEl = document.getElementById('pgjResult');
                const sigBtn = document.getElementById('pgjSigRonda');
                if (wEl) wEl.textContent = 'VICTORIAS: ' + wins;
                if (rEl) {
                    if (resultado === 'win') rEl.textContent = '🏆 ¡Ganaste esta ronda!';
                    else if (resultado === 'loss') rEl.textContent = '😔 Ganó la CPU esta vez';
                    else rEl.textContent = '🤝 Empate';
                    rEl.style.color = resultado === 'win' ? '#FFD54A' : resultado === 'loss' ? '#ff6b6b' : '#aaa';
                }
                if (sigBtn) sigBtn.hidden = false;
                if (resultado === 'win' && jug) {
                    try {
                        await P.dinamica.registrar(portal, 'juego_3lineas', { nombre: jug.nombre, ig: jug.ig || '', metadata: { puntos: wins } });
                        const cfg2 = await P.dinamica.publico(portal, 'juego_3lineas');
                        if (cfg2?.entradas) {
                            entradas = cfg2.entradas;
                            const lb = document.getElementById('pgjLbWrap');
                            if (lb) lb.innerHTML = lbHTML(entradas);
                        }
                    } catch (e) { console.error('[PG 3enLinea]', e?.message || e); }
                }
            });
            document.getElementById('pgjSalir').addEventListener('click', () => inicio3enLinea());
            document.getElementById('pgjSigRonda')?.addEventListener('click', () => {
                motor.reset();
                const rEl = document.getElementById('pgjResult');
                if (rEl) { rEl.textContent = 'Tú: ✕ &nbsp; CPU: ○'; rEl.style.color = '#aaa'; }
                const sigBtn = document.getElementById('pgjSigRonda');
                if (sigBtn) sigBtn.hidden = true;
            });
        }

        async function inicio3enLinea(msg) {
            try {
                const fresh = await P.dinamica.publico(portal, 'juego_3lineas');
                if (fresh?.entradas) entradas = fresh.entradas;
            } catch (_) {}
            cont.innerHTML = `<div class="pgj-caja"${cfg.config?.fondo ? ` style="background-image:url('${cfg.config.fondo}');background-size:cover;background-blend-mode:overlay"` : ''}>
                <h2>${titulo}</h2>
                <p class="pgj-sub">Tres en línea vs CPU — gana la mayor cantidad de rondas. ¡El jugador con más victorias gana!</p>
                <div class="pgj-layout">
                    <div>
                        ${jugador
                            ? `<p class="pgj-info" style="margin-bottom:12px">Jugando como <b style="color:var(--primary,#D8C395)">${esc(jugador.nombre)}</b>
                                <button class="pgj-btn pgj-btn-sec" id="pgjCambiar" style="min-height:30px;padding:2px 10px;font-size:.65rem;margin-left:8px">Cambiar</button></p>
                               ${msg ? `<p style="color:#4dff91;font-size:.9rem;margin-bottom:10px">${esc(msg)}</p>` : ''}
                               <button class="pgj-btn" id="pgjJugar" style="margin-bottom:20px;width:100%;max-width:220px">▶ Jugar</button>`
                            : `<form id="pgjForm">
                                <div><label for="pgjNom">Nombre *</label><input id="pgjNom" required maxlength="40" placeholder="Tu nombre" autocomplete="off"></div>
                                <div><label for="pgjId">ID de Free Fire</label><input id="pgjId" maxlength="40" placeholder="Ej: 123456789" inputmode="numeric"></div>
                                <button type="submit" class="pgj-btn">Listo para jugar →</button>
                                <p class="pgj-msg" id="pgjMsgForm"></p>
                               </form>`}
                        <h3 style="font:700 .72rem var(--font-display,'Michroma',sans-serif);letter-spacing:.1em;color:var(--primary,#D8C395);text-transform:uppercase;margin:0 0 8px">Top 20</h3>
                        <div id="pgjLbWrap">${lbHTML(entradas)}</div>
                    </div>
                    <div class="pgj-canvas-col">
                        <canvas id="pgjCvPrev" width="${TL_SIZE}" height="${TL_SIZE}" style="opacity:.25;max-width:min(88vw,${TL_SIZE}px)"></canvas>
                        <p class="pgj-controles">Haz clic en el tablero para jugar</p>
                    </div>
                </div>
            </div>`;
            const cv = document.getElementById('pgjCvPrev');
            if (cv) { const cx = cv.getContext('2d'); cx.fillStyle = '#0a0a0a'; cx.fillRect(0, 0, TL_SIZE, TL_SIZE); }
            document.getElementById('pgjForm')?.addEventListener('submit', e => {
                e.preventDefault();
                const nombre = document.getElementById('pgjNom').value.trim();
                const ig = document.getElementById('pgjId').value.trim();
                const msgEl = document.getElementById('pgjMsgForm');
                if (!nombre) { msgEl.textContent = 'El nombre es requerido.'; return; }
                if (MALAS.test(nombre)) { msgEl.textContent = 'Ese nombre no está permitido.'; return; }
                try { localStorage.setItem(clave, JSON.stringify({ nombre, ig })); } catch (_) {}
                jugador = { nombre, ig }; inicio3enLinea();
            });
            document.getElementById('pgjCambiar')?.addEventListener('click', () => {
                try { localStorage.removeItem(clave); } catch (_) {} jugador = null; inicio3enLinea();
            });
            document.getElementById('pgjJugar')?.addEventListener('click', () => renderJuego(jugador));
        }

        inicio3enLinea();
    }

    /* ═══════════════════════════════
       DISPATCHER PRINCIPAL
    ═══════════════════════════════ */
    const TIPOS = [
        { tipo: 'juego',        render: montarSnake    },
        { tipo: 'juego_tetris', render: montarTetris   },
        { tipo: 'juego_3lineas',render: montar3enLinea },
    ];

    async function montar(portal, destino, tipoForzado) {
        estilos();

        if (tipoForzado) {
            const def = TIPOS.find(t => t.tipo === tipoForzado);
            if (!def) return;
            const cont = contenedor(destino);
            cont.innerHTML = `<div class="pgj-caja" style="text-align:center;padding:40px;color:var(--gray,#B9B2A4)">
                <i class="fa-solid fa-circle-notch fa-spin" style="font-size:1.6rem;color:var(--primary,#D8C395);display:block;margin-bottom:14px"></i>Cargando…</div>`;
            try {
                const cfg = await P.dinamica.publico(portal, tipoForzado);
                if (!cfg?.activo) { cont.innerHTML = ''; return; }
                const navJuegos = document.getElementById('navJuegos');
                if (navJuegos) navJuegos.hidden = false;
                def.render(portal, cont, cfg);
            } catch (e) {
                cont.innerHTML = `<div class="pgj-caja pgj-msg" style="padding:30px;text-align:center">⚠️ ${esc(e.message)}</div>`;
            }
            return;
        }

        // Sin tipo forzado: verificar todos los tipos y montar los activos
        const cont = contenedor(destino);
        cont.innerHTML = `<div class="pgj-caja" style="text-align:center;padding:40px;color:var(--gray,#B9B2A4)">
            <i class="fa-solid fa-circle-notch fa-spin" style="font-size:1.6rem;color:var(--primary,#D8C395);display:block;margin-bottom:14px"></i>Cargando juego…</div>`;

        const activos = [];
        await Promise.all(TIPOS.map(async ({ tipo, render }) => {
            try {
                const cfg = await P.dinamica.publico(portal, tipo);
                if (cfg?.activo) activos.push({ tipo, render, cfg });
            } catch (_) {}
        }));

        if (!activos.length) { cont.innerHTML = ''; return; }

        const navJuegos = document.getElementById('navJuegos');
        if (navJuegos) navJuegos.hidden = false;

        cont.innerHTML = '';
        // Cada juego activo en su propio sub-contenedor
        for (const { tipo, render, cfg } of activos) {
            const sub = document.createElement('div');
            sub.className = 'pgj';
            cont.appendChild(sub);
            render(portal, sub, cfg);
        }
    }

    function autoMontar() {
        if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', autoMontar); return; }
        if (location.pathname.includes('/admin/')) return;
        if (!window.PumasPortal?.PORTALES) return;
        if (!document.getElementById('pgJuego')) return;
        const seg = location.pathname.split('/').filter(Boolean)[0];
        const scriptPortal = document.querySelector('script[data-portal]');
        const portal = (seg && window.PumasPortal.PORTALES[seg]) ? seg
                     : (scriptPortal?.dataset.portal) || null;
        if (!portal || !window.PumasPortal.PORTALES[portal]) return;
        montar(portal, 'pgJuego');
    }
    autoMontar();

    window.PumasPortal = window.PumasPortal || {};
    window.PumasPortal.juegos = { montar };
})();
