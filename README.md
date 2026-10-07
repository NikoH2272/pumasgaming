# Pumas Gaming · Portal Oficial

Portal de **Pumas Gaming** (Free Fire): entrenamientos, rankings y herramientas de resultados para Pumas y sus ligas aliadas de **Entrenos LATAM**.

🌐 **Sitio:** [pumasgaming.com](https://pumasgaming.com) · Hosting: GitHub Pages · Base de datos: Supabase

---

## Qué hay en el sitio

| Ruta | Qué es | Acceso |
|------|--------|--------|
| `/` | Portal principal: entrenamientos, Entrenos LATAM, jerseys, comunidad, rankings y creador de resultados | Público |
| `/entrenamientos/` | Entrenamientos oficiales de Pumas (calendario, top semanal, histórico, cupos) | Público · panel con login |
| `/entrenoslatam/` | **Entrenos LATAM**: junta los resultados de Pumas, Rusheo, ROW, QFD, Dragon Fest y ZMF | Público |
| `/ascensosqfd/` | Ascensos QFD | Portal público + herramienta (`admin.html`) |
| `/row/` | ROW x Maya | Portal público + herramienta |
| `/rusheo/` | Rusheo | Portal público + herramienta |
| `/dragonfest/` | Dragon Fest: `index.html` mixto · `femenino.html` femenino · `admin.html` herramienta compartida | Público + herramienta |
| `/zmf/` | ZMF: `index.html` mixto · `femenino.html` femenino · `admin.html` herramienta compartida | Público + herramienta |
| `/admin/` | Panel central: portales de cada usuario, personalización, usuarios y roles, corregir entrenos | Con login |

### Fórmulas de resultados (iguales en todo el sitio)
- **PG** (Puntos Generales) = suma de puntos.
- **PR** (Puntos Reales) = PG ÷ sesiones jugadas, en número entero. Orden: PR → booyah → PG.
- **KDA** = kills ÷ salas jugadas. Orden: KDA → kills.

---

## Estructura

```
/                     index.html, style.css, script.js, entrenamientos.js
portal-kit/           código compartido por todos los portales
  portal.js           sesión, login, permisos por rol, efecto global, ventana de confirmación
  portal.css          estilo común y temas de color de cada portal
  login.js            login por usuario (sin @)
  admin.js            personalización (efecto global)
  usuarios.js         usuarios y roles (superadmin)
  correcciones.js     borrar entrenos y corregir nombres de equipos (superadmin)
  guardado.js         botón "Cargar a la base de datos" de las herramientas
  resultados.js       portal público de resultados de cada entreno
  latam.js / .css     Entrenos LATAM (index y /entrenoslatam/)
admin/                panel central
<portal>/             index.html (resultados) · admin.html (herramienta) · login.html · imagenes/
sql/                  cambios de base de datos numerados (ver sql/README.md)
docs/                 guías: trabajo en paralelo y paso a producción
```

---

## Base de datos (Supabase)

- Los SQL están en [`sql/`](sql/) y se corren **en orden** en Supabase → SQL Editor. Estado y reglas: [`sql/README.md`](sql/README.md).
- **Usuarios y permisos:** cada usuario tiene un **rol** (`superadmin`, `pumas`, `qfd`, `row`, `rusheo`, `zmf`, `dragonfest`). El rol define qué portales ve, si puede personalizar el sitio y si puede gestionar usuarios.
- **Seguridad:** las contraseñas están cifradas (bcrypt). Las tablas no aceptan escrituras públicas: guardar, borrar y corregir pasa por funciones de la base que revisan la sesión y el permiso del usuario.
- **Entrenos LATAM no copia datos:** son vistas que leen las tablas de cada portal (0 bytes extra).

---

## Trabajar en local

El sitio es estático (HTML + JS). Basta con un servidor en la raíz del repositorio:

```bash
python -m http.server 5173
```

Luego abre `http://localhost:5173`. Usa la misma base de Supabase que producción.

> Las rutas usan `/` (raíz del dominio), por eso no funciona abriendo los archivos con doble clic.

Guías:
- [Trabajo en paralelo](docs/TRABAJO_EN_PARALELO.md): quién toca qué carpeta, ramas, SQL e imágenes de cada portal.
- [Paso a producción](docs/PRODUCCION.md): checklist antes y después de subir.

---

## Imágenes de cada portal

Van en `<portal>/imagenes/`. Si falta un logo, se ve el de Pumas; si falta una mascota, no aparece. La lista completa está en [docs/TRABAJO_EN_PARALELO.md](docs/TRABAJO_EN_PARALELO.md).

---

© 2026 Pumas Gaming. Todos los derechos reservados.
