import { useRef, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { cn, formatPrice } from '@/lib/utils'
import type { Product } from '@/types'
import { FranchiseBadge, ConditionBadge, RarityBadge, EditionBadge } from './Badge'
import { useCart } from '@/hooks/useCart'
import { useDeckAnimation } from '@/context/DeckAnimationContext'

interface ProductCardProps {
  product: Product
  className?: string
}

export function ProductCard({ product, className }: ProductCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [tilt, setTilt] = useState({ x: 0, y: 0 })
  const [isHovered, setIsHovered] = useState(false)
  const { addItem } = useCart()
  const { triggerFlipFly } = useDeckAnimation()

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

  const handleAddToCart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      addItem(product)

      if (cardRef.current) {
        const imageEl = cardRef.current.querySelector('[data-card-image]')
        const rect = (imageEl ?? cardRef.current).getBoundingClientRect()
        triggerFlipFly(rect, product.franchise)
      }
    },
    [addItem, product, triggerFlipFly]
  )

  const isHolo = product.variant === 'holo' || product.variant === 'reverse_holo'
  const outOfStock = product.stock === 0
  const isNew = product.isNew

  return (
    <div
      ref={cardRef}
      className={cn('group', className)}
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
          transition: isHovered
            ? 'transform 0.1s ease-out'
            : 'transform 0.4s ease-out, border-color 0.3s, box-shadow 0.3s',
        }}
      >
        {/* Image container */}
        <Link to={`/catalogo/${product.slug}`} className="block">
          <div data-card-image className="relative aspect-[3/4] overflow-hidden bg-abyss">
            <img
              src={product.images[0]}
              alt={product.name}
              loading="lazy"
              className={cn(
                'w-full h-full object-cover transition-transform duration-500',
                isHovered && 'scale-105'
              )}
            />

            {/* Continuous holo shimmer */}
            {isHolo && (
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: isHovered
                    ? `linear-gradient(
                        ${105 + tilt.y * 2}deg,
                        transparent 30%,
                        rgba(107,184,236,0.3) 45%,
                        rgba(48,64,196,0.25) 50%,
                        rgba(204,21,21,0.15) 55%,
                        transparent 65%
                      )`
                    : undefined,
                  animation: isHolo && !isHovered ? 'holoShimmer 4s ease-in-out infinite' : undefined,
                  opacity: isHovered ? 1 : 0.4,
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

            {/* NUEVO badge */}
            {isNew && !outOfStock && (
              <div className="absolute top-2 right-2">
                <motion.span
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="badge-base bg-dragon/90 border border-dragon text-white text-xs font-agency uppercase tracking-wider"
                >
                  Nuevo
                </motion.span>
              </div>
            )}

            {/* Stock = 1 badge */}
            {product.stock === 1 && !outOfStock && !isNew && (
              <div className="absolute top-2 right-2">
                <span className="badge-base bg-yellow-900/70 border border-yellow-600/50 text-yellow-400 text-xs">
                  ¡Último!
                </span>
              </div>
            )}

            {/* Out of stock overlay */}
            {outOfStock && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                <span className="font-agency text-lg text-red-400 tracking-widest uppercase">
                  Agotado
                </span>
              </div>
            )}

            {/* Add to cart overlay */}
            {!outOfStock && (
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-abyss/95 to-transparent pt-8 pb-3 px-3 md:transition-all md:duration-300 md:opacity-0 md:translate-y-4 md:group-hover:opacity-100 md:group-hover:translate-y-0">
                <button
                  onClick={handleAddToCart}
                  className="w-full btn-primary text-xs py-2 active:scale-95 transition-transform"
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
