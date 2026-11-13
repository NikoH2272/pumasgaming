# Estadísticas del replay `.bin` de Free Fire — instructivo

Cómo sacar estadísticas completas de cada jugador **solo con los replays de la sala**
(`ReplayInfo_<partida>_<fecha>.json` + `.bin`), sin necesitar el `.csv` de resultados completos,
guardarlas en Supabase y mostrarlas. Sirve para este proyecto y para llevarlo a otro.
**Solo el generador de CSV, sin base de datos: ver la sección 7.**

---

## 1. Qué trae cada archivo

| Archivo | Qué trae | Se lee con |
|---|---|---|
| `MatchResult_<id>.log` | Equipos, puntos oficiales (posición + kills) y kills por jugador | `jugadoresDeLog` (completos.js) |
| `ReplayInfo_<id>.json` | Mapa, modo, duración, eventos de derribo / caída / levantada / equipo eliminado, y kills con arma y posición (primera sangre, kill más lejana, quién eliminó a quién) | `partidaDesdeReplay` (completos.js) |
| `ReplayInfo_<id>.bin` | La grabación de red de la sala: **daño, impactos, headshots, torso, piernas, daño por arma, paredes gloo, reanimaciones, derribos, kills y el nombre de cada escuadra** | `PumasBin.leer` (portal-kit/replay-bin.js) |
| `<id>.csv` (opcional) | Resultados completos oficiales (106 columnas por jugador) | `partidaDesdeCSV` (completos.js) |

El número largo `<id>` (19 dígitos) es el mismo en los 4 archivos de una sala: así se emparejan.

> ⚠ **El número de partida no se puede leer como número.** `JSON.parse` lo redondea
> (2099181727218456576 → 2099181727218456500). Siempre se toma del texto
> (`/"MatchID"\s*:\s*(\d+)/`) o del nombre del archivo (`idDeArchivo`).

---

## 2. Formato del `.bin`

Es una secuencia de paquetes, uno detrás de otro, hasta el final del archivo:

```
[u8 0] [f32 tiempo, little endian] [u8 canal] [u16 tipo, LE] [u16 largo, LE] [datos: largo bytes]
```

- Tamaño de cada paquete = `10 + largo`. Un archivo de 22 MB tiene ~157.000 paquetes.
- Los **datos** son una lista de **varints** (7 bits por byte, el bit alto indica que sigue otro byte).
- Algunos valores van **×2** (codificación *zigzag*): el **largo de los textos** y el **id del arma**.
- Los textos son UTF-8: `[largo×2][bytes]`.
- **PlayerID**: es el mismo número que usa el `.json`. `escuadra = floor(PlayerID / 16777216)`.

### Mensajes que se usan

| Tipo | Qué es | Campos (varints, en orden) | Comprobado contra el `.csv` (241 jugadores) |
|---|---|---|---|
| **101** | Ficha del jugador | `account_id, 0, PlayerID, largo×2, nick, …` (más adelante lleva el id del clan) | nick y account_id 241/241 |
| **106** | Un impacto | `atacante, víctima, daño, daño extra, arma×2, ?, ?, parte` | ver abajo |
| **107** | Eliminación | `víctima, atacante, …` | kills 227/241 |
| **139** | Derribo | `víctima, atacante, …` | veces derribado 241/241 · derribos hechos 201/241 |
| **221** | Pared gloo colocada | 16 varints; el **16º** es el PlayerID | 241/241 |
| **306** | Equipos de la sala | `n×2`, y por equipo `[orden, puntos, ?, nombre, tag, id del clan]` | — |
| **393** | Reanimación | `quien levanta, a quien levanta, …` | veces revivido 241/241 · reanimó 200/241 |
| **250** | Habilidad activa | `PlayerID, habilidad, estado` (2 lista · **1 la usa** · 4 recarga) | activa 241/241 · veces que la usó 237/241 |

