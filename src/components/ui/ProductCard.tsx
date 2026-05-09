import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { cn, formatPrice } from '@/lib/utils'
import type { Product } from '@/types'
import { FranchiseBadge, ConditionBadge, RarityBadge, EditionBadge } from './Badge'
import { useCart } from '@/hooks/useCart'

interface ProductCardProps {
  product: Product
  className?: string
}

export function ProductCard({ product, className }: ProductCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [tilt, setTilt] = useState({ x: 0, y: 0 })
  const [isHovered, setIsHovered] = useState(false)
  const { addItem } = useCart()

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return
    const rect = cardRef.current.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 12
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * -12
    setTilt({ x: y, y: x })
  }

  const handleMouseLeave = () => {
    setTilt({ x: 0, y: 0 })
    setIsHovered(false)
  }

  const isHolo = product.variant === 'holo' || product.variant === 'reverse_holo'
  const outOfStock = product.stock === 0

  return (
    <div
      ref={cardRef}
      className={cn('perspective-1000 group', className)}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      style={{ perspective: '800px' }}
    >
      <div
        className={cn(
          'relative bg-deep border border-navy/50 overflow-hidden transition-all duration-300',
          isHovered && 'border-dragon/40 shadow-card-hover',
          outOfStock && 'opacity-60'
        )}
        style={{
          transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
          transition: isHovered ? 'transform 0.1s ease-out' : 'transform 0.4s ease-out, border-color 0.3s, box-shadow 0.3s',
        }}
      >
        {/* Image container */}
        <Link to={`/catalogo/${product.slug}`} className="block">
          <div className="relative aspect-[3/4] overflow-hidden bg-abyss">
            <img
              src={product.images[0]}
              alt={product.name}
              loading="lazy"
              className={cn(
                'w-full h-full object-cover transition-transform duration-500',
                isHovered && 'scale-105'
              )}
            />

            {/* Holographic shimmer for holo cards */}
            {isHolo && (
              <div
                className={cn(
                  'absolute inset-0 opacity-0 transition-opacity duration-300 pointer-events-none',
                  isHovered && 'opacity-100'
                )}
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
              />
            )}

            {/* Top badges */}
            <div className="absolute top-2 left-2 flex flex-col gap-1">
              <FranchiseBadge franchise={product.franchise} />
              {product.edition !== 'ilimitada' && (
                <EditionBadge edition={product.edition} />
              )}
            </div>

            {/* Out of stock overlay */}
            {outOfStock && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                <span className="font-agency text-lg text-red-400 tracking-widest uppercase">
                  Agotado
                </span>
              </div>
            )}

            {/* Stock = 1 badge */}
            {product.stock === 1 && !outOfStock && (
              <div className="absolute top-2 right-2">
                <span className="badge-base bg-yellow-900/70 border border-yellow-600/50 text-yellow-400 text-xs">
                  ¡Último!
                </span>
              </div>
            )}

            {/* Add to cart overlay — siempre visible en mobile, hover en desktop */}
            {!outOfStock && (
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-abyss/95 to-transparent pt-8 pb-3 px-3 md:transition-all md:duration-300 md:opacity-0 md:translate-y-4 md:group-hover:opacity-100 md:group-hover:translate-y-0">
                <button
                  onClick={(e) => {
                    e.preventDefault()
                    addItem(product)
                  }}
                  className="w-full btn-primary text-xs py-2"
                >
                  + Agregar al carrito
                </button>
              </div>
            )}
          </div>
        </Link>

        {/* Card info */}
        <div className="p-3 space-y-2">
          <div className="flex items-start gap-1 flex-wrap">
            <ConditionBadge condition={product.condition} />
            <RarityBadge rarity={product.rarity} />
          </div>

          <Link to={`/catalogo/${product.slug}`}>
            <h3 className="font-agency text-sm text-white uppercase tracking-wide leading-tight line-clamp-2 hover:text-dragon transition-colors">
              {product.name}
            </h3>
            <p className="text-xs text-ash mt-0.5 truncate">{product.set}</p>
          </Link>

          <div className="flex items-center justify-between pt-1">
            <span className="font-agency text-lg text-white tracking-wide">
              {formatPrice(product.price)}
            </span>
            {product.cardNumber && (
              <span className="text-xs text-ash/70">#{product.cardNumber}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
