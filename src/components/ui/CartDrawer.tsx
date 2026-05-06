import { cn, formatPrice } from '@/lib/utils'
import { useCart } from '@/hooks/useCart'
import { Link } from 'react-router-dom'
import { DeckIcon } from '@/components/ui/DeckIcon'

interface CartDrawerProps {
  open: boolean
  onClose: () => void
}

export function CartDrawer({ open, onClose }: CartDrawerProps) {
  const { items, removeItem, updateQuantity, subtotal, totalItems } = useCart()

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 bg-black/70 z-40 transition-opacity duration-300',
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        )}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={cn(
          'fixed top-0 right-0 h-full w-full max-w-sm bg-abyss border-l border-navy/50 z-50 flex flex-col transition-transform duration-300 ease-in-out',
          open ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-navy/50">
          <div className="flex items-center gap-2.5">
            <DeckIcon className="w-5 h-5 text-dragon" empty={totalItems === 0} />
            <div>
              <h2 className="font-agency text-lg text-white uppercase tracking-wider leading-none">
                Tu Deck
              </h2>
              <p className="text-xs text-ash mt-0.5">{totalItems} carta{totalItems !== 1 ? 's' : ''}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar carrito"
            className="text-ash hover:text-white transition-colors p-1"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-12 px-4">
              <DeckIcon className="w-16 h-16 text-navy mb-5" empty />
              <p className="font-agency text-white uppercase tracking-wider text-base mb-1">
                Tu deck está vacío
              </p>
              <p className="font-exo text-ash text-xs leading-relaxed mb-5">
                Agrega cartas para empezar tu colección
              </p>
              <button
                onClick={onClose}
                className="text-xs text-dragon hover:text-frost transition-colors font-exo"
              >
                Explorar catálogo →
              </button>
            </div>
          ) : (
            items.map((item) => (
              <div key={item.product.id} className="flex gap-3 bg-deep border border-navy/30 p-3">
                <Link to={`/catalogo/${item.product.slug}`} onClick={onClose}>
                  <img
                    src={item.product.images[0]}
                    alt={item.product.name}
                    loading="lazy"
                    className="w-16 h-20 object-cover flex-shrink-0"
                  />
                </Link>
                <div className="flex-1 min-w-0">
                  <Link
                    to={`/catalogo/${item.product.slug}`}
                    onClick={onClose}
                    className="font-agency text-xs text-white uppercase tracking-wide line-clamp-2 hover:text-dragon transition-colors"
                  >
                    {item.product.name}
                  </Link>
                  <p className="text-xs text-ash mt-0.5">{item.product.set}</p>

                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center border border-navy/60">
                      <button
                        onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                        className="w-7 h-7 flex items-center justify-center text-ash hover:text-white hover:bg-navy/30 transition-colors text-sm"
                      >
                        −
                      </button>
                      <span className="w-8 text-center text-xs text-frost font-exo">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                        disabled={item.quantity >= item.product.stock}
                        className="w-7 h-7 flex items-center justify-center text-ash hover:text-white hover:bg-navy/30 transition-colors text-sm disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        +
                      </button>
                    </div>

                    <span className="font-agency text-sm text-white">
                      {formatPrice(item.product.price * item.quantity)}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => removeItem(item.product.id)}
                  aria-label="Eliminar del carrito"
                  className="text-ash/50 hover:text-crimson transition-colors self-start mt-1"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="px-5 py-4 border-t border-navy/50 space-y-4">
            <div className="flex justify-between items-center">
              <span className="font-exo text-ash text-sm">Subtotal</span>
              <span className="font-agency text-xl text-white">{formatPrice(subtotal)}</span>
            </div>
            <p className="text-xs text-ash/70">Envío calculado en el checkout</p>
            <Link to="/checkout" onClick={onClose}>
              <button className="btn-primary w-full">
                Proceder al checkout
              </button>
            </Link>
            <Link to="/carrito" onClick={onClose}>
              <button className="btn-secondary w-full mt-2">
                Ver carrito completo
              </button>
            </Link>
          </div>
        )}
      </div>
    </>
  )
}
