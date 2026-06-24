import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { useCart } from '@/hooks/useCart'
import { formatPrice } from '@/lib/utils'

export default function CartPage() {
  const { items, removeItem, updateQuantity, subtotal, clearCart } = useCart()

  return (
    <>
      <Helmet>
        <title>Carrito — Double-I TCG</title>
      </Helmet>

      <div className="bg-night min-h-screen pt-32 md:pt-48">
        <div className="page-container py-8">
          <h1 className="section-title mb-8">Tu carrito</h1>

          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <svg className="w-20 h-20 text-navy mb-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <p className="font-agency text-ash uppercase tracking-wider text-lg mb-2">
                Tu carrito está vacío
              </p>
              <p className="font-exo text-ash/60 text-sm mb-8">Explora el catálogo y encuentra tu próxima carta.</p>
              <Link to="/catalogo" className="btn-primary text-sm px-8 py-3">
                Explorar catálogo
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Items */}
              <div className="lg:col-span-2 space-y-4">
                {items.map((item) => (
                  <div key={item.product.id} className="flex gap-4 bg-deep border border-navy/40 p-4">
                    <Link to={`/catalogo/${item.product.slug}`}>
                      <img
                        src={item.product.images[0]}
                        alt={item.product.name}
                        loading="lazy"
                        className="w-20 h-28 object-cover flex-shrink-0"
                      />
                    </Link>

                    <div className="flex-1 min-w-0">
                      <Link to={`/catalogo/${item.product.slug}`}>
                        <h3 className="font-agency text-sm text-white uppercase tracking-wide hover:text-dragon transition-colors">
                          {item.product.name}
                        </h3>
                      </Link>
                      <p className="font-exo text-ash text-xs mt-0.5">{item.product.set}</p>
                      <p className="font-exo text-ash/60 text-xs">
                        {(item.product.franchise ?? '').toUpperCase()} · {item.product.condition}
                      </p>

                      <div className="flex items-center justify-between mt-3">
                        <div className="flex items-center border border-navy/60">
                          <button
                            onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                            className="w-8 h-8 flex items-center justify-center text-ash hover:text-white hover:bg-navy/30 transition-colors"
                          >
                            −
                          </button>
                          <span className="w-10 text-center text-sm font-exo text-frost">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                            disabled={item.quantity >= item.product.stock}
                            className="w-8 h-8 flex items-center justify-center text-ash hover:text-white hover:bg-navy/30 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            +
                          </button>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="font-agency text-base text-white">
                            {formatPrice(item.product.price * item.quantity)}
                          </span>
                          <button
                            onClick={() => removeItem(item.product.id)}
                            aria-label="Eliminar"
                            className="text-ash/50 hover:text-crimson transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                <button
                  onClick={clearCart}
                  className="text-xs text-ash/60 hover:text-crimson transition-colors font-exo"
                >
                  Vaciar carrito
                </button>
              </div>

              {/* Summary */}
              <div>
                <div className="bg-deep border border-navy/40 p-6 sticky top-24">
                  <h2 className="font-agency text-lg text-white uppercase tracking-wider mb-5">
                    Resumen
                  </h2>

                  <div className="space-y-3 mb-5">
                    <div className="flex justify-between text-sm font-exo">
                      <span className="text-ash">Subtotal ({items.reduce((s, i) => s + i.quantity, 0)} artículos)</span>
                      <span className="text-frost">{formatPrice(subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-sm font-exo">
                      <span className="text-ash">Envío</span>
                      <span className="text-ash/60 italic">Calculado en checkout</span>
                    </div>
                  </div>

                  <div className="border-t border-navy/40 pt-4 mb-5">
                    <div className="flex justify-between">
                      <span className="font-agency text-sm text-ash uppercase">Subtotal</span>
                      <span className="font-agency text-2xl text-white">{formatPrice(subtotal)}</span>
                    </div>
                  </div>

                  <Link to="/checkout">
                    <button className="btn-primary w-full text-sm py-4">
                      Proceder al checkout
                    </button>
                  </Link>

                  <Link to="/catalogo" className="block text-center mt-3 text-xs text-dragon hover:text-frost transition-colors font-exo">
                    ← Seguir comprando
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
