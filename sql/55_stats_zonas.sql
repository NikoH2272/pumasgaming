-- =====================================================================
--  PUMAS GAMING · 55 · Zonas de mapa para analítica (Analítica de Mapas)
--  Requiere 49, 23. Se puede correr las veces que quieras.
--
--  · stats_zonas: 1 fila por zona por sala (kills, peleas, si fue zona de cierre)
--  · guardar_zonas: función para guardar desde la herramienta de entrenos
--  · v_analítica_zonas: vista pública con totales por mapa+zona
--  · analitica_zonas_publico(): función para la página Analítica de Mapas
--
--  Mapas: 1=Bermuda, 3=Purgatorio, 4=Kalahari, 22=Nexterra, 29=Solara (mismo código que stats_jugadores.mapa)
-- =====================================================================

-- 1) TABLA DE ZONAS POR SALA -------------------------------------------------
create table if not exists public.stats_zonas (
    id          bigint generated always as identity primary key,
    portal      text        not null default 'entrenamientos',
    sesion_id   text        not null,
    sala        smallint    not null,
    match_id    text,
    mapa        smallint    not null,   -- 1 Bermuda · 3 Purgatorio · 4 Kalahari · 22 Nexterra · 29 Solara
    zona        text        not null,   -- nombre de la zona (ej: 'Pochinok', 'Peak')
    kills       smallint    not null default 0,
    fights      smallint    not null default 0,  -- número de intercambios de disparos
    es_cierre   boolean     not null default false,
    cierre_orden smallint,              -- orden del círculo de cierre (1 = primer anillo, etc.)
    fecha       timestamptz not null default now(),
    creado_por  text
);
alter table public.stats_zonas enable row level security;  -- sin políticas: solo vía funciones

create index if not exists stats_zonas_mapa_idx     on public.stats_zonas (mapa, zona);
create index if not exists stats_zonas_sesion_idx   on public.stats_zonas (sesion_id);
create index if not exists stats_zonas_portal_idx   on public.stats_zonas (portal);


-- 2) FUNCIÓN ADMIN: guardar zonas de una sala ---------------------------------
-- p_zonas: array de {sala, match_id, mapa, zona, kills, fights, es_cierre, cierre_orden}
create or replace function public.guardar_zonas(
    p_token    uuid,
    p_sesion   text,
    p_portal   text,
    p_zonas    jsonb
)
returns json
language plpgsql security definer
set search_path = public
as $$
declare
    quien   text := _exigir_permiso(p_token, 'portal:' || p_portal)->>'usuario';
    z       jsonb;
begin
    if jsonb_typeof(p_zonas) <> 'array' then
        raise exception 'p_zonas debe ser un array JSON';
    end if;
    if jsonb_array_length(p_zonas) = 0 then
        return json_build_object('ok', true, 'filas', 0);
    end if;
    if jsonb_array_length(p_zonas) > 500 then
        raise exception 'Demasiadas zonas en un solo envío (máx 500)';
    end if;

    -- Elimina las zonas anteriores de estas salas para poder re-guardar sin duplicar
    delete from public.stats_zonas
     where portal    = p_portal
       and sesion_id = p_sesion
       and sala = any (
           select distinct (z2->>'sala')::smallint
             from jsonb_array_elements(p_zonas) z2
       );

    for z in select * from jsonb_array_elements(p_zonas) loop
        insert into public.stats_zonas (
            portal, sesion_id, sala, match_id, mapa, zona,
            kills, fights, es_cierre, cierre_orden, creado_por
        ) values (
            p_portal,
            p_sesion,
            (z->>'sala')::smallint,
            nullif(trim(z->>'match_id'), ''),
            (z->>'mapa')::smallint,
            left(trim(z->>'zona'), 60),
            coalesce((z->>'kills')::smallint,        0),
            coalesce((z->>'fights')::smallint,       0),
            coalesce((z->>'es_cierre')::boolean,     false),
            (z->>'cierre_orden')::smallint,
            quien
        );
    end loop;

    return json_build_object('ok', true, 'filas', jsonb_array_length(p_zonas));
end $$;
grant execute on function public.guardar_zonas(uuid, text, text, jsonb) to anon, authenticated;


-- 3) VISTA PÚBLICA: totales de zonas por mapa ---------------------------------
create or replace view public.v_analitica_zonas as
select
    sz.portal,
    sz.mapa,
    sz.zona,
    sum(sz.kills)                                        as kills,
    sum(sz.fights)                                       as fights,
    count(case when sz.es_cierre then 1 end)             as cierres,
    count(distinct sz.sesion_id)                         as sesiones
from public.stats_zonas sz
group by sz.portal, sz.mapa, sz.zona;


-- 4) FUNCIÓN PÚBLICA: datos de analítica de mapas ----------------------------
-- Devuelve, para cada mapa, las zonas ordenadas por kills desc
create or replace function public.analitica_zonas_publico(p_portal text default 'entrenamientos')
returns json
language plpgsql security definer stable
set search_path = public
as $$
begin
    return (
        select coalesce(
            json_object_agg(
                mapa_nombre,
                zonas_json
            ),
            '{}'::json
        )
        from (
            select
                case mapa
                    when 1  then 'bermuda'
                    when 3  then 'purgatorio'
                    when 4  then 'kalahari'
                    when 22 then 'nexterra'
                    when 29 then 'solara'
                    else        'mapa' || mapa
                end as mapa_nombre,
                json_agg(json_build_object(
                    'zona',     zona,
                    'kills',    kills,
                    'fights',   fights,
                    'cierres',  cierres,
                    'sesiones', sesiones
                ) order by kills desc) as zonas_json
            from public.v_analitica_zonas
            where portal = p_portal
            group by mapa
        ) t
    );
end $$;
grant execute on function public.analitica_zonas_publico(text) to anon, authenticated;


-- 5) FUNCIÓN ADMIN: eliminar zonas de una sesión (para re-subir) --------------
create or replace function public.admin_borrar_zonas(p_token uuid, p_sesion text, p_portal text)
returns json
language plpgsql security definer
set search_path = public
as $$
declare
    n int;
begin
    perform _exigir_permiso(p_token, 'portal:' || p_portal);
    delete from public.stats_zonas
     where sesion_id = p_sesion and portal = p_portal;
    get diagnostics n = row_count;
    return json_build_object('ok', true, 'borradas', n);
end $$;
grant execute on function public.admin_borrar_zonas(uuid, text, text) to anon, authenticated;


-- Revisión
select mapa, zona, kills, fights, cierres, sesiones
  from public.v_analitica_zonas
 order by mapa, kills desc
 limit 20;
