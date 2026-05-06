# Double-I UI Overhaul — Design Spec
**Fecha:** 2026-05-06  
**Proyecto:** synergy-irving-tcg  
**Estado:** Aprobado por usuario

---

## Resumen

Aplicar la paleta de marca Double-I a todas las secciones del sitio, reemplazar la animación de Novedades con un cubo 3D de tipo dado, corregir el bug de navegación en las flechas del banner, rediseñar el ícono del mazo de cartas y agregar animaciones adicionales temáticas de TCG.

---

## 1. Sistema de colores de marca

### Variables CSS nuevas en `src/index.css` (`:root`)

```css
--color-brand-red:   #E82222;   /* rojo del logotipo */
--color-brand-navy:  #2B1A5E;   /* azul marino/violeta oscuro del logotipo */
--color-brand-sky:   #85C5E8;   /* azul cielo del logotipo */
```

### Clases Tailwind nuevas en `tailwind.config.js`

```js
colors: {
  'brand-red':  '#E82222',
  'brand-navy': '#2B1A5E',
  'brand-sky':  '#85C5E8',
}
```

---

## 2. Logo más grande en Navbar

**Archivo:** `src/components/layout/Navbar.tsx`

| Elemento | Antes | Después |
|---|---|---|
| `<img>` logo clases | `h-12 md:h-14 lg:h-16` | `h-16 md:h-20 lg:h-24` |
| inner flex div (navbar) | `h-16 md:h-18` | `h-20 md:h-24` (es el div `flex items-center justify-between`, no el `<header>`) |
| `pt-16` spacer en `HomePage` y páginas | `pt-16` | `pt-20 md:pt-24` |

El spacer `pt-16` en `HomePage.tsx` también se actualiza. Se revisarán todas las páginas que usen ese padding top.

---

## 3. Tipografía

`AGENCYB.TTF` ya está cargada en `index.css` como `'Agency Bold'` y aplicada a `h1/h2/h3` y clases `font-agency`. No se requieren cambios al archivo de fuente.

Se asegura que los subtítulos de sección (`.section-subtitle`) también usen `font-agency` — actualmente usan `font-exo`. Se cambia a `font-agency` en el `@layer components`.

El body copy de legibilidad (descripciones largas, precios, formularios) mantiene Exo 2.

---

## 4. Fondos de sección — HomePage

### `NovedadesSection.tsx`
- `bg-abyss` → `bg-brand-navy` (sección completa)
- Banner interior: el overlay del gradiente incorpora acento rojo: `rgba(232,34,34,0.10)` a la izquierda
- Acento inferior: borde `from-brand-red/60` en lugar de `from-dragon/60`

### `CategoryCards.tsx` (¿Qué Coleccionas?)
- `bg-night` → `bg-brand-navy`
- Texto y tarjetas mantienen sus colores actuales (blanco, ash) — son legibles sobre navy oscuro

### `BestsellerGrid.tsx`
- `bg-abyss` → `bg-brand-sky`
- Todos los textos de la sección adaptan a oscuro (Tailwind built-in slate, disponible junto a colores custom):
  - `section-subtitle` → `text-slate-600`
  - `section-title` → `text-slate-900`
  - Link "Ver todo →" → `text-brand-red hover:text-slate-900`
- `ProductCard` sobre fondo claro: la card usa `bg-white` con `shadow-md` en vez de `bg-deep border-navy/50`

### `NewsletterSignup.tsx` (Mantente al día)
- `bg-deep` → `bg-white`
- `section-subtitle` → `text-slate-500`
- `section-title` → `text-slate-900`
- Párrafo descriptivo → `text-slate-600`
- Input: `input-dark` → borde gris claro, fondo blanco/gris muy claro
- Botón submit: mantiene `btn-primary` (rojo) — funciona bien sobre blanco

---

## 5. Animación cubo 3D — NovedadesSection

### Descripción técnica

Reemplaza la animación `rotateY` plana actual por una transición de **cubo 3D** donde dos paneles actúan como caras adyacentes de un dado.

```
Geometría:
  - wrapper: perspective: 2400px, overflow: hidden
  - cubo: transform-style: preserve-3d, transition: rotateY(0→-90deg) 
  - cara frontal (current): rotateY(0deg) translateZ(halfDepth)
  - cara derecha (next):    rotateY(90deg) translateZ(halfDepth)
  
Al ir →: cubo rota rotateY de 0 a -90deg en 600ms (ease-in-out)
Al ir ←: cubo rota rotateY de 0 a +90deg en 600ms

halfDepth = ancho del panel ÷ 2 (para rotación en Y el translateZ usa el ancho, no la altura)
  En la práctica: perspective ~1400px, translateZ ~600px con overflow:hidden en el wrapper
```

### Cambios en estado

