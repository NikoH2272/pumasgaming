-- =====================================================================
--  PUMAS GAMING · 52 · Estadísticas del replay .bin en stats_jugadores
--  Requiere 23. Se puede correr las veces que quieras.
--
--  El .bin de cada sala (ReplayInfo_<id>.bin) se lee en el navegador
--  (portal-kit/replay-bin.js) y trae, por jugador, lo que antes solo daba el .csv
--  de resultados completos (daño, impactos, headshots, gloo, revividas, derribos)
--  y algunas cosas más. Aquí cada una tiene su columna, para poder consultarlas
--  y ordenarlas desde la base:
--
--    torso, piernas     impactos al torso y a las piernas
--    revivido           veces que lo levantaron sus compañeros
--    derribado          veces que lo derribaron
--    rematados          equipos que eliminó (fue quien remató al último del equipo)
--    primera_sangre     hizo la primera baja de la sala
--    kill_lejana        metros de su kill más lejana
--    fuente             de dónde salieron los números: csv · bin · replay (solo .json)
--
--  Las filas viejas quedan con 0 / false / null en las columnas nuevas.
-- =====================================================================

alter table public.stats_jugadores add column if not exists torso          smallint not null default 0;
alter table public.stats_jugadores add column if not exists piernas        smallint not null default 0;
alter table public.stats_jugadores add column if not exists revivido       smallint not null default 0;
alter table public.stats_jugadores add column if not exists derribado      smallint not null default 0;
alter table public.stats_jugadores add column if not exists rematados      smallint not null default 0;
alter table public.stats_jugadores add column if not exists primera_sangre boolean  not null default false;
alter table public.stats_jugadores add column if not exists kill_lejana    smallint;
alter table public.stats_jugadores add column if not exists fuente         text;

comment on column public.stats_jugadores.torso          is 'Impactos al torso (.bin o .csv)';
comment on column public.stats_jugadores.piernas        is 'Impactos a las piernas (.bin o .csv)';
comment on column public.stats_jugadores.revivido       is 'Veces que lo levantaron sus compañeros';
comment on column public.stats_jugadores.derribado      is 'Veces que lo derribaron';
comment on column public.stats_jugadores.rematados      is 'Equipos que eliminó (remató al último jugador del equipo)';
comment on column public.stats_jugadores.primera_sangre is 'Hizo la primera baja de la sala';
comment on column public.stats_jugadores.kill_lejana    is 'Metros de su kill más lejana en la sala';
comment on column public.stats_jugadores.fuente         is 'csv · bin · replay: de dónde salieron daño, headshots y gloo';

-- Para los rankings por sala y por partida
create index if not exists stats_jugadores_match on public.stats_jugadores (match_id);

-- Guardar las estadísticas de un entreno (reemplaza las que hubiera de ese entreno), ahora con las columnas nuevas
create or replace function public.guardar_stats(p_token uuid, p_portal text, p_sesion text, p_filas jsonb)
returns json
language plpgsql security definer
set search_path = public
as $$
declare
    n int;
begin
    perform _exigir_permiso(p_token, 'portal:' || p_portal);
    if not _export_completo_ok(p_portal) then
        raise exception 'Los resultados completos no están habilitados para este evento (Admin → Resultados completos)';
    end if;
    if jsonb_typeof(p_filas) <> 'array' or jsonb_array_length(p_filas) = 0 then raise exception 'No hay estadísticas para guardar'; end if;
    if jsonb_array_length(p_filas) > 1500 then raise exception 'Demasiadas filas en un solo entreno'; end if;
    delete from stats_jugadores where portal = p_portal and sesion_id = p_sesion;
    insert into stats_jugadores (portal, sesion_id, sala, match_id, mapa, modo, equipo, jugador, account_id, kills, dano, headshots,
                                 hits, disparos, revividos, gloo, vivo, asistencias, derribos, booyah, arma, armas, extra, fecha, titulo,
                                 torso, piernas, revivido, derribado, rematados, primera_sangre, kill_lejana, fuente)
    select p_portal, p_sesion,
           least(greatest(coalesce((x->>'sala')::int, 1), 1), 50),
           left(x->>'match_id', 40), (x->>'mapa')::smallint, (x->>'modo')::smallint,
           left(trim(x->>'equipo'), 60), left(trim(x->>'jugador'), 60), left(x->>'account_id', 30),
           coalesce((x->>'kills')::int, 0), coalesce((x->>'dano')::int, 0), coalesce((x->>'headshots')::int, 0),
           coalesce((x->>'hits')::int, 0), coalesce((x->>'disparos')::int, 0), coalesce((x->>'revividos')::int, 0),
           coalesce((x->>'gloo')::int, 0), least(coalesce((x->>'vivo')::int, 0), 32000), coalesce((x->>'asistencias')::int, 0),
           coalesce((x->>'derribos')::int, 0), coalesce((x->>'booyah')::boolean, false),
           left(x->>'arma', 40), coalesce(x->'armas', '[]'),
           case when jsonb_typeof(x->'extra') = 'object' then x->'extra' else '{}' end,
           case when coalesce(x->>'fecha', '') ~ '^\d{4}-\d{2}-\d{2}' then (x->>'fecha')::timestamptz end,
           left(x->>'titulo', 80),
           least(coalesce((x->>'torso')::int, 0), 32000), least(coalesce((x->>'piernas')::int, 0), 32000),
           least(coalesce((x->>'revivido')::int, 0), 32000), least(coalesce((x->>'derribado')::int, 0), 32000),
           least(coalesce((x->>'rematados')::int, 0), 32000), coalesce((x->>'primera_sangre')::boolean, false),
           case when coalesce(x->>'kill_lejana', '') ~ '^\d+$' then least((x->>'kill_lejana')::int, 32000) end,
           case when x->>'fuente' in ('csv', 'bin', 'replay') then x->>'fuente' end
      from jsonb_array_elements(p_filas) x
     where coalesce(trim(x->>'jugador'), '') <> '';
    get diagnostics n = row_count;
    return json_build_object('ok', true, 'filas', n);
end $$;
grant execute on function public.guardar_stats(uuid, text, text, jsonb) to anon, authenticated;
