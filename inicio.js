/* La portada muestra posters primero; el video se carga después de interactuar. */
(() => {
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
