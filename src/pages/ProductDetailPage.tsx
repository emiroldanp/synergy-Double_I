import { useState } from 'react'
import { useParams, Link, Navigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { useProductBySlug } from '@/hooks/useProducts'
import { useCart } from '@/hooks/useCart'
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

export default function ProductDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const product = useProductBySlug(slug ?? '')
  const { addItem } = useCart()
  const [quantity, setQuantity] = useState(1)
  const [activeImg, setActiveImg] = useState(0)
  const [added, setAdded] = useState(false)

  if (!product) return <Navigate to="/catalogo" replace />

  const outOfStock = product.stock === 0

  const handleAddToCart = () => {
    addItem(product, quantity)
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  return (
    <>
      <Helmet>
        <title>{product.name} — Double-I TCG</title>
        <meta
          name="description"
          content={`${product.name} | ${product.set} | ${CONDITION_LABELS[product.condition]} | ${EDITION_LABELS[product.edition]} — ${formatPrice(product.price)}`}
        />
        <meta property="og:title" content={`${product.name} — Double-I TCG`} />
        <meta property="og:image" content={product.images[0]} />
      </Helmet>

      <div className="bg-night min-h-screen pt-20">
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
            {/* Images */}
            <div>
              <div className="relative aspect-[3/4] bg-abyss border border-navy/50 overflow-hidden mb-3 group">
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
              </div>

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
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Info */}
            <div>
              {/* Badges row */}
              <div className="flex flex-wrap gap-2 mb-4">
                <FranchiseBadge franchise={product.franchise} />
                <ConditionBadge condition={product.condition} />
                <RarityBadge rarity={product.rarity} />
                {product.edition !== 'ilimitada' && <EditionBadge edition={product.edition} />}
                <VariantBadge variant={product.variant} />
                <LanguageBadge language={product.language} />
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

              {/* Add to cart */}
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
                  {outOfStock
                    ? 'Agotado'
                    : added
                    ? '✓ Agregado al carrito'
                    : 'Agregar al carrito'}
                </button>

                <Link to="/checkout" className="btn-secondary w-full text-center block text-sm py-4">
                  Comprar ahora
                </Link>
              </div>

              {/* Details table */}
              <div className="mt-8 border border-navy/40 divide-y divide-navy/30">
                {[
                  { label: 'Franquicia', value: product.franchise.toUpperCase() },
                  { label: 'Set', value: product.set },
                  { label: 'Condición', value: CONDITION_LABELS[product.condition] },
                  { label: 'Edición', value: EDITION_LABELS[product.edition] },
                  { label: 'Idioma', value: product.language === 'en' ? 'Inglés' : product.language === 'jp' ? 'Japonés' : 'Español' },
                ].map((row) => (
                  <div key={row.label} className="flex justify-between px-4 py-2.5">
                    <span className="font-exo text-xs text-ash">{row.label}</span>
                    <span className="font-exo text-xs text-frost">{row.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
