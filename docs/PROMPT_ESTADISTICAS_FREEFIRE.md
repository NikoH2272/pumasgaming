# Prompt · Estadísticas de salas de Free Fire desde .log + .json + .bin

Copia todo lo que está debajo de la línea y pégalo como instrucción en el otro proyecto.

---

Quiero una página web que saque estadísticas completas de entrenamientos / scrims de Free Fire **solo con los archivos
que deja el cliente del juego en modo observador**, sin el `.csv` de resultados completos. Todo se lee en el navegador
(el usuario elige los archivos con `<input type="file" multiple>`); no se sube nada a un servidor para leerlos.

## 1. Archivos de entrada (por cada sala/partida)

| Archivo | Nombre | Para qué |
|---|---|---|
| Match log | `MatchResult_<id>_<fecha>.log` | Equipos, posición, puntos oficiales y kills por jugador (la verdad oficial) |
| Replay JSON | `ReplayInfo_<id>_<fecha>.json` | Mapa, modo, duración, eventos (derribos, caídas, levantadas, equipos eliminados), arma y posición de cada kill |
| Replay BIN | `ReplayInfo_<id>_<fecha>.bin` | Grabación de red: daño, impactos, headshots, gloo, reanimaciones, derribos, habilidades, granadas, cuenta de cada jugador, nombre de cada escuadra |

- `<id>` es el número de la partida (19 dígitos). Es el mismo en los 3 archivos: **así se emparejan**.
- Un entreno = 4 a 6 salas. Se ordenan por la fecha del nombre del `.log`.
- **Nunca leas el MatchID como número**: `JSON.parse` lo redondea (2099181727218456576 → 2099181727218456500).
  Tómalo del texto con `/"MatchID"\s*:\s*(\d+)/` o del nombre del archivo con `/(\d{15,})/`.

## 2. Formato del `.log`

Líneas de texto. Por cada equipo:
```
TeamName: <nombre>  Rank: <pos>  KillScore: <kills>  RankScore: <pts posición>  TotalScore: <total>
NAME: <nick>   ID: <account_id>   KILL: <kills>
NAME: ...
```
- Regex equipo: `/TeamName:\s*(.+?)\s+Rank:\s*(\d+)\s+KillScore:\s*(\d+)\s+RankScore:\s*(\d+)\s+TotalScore:\s*(\d+)/i`
- Regex jugador (pertenece al último TeamName leído): `/NAME:\s*(.+?)\s+ID:\s*(\d+).*?KILL:\s*(\d+)/i`
- Las **kills oficiales** salen de aquí. **Crúzalas por `account_id`, nunca por nick**: hay nicks repetidos y nicks
  hechos de letras especiales (`ᴅɢ.ʟᴏᴘᴇᴢᴢᴅ`) que quedan vacíos al normalizar; cruzar por nick le pone a un jugador
  las kills de otro y cambia el MVP. El `account_id` de cada jugador del replay sale del `.bin` (mensaje 101).

## 3. Formato del `.json` (ReplayInfo)

Campos: `MatchID`, `MapID`, `GroupMode` (1 solo · 2 dúo · 3 escuadra), `GameTotalTime` (s), `MatchDateTime`,
`Events[]` y `PlayerHighlightInfos[]`.

`Events[]`: `{ Event, Time, PlayerID, SParam, FParam }`
- **Evento 3**: `PlayerID` derribó/eliminó · `SParam` = nombre de la víctima
- **Evento 4**: `PlayerID` = víctima · `SParam` = nombre de quien la tumbó (mismo `Time` que su evento 3)
- **Evento 2**: `PlayerID` fue levantado (`SParam` = su propio nombre; `FParam` ≈ segundos que tardó)
- **Evento 1**: `PlayerID` es de un equipo eliminado · `SParam` = nombre del equipo
- **Escuadra** de un jugador: `Math.floor(PlayerID / 16777216)`.
- Nombre de cada PlayerID: del evento 2 o emparejando eventos 3/4 del mismo instante.

`PlayerHighlightInfos[].KillEvents[]`: `{ PlayerID, TriggerPoint, weaponDataID, position{x,z}, beKilledPlayerPos{x,z} }`
- Arma de cada kill: el KillEvent del mismo jugador a ±2 s del evento 3. Distancia = `hypot(Δx, Δz)` en metros.
- Cada kill sale repetida en los highlights de varios jugadores: deja una por (PlayerID + TriggerPoint redondeado).