**Impactos (106):**
- daño real = `daño + daño extra`
- arma = `campo / 2` (mismo id que `weapon_id` del `.csv`: 45 = M82B, 197 = VSK94…)
- parte del cuerpo: `1` cabeza · `2` torso · `3` piernas · `0` explosión / fuego (no cuenta como impacto)
- `atacante = víctima` → daño de zona o caída: **no** se suma
- **No** se quitan duplicados: dos impactos iguales en el mismo instante son perdigones reales
- Resultado: headshots 240/241, piernas 241/241, torso 219/241, impactos 206/241, daño por arma 1181/1202,
  daño total a ±1 % en 235/241 (a veces difiere unos puntos del oficial)

**Nombre de cada escuadra (306 + 101):** la ficha 101 de cada jugador contiene los bytes del varint del
`id del clan` de su equipo. Se vota por escuadra → nombre. 241/241. Esto arregla los equipos que el
`.json` deja como `ESCUADRA 5` (los que nadie eliminó, normalmente el del booyah).

**Habilidades (250 + 101):** la habilidad activa es la del mensaje 250 y cada `estado = 1` es un uso.
La ficha 101 trae las **4 habilidades equipadas** como `[8, h1, h2, h3, h4]` (todas terminan en 06; 241/241 contra
`skill_ids` del `.csv`). Nombres conocidos (tabla `HABILIDADES` en completos.js; el `.csv` enseña los nuevos con `skill_info`):
`2606 Steffie · 3806 y 7306 Chrono · 4006 Skyler · 4406 Xayne · 5606 Iris · 5806 Tatsuya · 7206 Koda · 7406 Oscar · 7706 Morse`.
Las pasivas no traen nombre en ningún archivo: salen como número. Foto del personaje: `imagenes/personajes/<Nombre>.png`.

**Lo que NO se sacó del `.bin`** (está en paquetes de estado empaquetados por bits, tipos 2002/2054):
daño recibido, curación, distancia recorrida. El daño recibido sumando los 106 solo cuadra 68/241.

### Relojes
El tiempo del `.bin`/`.json` cuenta desde que empieza la grabación (incluye el lobby y el avión).
El `kill_timestamp` del `.csv` va unos ~430 s por detrás. El "minuto de primera sangre" que se muestra
es el del replay.

### Mapas (`MapID`)
`1 BERMUDA · 3 NEXTERRA · 4 KALAHARI · 22 PURGATORIO · 29 SOLARA` (tabla `MAPAS` en completos.js).
Los archivos no traen el nombre: si un nombre está mal, se corrige solo en esa tabla.

---

## 3. Archivos del proyecto

| Archivo | Qué hace |
|---|---|
| `portal-kit/replay-bin.js` | **Lector del `.bin`**, sin dependencias. Funciona en el navegador (`window.PumasBin`) y en Node (`require`). `PumasBin.leer(arrayBuffer)` → `{ jugadores: Map(PlayerID → stats), cuentas: Map(account_id → PlayerID), equipos: Map(escuadra → nombre), duracion }` |
| `portal-kit/completos.js` | `aplicarBin(sala, datosBin)`: pone los nombres de equipo y suma lo del `.bin` a cada jugador (en `extra.bin`; si la sala no trae `.csv`, también en daño, headshots, impactos, gloo, revividas, derribos y kills). `equiposDelBin` solo renombra. `filasBD` / `salasDesdeBD` guardan y leen las columnas nuevas. `tablasDetalle(salas)`: tablas de jugadores, equipos, armas y booyah por sala |
| `entrenamientos/completos_admin.js` | **Entrenos Pumas → Cargar Resultados con Estadísticas**: lee cada `.bin` al subirlo, lo aplica a su sala (por el número de partida), genera las imágenes 4:5 y lo guarda en la base al "Procesar y guardar" |
| `portal-kit/analisis-admin.js` | **Módulo Pruebas → Análisis de entrenos**: lo mismo sin `.log` |
| `portal-kit/generador-csv.js` | **Generar CSV**: columnas del `.bin` en equipos, jugadores y detalle por sala, con vista previa en pestañas |
| `portal-kit/imagenes-resultados.js` | Imágenes 4:5 (1080×1350) para redes: tabla general, MVP detallado, cara a cara por sala, duelo de escuadras, armas y booyahs |
| `sql/52_stats_bin.sql` | Columnas nuevas en `stats_jugadores` y `guardar_stats` que las guarda |
| Página pública (`entrenamientos/index.html`) | Módulo **Estadísticas** (`PumasCompletos.montarPublico`): solo tablas, sin imágenes. Ver la sección 6 |
| `entrenamientos/vista_sesion.js` | Detalle de un entreno (calendario → Ver): botón **VER ESTADÍSTICAS** (`PumasCompletos.montarSesion`) con las mismas 3 pestañas solo de ese entreno |

