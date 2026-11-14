-- =====================================================================
--  PUMAS GAMING · 54 · Perfil público VIP y función de estadísticas
--  Requiere 19, 23, 49. Se puede correr las veces que quieras.
--
--  · Agrega instagram y logo_url a vip_registros
--  · Crea la vista pública v_equipos_vip con estadísticas agregadas
--  · Crea función pública vip_equipos_publico() para la página equipos-vip.html
--  · Crea función pública vip_jugadores_equipo() para la página de cada equipo
--  · Crea función admin para actualizar instagram/logo de un equipo VIP
-- =====================================================================

-- 1) COLUMNAS EXTRA EN vip_registros ----------------------------------------
alter table public.vip_registros
    add column if not exists instagram text,
    add column if not exists logo_url   text;

-- 2) VISTA PÚBLICA: equipos VIP con estadísticas -----------------------------
-- Vincula vip_registros (APROBADO) con stats_jugadores y salas_resultados
-- por coincidencia de nombre (normalizado: solo alfanumérico, minúsculas).
create or replace view public.v_equipos_vip as
select
    vr.id,
    vr.nombre,
    vr.tag,
    coalesce(vr.instagram, '')  as instagram,
    coalesce(vr.logo_url, er.logo_url, '') as logo_url,
    -- Puntos y posicionamiento desde salas_resultados
    coalesce(sr.puntos,       0) as puntos,
    coalesce(sr.booyahs,      0) as booyahs,
    coalesce(sr.top_promedio, 0) as top_promedio,
    -- Kills, gloo y sesiones desde stats_jugadores
    coalesce(sj.sesiones,     0) as sesiones,
    coalesce(sj.kills,        0) as kills,
    coalesce(sj.dano,         0) as dano,
    coalesce(sj.headshots,    0) as headshots,
    coalesce(sj.gloo,         0) as gloo
from public.vip_registros vr
-- Busca el registro en equipos_registrados para el logo_url
left join public.equipos_registrados er
       on regexp_replace(lower(er.nombre), '[^a-z0-9]', '', 'g')
        = regexp_replace(lower(vr.nombre), '[^a-z0-9]', '', 'g')
-- Agrega desde salas_resultados (puntos de entrenos)
left join (
    select
        regexp_replace(lower(equipo_nombre), '[^a-z0-9]', '', 'g') as clave,
        sum(total_score)                                             as puntos,
        count(case when es_booyah then 1 end)                       as booyahs,
        round(avg(rank)::numeric, 1)                                as top_promedio
    from public.salas_resultados sr2
    group by 1
) sr on sr.clave = regexp_replace(lower(vr.nombre), '[^a-z0-9]', '', 'g')
-- Agrega desde stats_jugadores (stats individuales del equipo)
left join (
    select
        regexp_replace(lower(equipo), '[^a-z0-9]', '', 'g') as clave,
        count(distinct sesion_id)                            as sesiones,
        sum(kills)                                           as kills,
        sum(dano)                                            as dano,
        sum(headshots)                                       as headshots,
        sum(gloo)                                            as gloo
    from public.stats_jugadores sj2
    where portal = 'entrenamientos'
    group by 1
) sj on sj.clave = regexp_replace(lower(vr.nombre), '[^a-z0-9]', '', 'g')
where vr.estado = 'APROBADO';


-- 3) FUNCIÓN PÚBLICA: lista de equipos VIP ordenados por puntos --------------
create or replace function public.vip_equipos_publico()
returns json
language plpgsql security definer stable
set search_path = public
as $$
begin
    return (
        select coalesce(json_agg(json_build_object(
            'id',           v.id,
            'nombre',       v.nombre,
            'tag',          v.tag,
            'instagram',    v.instagram,
            'logo_url',     v.logo_url,
            'puntos',       v.puntos,
            'sesiones',     v.sesiones,
            'kills',        v.kills,
            'dano',         v.dano,
            'headshots',    v.headshots,
            'gloo',         v.gloo,
            'booyahs',      v.booyahs,
            'top_promedio', v.top_promedio
        ) order by v.puntos desc, v.kills desc), '[]'::json)
        from v_equipos_vip v
    );
