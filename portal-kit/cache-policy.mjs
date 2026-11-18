// Registro compartido por el navegador y el Worker. Solo lecturas públicas auditadas.
// Una función nueva NO entra en caché hasta añadir su política explícitamente.
export const CACHE_VERSION = '20261117b';
const portal = v => v === null || (typeof v === 'string' && /^[a-z0-9_]{2,40}$/.test(v));
const fecha = v => v === null || (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v));
const limite = v => Number.isInteger(v) && v >= 1 && v <= 200;
const orden = v => ['pr', 'pg', 'kill'].includes(v);
const rpc = (ttl, params) => ({ ttl, params });
const tabla = (ttl, columns, required = {}) => ({ ttl, columns: columns.split(','), required });

export const PUBLIC_CACHE = Object.freeze({
    rpc: Object.freeze({
        latam_resumen: rpc(30, { p_portal: portal, p_completo: v => typeof v === 'boolean' }),
        // Las vistas LATAM pesan 144 KB por página (hasta 490 KB asc_jornadas): con 30 s cada nodo de
        // Cloudflare las volvía a pedir a Supabase dos veces por minuto. Los datos solo cambian cuando el
        // staff sube resultados; para publicar al instante basta subir PUBLIC_CACHE_VERSION y desplegar.
        latam_historico: rpc(300, { p_portal: portal, p_orden: orden, p_limite: limite }),
        latam_ranking: rpc(30, { p_portal: portal, p_orden: orden, p_limite: limite, p_desde: fecha, p_hasta: fecha }),
        latam_calendario: rpc(300, { p_portal: portal, p_desde: fecha, p_hasta: fecha }),
        asc_equipos_activos: rpc(120, { p_portal: portal }),
        portal_features: rpc(120, { p_portal: portal }),
        portal_ascensos_config: rpc(120, { p_portal: portal })
    }),
    table: Object.freeze({
        portales: tabla(180, 'id,nombre,color,color2,color_tema,logo,titulo,subtitulo,ruta,tipo,activo,latam,link,orden,fem_activo,fem_color,fem_color2,fem_logo,plantilla_resultados,ascenso_id,logo_bg,color_fuente,categoria,liga_vip_id,ev_ascenso'),
        v_latam_sesiones: tabla(300, 'id,portal,titulo,jornada,fecha,moderador'),
        v_latam_equipos: tabla(300, 'sesion_id,portal,fecha,equipo,salas,pts,kills,booyahs'),
        v_latam_killers: tabla(300, 'sesion_id,portal,fecha,jugador,equipo,kills,salas'),
        asc_jornadas: tabla(180, 'id,portal,categoria,titulo,fecha,horario,moderador,salas,modo,equipos,clasificados,creado_por,creado,imagen'),
        // Lista pública de baneados: sin numero, creado_por ni avisos (esas columnas solo las pide el staff, sin caché).
        asc_baneados: tabla(120, 'id,portal,equipo,tag,motivo,hasta,evento'),
        // Resultados de entrenamientos (Pumas): se piden por sesión; 60 s para que el resultado en vivo no se atrase.
        top_killers: tabla(60, 'sesion_id,jugador_nombre,equipo_nombre,kills'),
        salas_resultados: tabla(60, 'sesion_id,numero_sala,equipo_nombre,rank,kill_score,rank_score,total_score,es_booyah'),
        entrenamientos_stats: tabla(120, 'sesion_id,portal,salas,kills,equipos,jugadores'),
        entrenamientos_sesiones: tabla(120, 'id,titulo,jornada,fecha'),
        noticias: tabla(120, 'id,tipo,fecha_display,contenido,url,orden,created_at,activo', { activo: 'eq.true' }),
        eventos_latam: tabla(120, 'id,titulo,tipo,fecha,hora,precio_cop,precio_usd,destacado,activo', { activo: 'eq.true' })
    })
});

export function canonicalJSON(value) {
    if (Array.isArray(value)) return '[' + value.map(canonicalJSON).join(',') + ']';
    if (value && typeof value === 'object') return '{' + Object.keys(value).sort().map(k => JSON.stringify(k) + ':' + canonicalJSON(value[k])).join(',') + '}';
    return JSON.stringify(value);
}

export function cacheHeaders(headers) {
    const accept = headers.get('Accept') || 'application/json';
    const range = headers.get('Range') || '';
    const prefer = headers.get('Prefer') || '';
    if (!['application/json', 'application/vnd.pgrst.object+json', '*/*'].includes(accept) ||
        (range && (!/^\d{1,6}-\d{1,6}$/.test(range) || +range.split('-')[1] < +range.split('-')[0] || +range.split('-')[1] - +range.split('-')[0] >= 1000)) ||
        (prefer && !/^count=(exact|planned|estimated)$/.test(prefer)) ||
        (headers.has('Range-Unit') && headers.get('Range-Unit') !== 'items')) return null;
    return { accept, range, prefer };
}

export function cachePolicy(kind, name, query = new URLSearchParams(), args = {}) {
    const policy = Object.hasOwn(PUBLIC_CACHE[kind] || {}, name) ? PUBLIC_CACHE[kind][name] : null;
    if (!policy) return null;
    if (kind === 'rpc') {
        if (!args || Array.isArray(args) || typeof args !== 'object' || query.size) return null;
        if (!Object.entries(args).every(([k, v]) => Object.hasOwn(policy.params, k) && policy.params[k](v))) return null;
        return policy;
    }
    // No *, relaciones embebidas, alias ni columnas nuevas sin revisar.
    const selected = (query.get('select') || '').split(',').map(s => s.trim());
    if (!selected.length || selected.some(c => !policy.columns.includes(c))) return null;
    for (const [key, value] of Object.entries(policy.required)) if (query.get(key) !== value) return null;
    const seen = new Set();
    for (const [key, value] of query) {
        if (seen.has(key) || value.length > 3000) return null;
        seen.add(key);
        if (key === 'select') continue;
        if (key === 'limit' || key === 'offset') {
            if (!/^\d{1,6}$/.test(value) || (key === 'limit' && (+value < 1 || +value > 1000))) return null;
        } else if (key === 'order') {
            if (!value.split(',').every(part => {
                const [column, ...modifiers] = part.split('.');
                return policy.columns.includes(column) && modifiers.every(m => ['asc', 'desc', 'nullsfirst', 'nullslast'].includes(m));
            })) return null;
        } else if (!policy.columns.includes(key) || !/^(eq|neq|gt|gte|lt|lte|is|in|like|ilike)\./.test(value)) return null;
    }
    return policy;
}
