import { useState, useRef, useEffect } from 'react'
import { useParams, Link, Navigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { motion, AnimatePresence } from 'framer-motion'
import { useProductBySlug } from '@/hooks/useProducts'
import { useCart } from '@/hooks/useCart'
import { useDeckAnimation } from '@/context/DeckAnimationContext'
import {
  FranchiseBadge,
  ConditionBadge,
  RarityBadge,
  VariantBadge,
  LanguageBadge,
  EditionBadge,
  StockBadge,
} from '@/components/ui/Badge'
import { formatPrice, CONDITION_LABELS, EDITION_LABELS } from '@/lib/utils'
import { TcgCardDetails } from '@/components/ui/TcgCardDetails'

function ProductDetailSkeleton() {
  return (
    <div className="bg-night min-h-screen pt-32 md:pt-48">
      <div className="page-container py-8">
        {/* Breadcrumb skeleton */}
        <div className="flex items-center gap-2 mb-6">
          <div className="skeleton-box h-3 w-10 rounded" />
          <span className="text-navy/60">›</span>
          <div className="skeleton-box h-3 w-16 rounded" />
          <span className="text-navy/60">›</span>
          <div className="skeleton-box h-3 w-40 rounded" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
          {/* Imagen skeleton */}
          <div>
            <div className="skeleton-box aspect-[3/4] mb-3" />
            <div className="flex gap-2">
              {[0, 1].map((i) => (
                <div key={i} className="skeleton-box w-16 h-20" />
              ))}
            </div>
          </div>

          {/* Info skeleton */}
          <div className="space-y-4">
            <div className="flex gap-2">
              <div className="skeleton-box h-6 w-20 rounded" />
              <div className="skeleton-box h-6 w-16 rounded" />
            </div>
            <div className="skeleton-box h-10 w-3/4 rounded" />
            <div className="skeleton-box h-4 w-1/3 rounded" />
            <div className="skeleton-box h-12 w-1/2 rounded" />
            <div className="skeleton-box h-14 rounded mt-4" />
            <div className="skeleton-box h-14 rounded" />
            <div className="mt-8 border border-navy/40 divide-y divide-navy/30">
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="flex justify-between px-4 py-3">
                  <div className="skeleton-box h-3 w-16 rounded" />
                  <div className="skeleton-box h-3 w-24 rounded" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function ImageLightbox({
  images,
  initialIndex,
  onClose,
}: {
  images: string[]
  initialIndex: number
  onClose: () => void
}) {
  const [current, setCurrent] = useState(initialIndex)

  // Cerrar con Escape y navegar con flechas
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') setCurrent((c) => (c + 1) % images.length)
      if (e.key === 'ArrowLeft') setCurrent((c) => (c - 1 + images.length) % images.length)
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [images.length, onClose])

  // Bloquear scroll del body
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      {/* Botón cerrar */}
      <button
        className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors p-2"
        onClick={onClose}
        aria-label="Cerrar"
      >
        <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Imagen principal */}
      <motion.img
        key={current}
        src={images[current]}
        alt=""
        className="max-h-[90vh] max-w-[90vw] object-contain select-none"
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2 }}
        onClick={(e) => e.stopPropagation()}
      />

      {/* Navegación entre imágenes */}
      {images.length > 1 && (
        <>
          <button
            className="absolute left-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white transition-colors p-2"
            onClick={(e) => { e.stopPropagation(); setCurrent((c) => (c - 1 + images.length) % images.length) }}
            aria-label="Anterior"
          >
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            className="absolute right-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white transition-colors p-2"
            onClick={(e) => { e.stopPropagation(); setCurrent((c) => (c + 1) % images.length) }}
            aria-label="Siguiente"
          >
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          {/* Miniaturas en lightbox */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
            {images.map((img, i) => (
              <button
                key={i}
                onClick={(e) => { e.stopPropagation(); setCurrent(i) }}
                className={`w-12 h-14 overflow-hidden border-2 transition-colors ${
                  current === i ? 'border-dragon' : 'border-white/20 hover:border-white/50'
                }`}
              >
                <img src={img} alt="" loading="lazy" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </>
      )}

      {/* Contador */}
      {images.length > 1 && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 font-exo text-xs text-white/50">
          {current + 1} / {images.length}
        </div>
      )}
    </motion.div>
  )
}

export default function ProductDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const { product, loading } = useProductBySlug(slug ?? '')
  const { addItem } = useCart()
  const { triggerFlipFly } = useDeckAnimation()
  const mainImgRef = useRef<HTMLDivElement>(null)
  const [quantity, setQuantity] = useState(1)
  const [activeImg, setActiveImg] = useState(0)
  const [added, setAdded] = useState(false)
  const [lightboxOpen, setLightboxOpen] = useState(false)

  if (loading) return <ProductDetailSkeleton />
  if (!product) return <Navigate to="/catalogo" replace />

  const outOfStock = product.stock === 0

  const handleAddToCart = () => {
    addItem(product, quantity)
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)

    if (mainImgRef.current && product.franchise) {
      const rect = mainImgRef.current.getBoundingClientRect()
      triggerFlipFly(rect, product.franchise)
    }
  }

  return (
    <>
      <Helmet>
        <title>{product.name} — Double-I TCG</title>
        <meta
          name="description"
          content={`${product.name} | ${product.set} | ${product.condition ? CONDITION_LABELS[product.condition as import('@/types').Condition] : ''} | ${product.edition ? EDITION_LABELS[product.edition as import('@/types').Edition] : ''} — ${formatPrice(product.price)}`}
        />
        <meta property="og:title" content={`${product.name} — Double-I TCG`} />
        <meta property="og:image" content={product.images[0]} />
      </Helmet>

      <AnimatePresence>
        {lightboxOpen && (
          <ImageLightbox
            images={product.images}
            initialIndex={activeImg}
            onClose={() => setLightboxOpen(false)}
          />
        )}
      </AnimatePresence>

      <div className="bg-night min-h-screen pt-32 md:pt-48">
        <div className="page-container py-8">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-xs text-ash font-exo mb-6">
            <Link to="/" className="hover:text-frost transition-colors">Inicio</Link>
            <span>›</span>
            <Link to="/catalogo" className="hover:text-frost transition-colors">Catálogo</Link>
            <span>›</span>
            <span className="text-frost">{product.name}</span>
          </nav>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
            {/* Imágenes */}
            <div>
              {/* Imagen principal — click abre lightbox */}
              <div
                ref={mainImgRef}
                className="relative aspect-[3/4] bg-abyss border border-navy/50 overflow-hidden mb-3 group cursor-zoom-in"
                onClick={() => setLightboxOpen(true)}
              >
                <img
                  src={product.images[activeImg]}
                  alt={product.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />

                {(product.variant === 'holo' || product.variant === 'reverse_holo') && (
                  <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                    style={{
                      background: 'linear-gradient(105deg, transparent 30%, rgba(107,184,236,0.2) 45%, rgba(48,64,196,0.15) 52%, transparent 60%)',
                      backgroundSize: '200% 100%',
                      animation: 'cardShimmer 4s ease-in-out infinite',
                    }}
                  />
                )}

                {/* Hint "Ver imagen completa" */}
                <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                  <span className="flex items-center gap-1 bg-black/60 text-white/80 text-xs font-exo px-2 py-1">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                    </svg>
                    Ver completa
                  </span>
                </div>
              </div>

              {/* Miniaturas */}
              {product.images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {product.images.map((img, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveImg(i)}
                      className={`flex-shrink-0 w-16 h-20 overflow-hidden border-2 transition-colors ${
                        activeImg === i ? 'border-dragon' : 'border-navy/50 hover:border-navy'
                      }`}
                    >
                      <img src={img} alt="" loading="lazy" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Info */}
            <div>
              {/* Badges */}
              <div className="flex flex-wrap gap-2 mb-4">
                {product.franchise && <FranchiseBadge franchise={product.franchise} />}
                {product.condition && <ConditionBadge condition={product.condition as import('@/types').Condition} />}
                {product.rarity && <RarityBadge rarity={product.rarity as import('@/types').Rarity} />}
                {product.edition && product.edition !== 'ilimitada' && <EditionBadge edition={product.edition as import('@/types').Edition} />}
                {product.variant && <VariantBadge variant={product.variant as import('@/types').Variant} />}
                {product.language && <LanguageBadge language={product.language as import('@/types').Language} />}
              </div>

              <h1 className="font-agency text-3xl md:text-4xl text-white uppercase tracking-wide leading-tight mb-1">
                {product.name}
              </h1>
              <p className="font-exo text-ash text-sm mb-1">{product.set}</p>
              {product.cardNumber && (
                <p className="font-exo text-ash/60 text-xs mb-4">Carta #{product.cardNumber}</p>
              )}

              <div className="flex items-baseline gap-3 mb-4">
                <span className="font-agency text-4xl text-white">
                  {formatPrice(product.price)}
                </span>
                <StockBadge stock={product.stock} />
              </div>

              {product.description && (
                <p className="font-exo text-ash text-sm leading-relaxed mb-6 border-l-2 border-navy pl-4">
                  {product.description}
                </p>
              )}

              {/* Agregar al carrito */}
              <div className="space-y-3">
                {!outOfStock && product.stock > 1 && (
                  <div className="flex items-center gap-3">
                    <label className="font-agency text-xs text-ash uppercase tracking-wider">Cantidad</label>
                    <div className="flex items-center border border-navy/60">
                      <button
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        className="w-10 h-10 flex items-center justify-center text-ash hover:text-white hover:bg-navy/30 transition-colors text-lg"
                      >
                        −
                      </button>
                      <span className="w-12 text-center text-sm font-exo text-frost">{quantity}</span>
                      <button
                        onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                        className="w-10 h-10 flex items-center justify-center text-ash hover:text-white hover:bg-navy/30 transition-colors text-lg"
                      >
                        +
                      </button>
                    </div>
                    <span className="text-xs text-ash/60 font-exo">{product.stock} disponibles</span>
                  </div>
                )}

                <button
                  onClick={handleAddToCart}
                  disabled={outOfStock || added}
                  className={`btn-primary w-full text-sm py-4 ${added ? 'bg-green-700 border-green-600' : ''}`}
                >
                  {outOfStock ? 'Agotado' : added ? '✓ Agregado al carrito' : 'Agregar al carrito'}
                </button>

                <Link to="/checkout" className="btn-secondary w-full text-center block text-sm py-4">
                  Comprar ahora
                </Link>
              </div>

              {/* Tabla de detalles */}
              <div className="mt-8 border border-navy/40 divide-y divide-navy/30">
                {[
                  { label: 'Franquicia', value: (product.franchise ?? '').toUpperCase() },
                  { label: 'Set', value: product.set ?? '' },
                  { label: 'Condición', value: product.condition ? CONDITION_LABELS[product.condition as import('@/types').Condition] : '—' },
                  { label: 'Edición', value: product.edition ? EDITION_LABELS[product.edition as import('@/types').Edition] : '—' },
                  { label: 'Idioma', value: product.language === 'en' ? 'Inglés' : product.language === 'jp' ? 'Japonés' : 'Español' },
                ].map((row) => (
                  <div key={row.label} className="flex justify-between px-4 py-2.5">
                    <span className="font-exo text-xs text-ash">{row.label}</span>
                    <span className="font-exo text-xs text-frost">{row.value}</span>
                  </div>
                ))}
              </div>

              {/* Sección enriquecida con datos de la API TCG — solo aparece si la carta fue importada */}
              <TcgCardDetails product={product} />
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
