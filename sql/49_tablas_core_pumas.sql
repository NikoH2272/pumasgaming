-- =====================================================================
--  PUMAS GAMING · 49 · Tablas core del sistema de entrenamientos Pumas
--  Estas tablas no tenían CREATE TABLE guardado — se recrean aquí.
--  También crea los buckets de Storage necesarios.
--  Idempotente.
-- =====================================================================

-- 1) SESIONES DE ENTRENAMIENTOS ----------------------------------------
create table if not exists public.entrenamientos_sesiones (
    id          bigint generated always as identity primary key,
    titulo      text,
    jornada     text,
    fecha       timestamptz not null default now(),
    moderador   text,
    archivo_url text,         -- carpeta en Storage 'entrenamientos_logs'
    creado_por  text,
    creado      timestamptz  not null default now()
);
create index if not exists es_fecha_idx on public.entrenamientos_sesiones (fecha desc);

alter table public.entrenamientos_sesiones enable row level security;

drop policy if exists "es lectura publica" on public.entrenamientos_sesiones;
create policy "es lectura publica"
    on public.entrenamientos_sesiones for select using (true);

drop policy if exists "es escritura admin" on public.entrenamientos_sesiones;
create policy "es escritura admin"
    on public.entrenamientos_sesiones for all using (true) with check (true);


-- 2) RESULTADOS POR SALA -----------------------------------------------
create table if not exists public.salas_resultados (
    id            bigint generated always as identity primary key,
    sesion_id     bigint not null
                        references public.entrenamientos_sesiones(id)
                        on delete cascade,
    numero_sala   smallint,
    equipo_nombre text,
    rank          smallint,
    kill_score    smallint  not null default 0,
    rank_score    smallint  not null default 0,
    total_score   smallint  not null default 0,
    es_booyah     boolean   not null default false
);
create index if not exists sr_sesion_idx on public.salas_resultados (sesion_id);

alter table public.salas_resultados enable row level security;

drop policy if exists "sr lectura publica" on public.salas_resultados;
create policy "sr lectura publica"
    on public.salas_resultados for select using (true);

drop policy if exists "sr escritura admin" on public.salas_resultados;
create policy "sr escritura admin"
    on public.salas_resultados for all using (true) with check (true);


-- 3) TOP KILLERS -------------------------------------------------------
create table if not exists public.top_killers (
    id             bigint generated always as identity primary key,
    sesion_id      bigint not null
                         references public.entrenamientos_sesiones(id)
                         on delete cascade,
    jugador_nombre text,
    equipo_nombre  text,
    kills          smallint not null default 0
);
create index if not exists tk_sesion_idx on public.top_killers (sesion_id);

alter table public.top_killers enable row level security;

drop policy if exists "tk lectura publica" on public.top_killers;
create policy "tk lectura publica"
    on public.top_killers for select using (true);

drop policy if exists "tk escritura admin" on public.top_killers;
create policy "tk escritura admin"
    on public.top_killers for all using (true) with check (true);


-- 4) EQUIPOS REGISTRADOS (VIP) -----------------------------------------
create table if not exists public.equipos_registrados (
    id        bigint generated always as identity primary key,
    nombre    text not null,
    tag       text,
    logo_url  text,
    creado    timestamptz not null default now()
);

alter table public.equipos_registrados enable row level security;

drop policy if exists "er lectura publica" on public.equipos_registrados;
create policy "er lectura publica"
    on public.equipos_registrados for select using (true);

drop policy if exists "er escritura admin" on public.equipos_registrados;
create policy "er escritura admin"
    on public.equipos_registrados for all using (true) with check (true);


-- 5) STORAGE: BUCKET ENTRENAMIENTOS_LOGS --------------------------------
--    Bucket para los archivos .log de cada sesión de entrenamiento.
--    El admin sube, todos pueden leer para ver resultados.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
    'entrenamientos_logs',
    'entrenamientos_logs',
    true,          -- público: las descargas no necesitan token
    5242880,       -- 5 MB por archivo
    array['text/plain', 'application/octet-stream']
)
on conflict (id) do nothing;

drop policy if exists "el lectura publica" on storage.objects;
create policy "el lectura publica"
    on storage.objects for select
    using (bucket_id = 'entrenamientos_logs');

drop policy if exists "el subida admin" on storage.objects;
create policy "el subida admin"
    on storage.objects for insert
    with check (bucket_id = 'entrenamientos_logs');

drop policy if exists "el borrado admin" on storage.objects;
create policy "el borrado admin"
    on storage.objects for delete
    using (bucket_id = 'entrenamientos_logs');

drop policy if exists "el actualizacion admin" on storage.objects;
create policy "el actualizacion admin"
    on storage.objects for update
    using (bucket_id = 'entrenamientos_logs');


-- 6) STORAGE: BUCKET LOGOS_EQUIPOS ------------------------------------
--    Bucket para logos de equipos VIP.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
    'logos_equipos',
    'logos_equipos',
    true,
    2097152,       -- 2 MB
    array['image/png', 'image/jpeg', 'image/webp', 'image/gif']
)
on conflict (id) do nothing;

drop policy if exists "le lectura publica" on storage.objects;
create policy "le lectura publica"
    on storage.objects for select
    using (bucket_id = 'logos_equipos');

drop policy if exists "le subida admin" on storage.objects;
create policy "le subida admin"
    on storage.objects for insert
    with check (bucket_id = 'logos_equipos');

drop policy if exists "le borrado admin" on storage.objects;
create policy "le borrado admin"
    on storage.objects for delete
    using (bucket_id = 'logos_equipos');


-- 7) VERIFICACIÓN -------------------------------------------------------
select table_name from information_schema.tables
 where table_schema = 'public'
   and table_name in (
       'entrenamientos_sesiones', 'salas_resultados',
       'top_killers', 'equipos_registrados'
   )
 order by 1;

select id, name, public from storage.buckets
 where id in ('entrenamientos_logs', 'logos_equipos')
 order by 1;