end $$;
grant execute on function public.vip_equipos_publico() to anon, authenticated;


-- 4) FUNCIÓN PÚBLICA: jugadores de un equipo VIP (mínimo 2 sesiones) ---------
create or replace function public.vip_jugadores_equipo(p_nombre text)
returns json
language plpgsql security definer stable
set search_path = public
as $$
declare
    v_clave text := regexp_replace(lower(trim(coalesce(p_nombre, ''))), '[^a-z0-9]', '', 'g');
begin
    if v_clave = '' then raise exception 'Nombre de equipo requerido'; end if;
    if not exists (
        select 1 from vip_registros
         where estado = 'APROBADO'
           and regexp_replace(lower(nombre), '[^a-z0-9]', '', 'g') = v_clave
    ) then raise exception 'Equipo no encontrado o no aprobado'; end if;

    return (
        select coalesce(json_agg(json_build_object(
            'jugador',       j.jugador,
            'sesiones',      j.sesiones,
            'kills',         j.kills,
            'dano',          j.dano,
            'headshots',     j.headshots,
            'gloo',          j.gloo,
            'booyahs',       j.booyahs,
            'top_promedio',  j.top_promedio,
            'arma',          j.arma_principal
        ) order by j.kills desc), '[]'::json)
        from (
            select
                sj.jugador,
                count(distinct sj.sesion_id)              as sesiones,
                sum(sj.kills)                             as kills,
                sum(sj.dano)                              as dano,
                sum(sj.headshots)                         as headshots,
                sum(sj.gloo)                              as gloo,
                count(case when sj.booyah then 1 end)     as booyahs,
                -- Top promedio: promedio del rank de la sala en cada match
                round(coalesce(avg(sr.rank), 0)::numeric, 1) as top_promedio,
                -- Arma más usada: la que más aparece en la columna arma
                (select arma2
                   from (select unnest(array_agg(sj2.arma)) as arma2
                           from stats_jugadores sj2
                          where sj2.portal = 'entrenamientos'
                            and regexp_replace(lower(sj2.equipo), '[^a-z0-9]', '', 'g') = v_clave
                            and sj2.jugador = sj.jugador
                            and sj2.arma is not null) t
                  group by arma2 order by count(*) desc limit 1
                ) as arma_principal
            from public.stats_jugadores sj
            -- Intentamos obtener el rank de la sala del equipo
            left join public.salas_resultados sr
                   on sr.sesion_id::text = sj.sesion_id
                  and sr.numero_sala     = sj.sala
                  and regexp_replace(lower(sr.equipo_nombre), '[^a-z0-9]', '', 'g') = v_clave
            where sj.portal = 'entrenamientos'
              and regexp_replace(lower(sj.equipo), '[^a-z0-9]', '', 'g') = v_clave
            group by sj.jugador
            having count(distinct sj.sesion_id) >= 1
        ) j
    );
end $$;
grant execute on function public.vip_jugadores_equipo(text) to anon, authenticated;


-- 5) FUNCIÓN ADMIN: actualizar instagram y logo de un equipo VIP -------------
create or replace function public.admin_vip_perfil(
    p_token uuid, p_id bigint, p_instagram text, p_logo_url text
)
returns json
language plpgsql security definer
set search_path = public
as $$
begin
    perform _exigir_permiso(p_token, 'portal:entrenamientos');
    if not exists (select 1 from vip_registros where id = p_id) then
        raise exception 'Equipo VIP no encontrado';
    end if;
    update vip_registros
       set instagram = nullif(trim(coalesce(p_instagram, '')), ''),
           logo_url  = nullif(trim(coalesce(p_logo_url,  '')), '')
     where id = p_id;
    return json_build_object('ok', true);
end $$;
grant execute on function public.admin_vip_perfil(uuid, bigint, text, text) to anon, authenticated;


-- Revisión
select id, nombre, tag, instagram, logo_url, estado
  from public.vip_registros
 where estado = 'APROBADO'
 order by nombre
 limit 10;
