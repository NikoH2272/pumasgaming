-- =====================================================================
--  PUMAS GAMING · 56 · Carga inicial de equipos VIP (lista oficial)
--  Requiere 19, 54. Se puede correr las veces que quieras.
--
--  · Inserta o actualiza los 33 equipos de la lista oficial como APROBADO
--  · Cada equipo que ya exista se actualiza (instagram, estado=APROBADO)
--  · Los registros que NO estén en la lista quedan como RECHAZADO
--  · También sincroniza equipos_registrados para los APROBADO
-- =====================================================================

-- 1) LISTA OFICIAL (nombre normalizado → datos) --------------------------------
with lista (nombre, tag, instagram, logo_url) as (values
    ('RUSHEO E-SPORT',       'RUSHEO',   '@AGENCIA_RUSHEO',        'imagenes/equipos-vip/rusheo-e-sport.png'),
    ('RED WINE',             'REDWINE',  'Redwine25',               'imagenes/equipos-vip/red-wine.png'),
    ('TAZMANIA ESPORT',      'TAZMANIA', 'Tazmania.esport',         'imagenes/equipos-vip/tazmania-esport.png'),
    ('INTI ACD',             'INTIACD',  'inti_esports',            'imagenes/equipos-vip/inti-acd.png'),
    ('WASTED TIME',          'WASTED',   'wasted_timeofc',          'imagenes/equipos-vip/wasted-time.png'),
    ('5TO ESPORT',           '5TO',      '5to_esports',             'imagenes/equipos-vip/5to-esport.png'),
    ('SC SPORT',             'SC',       'sc_sport_of',             'imagenes/equipos-vip/sc-sport.png'),
    ('TCS E SPORT',          'TCS',      'ticos_00',                'imagenes/equipos-vip/tcs-e-sport.png'),
    ('CRAZY GANG ESPORTS',   'CRAZY',    'Crazy_gangmx',            'imagenes/equipos-vip/crazy-gang-esports.png'),
    ('FLAME SG',             'FLAMESG',  'flame.esports.ofc',       'imagenes/equipos-vip/flame-sg.png'),
    ('LYON ROSTER',          'LYON',     '@clan_lyon26',            'imagenes/equipos-vip/lyon-roster.png'),
    ('INTI ESPORTS',         'INTI',     'inti_esports',            'imagenes/equipos-vip/inti-esports.png'),
    ('LATINOS ESPORT LT',    'LATINOS',  'fflatinos.oficial',       'imagenes/equipos-vip/latinos-esport-lt.png'),
    ('GS PIRULIN',           'GSPIRL',   'GS.bankids',              'imagenes/equipos-vip/gs-pirulin.png'),
    ('FLAME E-SPORT',        'FLAME',    'flame.esport.ofc',        'imagenes/equipos-vip/flame-e-sport.png'),
    ('MONKEY ESPORT',        'MONKEY',   'monkey_esport7',          'imagenes/equipos-vip/monkey-esport.jpg'),
    ('AXE',                  'AXE',      'axe_e_sport1',            'imagenes/equipos-vip/axe.png'),
    ('DRAKARIX WHITE',       'DRAKWT',   '@DRAKARIXESPORT',         'imagenes/equipos-vip/drakarix-white.png'),
    ('ATC SPORTS',           'ATC',      'atc_sports',              'imagenes/equipos-vip/atc-sports.PNG'),
    ('SHISHIGANG',           'SHISHI',   null,                      'imagenes/equipos-vip/shishigang.png'),
    ('NHS E SPORT',          'NHS',      'NIGTH HAWKS',             'imagenes/equipos-vip/nhs-e-sport.png'),
    ('RENARDS ESPORTS',      'RENARDS',  'renards.esp',             'imagenes/equipos-vip/renards-esports.png'),
    ('ZWAN WHITE',           'ZWAN',     'zwan.white',              'imagenes/equipos-vip/zwan-white.png'),
    ('NAGUARA E-SPORTS',     'NAGUARA',  'Manuel6537_',             'imagenes/equipos-vip/naguara-e-sports.png'),
    ('L27 E-SPORT',          'L27',      null,                      'imagenes/equipos-vip/l27-e-sport.png'),
    ('PUMAS GG',             'PUMASGG',  'pumas.gaming.oficial',    'imagenes/equipos-vip/pumas-gg.png'),
    ('PUMAS TK',             'PUMASTK',  'pumas.gaming.oficial',    'imagenes/equipos-vip/pumas-tk.png'),
    ('PUMAS E7',             'PUMASE7',  'pumas.gaming.oficial',    'imagenes/equipos-vip/pumas-e7.png'),
    ('PUMAS',                'PUMAS',    'pumas.gaming.oficial',    'imagenes/equipos-vip/pumas.png'),
    ('PUMAS RW',             'PUMASRW',  'pumas.gaming.oficial',    'imagenes/equipos-vip/pumas-rw.png'),
    ('PUMAS ARG',            'PUMASARG', 'pumas.gaming.oficial',    'imagenes/equipos-vip/pumas-arg.png'),
    ('PUMAS SUR',            'PUMASSUR', 'pumas.gaming.oficial',    'imagenes/equipos-vip/pumas-sur.png'),
    ('PUMAS USA',            'PUMASUSA', 'pumas.gaming.oficial',    'imagenes/equipos-vip/pumas-usa.png')
),

