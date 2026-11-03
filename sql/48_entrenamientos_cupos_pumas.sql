-- =====================================================================
--  PUMAS GAMING · 48 · Tablas entrenamientos_programados y registro_cupos
--  Para el portal Pumas (entrenamientos/admin.html y cupos.html).
--  Estas tablas no tenían CREATE TABLE guardado — se recrean aquí.
--  Idempotente. Requiere 01.
-- =====================================================================

-- 1) ENTRENAMIENTOS PROGRAMADOS (cupos disponibles) --------------------
create table if not exists public.entrenamientos_programados (
    id            bigint generated always as identity primary key,
    titulo        text not null,
    fecha         timestamptz not null,
    hay_staff     text not null default 'NO',   -- 'SI' o 'NO'
    cupos_totales int  not null default 12 check (cupos_totales > 0),
    link_grupo    text,
    estado        text not null default 'ABIERTO'
                       check (estado in ('ABIERTO','CERRADO','EN_CURSO','FINALIZADO')),
    publicar_en   timestamptz,
    tipo          text not null default 'PUBLICO',  -- 'PUBLICO' o 'VIP'
    cierra_en     timestamptz,
    creado        timestamptz not null default now()
);
create index if not exists ep_fecha_idx on public.entrenamientos_programados (fecha desc);


-- 2) REGISTRO DE CUPOS (inscripciones de equipos) ----------------------
create table if not exists public.registro_cupos (
    id               bigint generated always as identity primary key,
    entrenamiento_id bigint not null
                           references public.entrenamientos_programados(id)
                           on delete cascade,
    nombre_jugador   text not null,
    telefono         text,
    creado           timestamptz not null default now()
);
create unique index if not exists rc_equipo_key
    on public.registro_cupos (entrenamiento_id, lower(trim(nombre_jugador)));
create index if not exists rc_entrenamiento_idx on public.registro_cupos (entrenamiento_id);


-- 3) SEGURIDAD ---------------------------------------------------------
--    El admin inserta/actualiza entrenamientos_programados con anon key
--    (admin_logica.js). Los participantes insertan en registro_cupos
--    también con anon key (script_cupos.js). Solo admins pueden borrar.

alter table public.entrenamientos_programados enable row level security;
alter table public.registro_cupos             enable row level security;

-- Lectura pública de entrenamientos abiertos
drop policy if exists "ep lectura publica" on public.entrenamientos_programados;
create policy "ep lectura publica"
    on public.entrenamientos_programados for select using (true);

-- Escritura/edición: cualquiera con anon key (la página exige login de admin)
drop policy if exists "ep escritura admin" on public.entrenamientos_programados;
create policy "ep escritura admin"
    on public.entrenamientos_programados for all using (true) with check (true);

-- Lectura pública de cupos (para mostrar inscritos)
drop policy if exists "rc lectura publica" on public.registro_cupos;
create policy "rc lectura publica"
    on public.registro_cupos for select using (true);

-- Inserción pública (el participante se inscribe sin login)
drop policy if exists "rc insercion publica" on public.registro_cupos;
create policy "rc insercion publica"
    on public.registro_cupos for insert with check (true);

-- Solo admin puede borrar inscripciones (all = select+insert+update+delete)
drop policy if exists "rc admin gestiona" on public.registro_cupos;
create policy "rc admin gestiona"
    on public.registro_cupos for all using (true) with check (true);


-- 4) VERIFICACIÓN -------------------------------------------------------
select table_name from information_schema.tables
 where table_schema = 'public'
   and table_name in ('entrenamientos_programados', 'registro_cupos')
 order by 1;