Del `.json` salen: tiempo vivo, booyah (la única escuadra sin evento 1), caídas, veces levantado, **primera sangre**
(primer evento 3: jugador, víctima, minuto, arma), **kill más lejana**, **quién eliminó a quién** (bajas a cada
equipo rival) y **equipos rematados** (el evento 1 cae en el mismo instante que la baja del último jugador).
Ojo: el evento 3 cuenta derribos, no solo eliminaciones; no lo uses como kills oficiales.

## 4. Formato del `.bin` (lo más importante)

Secuencia de paquetes hasta el final del archivo:
```
[u8 0] [f32 tiempo LE] [u8 canal] [u16 tipo LE] [u16 largo LE] [datos: largo bytes]
```
- Tamaño de cada paquete = `10 + largo`. Un `.bin` de 22 MB tiene ~157.000 paquetes.
- Los datos son **varints** (7 bits por byte; el bit alto indica que sigue otro byte). Usa aritmética normal, no
  operadores de bits: los `account_id` pasan de 32 bits.
- Valores con **×2 (zigzag)**: el largo de los textos y el id de arma. Textos = `[largo×2][bytes UTF-8]`.
- `PlayerID` es el mismo del `.json` y `escuadra = floor(PlayerID / 16777216)`. Un PlayerID válido es ≥ 16777216.

### Mensajes y qué sacar de cada uno

| Tipo | Qué es | Campos (varints en orden) | Qué calcular |
|---|---|---|---|
| **101** | Ficha del jugador | `account_id, 0, PlayerID, largo×2, nick…`; más adelante `[8, h1, h2, h3, h4]` = las 4 habilidades equipadas (todas terminan en 06) | Cuenta y nick de cada PlayerID; habilidades equipadas; id del clan (ver 306) |
| **106** | Impacto | `atacante, víctima, daño, daño extra, arma×2, ?, ?, parte` | Daño = daño + extra. Parte: 1 cabeza · 2 torso · 3 piernas · 0 explosión/fuego (no cuenta como impacto). Si atacante = víctima es zona/caída: no se suma. **No quites duplicados** (son perdigones reales). Daño por arma = `arma/2`. Daño a rivales = solo víctimas de otra escuadra |
| **107** | Eliminación | `víctima, quien la hizo` | Kills del replay; **arma de la kill = arma del último 106 de ese atacante a esa víctima** |
| **139** | Derribo | `víctima, quien derribó` | Derribos hechos / veces derribado |
| **221** | Pared gloo | 16 varints; el **16º** es el PlayerID | Paredes gloo |
| **393** | Reanimación | `quien levanta, a quién` | Reanimó a compañeros / veces revivido |
| **250** | Habilidad activa | `PlayerID, habilidad, estado` (2 lista · **1 la usa** · 4 recarga) | Habilidad activa de cada jugador y cuántas veces la usó (cada estado 1) |
| **160** | Objeto lanzado | `n, objeto, nº de lanzamiento, …, PlayerID (10º)` | Granadas lanzadas. **Solo cuentan los paquetes con nº de lanzamiento > 0**; los que traen 0 son las esquirlas de la misma granada |
| **306** | Equipos de la sala | `n×2`, y por equipo `[orden, puntos, ?, nombre, tag, id del clan]` | Nombre de cada escuadra: la ficha 101 de cada jugador contiene los bytes del varint del id del clan de su equipo; se vota por escuadra |
| **117** | Zona segura | fase, círculo actual (zz x·1000, zz z·1000, radio), siguiente, estado (1 anunciada · 2 cerrando · 6/7 final móvil), duración (zz fin − zz inicio)/500 | Fases de la zona (opcional, para mapas) |

`zz(n) = n % 2 ? -(n + 1) / 2 : n / 2`

### Catálogos

- **Mapas (`MapID`)**: 1 BERMUDA · 3 PURGATORIO · 4 KALAHARI · 22 NEXTERRA · 29 SOLARA.
- **Armas**: el id del `.bin` (`arma/2`) es el mismo `weapon_id` del `.csv` oficial (45 M82B, 197 VSK94, 23 M79,
  196 FGL24, 601 GRENADE, 608 FLASH FREEZE, 182 TROGON(GRENADE)…). Arma una tabla id → nombre; un id desconocido se
  muestra como `ARMA #id`; ids negativos no son armas.
