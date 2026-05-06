import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { cn, formatPrice, CARD_BACK } from '@/lib/utils'
import type { Product } from '@/types'
import { FranchiseBadge, ConditionBadge, RarityBadge, EditionBadge } from './Badge'
import { useCart } from '@/hooks/useCart'

interface ProductCardProps {
  product: Product
  className?: string
  light?: boolean
}

type FlipPhase = 'idle' | 'forward' | 'return'

function flyToCart(cardEl: HTMLElement, imageUrl: string) {
  const cartBtn = document.getElementById('navbar-deck-btn') as HTMLElement
  if (!cartBtn) return

  const cardRect = cardEl.getBoundingClientRect()
  const cartRect = cartBtn.getBoundingClientRect()

  const cloneW = cardRect.width * 0.5
  const cloneH = cloneW * 1.4

  const startLeft = cardRect.left + (cardRect.width - cloneW) / 2
  const startTop = cardRect.top + 8

  const targetX = cartRect.left + cartRect.width / 2 - startLeft - cloneW / 2
  const targetY = cartRect.top + cartRect.height / 2 - startTop - cloneH / 2

  const fly = document.createElement('div')
  fly.setAttribute('aria-hidden', 'true')
  fly.style.cssText = [
    'position:fixed',
    `left:${startLeft}px`,
    `top:${startTop}px`,
    `width:${cloneW}px`,
    `height:${cloneH}px`,
    `background-image:url('${imageUrl}')`,
    'background-size:cover',
    'background-position:center',
    'border-radius:4px',
    'border:1px solid rgba(107,184,236,0.6)',
    'box-shadow:0 0 16px rgba(107,184,236,0.5)',
    'z-index:9999',
    'pointer-events:none',
    'will-change:transform,opacity',
    `--tx:${targetX}px`,
    `--ty:${targetY}px`,
    'animation:flyParabolic 0.5s cubic-bezier(0.25,0.46,0.45,0.94) forwards',
  ].join(';')
  document.body.appendChild(fly)

  fly.addEventListener('animationend', () => {
    fly.remove()
    const badge = document.querySelector('[data-cart-badge]') as HTMLElement
    if (badge) {
      badge.classList.remove('cart-badge-bump')
      void badge.offsetWidth
      badge.classList.add('cart-badge-bump')
    }
  }, { once: true })
}

export function ProductCard({ product, className, light = false }: ProductCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [tilt, setTilt] = useState({ x: 0, y: 0 })
  const [isHovered, setIsHovered] = useState(false)
  const [flipPhase, setFlipPhase] = useState<FlipPhase>('idle')
  const { addItem } = useCart()

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current || flipPhase !== 'idle') return
    const rect = cardRef.current.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 12
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * -12
    setTilt({ x: y, y: x })
  }

  const handleMouseLeave = () => {
    setTilt({ x: 0, y: 0 })
    setIsHovered(false)
  }

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (flipPhase !== 'idle' || outOfStock) return

    addItem(product)
    setFlipPhase('forward')

    // Launch fly at flip midpoint (card back is fully visible)
    setTimeout(() => {
      if (cardRef.current) flyToCart(cardRef.current, product.images[0])
    }, 200)

    // Start return flip after forward completes
    setTimeout(() => setFlipPhase('return'), 400)

    // Back to idle
    setTimeout(() => setFlipPhase('idle'), 700)
  }

  const isHolo = product.variant === 'holo' || product.variant === 'reverse_holo'
  const outOfStock = product.stock === 0

  const flipTransform =
    flipPhase === 'forward'
      ? 'rotateY(180deg)'
      : flipPhase === 'return'
        ? 'rotateY(0deg)'
        : `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`

  const flipTransition =
    flipPhase === 'forward'
      ? 'transform 0.4s ease-in-out'
      : flipPhase === 'return'
        ? 'transform 0.3s ease-out'
        : isHovered
          ? 'transform 0.1s ease-out'
          : 'transform 0.4s ease-out, box-shadow 0.3s'

  return (
    <div
      ref={cardRef}
      className={cn('group', className)}
      style={{ perspective: '800px' }}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
    >
      {/* Flip container */}
      <div
        style={{
          transformStyle: 'preserve-3d',
          WebkitTransformStyle: 'preserve-3d',
          transform: flipTransform,
          transition: flipTransition,
          position: 'relative',
        }}
      >
        {/* ── Front face ── */}
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
          style={{
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
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
                  isHovered && flipPhase === 'idle' && 'scale-105'
                )}
              />

              {isHolo && (
                <div
                  className={cn(
                    'absolute inset-0 opacity-0 transition-opacity duration-300 pointer-events-none',
                    isHovered && flipPhase === 'idle' && 'opacity-100'
                  )}
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
                />
              )}

              <div className="absolute top-2 left-2 flex flex-col gap-1">
                <FranchiseBadge franchise={product.franchise} />
                {product.edition !== 'ilimitada' && <EditionBadge edition={product.edition} />}
              </div>

              {outOfStock && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                  <span className="font-agency text-lg text-red-400 tracking-widest uppercase">
                    Agotado
                  </span>
                </div>
              )}

              {product.stock === 1 && !outOfStock && (
                <div className="absolute top-2 right-2">
                  <span className="badge-base bg-yellow-900/70 border border-yellow-600/50 text-yellow-400 text-xs">
                    ¡Último!
                  </span>
                </div>
              )}

              {!outOfStock && (
                <div
                  className={cn(
                    'absolute inset-x-0 bottom-0 bg-gradient-to-t from-abyss/95 to-transparent pt-8 pb-3 px-3 transition-all duration-300',
                    isHovered && flipPhase === 'idle'
                      ? 'opacity-100 translate-y-0'
                      : 'opacity-0 translate-y-4'
                  )}
                >
                  <button
                    onClick={handleAddToCart}
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

        {/* ── Back face (franchise card back) ── */}
        <div
          className="absolute inset-0 overflow-hidden border border-navy/50"
          style={{
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
          }}
        >
          {/* PLACEHOLDER: reemplazar URLs placehold.co con imágenes reales de Irving */}
          <img
            src={CARD_BACK[product.franchise]}
            alt="Card back"
            className="w-full h-full object-cover"
            draggable={false}
          />
        </div>
      </div>
    </div>
  )
}
