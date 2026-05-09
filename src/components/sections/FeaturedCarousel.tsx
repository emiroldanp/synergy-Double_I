import { useRef, useState } from 'react'
import { useNovedades } from '@/hooks/useProducts'
import { ProductCard } from '@/components/ui/ProductCard'

export function FeaturedCarousel() {
  const products = useNovedades()
  const trackRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [startX, setStartX] = useState(0)
  const [scrollLeft, setScrollLeft] = useState(0)

  const scroll = (dir: 'left' | 'right') => {
    if (!trackRef.current) return
    trackRef.current.scrollBy({ left: dir === 'right' ? 280 : -280, behavior: 'smooth' })
  }

  const onMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true)
    setStartX(e.pageX - (trackRef.current?.offsetLeft ?? 0))
    setScrollLeft(trackRef.current?.scrollLeft ?? 0)
  }
  const onMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !trackRef.current) return
    e.preventDefault()
    const x = e.pageX - (trackRef.current.offsetLeft ?? 0)
    const walk = (x - startX) * 1.5
    trackRef.current.scrollLeft = scrollLeft - walk
  }
  const onMouseUp = () => setIsDragging(false)

  return (
    <section className="bg-night py-16 overflow-hidden">
      <div className="page-container">
        <div className="flex items-end justify-between mb-8">
          <div>
            <p className="section-subtitle mb-2">Recién llegadas</p>
            <h2 className="section-title">Novedades</h2>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => scroll('left')}
              aria-label="Anterior"
              className="w-10 h-10 border border-navy/60 hover:border-dragon/60 text-ash hover:text-dragon transition-all flex items-center justify-center"
            >
              ‹
            </button>
            <button
              onClick={() => scroll('right')}
              aria-label="Siguiente"
              className="w-10 h-10 border border-navy/60 hover:border-dragon/60 text-ash hover:text-dragon transition-all flex items-center justify-center"
            >
              ›
            </button>
          </div>
        </div>
      </div>

      <div className="page-container overflow-visible">
        <div
          ref={trackRef}
          className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide cursor-grab active:cursor-grabbing select-none"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
          onTouchStart={(e) => {
            setStartX(e.touches[0].pageX - (trackRef.current?.offsetLeft ?? 0))
            setScrollLeft(trackRef.current?.scrollLeft ?? 0)
            setIsDragging(true)
          }}
          onTouchMove={(e) => {
            if (!isDragging || !trackRef.current) return
            const x = e.touches[0].pageX - (trackRef.current.offsetLeft ?? 0)
            trackRef.current.scrollLeft = scrollLeft - (x - startX) * 1.5
          }}
          onTouchEnd={() => setIsDragging(false)}
        >
          {products.map((product, i) => (
            <div
              key={product.id}
              className="flex-shrink-0 w-48 sm:w-52"
              style={{ animation: `slideUp 0.5s ease-out ${i * 0.06}s both` }}
            >
              <ProductCard product={product} />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