```ts
// Estado actual (se elimina 'rotation', 'transitionMs', 'isFlipping')
// Se reemplaza por:
const [currentFace, setCurrentFace] = useState(0)   // índice novedad actual
const [nextFace, setNextFace]       = useState(1)    // índice novedad siguiente
const [cubeRotY, setCubeRotY]       = useState(0)    // rotación Y del cubo
const [isAnimating, setIsAnimating] = useState(false)
```

### Fix bug flechas (incluido aquí)

**Causa del bug:** `onPointerUp` del contenedor llama `navigate()` cuando `!dragRef.moved`. Los botones de flecha usan `onClick` con `e.stopPropagation()`, pero el `stopPropagation` en `click` no detiene el `pointerup` del mismo gesto.

**Fix:** Los botones de flecha añaden:
```tsx
onPointerDown={(e) => e.stopPropagation()}
onPointerUp={(e) => { e.stopPropagation(); go(dir) }}
// No necesitan onClick — el pointerUp ya lo maneja
```

---

## 6. DeckIcon rediseño

**Archivo:** `src/components/ui/DeckIcon.tsx`

Redibuja el SVG para mostrar un mazo de cartas **inclinado a la izquierda** (como foto de referencia — Yu-Gi-Oh stack a ~15° con caras apiladas visibles):

- 5 rectángulos representando cartas apiladas
- Rotación global: `rotate(-15, 12, 12)` aplicado al grupo
- Desplazamiento perspectívico: cada carta se mueve +1px right/up respecto a la anterior
- Línea horizontal en la carta frontal (separador arte/texto)
- `strokeOpacity` gradual de atrás (0.15) a frente (1.0) para profundidad

---

## 7. Footer — Accesorios

**Archivo:** `src/components/layout/Footer.tsx`

En la columna "Tienda", agregar:
```ts
{ to: '/catalogo?franchise=accessories', label: 'Accesorios' }
```
Posición: después de `Lorcana`.

---

## 8. Animaciones adicionales (Magic MCP)

Se buscará en `mcp__magic__21st_magic_component_builder` e `inspiration` para:

| Animación | Ubicación | Descripción |
|---|---|---|
| Card shuffle hover | `CategoryCards` — cada tarjeta | Al hover, la tarjeta hace un micro-shuffle (rota levemente y vuelve) |
| Holographic shimmer | `ProductCard` — ya existe `.holographic`, reforzar | Brillo arcoíris más pronunciado al hover |
| Pack open ripple | `CartDrawer` — al añadir item | Ondas de energía desde el punto de adición |
| Floating cards bg | `Hero.tsx` (si existe) o sección vacía | Cartas flotando en el fondo con parallax |

---

## 9. Réplica de colores a otras páginas

Se revisan los `bg-*` en:

| Página | Cambio |
|---|---|
| `CatalogPage.tsx` | Header/filtros: `bg-night` → `bg-brand-navy` |
| `ProductDetailPage.tsx` | Sección principal: `bg-abyss` → `bg-brand-navy` |
| `BlogPage.tsx` | Header: `bg-night` → `bg-brand-navy` |
| `ContactPage.tsx` | Sección: `bg-abyss` → `bg-brand-navy` |
| `CartPage.tsx` | Fondo: mantiene oscuro, acento brand-red en totales |
| `CheckoutPage.tsx` | Igual que Cart |
| `AccountPage.tsx` | Header: `bg-night` → `bg-brand-navy` |

---

## Archivos a modificar

1. `src/index.css` — variables CSS + `.section-subtitle` font
2. `tailwind.config.js` — colores brand
3. `src/components/layout/Navbar.tsx` — tamaño logo + navbar height
4. `src/pages/HomePage.tsx` — spacer pt actualizado
5. `src/components/sections/NovedadesSection.tsx` — bg + cubo 3D + fix flechas
6. `src/components/sections/CategoryCards.tsx` — bg brand-navy
7. `src/components/sections/BestsellerGrid.tsx` — bg brand-sky + texto oscuro
8. `src/components/sections/NewsletterSignup.tsx` — bg white + texto oscuro
9. `src/components/ui/DeckIcon.tsx` — SVG nuevo
10. `src/components/layout/Footer.tsx` — añadir Accesorios
11. `src/pages/CatalogPage.tsx`, `ProductDetailPage.tsx`, `BlogPage.tsx`, `ContactPage.tsx`, `CartPage.tsx`, `CheckoutPage.tsx`, `AccountPage.tsx` — colores de sección

---

## Criterio de éxito

- `vite build` sin errores TypeScript
- Logo visible y prominente en navbar en desktop y mobile
- Animación cubo 3D suave en Novedades — flechas cambian imagen, no navegan
- Colores de marca presentes en todas las páginas
- Texto legible en Bestsellers (dark sobre sky blue) y Newsletter (dark sobre white)
- DeckIcon reconocible como mazo de cartas TCG
- "Accesorios" en footer → enlaza a `/catalogo?franchise=accessories`
