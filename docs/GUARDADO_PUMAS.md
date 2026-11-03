# Guardado de resultados Pumas: error 401

El login del panel usa `admin_sesiones`, no Supabase Auth. Las escrituras
directas con la clave pública no llevan esa sesión y Supabase las rechaza.

## Activar la corrección

1. Ejecutar completo `sql/50_guardado_pumas_con_sesion.sql` en el SQL Editor
   del proyecto Supabase. Requiere las tablas de Pumas y las funciones de
   permisos de las migraciones 28 y 32. No ejecutar migraciones antiguas
   indiscriminadamente ni habilitar escrituras públicas para resolver el 401.
2. Publicar los cambios del frontend en GitHub Pages, incluidos
   `portal-kit/portal.js`, `portal-kit/descargas.js`, `entrenamientos.js`,
   `entrenamientos/admin_logica.js`, `entrenamientos/script_entrenamientos.js`,
   `entrenamientos/vista_sesion.js` y sus referencias en los HTML.
3. Recargar el panel y publicar el entrenamiento. Verificar en el calendario
   el día seleccionado y abrir su resultado. Si el intento anterior sí llegó
   a crear una sesión, la función informará que ya está guardada.

La función valida el token y los permisos de carga y guarda sesión, equipos y
jugadores en una transacción. Un error revierte las tres escrituras. Los nuevos
entrenamientos leen resultados de las tablas; los antiguos conservan la lectura
de logs como alternativa. No se suben nuevos logs al bucket.

Verificación local: sintaxis de los scripts, payload de la función, distinción
entre posición y puntos de posición, manejo de sesión inválida y lectura de
resultados sin archivos. La migración SQL y el guardado real requieren comprobarse
en Supabase después de aplicar la migración.
