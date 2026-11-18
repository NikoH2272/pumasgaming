import { cachePolicy, cacheHeaders, canonicalJSON } from './cache-policy.mjs?v=20261117b';

// Transporte de supabase-js; conserva AbortSignal y deja intactas las escrituras.
export async function fetchPublico(input, init, options) {
    const network = options.fetch || globalThis.fetch;
    const request = new Request(input, init);
    const url = new URL(request.url);
    const match = /^\/rest\/v1\/(?:rpc\/([a-z0-9_]+)|([a-z0-9_]+))$/.exec(url.pathname);
    const auth = request.headers.get('Authorization');
    if (options.privatePage || url.origin !== options.supabaseURL || !match ||
        (auth && auth !== 'Bearer ' + options.anonKey) ||
        (request.headers.has('Accept-Profile') && request.headers.get('Accept-Profile') !== 'public') ||
        (request.headers.has('Content-Profile') && request.headers.get('Content-Profile') !== 'public')) return network(request);
    const kind = match[1] ? 'rpc' : 'table', name = match[1] || match[2];
    if (request.method !== (kind === 'rpc' ? 'POST' : 'GET')) return network(request);
    let args = {};
    if (kind === 'rpc') {
        const text = await request.clone().text();
        if (text.length > 4096) return network(request);
        try { args = JSON.parse(text || '{}'); } catch { return network(request); }
    }
    if (!cachePolicy(kind, name, url.searchParams, args) || !cacheHeaders(request.headers)) return network(request);
    const target = new URL('/api/public-cache/' + kind + '/' + name, options.origin);
    target.search = kind === 'rpc' ? new URLSearchParams({ params: canonicalJSON(args) }).toString() : url.search;
    const headers = new Headers();
    for (const key of ['Accept', 'Range', 'Prefer']) if (request.headers.has(key)) headers.set(key, request.headers.get(key));
    try {
        const response = await network(target, { headers, signal: request.signal, credentials: 'omit', cache: 'no-store' });
        // Compatibilidad con previews estáticas o despliegues anteriores, sin ocultar errores de datos.
        if ([404, 503].includes(response.status) || (response.ok && !response.headers.get('Content-Type')?.includes('json'))) return network(request);
        return response;
    } catch (error) {
        if (request.signal.aborted || error.name === 'AbortError') throw error;
        return network(request);
    }
}
