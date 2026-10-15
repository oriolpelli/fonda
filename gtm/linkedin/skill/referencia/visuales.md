# Visuales — qué imagen lleva cada post

## Qué visual, según el post

| Post | Visual | Plantilla (`visual/render.mjs`) |
|---|---|---|
| Educativo en pasos, ley, guía (G1, G5, «tres cosas para…») | **Carrusel PDF**, 8–10 páginas | `portada` → `texto` / `dato` / `lista` / `comparar` → `cierre` |
| Resultados de un estudio propio (G4) | **Carrusel PDF** con un `dato` por hallazgo | Igual, con más páginas `dato` |
| Un número que choca (G3) | **Imagen de dato** | Una página `dato` |
| Lo que oigo en recepción, una frase (pilar 4) | **Imagen de cita** o **fotos reales** | Una página `cita` |
| Walk-in, piloto, un día de trabajo (pilar 4) | **1–4 fotos reales** (post de varias imágenes) | — elegir de `brand/linkedin/fotos/` |
| Ven a verlo (tipo E) | **Captura real del producto**: el resumen de ejemplo de `fondas.app/es/sample-brief` (hotel ficticio, sin datos reales), o un carrusel de 5–6 páginas con capturas | — captura a 1080 px de ancho; nunca una pantalla con datos de un hotel real |
| Cualquiera con una cifra fuerte | **Portada con cifra**: el número enorme sobre el degradado | `portada` con `cifra` (ejemplo: `visual/ejemplos/portada-cifra.json`) |
| Opinión fuerte, historia | Foto real tuya, o solo texto si es muy bueno | — |

## Fotos reales: la biblioteca
El truco de Xavier Caffrey (vídeo del 18 feb 2026), adaptado: **el nombre de cada foto la describe**, así Claude elige sin abrir las imágenes.

- Carpeta: `brand/linkedin/fotos/` (ver su `README.md`).
- Nombre: `AAAA-MM_lugar_que-se-ve_tono.jpg`, en minúsculas y con guiones. Ejemplo: `2026-10_eixample_sobre-fondas-en-mostrador-de-recepcion_trabajo.jpg`.
- Para elegir, Claude lista la carpeta, propone 1–3 fotos por post con una línea de por qué, y tú decides.
- **Si no hay foto adecuada, Claude te pide una concreta** («una foto del sobre encima del mostrador, sin el nombre del hotel a la vista») en vez de usar otra cosa.

**Reglas de las fotos:**
- Reales, siempre. Nada de stock ni de imágenes generadas con IA de personas, hoteles o recepciones: el feed está lleno de eso y el director lo nota (y LinkedIn etiqueta las imágenes con metadatos de IA).
- Sin nombre de hotel, logotipo, pantalla de PMS con datos o cara de un huésped o empleado sin permiso por escrito.
- Vertical (4:5) cuando se pueda. Mínimo 1080 px de ancho; si pesa más de 5 MB, redúcela.

## Reglas de diseño (Signal v4, `FONDA_SANA_REDESIGN.md` §0.1)
Ya están en `visual/brand.css`; no las cambies en cada post.
- Una sola tipografía: Geist (y Geist Mono para etiquetas, números de página y fuentes).
- Fondo blanco; el contenido se agrupa en **pozos** gris cálido `#F6F3EE`, separados por radio y color, **nunca por sombra**.
- El color solo en contenido: **un degradado por página como mucho** (la portada: `cool` para datos e IA, `warm` para la mañana y la operativa, `sand` para el huésped) y **un acento azul** `#1B3BB3` dentro de un dato.
- Una idea por página. Títulos de 6–10 palabras. Si algo no cabe, se corta el texto, no se reduce la letra.
- Sin emojis, sin iconos de stock, sin flechas decorativas. El wordmark FONDAS solo en la última página.
- Pie en todas las páginas: «Oriol Pellicer · Fondas» y el número de página.

## Cómo se genera

1. Claude escribe el *spec* en `gtm/linkedin/visuales/<ID>/spec.json` (ejemplos en `visual/ejemplos/`).
2. Lo renderiza: `node gtm/linkedin/skill/visual/render.mjs gtm/linkedin/visuales/<ID>/spec.json`.
3. Salen `<ID>-01.png …` y `<ID>.pdf` (carrusel) o `<ID>.png` (imagen) en la misma carpeta.
4. Claude **mira cada PNG** antes de dártelo: texto cortado, líneas huérfanas, páginas vacías. Si el script avisa con «REVISAR», corrige y vuelve a renderizar.
5. En LinkedIn: para el carrusel, «Añadir documento» → el PDF, con un título corto. Para la imagen, el PNG.

### Tipos de página del spec
| `tipo` | Campos |
|---|---|
| `portada` | `eyebrow`, `cifra` (opcional: el número enorme encima del título), `titulo`, `subtitulo`, `fondo` (`cool` · `warm` · `sand`), `swipe` (texto o `false`) |
| `texto` | `eyebrow`, `titulo`, `cuerpo` (admite `**negrita**`), `nota` |
| `dato` | `eyebrow`, `cifra`, `texto`, `cuerpo`, `fuente`, `color` (`accent` por defecto · `ink`) |
| `lista` | `eyebrow`, `titulo`, `items` (texto, o `{ "t": …, "sub": … }`) |
| `cita` | `eyebrow`, `texto` (sin comillas: las pone la plantilla), `autor` (rol y tipo de hotel, nunca nombre) |
| `comparar` | `eyebrow`, `titulo`, `no: { titulo, items }`, `si: { titulo, items }` |
| `cierre` | `titulo`, `cuerpo`, `cta`, `marca` (`false` quita el wordmark) |

**Dónde se renderiza.** Hace falta Playwright con Chromium, y **no es dependencia de la app** (no va en `package.json`).
- En una sesión de Claude en la nube enlazada a la carpeta: ya está instalado allí. Copia `gtm/linkedin/skill/visual/` y el `spec.json` a la nube, renderiza, y devuelve los PNG y el PDF a `gtm/linkedin/visuales/<ID>/`.
- En Claude Code en el Mac: una vez, `npm i -g playwright && npx playwright install chromium`; después el comando de arriba funciona tal cual.
