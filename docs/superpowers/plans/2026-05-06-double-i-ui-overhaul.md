# Double-I UI Overhaul — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Aplicar la paleta de marca Double-I (rojo #E82222, azul marino #2B1A5E, cielo #85C5E8) a todas las secciones, reemplazar la animación de Novedades por un cubo 3D, corregir el bug de flechas, rediseñar DeckIcon y agregar animaciones.

**Architecture:** Cambios CSS/Tailwind en base + ajustes a componentes individuales. La animación de cubo usa dos paneles absolutos con `perspective` compartida. ProductCard recibe prop `light` para adaptarse a fondo claro.

**Tech Stack:** React + Vite + TypeScript + Tailwind CSS v3 · tailwind.config.js · index.css

---

## Mapa de archivos

| Archivo | Acción | Razón |
|---|---|---|
| `tailwind.config.js` | Modificar | Añadir brand-red, brand-navy, brand-sky |
| `src/index.css` | Modificar | Variables CSS + section-subtitle font-agency |
| `src/components/layout/Navbar.tsx` | Modificar | Logo más grande, navbar height |
| `src/pages/HomePage.tsx` | Modificar | Spacer pt-16 → pt-20 |
| `src/components/sections/NovedadesSection.tsx` | Reescribir animación | Cubo 3D + bg-brand-navy + fix flechas |
| `src/components/sections/CategoryCards.tsx` | Modificar | bg-brand-navy |
| `src/components/sections/BestsellerGrid.tsx` | Modificar | bg-brand-sky + texto oscuro + prop light |
| `src/components/ui/ProductCard.tsx` | Modificar | Prop `light?: boolean` |
| `src/components/sections/NewsletterSignup.tsx` | Modificar | bg-white + texto oscuro |
| `src/components/ui/DeckIcon.tsx` | Reescribir SVG | Mazo inclinado |
| `src/components/layout/Footer.tsx` | Modificar | Agregar Accesorios |
| `src/pages/CatalogPage.tsx` | Modificar | bg-brand-navy |
| `src/pages/BlogPage.tsx` | Modificar | bg-brand-navy |
| `src/pages/BlogPostPage.tsx` | Modificar | bg-brand-navy |
| `src/pages/ContactPage.tsx` | Modificar | bg-brand-navy |
| `src/pages/ProductDetailPage.tsx` | Modificar | bg-brand-navy |
| `src/pages/CartPage.tsx` | Modificar | bg-brand-navy |
| `src/pages/CheckoutPage.tsx` | Modificar | bg-brand-navy |
| `src/pages/AccountPage.tsx` | Modificar | bg-brand-navy |

---

## Task 1: Sistema de colores de marca — Tailwind + CSS

**Files:**
- Modify: `tailwind.config.js`
- Modify: `src/index.css`

- [ ] **Step 1: Añadir colores de marca a tailwind.config.js**

En la sección `theme.extend.colors`, añadir después de `ash`:

```js
// tailwind.config.js — dentro de colors: { ... }
'brand-red':  '#E82222',
'brand-navy': '#2B1A5E',
'brand-sky':  '#85C5E8',
```

Resultado del bloque `colors` completo:
```js
colors: {
  void: '#080C14',
  night: '#0F1520',
  abyss: '#141E2E',
  deep: '#1A2338',
  navy: '#1E3054',
  royal: '#3040C4',
  dragon: '#6BB8EC',
  crimson: '#CC1515',
  flame: '#FF2222',
  frost: '#C8D8F0',
  ash: '#8A90A8',
  'brand-red':  '#E82222',
  'brand-navy': '#2B1A5E',
  'brand-sky':  '#85C5E8',
},
```

- [ ] **Step 2: Añadir variables CSS en src/index.css**

Dentro del bloque `:root { ... }`, añadir al final (antes del cierre `}`):

```css
--color-brand-red:   #E82222;
--color-brand-navy:  #2B1A5E;
--color-brand-sky:   #85C5E8;
```

- [ ] **Step 3: Cambiar .section-subtitle de font-exo a font-agency**

En `src/index.css`, localizar y reemplazar:
```css
/* ANTES */
.section-subtitle {
  @apply font-exo text-ash text-sm uppercase tracking-widest;
}

/* DESPUÉS */
.section-subtitle {
  @apply font-agency text-ash text-sm uppercase tracking-widest;
}
```

- [ ] **Step 4: Verificar que el build no tiene errores**

```bash
npm run build
```

Esperado: `vite build` completa sin errores TypeScript.

- [ ] **Step 5: Commit**

```bash
git add tailwind.config.js src/index.css
git commit -m "style: agregar colores de marca brand-red/navy/sky y section-subtitle font-agency"
```

---

## Task 2: Navbar — Logo más grande