### Columnas de `stats_jugadores` (sql/23 + sql/52)

| Columna | De dónde sale |
|---|---|
| `kills, dano, headshots, hits, revividos, gloo, derribos` | `.csv` si lo hay; si no, `.bin` (`fuente = 'bin'`) |
| `torso, piernas` | `.bin` (o `.csv`: `torso_hits`, `leg_hits`) |
| `revivido, derribado` | `.bin` (o `.csv`: `revived_times`, `be_knocked_down_count`; o el `.json`) |
| `rematados, primera_sangre, kill_lejana` | `.json` |
| `fuente` | `csv` · `bin` · `replay` (solo `.json`: sin daño) |
| `extra` (jsonb) | Todo lo demás: `extra.bin` completo, `vs` (bajas a cada rival), caídas, etc. |

---

## 4. Aplicarlo en otro proyecto (paso a paso)

1. **Copiar el lector**: `portal-kit/replay-bin.js` (es independiente). Cargarlo con `<script>`.
2. **Leer el `.bin` en el navegador** (no hace falta subirlo a ningún lado):
   ```js
   const datos = PumasBin.leer(await archivo.arrayBuffer());
   datos.jugadores.forEach(j => console.log(j.nick, j.account_id, j.equipo, j.kills, j.dano, j.hs, j.gloo));
   ```
   Cada jugador trae: `pid, account_id, nick, equipo, tag, kills, dano, impactos, hs, torso, piernas,
   gloo, reanimo, revivido, derribos, derribado, armas {idArma: daño}`.
3. **Cruzar con lo que ya tengas**, en este orden: por `PlayerID` (si usas el `.json`), por
   `account_id` (`datos.cuentas`) o por nick normalizado.
4. **Nombres de equipo**: `datos.equipos.get(Math.floor(pid / 16777216))`.
5. **Armas**: el id es el mismo del `.csv` oficial; ver la tabla `ARMAS_FF` en completos.js.
6. **Base de datos**: correr `sql/23_resultados_completos.sql` y después `sql/52_stats_bin.sql`
   (o copiar solo el `alter table` + `guardar_stats` si la tabla se llama distinto).
7. **Mostrar**: `tablasDetalle(salas)` devuelve `[{ titulo, icono, cab, filas }]`; se pinta como cualquier tabla.

### Comprobar que funciona (con un `.csv` oficial de la misma partida)
Con Node, comparar `PumasBin.leer` contra el `.csv` columna por columna
(`damage`, `hits`, `headshots`, `torso_hits`, `leg_hits`, `icewall_use`, `revived_times`,
`be_knocked_down_count`, `knock_down`, `kills`). Con la J16 de la liga (6 salas, 241 jugadores) da los
números de la tabla de la sección 2. Si Free Fire cambia el formato en una actualización, esta comparación
es lo primero que falla: revisar los números de tipo de mensaje.

---

## 5. Orden de aplicación en este proyecto

1. Supabase → SQL Editor: correr `sql/52_stats_bin.sql` (requiere el 23).
2. Subir los cambios del repo (los `<script>` ya llevan la versión nueva para que el navegador no use la vieja).
3. Entrenos Pumas → admin → **Cargar con estadísticas**: subir `.log` + `.json` + `.bin` de 4 a 6 salas →
   revisar las imágenes → "Procesar y guardar".
