# Cartel del Día del Hombre · Pumas Gaming

Versión actual: **Hombres que dejan huella**, revisión 5, con Pinocho sin fondo. Sigue la referencia elegida: retrato más cercano a la derecha, titular grande a la izquierda, marca superior, trazos dorados detrás y mensaje al pie. Se reutiliza el recorte existente sin otra generación del rostro. El personaje se había extraído de `imagenes/jugador3.png` con ImageGen; la composición y los textos se maquetan en HTML/CSS.

- PNG actual para descarga (1080 × 1350): `imagenes/campanas/dia-del-hombre-pumas-2026-v5.png`.
- WebP actual para la vista web: `imagenes/campanas/dia-del-hombre-pumas-2026-v5.webp`.
- Recorte PNG con transparencia: `imagenes/campanas/pinocho-sin-fondo.png`.
- Composición editable: `imagenes/campanas/dia-del-hombre-pumas-2026-v5.html`. Renderizar a 1080 × 1350 tras esperar `document.fonts.ready` y la decodificación de imágenes.
- Las versiones anteriores se conservan en los archivos sin sufijo, `-v2` y `-v3`.
- Entrada automática: del 19 al 22 de noviembre de 2026, según la hora de Bogotá. Las fechas se editan en `data-desde` y `data-hasta` del diálogo en `index.html`.
- Se abre una vez por sesión; cerrar guarda la preferencia solo en sessionStorage. Si el almacenamiento está bloqueado, el aviso y la descarga siguen funcionando.
- Se puede reabrir desde el botón del pie de página, incluso después de la campaña. Escape, el botón X y «Continuar al sitio» lo cierran. El foco vuelve al botón que lo abrió.
- El PNG se descarga directamente; no depende de html2canvas, Analytics ni los servicios de datos del portal.
- Después de modificar `inicio.css`, ejecutar `npm run build:inicio`.

## Prompt del recorte actual (ImageGen integrado)

Precisely remove the background from this real Pumas player graphic and deliver a transparent-background cutout PNG. This is an extraction task, NOT a creative redesign. Preserve the exact identity of this real person (Pinocho), his real face, facial features, curly hair, skin texture, earrings, expression, pose and the real black-white-gold jersey. Do not beautify, relight, repaint or reimagine the face. Preserve natural photographic detail. Extract the player from head through chest/torso, including his real visible arm and foreground hand gesture when part of his silhouette. Remove ALL graphic design outside the person: background, border lines, top PLAYER/PRESENT labels, sidebar text, sponsor panels, large E7 PINOCHO text at the bottom, captions and decorative elements. Keep jersey-printed logos as they really are. End the cutout cleanly above the bottom graphic text if necessary; do not invent lower anatomy or recreate clothes. Hair edges carefully extracted. No shadows, glow, gold outline, backdrop, text or added items. Truly transparent alpha background around the subject.

## Historial: prompt de la versión 2, reemplazada

EDIT / REDESIGN the supplied player graphic into a completely original, premium Pumas Gaming International Men's Day poster. Output a finished portrait 4:5 artwork at high resolution.
IMAGE 1: the actual E7 ASTA player photo from the team's website, used as the photographic edit target. Preserve his recognizable real face, facial features, curly hairstyle, skin tone, expression, hands/perspective gesture, and the actual black-white-gold Pumas jersey. He must remain the same person, not a newly generated generic model. Remove the OLD graphic's borders, labels, old player name, presentation texts, old background and peripheral sponsor boxes; preserve the real subject and jersey. Use a faithful cutout/recomposition of this player photo. 
IMAGE 2: actual Pumas logo for the brand mark at the top.
ART DIRECTION: Original sports editorial tribute titled "Hombres que dejan huella". Asymmetric composition with intelligent negative space. One actual player, never a trio. Dominant portrait at right/center with his foreground hand reaching toward camera, creating real photographic depth, a warm gold edge light on black. A subtle single brushed-gold organic claw trace in the background may tie to the puma, no geometric diagonal frame. Retain natural skin and photographic texture, black and muted champagne gold #DCCC9C, ivory white. Do NOT copy the original celebration example's stacked FELIZ DÍA / DEL HOMBRE layout, or the previous giant header with three men. No lime, no sparkles, no random futuristic UI, no fake badges, no neon, no generic tournament poster.
TYPE & COMPOSITION: Brand logo and PUMAS GAMING aligned near upper left. A generous readable headline in three deliberate lines, upper left to middle left, balanced against the face on the right. "HUELLA." is the largest expressive word, warm gold, perhaps vertically condensed editorial italic lettering, with just a small overlap on the shoulder, absolutely no text over the eyes or face. Rest of headline ivory. Player hand can project in foreground in lower middle. A calm short message in a bottom dark quiet region, and a distinctive refined footer. Plenty of breathing room, strong visual hierarchy, precise Spanish spelling. All required text must be fully inside the frame and legible.
Exact text:
PUMAS GAMING
19 DE NOVIEMBRE
HOMBRES
QUE DEJAN
HUELLA.
FELIZ DÍA DEL HOMBRE
El respeto, la lealtad y el corazón también hacen equipo.
@pumas.gaming.oficial
pumasgaming.com
Do not add other words. No button, browser UI, QR code, or mockup. Finished downloadable artwork only.

## Prompt de la primera versión (conservada)

Create a finished premium Spanish esports celebration poster for PUMAS GAMING, portrait 4:5, high resolution 1080x1350 or larger. Reference image 1 is STYLE/COMPOSITION reference only: oversized condensed bold typography, dark textured black background, three happy young adult male teammates in black esports jerseys with arms around each other, candid camaraderie, black and white photographic treatment. Reference image 2 is the actual Pumas silver puma shield logo: reproduce this brand mark faithfully at the top and discreetly on their jerseys. Replace ALL PROYECTN branding and lime green accents from the reference with PUMAS GAMING branding and warm muted gold #DCCC9C. Do not use neon green. No copied real faces; three original fictional adult men of Latin American appearance, around 22-30, distinct hairstyles and natural smiles. Sophisticated black and gold editorial esports look. Diagonal gold frame behind the teammates, textured background restrained, beautiful readable type, precise Spanish accents.
Poster layout: top centered Pumas logo next to PUMAS GAMING, below date, huge headline in white and gold occupying upper third. Supporting text clearly readable. The three teammates fill the middle/lower half. Bottom invitation, official Instagram and website. Comfortable margins; absolutely no cut-off text; no extra logos, no QR codes.
Exact required text, spelled verbatim:
PUMAS GAMING
19 DE NOVIEMBRE
FELIZ DÍA
DEL HOMBRE
Gracias por ser parte de la familia Pumas.
Hoy celebramos a quienes suman dentro y fuera del juego.
DESCARGA · COMPARTE · ETIQUÉTANOS
@pumas.gaming.oficial
pumasgaming.com
Headline DEL HOMBRE in muted gold, FELIZ DÍA in white. Handle must be easily readable, sized to fit on a single line. Deliver the complete finished artwork only, not a mockup, no browser interface, no download button drawn on the artwork.

