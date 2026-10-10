/* Categorías de los ascensos (lo que eliges en "Evento" de la herramienta).
   · Eventos: cada logo de ascensos/imagenes es un entreno. La imagen sale SIN fondo,
     en formato tabla, con el logo, moderador, fecha y hora, y los colores del logo.
   · Clásicos: los diseños de antes, con imagen de fondo (.tema-<id> en style.css).
   El portal usa el color de cada una para mostrar en qué evento jugó cada equipo.
   Para agregar un evento: sube su logo PNG a ascensos/imagenes/ y añade una línea aquí. */
(function () {
    const L = n => '/ascensos/imagenes/' + encodeURIComponent(n);
    const evento = (id, nombre, logo, color, color2) => ({ id: 'ev_' + id, nombre, corto: nombre.toUpperCase(), color, color2, logo: L(logo), tipo: 'evento' });
    window.ASC_CATEGORIAS = [
        evento('9z',         '9z',          '9z.png',           '#F2F2F2', '#8C8C8C'),
        evento('bloody',     'Bloody',      'bloody.png',       '#F5C400', '#E08E00'),
        evento('bluecheese', 'Blue Cheese', 'blue cheese.png',  '#1E9BF0', '#0B5FC4'),
        evento('cacm',       'CACM',        'cacmlogo.png',     '#D10000', '#FFFFFF'),
        evento('chill',      'Chill',       'chill.png',        '#F03A1E', '#FF8A5C'),
        evento('estorm',     'eStorm',      'estorm.png',       '#F5B800', '#6A2BB0'),
        evento('fuego',      'Fuego',       'fuego.png',        '#F26A00', '#B81E00'),
        evento('gamerhood',  'Gamerhood',   'gamerhood.png',    '#F2F2F2', '#6E6E6E'),
        evento('infinity',   'Infinity',    'infinity.png',     '#F0281A', '#FF7A55'),
        evento('leviatan',   'Leviatán',    'leviatanlogo.png', '#32A9DE', '#1C6F99'),
        evento('lyon',       'Lyon',        'lyonlogo.png',     '#C9984C', '#8C6328'),
        evento('mia',        'MIA',         'mia.png',          '#F00000', '#8B0000'),
        evento('nova',       'Nova',        'nova.png',         '#7A1FD6', '#B47CFF'),
        // Clásicos con imagen de fondo
        { id: 'pumasgg',   nombre: 'Pumas Gaming',  corto: 'PUMAS',     color: '#FFCC00', tipo: 'fondo' },
        { id: 'alca',      nombre: 'Alca Coach',    corto: 'ALCA',      color: '#B04DD6', tipo: 'fondo' },
        { id: 'cacm',      nombre: 'CACM FFWS',     corto: 'CACM',      color: '#FF4D4D', tipo: 'fondo' },
        { id: 'leviatan',  nombre: 'Leviatán FFWS', corto: 'LEVIATÁN',  color: '#00B4D8', tipo: 'fondo' },
        { id: 'lyon',      nombre: 'Lyon FFWS',     corto: 'LYON',      color: '#D4A373', tipo: 'fondo' },
        { id: 'levxtatsu', nombre: 'Lev x Tatsu',   corto: 'LEVXTATSU', color: '#5B8CFF', tipo: 'fondo' }
    ];
    window.ASC_CATEGORIA = id => window.ASC_CATEGORIAS.find(c => c.id === id)
        || { id: id || 'general', nombre: String(id || 'General').toUpperCase(), corto: String(id || 'GENERAL').toUpperCase(), color: '#9AA0A6', tipo: 'fondo' };
    // <option>s agrupadas para los selectores de la herramienta
    window.ASC_OPCIONES = sel => {
        const op = c => `<option value="${c.id}"${c.id === sel ? ' selected' : ''}>${c.nombre}</option>`;
        return `<optgroup label="Eventos (tabla sin fondo, colores del logo)">${window.ASC_CATEGORIAS.filter(c => c.tipo === 'evento').map(op).join('')}</optgroup>` +
               `<optgroup label="Clásicos (con imagen de fondo)">${window.ASC_CATEGORIAS.filter(c => c.tipo !== 'evento').map(op).join('')}</optgroup>`;
    };

    // Puntos por posición (top) en cada sala
    window.ASC_PUNTOS = { 1: 12, 2: 9, 3: 8, 4: 7, 5: 6, 6: 5, 7: 4, 8: 3, 9: 2, 10: 1, 11: 0, 12: 0 };
    // Ascenso directo: 45 puntos de posición o más y 3 o 4 tags
    window.ASC_REGLA = { puntos: 45, tags: [3, 4] };
})();
