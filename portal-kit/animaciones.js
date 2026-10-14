/* =====================================================================
   PUMAS GAMING · Animaciones con Motion (portal-kit/vendor/motion.js)
   · Portada de cada portal: entra por capas (etiqueta, título, texto, cifras).
   · Secciones y tarjetas: aparecen al llegar a ellas (una vez), escalonadas.
   · Cifras de la portada: cuentan desde 0 hasta su valor.
   · Menú en celular: los enlaces bajan uno tras otro.
   No hace nada si el usuario pidió "reducir movimiento" en su sistema.
   Lo carga portal.js; las páginas no tienen que hacer nada.
   ===================================================================== */
(function () {
    const M = window.Motion;
    if (!M || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const { animate, inView, stagger } = M;
    const SALIDA = [0.22, 1, 0.36, 1];   // frena suave al final
    const modo = (document.querySelector('script[data-modo]') || {}).dataset || {};
    const publico = modo.modo === 'publico';
    // Seguro: si el navegador frena las animaciones (pestaña sin dibujar, ahorro de batería),
    // el contenido aparece igual pasado un momento; nunca se queda invisible.
    const asegurar = (els, ms) => setTimeout(() => [].concat(els).forEach(el => {
        if (!el || parseFloat(getComputedStyle(el).opacity) >= 0.99) return;
        // La animación del navegador manda sobre el estilo: se termina (o se quita) y se deja visible
        (el.getAnimations ? el.getAnimations() : []).forEach(an => { try { an.finish(); } catch (e) { an.cancel(); } });
        if (parseFloat(getComputedStyle(el).opacity) < 0.99) {
            (el.getAnimations ? el.getAnimations() : []).forEach(an => an.cancel());
            el.style.opacity = '1'; el.style.transform = '';   // sin pisar el transform del CSS
        }
    }), ms);

    /* ---------- Portada ---------- */
    const hero = document.querySelector('.portal-hero, section.hero, .hero');
    if (hero && hero.getBoundingClientRect().top < window.innerHeight) {
        const piezas = [...hero.querySelectorAll('.eyebrow, h1, .hero-copy > p, .hero > p, .stat-row > div, .hero-actions > *, .asc-carrusel')]
            .filter(el => el.offsetParent && getComputedStyle(el).transform === 'none');
        if (piezas.length) { animate(piezas, { opacity: [0, 1], y: [22, 0] }, { delay: stagger(0.06, { startDelay: 0.05 }), duration: 0.6, ease: SALIDA }); asegurar(piezas, 1800); }
        const marca = hero.querySelector('.hero-mark, .hero-visual');
        // El rombo del logo y la mascota ya tienen su propio giro/posición en CSS: solo se anima la opacidad
        if (marca) { animate(marca, { opacity: [0, 1] }, { duration: 0.9, delay: 0.15, ease: SALIDA }); asegurar(marca, 1800); }
        const mascota = hero.querySelector('.hero-mascota');
        if (mascota) { animate(mascota, { opacity: [0, 1] }, { duration: 0.8, delay: 0.35, ease: SALIDA }); asegurar(mascota, 1800); }
    }

    /* ---------- Cifras que cuentan ---------- */
    // Las cifras se llenan cuando llegan los datos: se anima cada vez que pasan de 0 a un número
    const contar = b => {
        const fin = parseInt(String(b.textContent).replace(/[^\d]/g, ''), 10);
        if (!fin || b.dataset.pgContado === String(fin)) return;
        b.dataset.pgContado = String(fin);
        animate(0, fin, {
            duration: Math.min(1.4, 0.5 + fin / 4000), ease: SALIDA,
            onUpdate: v => { b.dataset.pgAnimando = '1'; b.textContent = Math.round(v).toLocaleString('es'); },
            onComplete: () => { delete b.dataset.pgAnimando; b.textContent = fin.toLocaleString('es'); }
        });
        setTimeout(() => { if (b.dataset.pgAnimando || b.textContent !== fin.toLocaleString('es')) { delete b.dataset.pgAnimando; b.textContent = fin.toLocaleString('es'); } }, 2000);
    };
    document.querySelectorAll('.stat-row b, .hero-stats b, .stats-hero b').forEach(b => {
        contar(b);
        new MutationObserver(() => { if (!b.dataset.pgAnimando) contar(b); }).observe(b, { childList: true, characterData: true, subtree: true });
    });

    /* ---------- Secciones y tarjetas al llegar a ellas ---------- */
    // Si el navegador no dibuja cuadros (pestaña congelada, ahorro extremo), no se esconde nada
    let congelado = false;
    const prueba = setTimeout(() => {
        congelado = true;
        document.querySelectorAll('[data-pg-anim]').forEach(el => { if (el.style.opacity === '0') el.style.opacity = ''; });
    }, 800);
    requestAnimationFrame(() => requestAnimationFrame(() => clearTimeout(prueba)));
    if (publico) {
        const SEL = '.section-title, .card-box, .dashboard-col, .cupo-card, .jornadas-grid > *, .res-grid > *, .semana-grid > *, .cpl-dest, .cpl-tabla, .tabla-contenedor';
        const grupos = new WeakMap();   // tarjetas hermanas entran escalonadas
        function preparar(el) {
            if (el.dataset.pgAnim || el.closest('[data-pg-anim="1"]:not(.section-title)') && !el.matches('.cpl-dest, .cupo-card')) return;
            el.dataset.pgAnim = '1';
            if (congelado) return;
            const caja = el.getBoundingClientRect();
            if (caja.top < window.innerHeight * 0.92 && caja.bottom > 0) return;   // ya está a la vista: sin parpadeo
            el.style.opacity = '0';
            inView(el, () => {
                const padre = el.parentElement;
                const orden = grupos.get(padre) || 0;
                grupos.set(padre, orden + 1);
                setTimeout(() => grupos.set(padre, 0), 400);
                const propio = getComputedStyle(el).transform !== 'none';   // si ya tiene transform en CSS, solo opacidad
                animate(el, propio ? { opacity: [0, 1] } : { opacity: [0, 1], y: [26, 0] }, { duration: 0.55, delay: Math.min(orden, 6) * 0.06, ease: SALIDA });
                asegurar(el, 1400);
            }, { margin: '0px 0px -6% 0px' });
        }
        document.querySelectorAll(SEL).forEach(preparar);
        // Lo que llega después (resultados, cupos, análisis) también entra animado
        new MutationObserver(lista => lista.forEach(m => m.addedNodes.forEach(n => {
            if (n.nodeType !== 1) return;
            if (n.matches(SEL)) preparar(n);
            n.querySelectorAll(SEL).forEach(preparar);
        }))).observe(document.body, { childList: true, subtree: true });
        // Por si algo quedó oculto (pestaña que nunca se abrió y luego se imprime, etc.)
        window.addEventListener('beforeprint', () => document.querySelectorAll('[data-pg-anim]').forEach(el => { el.style.opacity = ''; }));
    }

    /* ---------- Menú: los enlaces bajan escalonados al abrirlo ---------- */
    const nav = document.getElementById('mainNav');
    if (nav) {
        new MutationObserver(() => {
            if (!nav.classList.contains('is-active') || getComputedStyle(nav).position !== 'absolute') return;
            const items = [...nav.querySelectorAll(':scope > ul > li')].filter(li => !li.hidden);
            animate(nav, { opacity: [0, 1], y: [-8, 0] }, { duration: 0.25, ease: SALIDA });
            animate(items, { opacity: [0, 1], x: [-12, 0] }, { delay: stagger(0.035), duration: 0.3, ease: SALIDA });
            asegurar([nav, ...items], 900);
        }).observe(nav, { attributes: true, attributeFilter: ['class'] });
    }

    /* ---------- Pestañas segmentadas: el resaltado se desliza ---------- */
    document.addEventListener('click', e => {
        const b = e.target.closest('.segmentos button');
        if (b) animate(b, { scale: [0.94, 1] }, { duration: 0.25, ease: SALIDA });
    });
})();