**Files:**
- Modify: `src/components/layout/Navbar.tsx`
- Modify: `src/pages/HomePage.tsx`

- [ ] **Step 1: Aumentar tamaño del logo en Navbar.tsx**

Localizar la etiqueta `<img>` del logo (línea ~49) y cambiar las clases:

```tsx
{/* ANTES */}
<img
  src="/logo-color.png"
  alt="Double-I Trading Card Game"
  className="h-12 md:h-14 lg:h-16 w-auto"
/>

{/* DESPUÉS */}
<img
  src="/logo-color.png"
  alt="Double-I Trading Card Game"
  className="h-16 md:h-20 lg:h-24 w-auto"
/>
```

- [ ] **Step 2: Aumentar height del flex container interno del header**

En `Navbar.tsx` localizar el div con `flex items-center justify-between` (línea ~45):

```tsx
{/* ANTES */}
<div className="flex items-center justify-between h-16 md:h-18">

{/* DESPUÉS */}
<div className="flex items-center justify-between h-20 md:h-24">
```

- [ ] **Step 3: Actualizar spacer en HomePage.tsx**

En `src/pages/HomePage.tsx`, línea ~24:

```tsx
{/* ANTES */}
<div className="pt-16" />

{/* DESPUÉS */}
<div className="pt-20 md:pt-24" />
```

- [ ] **Step 4: Verificar build**

```bash
npm run build
```

- [ ] **Step 5: Commit**

```bash
git add src/components/layout/Navbar.tsx src/pages/HomePage.tsx
git commit -m "style: logo más grande en navbar y spacer actualizado"
```

---

## Task 3: Fondos de sección — Novedades y Qué Coleccionas

**Files:**
- Modify: `src/components/sections/NovedadesSection.tsx`
- Modify: `src/components/sections/CategoryCards.tsx`

**Nota:** Esta tarea solo cambia los fondos. La animación cubo 3D se hace en Task 5.

- [ ] **Step 1: Cambiar fondo de NovedadesSection a brand-navy**

En `NovedadesSection.tsx`, el fallback (línea ~103) y la sección principal (línea ~122):

```tsx
{/* ANTES — fallback */}
<section className="bg-abyss py-16">

{/* DESPUÉS — fallback */}
<section className="bg-brand-navy py-16">
```

```tsx
{/* ANTES — sección principal */}
<section className="bg-abyss py-14">

{/* DESPUÉS */}
<section className="bg-brand-navy py-14">
```

- [ ] **Step 2: Añadir acento rojo en el gradiente overlay del banner**

En `NovedadesSection.tsx`, localizar el `<div>` con el gradiente overlay (~línea 169):

```tsx
{/* ANTES */}
style={{
  background: 'linear-gradient(to right, rgba(10,13,20,0.88) 0%, rgba(10,13,20,0.5) 45%, rgba(10,13,20,0.1) 100%)',
}}

{/* DESPUÉS */}
style={{
  background: 'linear-gradient(to right, rgba(232,34,34,0.18) 0%, rgba(43,26,94,0.75) 20%, rgba(43,26,94,0.4) 55%, rgba(43,26,94,0.05) 100%)',
}}
```

- [ ] **Step 3: Cambiar acento del borde inferior a brand-red**

En `NovedadesSection.tsx`, localizar el `<div>` con `h-px bg-gradient-to-r from-dragon/60`:

```tsx
{/* ANTES */}
<div className="h-px bg-gradient-to-r from-dragon/60 via-royal/40 to-transparent" />

{/* DESPUÉS */}
<div className="h-px bg-gradient-to-r from-brand-red/70 via-brand-navy/40 to-transparent" />
```

- [ ] **Step 4: Cambiar fondo de CategoryCards a brand-navy**

En `CategoryCards.tsx`, línea ~53:

```tsx
{/* ANTES */}
<section className="bg-night py-16">

{/* DESPUÉS */}
<section className="bg-brand-navy py-16">
```

- [ ] **Step 5: Build y commit**

```bash
npm run build
git add src/components/sections/NovedadesSection.tsx src/components/sections/CategoryCards.tsx
git commit -m "style: fondos Novedades y Qué Coleccionas a brand-navy con acento rojo"
```

---

## Task 4: BestsellerGrid — fondo sky blue + ProductCard light mode

**Files:**
- Modify: `src/components/sections/BestsellerGrid.tsx`
- Modify: `src/components/ui/ProductCard.tsx`

- [ ] **Step 1: Añadir prop `light` a ProductCard**

En `src/components/ui/ProductCard.tsx`, cambiar la interfaz (~línea 8):

```tsx
{/* ANTES */}
interface ProductCardProps {
  product: Product
  className?: string
}

{/* DESPUÉS */}
interface ProductCardProps {
  product: Product
  className?: string
  light?: boolean
}
```

Y en la función (~línea 65):

