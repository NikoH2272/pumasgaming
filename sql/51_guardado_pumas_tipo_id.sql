-- Corrige SQL 50 cuando entrenamientos_sesiones.id es UUID.
-- Conserva la función instalada y usa el tipo real de la columna.
-- Ejecutar completo en Supabase > SQL Editor. No modifica resultados.
begin;

do $$
declare
    definicion text;
begin
    select pg_get_functiondef(
        'public.pumas_guardar_entreno(uuid,text,text,timestamptz,text,jsonb,jsonb)'::regprocedure
    ) into definicion;

    if definicion ~ 'nuevo\s+bigint\s*;' then
        execute regexp_replace(definicion, 'nuevo\s+bigint\s*;',
            'nuevo public.entrenamientos_sesiones.id%TYPE;');
    elsif position('nuevo public.entrenamientos_sesiones.id%TYPE;' in definicion) = 0 then
        raise exception 'La declaración del ID cambió. Revisar la función antes de modificarla';
    end if;
end $$;

notify pgrst, 'reload schema';
commit;