- **Habilidades activas (id → personaje)**: 1906 A124 · 2606 Steffie · 3806 Chrono · 4006 Skyler · 4406 Xayne ·
  5606 Iris · 5806 Tatsuya · 7006 Kassie · 7206 Koda · 7306 Chrono · 7406 Oscar · 7606 Nero · 7706 Morse.
  Sin nombre conocido: 5506, 6206, 6706. Las pasivas no traen nombre en ningún archivo. Foto: `personajes/<Nombre>.png`.
- **Granadas y lanzagranadas** (objeto del 160 = arma del 106):
  601 Granada explosiva · 608 Granada de hielo (Flash Freeze) · 624 Granada de dragón · 196 FGL24 · 23 M79.
  Otros lanzables (617, 10006, 182…) **no** se cuentan como granadas.

## 5. Cómo se cruza todo

1. Por cada `.log`, busca su `.json` y su `.bin` por el número de partida.
2. Del `.json` arma los jugadores (PlayerID, nombre, escuadra, eventos).
3. Del `.bin`, por PlayerID: `account_id`, nick, todas las métricas del punto 4 y el nombre de cada escuadra
   (sirve para las escuadras que el `.json` deja como "ESCUADRA 5", normalmente la del booyah).
4. Kills oficiales: del `.log` por `account_id`. Si un jugador no aparece en el `.log` por su cuenta, usa las del `.bin`.
5. Si no hay `.log`, los puntos se calculan: posición (1º 12 · 2º 9 · 3º 8 · 4º 7 · 5º 6 · 6º 5 · 7º 4 · 8º 3 · 9º 2 · 10º 1) + 1 por kill.

## 6. Estadísticas a mostrar

**Por jugador** (por sala y acumulado): kills, daño, daño por sala, impactos, headshots, % headshot (mínimo 15
impactos), torso, piernas, paredes gloo, reanimó, veces revivido, derribos, veces derribado, primeras sangres,
equipos rematados, rival con más bajas, kill más lejana, tiempo vivo promedio, booyahs, mejor mapa, arma con más daño,
daño por arma, habilidad activa y sus usos, granadas lanzadas por tipo, daño y kills con granadas, asistencias (estimadas).

**Por equipo**: salas, booyahs, puntos por sala y total, kills, daño, headshots, gloo, derribos, veces derribado,
equipos eliminados, tiempo vivo promedio, mejor mapa, rival con más bajas, y la **escuadra más constante**:
promedio por sala (puntos; si no hay, daño; si no, kills) × (0,5 + 0,5 × constancia), con
constancia = máx(0, 1 − desviación/promedio); solo equipos con al menos la mitad de las salas (mínimo 2).

**Por sala**: mapa, modo, duración, equipos, kills, daño, booyah, primera sangre (jugador, víctima, minuto, arma),
kill más lejana, MVP (más kills; desempate daño), cómo jugó la escuadra del booyah (kills, daño, HS, gloo, su MVP).

**Por mapa**: salas, kills, kills por sala, daño, HS, gloo, duración promedio, equipo con más booyahs,
jugador con más kills, arma con más kills.

**Armas**: más usada (la usaron más jugadores), con más kills, daño por arma.
**Habilidades activas**: veces elegida, usos, usos por sala, kills de quien la lleva, booyahs, quién más la usó.
**Granadas y lanzagranadas (los 5 tipos)**: usos, daño a rivales, kills, quién más la usó.

**Destacados del entreno**: MVP, más daño, mejor % headshot, más derribos, más asistencias, más reanimaciones, más
veces levantado, kill más lejana, primera sangre, granadas lanzadas, daño con granadas, arma más usada, equipo con
más kills / daño / booyahs, más equipos eliminados, mayor rivalidad, totales (kills, daño, gloo, vivo promedio).

## 7. Limitaciones (dilo así en la página, no inventes datos)

- **Asistencias**: el `.bin` no trae las oficiales. Estimación: al eliminar a alguien (107), suman los compañeros de
  quien eliminó que le hicieron daño > 0 en los 20 s previos. Coincide en 181/241 jugadores; cuando falla, cuenta de
  menos. Muéstralas como "estimadas".
- **Curación, daño recibido y distancia recorrida**: no salen de mensajes legibles (van en paquetes de estado
  empaquetados por bits, tipos 2002/2054). No las muestres.
- **Daño del FGL24 y M79**: el `.bin` incluye la quemadura del fuego (paquetes 106 con campos 6-7 = 726/64), que el
  `.csv` oficial casi no cuenta; sale más alto que el oficial.