```tsx
{/* ANTES */}
export function ProductCard({ product, className }: ProductCardProps) {

{/* DESPUÉS */}
export function ProductCard({ product, className, light = false }: ProductCardProps) {
```

- [ ] **Step 2: Aplicar estilos light en la cara frontal de ProductCard**

Localizar el div de la cara frontal (~línea 144):

```tsx
{/* ANTES */}
<div
  className={cn(
    'relative bg-deep border border-navy/50 overflow-hidden transition-colors duration-300',
    isHovered && flipPhase === 'idle' && 'border-dragon/40 shadow-card-hover',
    outOfStock && 'opacity-60'
  )}
  style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
>

{/* DESPUÉS */}
<div
  className={cn(
    'relative overflow-hidden transition-colors duration-300',
    light
      ? 'bg-white border border-slate-200 shadow-md'
      : 'bg-deep border border-navy/50',
    !light && isHovered && flipPhase === 'idle' && 'border-dragon/40 shadow-card-hover',
    light && isHovered && flipPhase === 'idle' && 'border-brand-sky shadow-lg',
    outOfStock && 'opacity-60'
  )}
  style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
>
```

- [ ] **Step 3: Cambiar BestsellerGrid a fondo sky blue con texto oscuro**

Reemplazar el contenido completo de `BestsellerGrid.tsx`:

```tsx
import { Link } from 'react-router-dom'
import { useBestsellers } from '@/hooks/useProducts'
import { ProductCard } from '@/components/ui/ProductCard'
import { ScrollRevealGrid } from '@/components/ui/ScrollRevealGrid'

export function BestsellerGrid() {
  const products = useBestsellers()

  return (
    <section className="bg-brand-sky py-16">
      <div className="page-container">
        <div className="flex items-end justify-between mb-8">
          <div>
            <p className="section-subtitle mb-2 text-slate-600">Más vendidos últimos 30 días</p>
            <h2 className="font-agency text-3xl md:text-4xl text-slate-900 tracking-wider uppercase">
              Bestsellers
            </h2>
          </div>
          <Link
            to="/catalogo"
            className="hidden sm:block font-agency text-xs uppercase tracking-wider text-brand-navy hover:text-brand-red transition-colors"
          >
            Ver todo →
          </Link>
        </div>

        <ScrollRevealGrid className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {products.map((product, i) => (
            <div
              key={product.id}
              style={{ animation: `slideUp 0.5s ease-out ${i * 0.07}s both` }}
            >
              <ProductCard product={product} light />
            </div>
          ))}
        </ScrollRevealGrid>

        <div className="sm:hidden mt-6 text-center">
          <Link
            to="/catalogo"
            className="font-agency text-xs uppercase tracking-wider border border-brand-navy text-brand-navy hover:bg-brand-navy hover:text-white px-6 py-3 transition-all duration-200 inline-block"
          >
            Ver todo el catálogo
          </Link>
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 4: Build y verificar que las product cards se ven bien sobre sky blue**

```bash
npm run build
```

- [ ] **Step 5: Commit**

```bash
git add src/components/sections/BestsellerGrid.tsx src/components/ui/ProductCard.tsx
git commit -m "style: BestsellerGrid fondo brand-sky con texto oscuro y ProductCard modo light"
```

---

## Task 5: NewsletterSignup — fondo blanco

**Files:**
- Modify: `src/components/sections/NewsletterSignup.tsx`

- [ ] **Step 1: Reemplazar NewsletterSignup.tsx completo**

```tsx
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { suscripcionSchema, type SuscripcionFormData } from '@/lib/schemas/suscripcion'
import { emailApi } from '@/lib/api'

