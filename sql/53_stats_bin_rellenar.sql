-- =====================================================================
--  PUMAS GAMING · 53 · Rellenar las columnas de sql/52 en filas ya guardadas
--  Requiere 52. Se puede correr las veces que quieras (solo toca filas con fuente vacía).
--
--  Los entrenos guardados antes de que la herramienta enviara las columnas nuevas
--  tienen esos datos dentro de "extra" (extra.bin del replay .bin, y fin,
--  primeraSangre, distancia del .json). Esto los copia a sus columnas.
-- =====================================================================

update public.stats_jugadores set
    torso          = coalesce(nullif(extra->'bin'->>'torso', '')::numeric::int,    nullif(extra->>'torso', '')::numeric::int, 0),
    piernas        = coalesce(nullif(extra->'bin'->>'piernas', '')::numeric::int,  nullif(extra->>'piernas', '')::numeric::int, 0),
    revivido       = coalesce(nullif(extra->'bin'->>'revivido', '')::numeric::int, nullif(extra->>'levantadoCsv', '')::numeric::int,
                              nullif(extra->>'levantado', '')::numeric::int, 0),
    derribado      = coalesce(nullif(extra->'bin'->>'derribado', '')::numeric::int, nullif(extra->>'derribado', '')::numeric::int,
                              nullif(extra->>'caidas', '')::numeric::int, 0),
    rematados      = coalesce(nullif(extra->>'fin', '')::numeric::int, 0),
    primera_sangre = coalesce(extra->>'primeraSangre', '') in ('1', 'true'),
    -- (least() ignora los null: sin el case, quien no tiene kill lejana quedaría con 32000)
    kill_lejana    = case when coalesce(extra->>'distancia', '') ~ '^\d+(\.\d+)?$' then least((extra->>'distancia')::numeric::int, 32000) end,
    -- replay: solo .json · bin: el daño es el del .bin (no había .csv) · csv: el resto
    fuente         = case when extra->>'fuente' = 'replay' then 'replay'
                          when extra ? 'bin' and dano = coalesce(nullif(extra->'bin'->>'dano', '')::numeric::int, -1) then 'bin'
                          else 'csv' end
 where fuente is null;
