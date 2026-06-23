import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import type { BannerSlide } from '@/types'

const STORAGE_KEY = 'doublei_banner_slides'

const DEFAULT_SLIDES: BannerSlide[] = [
  {
    id: '1',
    imageUrl: 'https://placehold.co/1600x700/0D0820/6BB8EC?text=Double-I+TCG',
    title: 'Tu tienda especialista',
    subtitle: 'Pokémon · Yu-Gi-Oh! · Lorcana — cartas individuales con condición verificada.',
    ctaLabel: 'Explorar Catálogo',
    ctaHref: '/catalogo',
    isActive: true,
  },
  {
    id: '2',
    imageUrl: 'https://placehold.co/1600x700/1E0E40/CC1515?text=Cartas+Primera+Edición',
    title: 'Coleccionismo serio',
    subtitle: 'Piezas únicas de Primera Edición. Cada carta verificada por expertos.',
    ctaLabel: 'Ver colección',
    ctaHref: '/catalogo?edition=primera',
    isActive: true,
  },
  {
    id: '3',
    imageUrl: 'https://placehold.co/1600x700/0D0820/F5C400?text=Envíos+a+Todo+México',
    title: 'Envíos a todo México',
    subtitle: 'Empaque seguro, tracking en tiempo real y factura CFDI incluida.',
    ctaLabel: 'Conoce más',
    ctaHref: '/contacto',
    isActive: true,
  },
]

export function loadSlides(): BannerSlide[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as BannerSlide[]
  } catch { /* ignore */ }
  return DEFAULT_SLIDES
}

export function saveSlides(slides: BannerSlide[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(slides))
}

const variants = {
  enter: (dir: number) => ({ x: dir > 0 ? '100%' : '-100%', opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? '-100%' : '100%', opacity: 0 }),
}

export function HeroBanner() {
  const slides = loadSlides().filter((s) => s.isActive)
  const [index, setIndex] = useState(0)
  const [dir, setDir] = useState(1)
  const [paused, setPaused] = useState(false)

  const go = useCallback(
    (newIndex: number, direction: number) => {
      setDir(direction)
      setIndex(newIndex)
    },
    []
  )

  const prev = useCallback(() => {
    go((index - 1 + slides.length) % slides.length, -1)
  }, [index, slides.length, go])

  const next = useCallback(() => {
    go((index + 1) % slides.length, 1)
  }, [index, slides.length, go])

  useEffect(() => {
    if (paused || slides.length <= 1) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const t = setInterval(next, 5000)
    return () => clearInterval(t)
  }, [next, paused, slides.length])

  if (slides.length === 0) return null

  const slide = slides[index]

  return (
    <section
      className="relative w-full overflow-hidden bg-void"
      style={{ height: 'min(90vh, 700px)' }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <AnimatePresence initial={false} custom={dir} mode="popLayout">
        <motion.div
          key={slide.id}
          custom={dir}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.55, ease: [0.4, 0, 0.2, 1] }}
          className="absolute inset-0"
        >
          {/* Background image */}
          <img
            src={slide.imageUrl}
            alt=""
            aria-hidden="true"
            className="w-full h-full object-cover"
          />
          {/* Dark overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-void/90 via-void/60 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-void via-transparent to-transparent" />

          {/* Logo watermark top-right */}
          <div className="absolute top-8 right-8 pointer-events-none" aria-hidden="true">
            <img
              src="/logo-color.png"
              alt=""
              className="h-16 md:h-20 w-auto opacity-10"
            />
          </div>

          {/* Content */}
          <div className="absolute inset-0 flex items-center">
            <div className="page-container">
              <div className="max-w-2xl">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.5 }}
                >
                  <div className="inline-flex items-center gap-2 mb-4">
                    <span className="h-px w-8 bg-dragon" />
                    <span className="font-agency text-xs text-dragon uppercase tracking-[0.3em]">
                      Double-I TCG
                    </span>
                  </div>

                  <h1 className="font-agency text-4xl sm:text-5xl md:text-6xl lg:text-7xl text-white leading-none mb-4">
                    {slide.title}
                  </h1>

                  <p className="font-exo text-frost/80 text-base md:text-lg max-w-xl leading-relaxed mb-8">
                    {slide.subtitle}
                  </p>

                  <Link
                    to={slide.ctaHref}
                    className="btn-primary text-center inline-block text-sm px-8 py-4"
                  >
                    {slide.ctaLabel}
                  </Link>
                </motion.div>
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Navigation arrows */}
      {slides.length > 1 && (
        <>
          <button
            onClick={prev}
            aria-label="Slide anterior"
            className="absolute left-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 flex items-center justify-center bg-void/60 border border-navy/60 hover:border-dragon/60 hover:text-dragon text-ash transition-all"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={next}
            aria-label="Siguiente slide"
            className="absolute right-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 flex items-center justify-center bg-void/60 border border-navy/60 hover:border-dragon/60 hover:text-dragon text-ash transition-all"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          {/* Dots */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-10">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => go(i, i > index ? 1 : -1)}
                aria-label={`Ir al slide ${i + 1}`}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  i === index ? 'bg-dragon w-6' : 'bg-white/40 hover:bg-white/70'
                }`}
              />
            ))}
          </div>
        </>
      )}
    </section>
  )
}
