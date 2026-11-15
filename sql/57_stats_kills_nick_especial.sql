-- =====================================================================
-- 57 · Kills mal asignadas a jugadores con nick de letras especiales
-- ---------------------------------------------------------------------
-- Qué pasó: al cruzar el .log con el replay por nick, los nicks hechos de
-- letras especiales (ᴅɢ.ʟᴏᴘᴇᴢᴢᴅ, ＧＰＥㅤｅｍｉｎｅｍ…) quedaban vacíos y todos
-- recibían las kills del primer jugador así del .log. Eso movía el MVP.
-- Ya está corregido en portal-kit/completos.js (el .log se cruza por ID de cuenta).
--
-- Qué hace: en esas filas pone las kills del .bin (extra.bin.kills).
-- Comprobado antes de escribirlo: con este cambio los 14 equipos afectados
-- suman exactamente las kills del .log (salas_resultados.kill_score).
-- Deja fuera la sala 5 del entreno 2f789903…: su replay es de otra partida
-- (hay que volver a cargarla con sus archivos).
-- Requiere: 23 y 52. Se puede correr más de una vez (solo cambia lo que difiere).
-- =====================================================================

update stats_jugadores
set kills = (extra->'bin'->>'kills')::int
where extra->'bin' ? 'kills'
  and length(regexp_replace(lower(jugador), '[^a-z0-9]', '', 'g')) < 3
  and (extra->'bin'->>'kills')::int <> kills
  and not (sesion_id = '2f789903-a9de-45a6-a88a-8d9e04643fc8' and sala = 5);

-- Revisión: equipos de las salas tocadas, kills guardadas contra el .log
select s.sesion_id, s.sala, s.equipo, sum(s.kills) kills, max(r.kill_score) log
from stats_jugadores s
join salas_resultados r on r.sesion_id::text = s.sesion_id and r.numero_sala = s.sala and upper(r.equipo_nombre) = upper(s.equipo)
where length(regexp_replace(lower(s.jugador), '[^a-z0-9]', '', 'g')) < 3
group by 1, 2, 3
having sum(s.kills) <> max(r.kill_score);
