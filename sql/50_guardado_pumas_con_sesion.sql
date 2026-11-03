-- Pumas: guardar con la sesión propia del panel, sin escrituras públicas.
-- Requiere las tablas core de Pumas y las funciones de permisos (28 y 32).
-- Ejecutar completo en Supabase > SQL Editor antes de publicar el frontend.
begin;

create or replace function public.pumas_guardar_entreno(
    p_token uuid, p_titulo text, p_jornada text, p_fecha timestamptz,
    p_moderador text, p_salas jsonb, p_killers jsonb
)
returns json
language plpgsql security definer
set search_path = public
as $$
declare
    ses json := _exigir_permiso(p_token, 'portal:entrenamientos');
    permisos json;
    secciones json;
    nuevo bigint;
begin
    permisos := pumas_mis_permisos(p_token);
    if json_typeof(permisos->'modulos') = 'array'
       and not ((permisos->'modulos')::jsonb ?| array['cargar', 'cargarStats']) then
        raise exception 'No tienes permiso para cargar resultados de Pumas';
    end if;
    secciones := portal_mis_secciones(p_token, 'entrenamientos');
    if json_typeof(secciones->'secciones') = 'array'
       and not ((secciones->'secciones')::jsonb ? 'herramienta') then
        raise exception 'No tienes acceso a la herramienta de resultados';
    end if;
    if coalesce(length(trim(p_titulo)), 0) = 0 or p_fecha is null then
        raise exception 'Indica el título y la fecha del entrenamiento';
    end if;
    if p_salas is null or jsonb_typeof(p_salas) <> 'array' then
        raise exception 'Los resultados deben ser una lista';
    end if;
    if jsonb_array_length(p_salas) not between 1 and 3000 then
        raise exception 'Cantidad de resultados de equipos no válida';
    end if;
    if p_killers is null or jsonb_typeof(p_killers) <> 'array' then
        raise exception 'Los jugadores deben ser una lista';
    end if;
    if jsonb_array_length(p_killers) > 3000 then
        raise exception 'Demasiados resultados de jugadores';
    end if;
    if exists (select 1 from jsonb_array_elements(p_salas) x
                where coalesce(trim(x->>'equipo_nombre'), '') = ''
                   or coalesce((x->>'numero_sala')::int, 0) < 1) then
        raise exception 'Hay resultados sin equipo o sin número de sala';
    end if;

    -- Serializar reintentos del mismo entreno para evitar sesiones duplicadas.
    perform pg_advisory_xact_lock(hashtextextended('pumas:' || trim(p_titulo) || ':' || extract(epoch from p_fecha)::text, 0));
    if exists (select 1 from entrenamientos_sesiones
                where titulo = left(trim(p_titulo), 120) and fecha = p_fecha) then
        raise exception 'Este entrenamiento ya está guardado. Consulta el calendario';
    end if;

    insert into entrenamientos_sesiones(titulo, jornada, fecha, moderador, archivo_url)
    values (left(trim(p_titulo), 120), left(p_jornada, 60), p_fecha, left(p_moderador, 60), null)
    returning id into nuevo;

    insert into salas_resultados(sesion_id, numero_sala, equipo_nombre, rank,
                                kill_score, rank_score, total_score, es_booyah)
    select nuevo, (x->>'numero_sala')::smallint, left(trim(x->>'equipo_nombre'), 60),
           (x->>'rank')::smallint, coalesce((x->>'kill_score')::smallint, 0),
           coalesce((x->>'rank_score')::smallint, 0), coalesce((x->>'total_score')::smallint, 0),
           coalesce((x->>'rank')::int = 1, false)
      from jsonb_array_elements(p_salas) x;

    insert into top_killers(sesion_id, jugador_nombre, equipo_nombre, kills)
    select nuevo, left(trim(x->>'jugador_nombre'), 60), left(trim(x->>'equipo_nombre'), 60),
           coalesce((x->>'kills')::smallint, 0)
      from jsonb_array_elements(p_killers) x
     where coalesce(trim(x->>'jugador_nombre'), '') <> '';

    return json_build_object('ok', true, 'id', nuevo);
end $$;

revoke all on function public.pumas_guardar_entreno(uuid, text, text, timestamptz, text, jsonb, jsonb) from public;
grant execute on function public.pumas_guardar_entreno(uuid, text, text, timestamptz, text, jsonb, jsonb) to anon, authenticated;

-- El token del panel se comprueba dentro de la función; no abrir INSERT a anon.
revoke insert on public.entrenamientos_sesiones, public.salas_resultados, public.top_killers from anon, authenticated;

notify pgrst, 'reload schema';
commit;
