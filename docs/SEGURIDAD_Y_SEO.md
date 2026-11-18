# Revisión de la portada — 17 de noviembre de 2026

## Cambios implementados

- Open Graph, Twitter Card, canonical y JSON-LD de Organization y WebSite, con las redes oficiales existentes.
- `robots.txt` y sitemap de las rutas públicas activas; se excluyen administración, pruebas, respaldos y exportaciones del rastreo. Robots no sustituye los permisos de acceso.
- Política de referrer `strict-origin-when-cross-origin` en el HTML de la portada. La política funciona en el navegador aunque un auditor que solo busca cabeceras siga marcándola como ausente.
- Logo de navegación de 726.912 a 2.462 bytes. El original se conserva para exportaciones y redes sociales.
- Fuentes Barlow, Barlow Condensed y Michroma locales, con sus licencias. Las fuentes principales se precargan; `font-display: optional` evita que un cambio tardío de fuente desplace el contenido. En conexiones lentas puede mantenerse la fuente de respaldo durante la primera visita.
- Vistas previas WebP de los videos: el MP4 se carga tras interactuar y al entrar en pantalla. Se pausa fuera de pantalla y en pestañas ocultas. Con movimiento reducido o ahorro de datos, los controles de los jerseys permiten reproducción manual.
- Scripts de la portada diferidos y html2canvas cargado al descargar una imagen. Se conserva el orden de dependencias.
- Tamaños explícitos para imágenes, columnas estables para las cifras, encabezados del pie corregidos y cierre del menú con Escape.
- El logo generado en las tablas ahora tiene `alt`. Los logos junto al nombre de Pumas conservan `alt=""`: son decorativos y repetir el nombre sería redundante.

## Pendiente en el alojamiento

La respuesta de `https://pumasgaming.com/` se comprobó con `curl -I`: se sirve desde GitHub Pages y no devuelve X-Frame-Options, Strict-Transport-Security ni Referrer-Policy. Estos valores deben configurarse en un proxy/CDN o en un alojamiento que permita editar cabeceras HTTP:

```http
X-Frame-Options: SAMEORIGIN
Content-Security-Policy: frame-ancestors 'self'
Strict-Transport-Security: max-age=31536000
Referrer-Policy: strict-origin-when-cross-origin
X-Content-Type-Options: nosniff
```

Aplicar a las respuestas HTTPS del dominio. `frame-ancestors` controla quién puede incrustar el sitio y no limita las imágenes, scripts ni conexiones que carga la aplicación. No se añade `includeSubDomains` a HSTS sin comprobar antes que todos los subdominios usan HTTPS.

No se agregaron cabeceras ficticias en etiquetas meta ni archivos `_headers` que GitHub Pages no utiliza. X-Frame-Options exige una cabecera HTTP: [documentación de MDN](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/X-Frame-Options). HSTS también se configura mediante la respuesta del servidor: [documentación de MDN](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Strict-Transport-Security).

La autoridad de dominio es una métrica externa: no se corrige mediante HTML ni se puede garantizar con estos cambios.

## Validación

Chrome local con Lighthouse, perfiles móvil y escritorio. Los números locales no son las métricas del dominio publicado y varían con la red, servicios externos y CPU. Ver el informe de rendimiento adjunto para la comparación y sus limitaciones.

Comprobaciones funcionales: sin errores JavaScript al abrir la portada; imágenes renderizadas con atributo alt; menú abre y cierra con Escape; sin desbordamiento horizontal a 360, 768 y 1440 px; con movimiento reducido no se descargan automáticamente los MP4; generación de una tabla desde un log y descarga real de `Tabla_Resultados_Pumas.png`; biblioteca de captura ausente antes de usarla y disponible después. Las cuatro pruebas existentes de métricas también pasan.

Después de publicar, revisar las URLs del sitemap y ejecutar de nuevo PageSpeed Insights en el dominio. Los metadatos y cabeceras no estarán activos en producción hasta su despliegue y la configuración del alojamiento, respectivamente.
