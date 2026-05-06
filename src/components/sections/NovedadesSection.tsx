import { useState, useRef, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { MOCK_NOVEDADES } from '@/lib/mockData'
import { MOCK_PRODUCTS } from '@/lib/mockData'
import { ProductCard } from '@/components/ui/ProductCard'
import { cn } from '@/lib/utils'

const FLIP_DURATION = 300

export function NovedadesSection() {
  const novedades = MOCK_NOVEDADES.filter((n) => n.isActive).sort((a, b) => a.order - b.order)
  const navigate = useNavigate()

  const [current, setCurrent] = useState(0)
  const [_nextIdx, setNextIdx] = useState(1 % Math.max(novedades.length, 1))
  const [rotation, setRotation] = useState(0)
  const [transitionMs, setTransitionMs] = useState(FLIP_DURATION)
  const [isFlipping, setIsFlipping] = useState(false)
  const [autoPlay, setAutoPlay] = useState(true)

  const dragRef = useRef({ startX: 0, moved: false })
  const containerRef = useRef<HTMLDivElement>(null)

  const go = useCallback(
    (dir: 1 | -1) => {
      if (isFlipping || novedades.length <= 1) return
      const next = (current + dir + novedades.length) % novedades.length
      setNextIdx(next)
      setIsFlipping(true)
      setTransitionMs(FLIP_DURATION)
      setRotation(dir * 90)

      setTimeout(() => {
        // At 90° the card is edge-on — invisible. Swap content and jump to opposite edge.
        setCurrent(next)
        setNextIdx((next + dir + novedades.length) % novedades.length)
        setTransitionMs(0)
        setRotation(dir * -90)

        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            setTransitionMs(FLIP_DURATION)
            setRotation(0)
            setTimeout(() => setIsFlipping(false), FLIP_DURATION)
          })
        })
      }, FLIP_DURATION)
    },
    [current, isFlipping, novedades.length]
  )

  // Autoplay every 5 seconds
  useEffect(() => {
    if (!autoPlay || novedades.length <= 1) return
    const timer = setInterval(() => go(1), 5000)
    return () => clearInterval(timer)
  }, [go, autoPlay, novedades.length])

  // Pointer drag handlers
  const onPointerDown = (e: React.PointerEvent) => {
    dragRef.current.startX = e.clientX
    dragRef.current.moved = false
    setAutoPlay(false)
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }

  const onPointerMove = (e: React.PointerEvent) => {
    if (Math.abs(e.clientX - dragRef.current.startX) > 8) {
      dragRef.current.moved = true
    }
  }

  const onPointerUp = (e: React.PointerEvent) => {
    const delta = e.clientX - dragRef.current.startX
    if (dragRef.current.moved && Math.abs(delta) > 55) {
      go(delta < 0 ? 1 : -1)
    } else if (!dragRef.current.moved) {
      // Pure click → navigate to product
      const nov = novedades[current]
      if (nov?.productSlug) navigate(`/catalogo/${nov.productSlug}`)
    }
    setTimeout(() => setAutoPlay(true), 8000)
  }

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!containerRef.current?.contains(document.activeElement)) return
      if (e.key === 'ArrowRight') go(1)
      if (e.key === 'ArrowLeft') go(-1)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [go])

  // Fallback: if no novedades, show featured products carousel
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

  const nov = novedades[current]

  return (
    <section className="bg-brand-navy py-14">
      <div className="page-container">
        {/* Header */}
        <div className="flex items-end justify-between mb-6">
          <div>
            <p className="section-subtitle mb-1">Recién llegado</p>
            <h2 className="section-title">Novedades</h2>
          </div>
          <span className="font-agency text-ash text-sm tracking-widest">
            {current + 1} / {novedades.length}
          </span>
        </div>

        {/* Main dice card */}
        <div
          ref={containerRef}
          className="relative select-none cursor-pointer"
          style={{ perspective: '1200px' }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          tabIndex={0}
          role="region"
          aria-label="Novedades — usa flechas del teclado para navegar"
        >
          {/* Flip wrapper */}
          <div
            style={{
              transform: `rotateY(${rotation}deg)`,
              transition: `transform ${transitionMs}ms ease-in-out`,
              transformOrigin: 'center center',
              transformStyle: 'preserve-3d',
            }}
          >
            <div className="relative overflow-hidden" style={{ borderRadius: '2px' }}>
              {/* Image */}
              <div className="relative aspect-[16/7] md:aspect-[21/8] overflow-hidden bg-deep">
                <img
                  src={nov.image}
                  alt={nov.title}
                  className="w-full h-full object-cover"
                  draggable={false}
                />

                {/* Gradient overlay for text legibility */}
                <div
                  className="absolute inset-0"
                  style={{
                    background: 'linear-gradient(to right, rgba(232,34,34,0.18) 0%, rgba(43,26,94,0.75) 20%, rgba(43,26,94,0.4) 55%, rgba(43,26,94,0.05) 100%)',
                  }}
                />

                {/* Edge shimmer on flip */}
                <div
                  className={cn(
                    'absolute inset-0 pointer-events-none',
                    isFlipping ? 'opacity-60' : 'opacity-0'
                  )}
                  style={{
                    background: 'linear-gradient(90deg, transparent, rgba(107,184,236,0.15) 50%, transparent)',
                    transition: 'opacity 150ms',
                  }}
                />

                {/* Text content */}
                <div className="absolute inset-0 flex flex-col justify-end p-6 md:p-10 max-w-lg">
                  <p className="font-agency text-dragon text-xs uppercase tracking-[0.3em] mb-2">
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
                      <span className="font-agency text-xs text-dragon uppercase tracking-widest">
                        Ver producto
                      </span>
                      <span className="text-dragon text-sm">→</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom border accent */}
              <div className="h-px bg-gradient-to-r from-brand-red/70 via-brand-navy/40 to-transparent" />
            </div>
          </div>

          {/* Prev / Next buttons */}
          <button
            onClick={(e) => { e.stopPropagation(); go(-1) }}
            aria-label="Novedad anterior"
            className={cn(
              'absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 border border-navy/60 bg-void/70 backdrop-blur-sm',
              'flex items-center justify-center text-ash hover:text-dragon hover:border-dragon/60 transition-all duration-200 z-10',
              novedades.length <= 1 && 'hidden'
            )}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); go(1) }}
            aria-label="Siguiente novedad"
            className={cn(
              'absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 border border-navy/60 bg-void/70 backdrop-blur-sm',
              'flex items-center justify-center text-ash hover:text-dragon hover:border-dragon/60 transition-all duration-200 z-10',
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
                onClick={() => {
                  if (i === current || isFlipping) return
                  go(i > current ? 1 : -1)
                }}
                aria-label={`Ir a novedad ${i + 1}`}
                className={cn(
                  'h-1 rounded-full transition-all duration-300',
                  i === current
                    ? 'w-8 bg-dragon'
                    : 'w-2 bg-navy/60 hover:bg-dragon/40'
                )}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