export function NewsletterSignup() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SuscripcionFormData>({ resolver: zodResolver(suscripcionSchema) })

  const onSubmit = async (data: SuscripcionFormData) => {
    setStatus('loading')
    try {
      await emailApi.subscribe(data.email, data.name)
      setStatus('success')
      reset()
    } catch {
      setStatus('success')
      reset()
    }
  }

  return (
    <section className="relative bg-white py-16 overflow-hidden">
      {/* Background glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 60% 80% at 50% 100%, rgba(133,197,232,0.18) 0%, transparent 70%)',
        }}
        aria-hidden="true"
      />

      <div className="page-container relative z-10">
        <div className="max-w-2xl mx-auto text-center">
          <p className="section-subtitle mb-3 text-slate-500">Mantente al día</p>
          <h2 className="font-agency text-3xl md:text-4xl text-slate-900 tracking-wider uppercase mb-4">
            Novedades en tu correo
          </h2>
          <p className="font-exo text-slate-600 text-sm mb-8 leading-relaxed">
            Entérate primero cuando lleguen nuevas cartas, promociones exclusivas y artículos de colección.
          </p>

          {status === 'success' ? (
            <div className="flex items-center justify-center gap-3 py-6">
              <span className="text-2xl">🎉</span>
              <div className="text-left">
                <p className="font-agency text-brand-red uppercase tracking-wide text-sm">¡Suscripción exitosa!</p>
                <p className="font-exo text-slate-500 text-xs mt-0.5">Recibirás un correo de bienvenida pronto.</p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} noValidate>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1">
                  <input
                    {...register('email')}
                    type="email"
                    placeholder="tu@correo.com"
                    className="w-full px-3 py-3 text-sm font-exo border border-slate-300 bg-slate-50 focus:border-brand-sky focus:outline-none text-slate-800 placeholder:text-slate-400 h-12"
                    aria-label="Correo electrónico"
                  />
                  {errors.email && (
                    <p className="text-xs text-brand-red mt-1 text-left">{errors.email.message}</p>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={status === 'loading'}
                  className="btn-primary h-12 px-8 text-sm flex-shrink-0 flex items-center justify-center gap-2"
                >
                  {status === 'loading' ? (
                    <>
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Suscribiendo...
                    </>
                  ) : (
                    'Suscribirme'
                  )}
                </button>
              </div>
              <p className="text-xs text-slate-400 mt-3 font-exo">
                Sin spam. Cancela cuando quieras.
              </p>
            </form>
          )}
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Build y commit**

```bash
npm run build
git add src/components/sections/NewsletterSignup.tsx
git commit -m "style: NewsletterSignup fondo blanco con texto oscuro"
```

---

## Task 6: NovedadesSection — Animación cubo 3D + fix flechas

**Files:**
- Modify: `src/components/sections/NovedadesSection.tsx`

**Concepto de la animación:**
- Dos paneles absolutos superpuestos comparten `perspective: 1400px` del contenedor
- Al ir → (siguiente): panel actual rota `rotateY(-90deg)` con `transformOrigin: left center` (se va a la izquierda); siguiente entra desde `rotateY(90deg)` hacia `rotateY(0deg)` con `transformOrigin: right center`
- Al ir ← (anterior): opuesto
- Duration: 600ms `cubic-bezier(0.4,0,0.2,1)`
- `overflow: hidden` en el contenedor para que los paneles no desborden

**Fix del bug de flechas:** Los botones de flecha llaman `e.stopPropagation()` en `onPointerDown` y `onPointerUp` para cortar la cadena de pointer events antes de que llegue al `onPointerUp` del contenedor que llama `navigate()`.

- [ ] **Step 1: Reemplazar NovedadesSection.tsx completo**

**Nota sobre la animación:** El panel "next" necesita renderizarse PRIMERO en su posición inicial (rotateY ±90°, sin transition) y luego, en el siguiente frame, recibir la transition que lo lleva a rotateY(0°). Esto se logra con una fase `'priming'` + `requestAnimationFrame`. Sin este paso, el panel aparecería directamente en 0° sin animarse.

```tsx
import { useState, useRef, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { MOCK_NOVEDADES, MOCK_PRODUCTS } from '@/lib/mockData'
import { ProductCard } from '@/components/ui/ProductCard'
import { cn } from '@/lib/utils'

const CUBE_DURATION = 600

type AnimPhase = 'idle' | 'priming' | 'animating'

interface BannerPanelProps {
  nov: (typeof MOCK_NOVEDADES)[0]
}

function BannerPanel({ nov }: BannerPanelProps) {
  return (
    <div className="relative overflow-hidden" style={{ borderRadius: '2px' }}>
      <div className="relative aspect-[16/7] md:aspect-[21/8] overflow-hidden bg-brand-navy">
        <img
          src={nov.image}
          alt={nov.title}
          className="w-full h-full object-cover"
          draggable={false}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(to right, rgba(232,34,34,0.18) 0%, rgba(43,26,94,0.75) 20%, rgba(43,26,94,0.4) 55%, rgba(43,26,94,0.05) 100%)',
          }}
        />
        <div className="absolute inset-0 flex flex-col justify-end p-6 md:p-10 max-w-lg">
          <p className="font-agency text-brand-red text-xs uppercase tracking-[0.3em] mb-2">
            Novedad destacada
          </p>
          <h3 className="font-agency text-2xl md:text-4xl text-white uppercase leading-tight mb-3">
            {nov.title}
          </h3>
          {nov.text && (
            <p className="font-exo text-frost/75 text-sm md:text-base leading-relaxed mb-5 max-w-sm">
              {nov.text}
            </p>
          )}
          {nov.productSlug && (
            <div className="flex items-center gap-2">
              <span className="font-agency text-xs text-brand-red uppercase tracking-widest">
                Ver producto
              </span>
              <span className="text-brand-red text-sm">→</span>
            </div>
          )}
        </div>
      </div>
      <div className="h-px bg-gradient-to-r from-brand-red/70 via-brand-navy/40 to-transparent" />
    </div>
  )
}

export function NovedadesSection() {
  const novedades = MOCK_NOVEDADES.filter((n) => n.isActive).sort((a, b) => a.order - b.order)
  const navigate = useNavigate()

  const [currentIdx, setCurrentIdx] = useState(0)
  const [nextIdx, setNextIdx] = useState(1 % Math.max(novedades.length, 1))
  const [phase, setPhase] = useState<AnimPhase>('idle')
  const [dir, setDir] = useState<1 | -1>(1)
  const [autoPlay, setAutoPlay] = useState(true)

  const dragRef = useRef({ startX: 0, moved: false })
  const containerRef = useRef<HTMLDivElement>(null)

  const go = useCallback(
    (d: 1 | -1) => {
      if (phase !== 'idle' || novedades.length <= 1) return
      const nxt = (currentIdx + d + novedades.length) % novedades.length
      setNextIdx(nxt)
      setDir(d)
      // Phase 1 — prime: render next panel at start position, no transition yet
      setPhase('priming')
      // Phase 2 — animate: after React paints the primed position, trigger transitions
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setPhase('animating')
          setTimeout(() => {
            setCurrentIdx(nxt)
            setPhase('idle')
          }, CUBE_DURATION)
        })
      })
    },
    [currentIdx, phase, novedades.length]
  )

  useEffect(() => {
    if (!autoPlay || novedades.length <= 1) return
    const timer = setInterval(() => go(1), 5000)
    return () => clearInterval(timer)
  }, [go, autoPlay, novedades.length])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!containerRef.current?.contains(document.activeElement)) return
      if (e.key === 'ArrowRight') go(1)
      if (e.key === 'ArrowLeft') go(-1)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [go])

  const onPointerDown = (e: React.PointerEvent) => {
    dragRef.current.startX = e.clientX
    dragRef.current.moved = false
    setAutoPlay(false)
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }

  const onPointerMove = (e: React.PointerEvent) => {
    if (Math.abs(e.clientX - dragRef.current.startX) > 8) dragRef.current.moved = true
  }

  const onPointerUp = (e: React.PointerEvent) => {
    const delta = e.clientX - dragRef.current.startX
    if (dragRef.current.moved && Math.abs(delta) > 55) {
      go(delta < 0 ? 1 : -1)
    } else if (!dragRef.current.moved) {
      const nov = novedades[currentIdx]
      if (nov?.productSlug) navigate(`/catalogo/${nov.productSlug}`)
    }
    setTimeout(() => setAutoPlay(true), 8000)
  }

  const isMoving = phase !== 'idle'

  // Current panel exits during 'animating', stays put during 'priming' and 'idle'
  const currentTransform =
    phase === 'animating' ? `rotateY(${dir === 1 ? -90 : 90}deg)` : 'rotateY(0deg)'
  const currentOrigin = dir === 1 ? 'left center' : 'right center'
  const currentTransition =
    phase === 'animating' ? `transform ${CUBE_DURATION}ms cubic-bezier(0.4,0,0.2,1)` : 'none'

  // Next panel: during 'priming' = initial offset position (no transition)
  //             during 'animating' = transitions into view (rotateY → 0)
  const nextTransform =
    phase === 'animating' ? 'rotateY(0deg)' : `rotateY(${dir === 1 ? 90 : -90}deg)`
  const nextOrigin = dir === 1 ? 'right center' : 'left center'
  const nextTransition =
    phase === 'animating' ? `transform ${CUBE_DURATION}ms cubic-bezier(0.4,0,0.2,1)` : 'none'

  const fallbackProducts = MOCK_PRODUCTS.filter((p) => p.isActive)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 4)

  if (novedades.length === 0) {
    return (
      <section className="bg-brand-navy py-16">
        <div className="page-container">
          <div className="mb-8">
            <p className="section-subtitle mb-2">Recién llegado</p>
            <h2 className="section-title">Novedades</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {fallbackProducts.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="bg-brand-navy py-14">
      <div className="page-container">
        <div className="flex items-end justify-between mb-6">
          <div>
            <p className="section-subtitle mb-1">Recién llegado</p>
            <h2 className="section-title">Novedades</h2>
          </div>
          <span className="font-agency text-ash text-sm tracking-widest">
            {currentIdx + 1} / {novedades.length}
          </span>
        </div>

        {/* Cube container — perspective shared by both panels */}
        <div
          ref={containerRef}
          className="relative select-none cursor-pointer"
          style={{ perspective: '1400px', overflow: 'hidden' }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          tabIndex={0}
          role="region"
          aria-label="Novedades — usa flechas del teclado para navegar"
        >
          {/* Current panel */}
          <div
            style={{
              transform: currentTransform,
              transformOrigin: isMoving ? currentOrigin : 'center center',
              transition: currentTransition,
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
            }}
          >
            <BannerPanel nov={novedades[currentIdx]} />
          </div>

          {/* Next panel — rendered during priming+animating phases */}
          {isMoving && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                transform: nextTransform,
                transformOrigin: nextOrigin,
                transition: nextTransition,
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden',
              }}
            >
              <BannerPanel nov={novedades[nextIdx]} />
            </div>
          )}

          {/* Prev button — stopPropagation en pointer events para no trigger navigate */}
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onPointerUp={(e) => { e.stopPropagation(); go(-1) }}
            aria-label="Novedad anterior"
            className={cn(
              'absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 border border-brand-red/40 bg-brand-navy/70 backdrop-blur-sm',
              'flex items-center justify-center text-ash hover:text-white hover:border-brand-red transition-all duration-200 z-10',
              novedades.length <= 1 && 'hidden'
            )}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {/* Next button */}
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onPointerUp={(e) => { e.stopPropagation(); go(1) }}
            aria-label="Siguiente novedad"
            className={cn(
              'absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 border border-brand-red/40 bg-brand-navy/70 backdrop-blur-sm',
              'flex items-center justify-center text-ash hover:text-white hover:border-brand-red transition-all duration-200 z-10',
              novedades.length <= 1 && 'hidden'
            )}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Dot indicators */}
        {novedades.length > 1 && (
          <div className="flex justify-center gap-2 mt-5">
            {novedades.map((_, i) => (
              <button
                key={i}
                onPointerDown={(e) => e.stopPropagation()}
                onPointerUp={(e) => {
                  e.stopPropagation()
                  if (i === currentIdx || phase !== 'idle') return
                  go(i > currentIdx ? 1 : -1)
                }}
                aria-label={`Ir a novedad ${i + 1}`}
                className={cn(
                  'h-1 rounded-full transition-all duration-300',
                  i === currentIdx ? 'w-8 bg-brand-red' : 'w-2 bg-brand-navy/60 hover:bg-brand-red/40'
                )}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Build y verificar animación**

```bash
npm run build
```

Verificar en el navegador (`npm run dev`) que:
1. El banner de Novedades se ve con fondo azul marino
2. Al hacer click en las flechas, cambia la imagen (no navega al producto)
3. La transición tiene efecto 3D

- [ ] **Step 3: Commit**

```bash
git add src/components/sections/NovedadesSection.tsx
git commit -m "feat: animación cubo 3D en Novedades + fix bug flechas de navegación"
```

---

## Task 7: DeckIcon — rediseño SVG como mazo de cartas

**Files:**
- Modify: `src/components/ui/DeckIcon.tsx`

**Diseño:** 4 rectángulos que representan cartas apiladas con inclinación a la izquierda (~15°). Las cartas traseras tienen menor opacidad, la delantera tiene opacidad 1.0 y una línea separadora (arte/texto).

- [ ] **Step 1: Reemplazar DeckIcon.tsx**

```tsx
interface DeckIconProps {
  className?: string
  empty?: boolean
}

export function DeckIcon({ className, empty = false }: DeckIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {/* Deck of cards tilted left — back to front, each card offset */}
      <g transform="rotate(-15, 11, 13)">
        {/* Card 4 — back of deck */}
        <rect x="7.5" y="2" width="10" height="14" rx="1.5"
          strokeOpacity={empty ? 0.05 : 0.12} />
        {/* Card 3 */}
        <rect x="6" y="3.5" width="10" height="14" rx="1.5"
          strokeOpacity={empty ? 0.1 : 0.28} />
        {/* Card 2 */}
        <rect x="4.5" y="5" width="10" height="14" rx="1.5"
          strokeOpacity={empty ? 0.18 : 0.52} />
        {/* Card 1 — front */}
        <rect x="3" y="6.5" width="10" height="14" rx="1.5"
          strokeOpacity={empty ? 0.35 : 1} />
        {/* Art separator on front card */}
        {!empty && (
          <line x1="4.5" y1="12" x2="11.5" y2="12"
            strokeWidth="0.75" strokeOpacity="0.65" />
        )}
      </g>
    </svg>
  )
}
```

- [ ] **Step 2: Build y verificar que el ícono en la navbar se ve como mazo**

```bash
npm run build
```

Abrir en navegador (`npm run dev`), el ícono del carrito debería verse como cartas apiladas inclinadas a la izquierda.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/DeckIcon.tsx
git commit -m "style: DeckIcon rediseñado como mazo de cartas TCG inclinado"
```

---

## Task 8: Footer — agregar Accesorios

**Files:**
- Modify: `src/components/layout/Footer.tsx`

- [ ] **Step 1: Añadir Accesorios a la columna Tienda**

En `Footer.tsx`, localizar el array de la columna Tienda (~línea 53):

```tsx
{/* ANTES */}
{[
  { to: '/catalogo', label: 'Catálogo' },
  { to: '/catalogo?franchise=pokemon', label: 'Pokémon' },
  { to: '/catalogo?franchise=yugioh', label: 'Yu-Gi-Oh!' },
  { to: '/catalogo?franchise=lorcana', label: 'Lorcana' },
].map((link) => (

{/* DESPUÉS */}
{[
  { to: '/catalogo', label: 'Catálogo' },
  { to: '/catalogo?franchise=pokemon', label: 'Pokémon' },
  { to: '/catalogo?franchise=yugioh', label: 'Yu-Gi-Oh!' },
  { to: '/catalogo?franchise=lorcana', label: 'Lorcana' },
  { to: '/catalogo?franchise=accessories', label: 'Accesorios' },
].map((link) => (
```

- [ ] **Step 2: Build y commit**

```bash
npm run build
git add src/components/layout/Footer.tsx
git commit -m "feat: agregar Accesorios al footer columna Tienda"
```

---

## Task 9: Otras páginas — fondo bg-brand-navy

**Files:**
- Modify: `src/pages/CatalogPage.tsx`
- Modify: `src/pages/BlogPage.tsx`
- Modify: `src/pages/BlogPostPage.tsx`
- Modify: `src/pages/ContactPage.tsx`
- Modify: `src/pages/ProductDetailPage.tsx`
- Modify: `src/pages/CartPage.tsx`
- Modify: `src/pages/CheckoutPage.tsx`
- Modify: `src/pages/AccountPage.tsx`

- [ ] **Step 1: CatalogPage — cambiar bg-night a bg-brand-navy**

En `CatalogPage.tsx`, línea ~50:

```tsx
{/* ANTES */}
<div className="bg-night min-h-screen pt-20">

{/* DESPUÉS */}
<div className="bg-brand-navy min-h-screen pt-20">
```

- [ ] **Step 2: BlogPage y BlogPostPage — cambiar bg-night a bg-brand-navy**

`BlogPage.tsx`, línea ~17:
```tsx
{/* ANTES */}
<div className="bg-night min-h-screen pt-20">
{/* DESPUÉS */}
<div className="bg-brand-navy min-h-screen pt-20">
```

`BlogPostPage.tsx`, línea ~24:
```tsx
{/* ANTES */}
<div className="bg-night min-h-screen pt-20">
{/* DESPUÉS */}
<div className="bg-brand-navy min-h-screen pt-20">
```

- [ ] **Step 3: ContactPage — cambiar bg-night a bg-brand-navy**

`ContactPage.tsx`, línea ~14:
```tsx
{/* ANTES */}
<div className="bg-night min-h-screen pt-20">
{/* DESPUÉS */}
<div className="bg-brand-navy min-h-screen pt-20">
```

- [ ] **Step 4: ProductDetailPage — cambiar bg-night a bg-brand-navy**

`ProductDetailPage.tsx`, línea ~47:
```tsx
{/* ANTES */}
<div className="bg-night min-h-screen pt-20">
{/* DESPUÉS */}
<div className="bg-brand-navy min-h-screen pt-20">
```

- [ ] **Step 5: CartPage — cambiar bg-night a bg-brand-navy**

`CartPage.tsx`, línea ~15:
```tsx
{/* ANTES */}
<div className="bg-night min-h-screen pt-20">
{/* DESPUÉS */}
<div className="bg-brand-navy min-h-screen pt-20">
```

- [ ] **Step 6: CheckoutPage — cambiar bg-night a bg-brand-navy**

`CheckoutPage.tsx`, línea ~105:
```tsx
{/* ANTES */}
<div className="bg-night min-h-screen pt-20">
{/* DESPUÉS */}
<div className="bg-brand-navy min-h-screen pt-20">
```

- [ ] **Step 7: AccountPage — cambiar bg-night a bg-brand-navy (todas las instancias)**

`AccountPage.tsx` tiene `bg-night` en líneas ~26, ~39, ~63. Cambiar las 3 instancias a `bg-brand-navy`.

- [ ] **Step 8: Build final y commit**

```bash
npm run build
git add src/pages/CatalogPage.tsx src/pages/BlogPage.tsx src/pages/BlogPostPage.tsx \
  src/pages/ContactPage.tsx src/pages/ProductDetailPage.tsx src/pages/CartPage.tsx \
  src/pages/CheckoutPage.tsx src/pages/AccountPage.tsx
git commit -m "style: fondo bg-brand-navy en todas las páginas del sitio"
```

---

## Task 10: Animaciones adicionales — Magic MCP

**Files:**
- Modify: `src/components/sections/CategoryCards.tsx` (shuffle hover)
- Modify: `src/index.css` (nuevas keyframes)
- Modify: `src/components/ui/ProductCard.tsx` (holographic mejorado)

- [ ] **Step 1: Buscar inspiración en Magic MCP**

Usar el MCP de 21st Magic para buscar animaciones de cartas:

```
mcp__magic__21st_magic_component_inspiration: "TCG card shuffle hover animation"
mcp__magic__21st_magic_component_inspiration: "holographic card shimmer effect"
mcp__magic__21st_magic_component_inspiration: "card dealing animation css"
```

Revisar los resultados y seleccionar las animaciones más relevantes.

- [ ] **Step 2: Añadir keyframes de nuevas animaciones a index.css**

Al final del bloque de `@keyframes` en `src/index.css`, añadir:

```css
/* Micro-shuffle hover — tarjetas de categoría */
@keyframes cardShuffle {
  0%   { transform: rotate(0deg) translateY(0px); }
  20%  { transform: rotate(-3deg) translateY(-3px); }
  40%  { transform: rotate(2deg) translateY(-5px); }
  60%  { transform: rotate(-1deg) translateY(-3px); }
  80%  { transform: rotate(1deg) translateY(-1px); }
  100% { transform: rotate(0deg) translateY(0px); }
}

/* Holographic rainbow sweep */
@keyframes holoRainbow {
  0%   { background-position: -200% 0; filter: hue-rotate(0deg); }
  50%  { filter: hue-rotate(180deg); }
  100% { background-position: 200% 0; filter: hue-rotate(360deg); }
}

/* Pack energy ripple */
@keyframes energyRipple {
  0%   { transform: scale(1); opacity: 0.8; }
  100% { transform: scale(2.5); opacity: 0; }
}
```

- [ ] **Step 3: Añadir shuffle hover a CategoryCards**

En `CategoryCards.tsx`, en el `<Link>` de cada categoría, añadir clase de animación:

```tsx
{/* En el className del Link — añadir group/animation */}
className="group relative block overflow-hidden border transition-all duration-300 hover:[animation:cardShuffle_0.5s_ease-in-out]"
```

- [ ] **Step 4: Mejorar holographic shimmer en ProductCard**

En `ProductCard.tsx`, el bloque `isHolo` (~línea 170), reemplazar el `background` del overlay:

```tsx
{/* ANTES */}
style={{
  background: `linear-gradient(
    ${105 + tilt.y * 2}deg,
    transparent 30%,
    rgba(107,184,236,0.25) 45%,
    rgba(48,64,196,0.2) 50%,
    rgba(204,21,21,0.1) 55%,
    transparent 65%
  )`,
}}

{/* DESPUÉS */}
style={{
  background: `linear-gradient(
    ${105 + tilt.y * 2}deg,
    transparent 20%,
    rgba(255,0,128,0.2) 30%,
    rgba(107,184,236,0.3) 40%,
    rgba(48,196,96,0.2) 50%,
    rgba(196,48,196,0.2) 60%,
    rgba(232,34,34,0.15) 70%,
    transparent 80%
  )`,
  backgroundSize: '200% 100%',
  animation: 'holoRainbow 4s linear infinite',
}}
```

- [ ] **Step 5: Build y commit**

```bash
npm run build
git add src/components/sections/CategoryCards.tsx src/index.css src/components/ui/ProductCard.tsx
git commit -m "feat: animaciones TCG — card shuffle hover, holographic rainbow, keyframes de cartas"
```

---

## Verificación final

- [ ] **Step 1: Build limpio**

```bash
npm run build
```

Esperado: `✓ built in X.XXs` sin errores TypeScript.

- [ ] **Step 2: Smoke test visual en browser**

```bash
npm run dev
```

Checklist:
- [ ] Logo prominente en navbar (más alto que antes)
- [ ] Novedades: fondo azul marino, banner con acento rojo
- [ ] Flechas de Novedades cambian imagen con cubo 3D (no navegan al producto)
- [ ] Qué Coleccionas: fondo azul marino
- [ ] Bestsellers: fondo azul cielo, texto oscuro, product cards blancas
- [ ] Newsletter: fondo blanco, texto oscuro
- [ ] DeckIcon se ve como mazo de cartas inclinado
- [ ] Footer tiene "Accesorios" en la columna Tienda
- [ ] CatalogPage, BlogPage, CartPage y demás tienen fondo azul marino
- [ ] Al hover sobre las cartas de categoría hay micro-animación
- [ ] Las cartas holo tienen shimmer arcoíris

- [ ] **Step 3: Commit de ajustes si hay detalles**

Si hay ajustes visuales menores tras el smoke test, corregirlos y commitear:

```bash
git add -p
git commit -m "style: ajustes visuales post-review UI overhaul"
```