-- Claves normalizadas para comparar
lista_norm as (
    select
        upper(trim(nombre))                                              as nombre_limpio,
        tag,
        instagram,
        logo_url,
        regexp_replace(lower(trim(nombre)), '[^a-z0-9]', '', 'g')       as clave
    from lista
),

-- 2) ACTUALIZAR los que ya existen en vip_registros ---------------------------
actualizados as (
    update public.vip_registros vr
       set estado    = 'APROBADO',
           instagram = ln.instagram,
           tag       = ln.tag,
           logo_url  = ln.logo_url
      from lista_norm ln
     where regexp_replace(lower(vr.nombre), '[^a-z0-9]', '', 'g') = ln.clave
    returning vr.id, vr.nombre,
              regexp_replace(lower(vr.nombre), '[^a-z0-9]', '', 'g') as clave
),

-- 3) INSERTAR los que no existen aún ------------------------------------------
insertados as (
    insert into public.vip_registros (nombre, tag, telefono, horarios, estado, instagram, logo_url)
    select
        ln.nombre_limpio,
        ln.tag,
        '0000000000',   -- placeholder; el admin actualiza el teléfono si lo necesita
        '{10AM,4PM}'::text[],
        'APROBADO',
        ln.instagram,
        ln.logo_url
    from lista_norm ln
    where not exists (
        select 1 from public.vip_registros vr2
         where regexp_replace(lower(vr2.nombre), '[^a-z0-9]', '', 'g') = ln.clave
    )
    returning id, nombre,
              regexp_replace(lower(nombre), '[^a-z0-9]', '', 'g') as clave
),

-- Claves que ya están gestionadas (actualizadas o insertadas)
gestionados as (
    select clave from actualizados
    union all
    select clave from insertados
)

-- 4) RECHAZAR los que NO están en la lista ------------------------------------
update public.vip_registros vr
   set estado = 'RECHAZADO'
 where estado <> 'RECHAZADO'
   and not exists (
       select 1 from lista_norm ln
        where ln.clave = regexp_replace(lower(vr.nombre), '[^a-z0-9]', '', 'g')
   );


-- 5) SINCRONIZAR equipos_registrados ------------------------------------------
-- Inserta en equipos_registrados los APROBADO que no estén ya ahí
insert into public.equipos_registrados (nombre, tag)
select vr.nombre, vr.tag
  from public.vip_registros vr
 where vr.estado = 'APROBADO'
   and not exists (
       select 1 from public.equipos_registrados er
        where regexp_replace(lower(er.nombre), '[^a-z0-9]', '', 'g')
            = regexp_replace(lower(vr.nombre), '[^a-z0-9]', '', 'g')
   );


-- 6) VERIFICAR RESULTADO -------------------------------------------------------
select
    estado,
    count(*) as total,
    string_agg(nombre, ', ' order by nombre) as equipos
from public.vip_registros
group by estado
order by estado;
