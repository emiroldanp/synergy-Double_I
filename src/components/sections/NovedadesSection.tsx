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
      setPhase('priming')
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

  const currentTransform =
    phase === 'animating' ? `rotateY(${dir === 1 ? -90 : 90}deg)` : 'rotateY(0deg)'
  const currentOrigin = dir === 1 ? 'left center' : 'right center'
  const currentTransition =
    phase === 'animating' ? `transform ${CUBE_DURATION}ms cubic-bezier(0.4,0,0.2,1)` : 'none'

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

          {/* Next panel — only rendered during priming+animating */}
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

          {/* Prev button */}
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
