import { useEffect, useState } from 'react'
import { useLocation, useSearchParams, Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { ordersApi } from '@/lib/api'
import { formatPrice, ORDER_STATUS_LABELS } from '@/lib/utils'
import type { Order } from '@/types'

export default function OrderConfirmationPage() {
  const { state } = useLocation()
  const [searchParams] = useSearchParams()

  // orderId puede venir del state (flujo interno) o del query param (redirect de MP)
  const orderId: string | null = state?.orderId ?? searchParams.get('external_reference') ?? null

  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(Boolean(orderId))
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!orderId) return
    ordersApi.getById(orderId)
      .then((res) => setOrder(res.data?.data ?? res.data))
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [orderId])

  return (
    <>
      <Helmet>
        <title>Pedido confirmado — Double-I TCG</title>
      </Helmet>

      <div className="bg-night min-h-screen pt-20">
        <div className="page-container py-16">
          <div className="max-w-lg mx-auto text-center">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-dragon" />
              </div>
            ) : error ? (
              <>
                <h1 className="font-agency text-3xl text-white uppercase tracking-wider mb-4">
                  Pedido registrado
                </h1>
                <p className="font-exo text-ash text-sm mb-8">
                  Tu pedido fue creado correctamente. Recibirás un correo de confirmación pronto.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Link to="/" className="btn-primary text-sm px-8 py-3">Ir al inicio</Link>
                  <Link to="/mi-cuenta" className="btn-secondary text-sm px-8 py-3">Ver mis pedidos</Link>
                </div>
              </>
            ) : (
              <>
                {/* Ícono de éxito */}
                <div className="w-20 h-20 mx-auto mb-6 flex items-center justify-center bg-royal/20 border border-dragon/40">
                  <svg className="w-10 h-10 text-dragon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
                  </svg>
                </div>

                <h1 className="font-agency text-3xl text-white uppercase tracking-wider mb-2">
                  ¡Pedido confirmado!
                </h1>
                <p className="font-exo text-ash text-sm mb-4">Número de pedido:</p>
                <div className="inline-block bg-deep border border-dragon/40 px-6 py-3 mb-6">
                  <span className="font-agency text-xl text-dragon tracking-widest">
                    {order?.orderNumber ?? orderId}
                  </span>
                </div>

                {order?.status && (
                  <p className="font-exo text-ash text-xs mb-4">
                    Estado: <span className="text-frost">{ORDER_STATUS_LABELS[order.status] ?? order.status}</span>
                  </p>
                )}

                <p className="font-exo text-ash text-sm leading-relaxed mb-8">
                  Recibirás un correo de confirmación con el resumen de tu pedido.
                  {(order?.customer?.email ?? state?.contact?.email) && (
                    <> Enviado a <span className="text-frost">{order?.customer?.email ?? state?.contact?.email}</span>.</>
                  )}
                </p>

                {/* Items del pedido */}
                {order?.items && order.items.length > 0 && (
                  <div className="bg-deep border border-navy/40 p-5 text-left mb-6">
                    <h2 className="font-agency text-xs text-ash uppercase tracking-widest mb-3">Tu pedido</h2>
                    <div className="space-y-2">
                      {order.items.map((item) => (
                        <div key={item.productId} className="flex justify-between text-xs font-exo">
                          <span className="text-ash">{item.name} ×{item.quantity}</span>
                          <span className="text-frost">{formatPrice(item.price * item.quantity)}</span>
                        </div>
                      ))}
                      {order.shippingCost > 0 && (
                        <div className="flex justify-between text-xs font-exo border-t border-navy/40 pt-2 mt-2">
                          <span className="text-ash">Envío</span>
                          <span className="text-frost">{formatPrice(order.shippingCost)}</span>
                        </div>
                      )}
                      <div className="flex justify-between font-agency text-sm border-t border-navy/40 pt-2 mt-2">
                        <span className="text-ash uppercase">Total</span>
                        <span className="text-white">{formatPrice(order.total)}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Envío seleccionado (desde state si no hay order aún) */}
                {!order?.items && state?.shipping && (
                  <div className="bg-deep border border-navy/40 p-5 text-left mb-6">
                    <h2 className="font-agency text-xs text-ash uppercase tracking-widest mb-2">Detalle de envío</h2>
                    <p className="font-exo text-sm text-frost">{state.shipping.service}</p>
                    {state.shipping.eta && <p className="font-exo text-xs text-ash">{state.shipping.eta}</p>}
                    <p className="font-agency text-sm text-dragon mt-1">{formatPrice(state.shipping.price)}</p>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Link to="/" className="btn-primary text-sm px-8 py-3">Ir al inicio</Link>
                  <Link to="/catalogo" className="btn-secondary text-sm px-8 py-3">Seguir comprando</Link>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
