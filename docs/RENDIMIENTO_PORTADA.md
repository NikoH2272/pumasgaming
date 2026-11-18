# Mediciones locales — portada

17 de noviembre de 2026. Chrome 157, Lighthouse local. Mismo equipo, sin publicar cambios. Las cifras son pruebas de laboratorio, no datos de usuarios reales.

## Escritorio: perfil estándar de Lighthouse

| Indicador | Antes | Después |
| --- | ---: | ---: |
| Rendimiento | 89/100 | 100/100 |
| Accesibilidad | 98/100 | 100/100 |
| SEO | 100/100 | 100/100 |
| LCP | 0,61 s | 0,52 s |
| CLS | 0,191 | 0,002 |
| Transferencia inicial | 37,6 MB | 1,46 MB |

## Móvil: limitación real con DevTools

Se realizó una segunda comparación con `--throttling-method=devtools`: limita realmente la red y CPU durante la carga en lugar de extrapolar los tiempos.

| Indicador | Antes | Después |
| --- | ---: | ---: |
| Rendimiento | 67/100 | 79/100 |
| LCP | 3,60 s | 2,88 s |
| CLS | 0,083 | 0 |
| Transferencia registrada | 8,19 MB* | 1,46 MB |

*La prueba anterior alcanzó el tiempo límite de carga, por lo que su transferencia es parcial y sus métricas pueden estar incompletas. No constituye una comparación definitiva. La prueba final terminó sin advertencias; accesibilidad y SEO: 100/100. El LCP móvil todavía supera el objetivo de 2,5 s.

## Límite de la simulación móvil

El perfil móvil simulado estándar pasó de 84/100 (LCP 2,85 s) a resultados de 74–78/100 (LCP 5,8–7,2 s) durante las iteraciones. El LCP observado en esas mismas trazas estuvo cerca de 0,2–0,3 s sin limitar la red. No se presentan esas puntuaciones como una mejora. La discrepancia motivó la medición adicional con DevTools; ambos métodos son distintos y sus puntuaciones no deben mezclarse.

La siguiente validación debe hacerse con PageSpeed Insights en el dominio publicado, con varias repeticiones y un teléfono real. La reducción de transferencia, el aplazamiento del video y la estabilidad del diseño están comprobados; no se garantiza una puntuación móvil de 90 ni un LCP menor a 2,5 s.

## Pruebas de funcionamiento

- Generar una tabla desde un archivo `.log` y descargar el PNG real con html2canvas cargado bajo demanda.
- Abrir el menú y cerrarlo con Escape, devolviendo el foco al botón.
- Sin desbordamiento horizontal a 360, 768 y 1440 px.
- Sin descarga automática de MP4 con movimiento reducido.
- Sin errores JavaScript al cargar la portada y con atributos alt en las imágenes renderizadas.
- Las cuatro pruebas existentes de métricas pasan.

Las capturas y los JSON completos de Lighthouse se generaron en la carpeta temporal local `C:/Users/nicolas/AppData/Local/Temp/`, con prefijo `pumas-`. Las dependencias de auditoría se instalaron fuera del repositorio, en `pumas-audit-tools`; no se añadieron dependencias de producción.