- El daño total por jugador puede variar unos puntos del oficial (±1 % en 235/241).
- El reloj del `.bin`/`.json` cuenta desde que empieza la grabación (incluye lobby y avión).

## 8. Precisión comprobada (J16 de una liga: 6 salas, 241 jugadores, contra el `.csv` oficial)

Gloo, veces revivido, veces derribado, impactos a piernas: exactos · headshots 240/241 · kills 227/241 (por eso las
oficiales salen del `.log`) · daño por arma 1181/1202 · habilidades equipadas y activa 241/241 · usos de la activa
237/241 · granadas lanzadas (601/608/624) 241/241 · daño con granada y Flash Freeze 241/241 · kills con granada
240/241 · usos de FGL24 y M79 241/241 · nombres de escuadra 241/241.

Si Free Fire cambia el formato en una actualización, esta comparación es lo primero que falla: revisa los números de
tipo de mensaje con un `.bin` y el `.csv` oficial de la misma partida.

## 9. Mapas (analítica de zonas) y paredes gloo

**Planos**: una imagen por mapa, cuadrada (1200 px), que representa el plano 0–1000. Calibración mundo → plano
(coordenadas `x, z` del `.json` y del `.bin`), validada con replays de torneo:
```
u = (x − x0) / lado · 1000      v = (z0 + lado − z) / lado · 1000
MapID 1  BERMUDA     x0 −397.9   z0 −816.8   lado 1840.0
MapID 3  PURGATORIO  x0 −1000.3  z0 −1079.8  lado 1826.7
MapID 4  KALAHARI    x0 −710.2   z0 −709.3   lado 1419.8
MapID 22 NEXTERRA    x0 −632.9   z0 −632.4   lado 1268.9
MapID 29 SOLARA      x0 −709.7   z0 −716.9   lado 1496.3
```
Datos que se dibujan encima:
- **Zonas (mensaje 117 del `.bin`)**: por fase, cuándo se anuncia, cuándo empieza y termina de cerrar, centro y radio
  del círculo siguiente (la última puede moverse). Descarta fases anunciadas después del final de la partida.
- **Enfrentamientos / bajas (`.json`, KillEvents)**: posición de la víctima (`beKilledPlayerPos`) y del que dispara
  (`position`), con su instante. Una por (PlayerID + TriggerPoint).
- Imágenes que se arman con eso:
  - **Mapa por sala**: los círculos de cada cierre (el final resaltado) + mapa de calor de enfrentamientos desde que
    cierra la Z1 + los 3 puntos más calientes; recorta el plano alrededor de la zona final.
  - **Zonas finales**: el último círculo de cada sala.
  - **Zonas de caída**: enfrentamientos desde el aterrizaje hasta que cierra la Z1 (dónde se pelearon al caer).
  - **Acumulado de mapas** (varios entrenos): zonas calientes y cierres sumados por mapa.
- Mapa de calor: dibújalo en un `<canvas>` (gradiente radial por punto) y ponlo como `<img>` (PNG); así se exporta
  bien a imagen con html2canvas.

**Paredes gloo (mensaje 221 del `.bin`)**: 16 varints; el 16º es el PlayerID de quien la puso. Cada paquete = una
pared (exacto contra el `.csv`, 241/241). Estadísticas: total del entreno, top jugadores, equipo que más puso,
gloo por sala y en el booyah. La posición de cada pared viene en los primeros campos pero no está calibrada: no la
dibujes en el mapa sin comprobarla antes.

## 10. Lo que tiene que tener la página

1. Subida de archivos: `.log`, `.json` y `.bin` (varios a la vez). Una lista de chequeo por sala (qué archivo falta).
2. Lectura de los `.bin` en el navegador (`file.arrayBuffer()`), una sola vez por archivo.
3. Pestañas **TOP** (destacados y escuadra más constante) · **ESTADÍSTICAS** (por sala + detalle de jugadores,
   equipos, armas, habilidades, granadas y booyahs) · **ACUMULADOS** (por jugador, equipo y mapa, con buscador).
4. Descarga en CSV de equipos, jugadores y detalle por sala.
5. Opcional: guardar en una base de datos una fila por jugador y sala (las métricas como columnas y el detalle del
   `.bin` en un campo JSON), para acumular entre entrenos y filtrar por día o por entreno.
