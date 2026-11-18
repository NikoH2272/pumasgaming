/* La portada muestra posters primero; el video se carga después de interactuar. */
(() => {
    // Descargar servicios después de dibujar la portada. async=false conserva
    // el orden de ejecución sin serializar las descargas.
    function iniciarServicios() {
        const icons = document.createElement('link');
        icons.rel = 'stylesheet';
        icons.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css';
        document.head.appendChild(icons);
        const scripts = [
            ['script.js?v=20261117b'],
            ['https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2'],
            ['portal-kit/portal.js?v=20261117c', {portal:'principal', modo:'publico', sinAnimaciones:''}],
            ['portal-kit/descargas.js?v=20261103b'],
            ['entrenamientos.js?v=20261117c'],
            ['portal-kit/juegos.js?v=20261014a']
        ];
        scripts.forEach(([src, data]) => {
            const script = document.createElement('script');
            script.src = src;
            script.async = false;
            if (data) Object.assign(script.dataset, data);
            script.onerror = () => {
                const target = document.querySelector('#trainMain > p');
                if (target) target.textContent = 'No se pudieron cargar los servicios. Recarga la página para volver a intentarlo.';
            };
            document.head.appendChild(script);
        });
        const analytics = document.createElement('script');
        analytics.src = 'https://www.googletagmanager.com/gtag/js?id=G-C79JND219Y';
        analytics.async = true;
        document.head.appendChild(analytics);
    }
    // Un rAF por sí solo puede ejecutarse antes del primer contenido visible.
    // La entrada Paint confirma que la portada ya llegó a pantalla.
    if (window.PerformanceObserver && PerformanceObserver.supportedEntryTypes?.includes('paint')) {
        const painted = new PerformanceObserver(list => {
            if (list.getEntries().some(entry => entry.name === 'first-contentful-paint')) {
                painted.disconnect();
                iniciarServicios();
            }
        });
        painted.observe({ type: 'paint', buffered: true });
    } else {
        const start = () => requestAnimationFrame(() => requestAnimationFrame(iniciarServicios));
        if (document.readyState === 'complete') start();
        else window.addEventListener('load', start, { once: true });
    }

    const videos = [...document.querySelectorAll('video[data-src]')];
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
    const connection = navigator.connection;
    let interacted = false;
    const automatic = () => !reducedMotion.matches && !connection?.saveData;

    function load(video) {
        if (video.dataset.src) {
            video.src = video.dataset.src;
            delete video.dataset.src;
            video.load();
        }
    }

    const observer = new IntersectionObserver(entries => {
        for (const { target: video, isIntersecting } of entries) {
            video.dataset.visible = String(isIntersecting);
            if (!isIntersecting) video.pause();
            else if (interacted && automatic()) {
                load(video);
                video.play().catch(() => {});
            }
        }
    }, { threshold: 0.1 });
    videos.forEach(video => {
        video.addEventListener('playing', () => video.setAttribute('data-playing', ''));
        observer.observe(video);
        // Los controles permiten reproducir manualmente incluso con ahorro de datos.
        video.addEventListener('pointerdown', () => load(video), { once: true });
        video.addEventListener('keydown', () => load(video), { once: true });
    });

    function start() {
        if (interacted) return;
        interacted = true;
        for (const video of videos) {
            if (automatic() && video.dataset.visible === 'true') {
                load(video);
                video.play().catch(() => {});
            }
        }
    }
    ['pointerdown', 'keydown', 'scroll'].forEach(event => {
        window.addEventListener(event, start, { once: true, passive: true });
    });
    reducedMotion.addEventListener('change', () => {
        if (reducedMotion.matches) videos.forEach(video => video.pause());
    });
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) videos.forEach(video => video.pause());
    });
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape') {
            const open = document.getElementById('mainNav')?.classList.contains('is-active');
            closeMenu();
            if (open) document.querySelector('.menu-toggle')?.focus();
        }
    });
})();