4. Ver `/entrenamientos/` → **Estadísticas** (menú) y, en cada entreno del calendario, **Ver → VER ESTADÍSTICAS**.
5. Personajes del cara a cara (imágenes): `imagenes/personajes/mvp1.png` y `mvp2.png`.

---

## 6. Módulo público ESTADÍSTICAS

Se alimenta solo de `stats_jugadores` (lo que guarda "Cargar con estadísticas"). Tiene 3 pestañas, y
los filtros **General · Por día · Por entreno** aplican a las tres (cambiar de pestaña no vuelve a consultar
la base: reutiliza el último cálculo del mismo filtro).

| Pestaña | Qué muestra | Función |
|---|---|---|
| **TOP** | Destacados en tarjetas (MVP, más daño, mejor % HS, más derribos, primera sangre, arma más usada, equipos con más kills / daño / booyahs, más equipos eliminados…) y la escuadra más constante | `destacadosHTML`, `escuadraHTML` |
| **ESTADÍSTICAS** | Por sala (tipo de partida, primera sangre y kill más lejana, MVP) + detalle: jugadores (top 15), equipos (quién eliminó a quién), armas más usadas, **habilidades activas** (con la foto del personaje: veces elegida, usos, kills, booyahs, quién más la usó), booyah por sala con los números de la escuadra | `tablasSalas`, `tablasDetalle` |
| **ACUMULADOS** | Totales de todas las salas del filtro, con buscador: **por jugador** (todos: kills, K/sala, daño, daño/sala, HS, % HS, torso, piernas, gloo, revivió, veces revivido, derribos, veces derribado, booyahs, 1ª sangre, rematados, vivo promedio, mejor mapa, habilidad activa y usos) · **por equipo** (salas, booyahs, kills, K/sala, daño, daño/sala, HS, gloo, derribos, veces derribado, equipos eliminados, vivo promedio, mejor mapa, rival con más bajas) · **por mapa** (salas, kills, K/sala, daño, HS, gloo, duración promedio, equipo con más booyahs, jugador con más kills, arma con más kills) | `tablasAcumulados` |

Para llevarlo a otro portal: cargar `portal-kit/completos.js` y llamar
`PumasCompletos.montarPublico('idDelContenedor', 'portal')` (lista general) o
`PumasCompletos.montarSesion(elemento, 'portal', sesionId)` (un solo entreno). Cada tabla es
`{ titulo, icono, cab, filas }` y se pinta con `tablasHTML(tablas, clase)`.

---

## 7. Generador de CSV suelto (copiar y usar)

No necesita `portal.js`, Supabase ni base de datos: todo se lee en el navegador y no se guarda nada.
Página lista: **`portal-kit/generador-csv.html`**.

**Para llevarlo a otro proyecto** copia estos 4 archivos a una misma carpeta y abre la página:

| Archivo | Qué es |
|---|---|
| `generador-csv.html` | La página (cámbiale título y colores si quieres) |
| `completos.js` | Lectura de `.json` / `.log` / `.csv`, armas, mapas y armado del CSV |
| `replay-bin.js` | Lector del `.bin` |
| `generador-csv.js` | La herramienta: subida de archivos, vista previa en pestañas y descargas |

**Para meterlo en una página que ya existe**, basta con:
```html
<div id="generadorCsv"></div>
<script src="completos.js"></script>
<script src="replay-bin.js"></script>
<script src="generador-csv.js"></script>
<script>PumasGenerador.montar('generadorCsv');</script>
```
Trae estilos base propios con peso cero (`:where`), así que si la página ya tiene estilos para
`.form-group`, `.btn-generar`, etc., mandan los de la página.

Qué sube el usuario: `.json` + `.bin` de cada sala (obligatorios), `.log` y `.csv` completos (opcionales).
Descarga: CSV de **equipos**, de **jugadores** (todo el entreno) y **detalle por sala**.

Opcional — nombres oficiales: si en la página existe `window.supabaseClient` (o `portal.js`) y una tabla
`equipos_registrados(nombre)`, la opción "Usar el nombre oficial" corrige los nombres de los equipos.
Sin eso, deja el nombre tal cual sale en la sala.
