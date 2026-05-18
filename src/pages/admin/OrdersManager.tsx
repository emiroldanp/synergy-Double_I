import { useState, useEffect } from 'react'
import { Navigate, Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { useAuth } from '@/hooks/useAuth'
import { ordersApi } from '@/lib/api'
import { formatPrice, ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from '@/lib/utils'
import type { Order, OrderStatus } from '@/types'
import { cn } from '@/lib/utils'

const STATUS_OPTIONS: OrderStatus[] = [
  'pendiente_pago', 'pago_confirmado', 'en_preparacion', 'enviado', 'entregado', 'cancelado'
]

export default function OrdersManager() {
  const { isSignedIn, isAdmin, isLoaded } = useAuth()
  const [filterStatus, setFilterStatus] = useState<OrderStatus | 'all'>('all')
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [pendingStatus, setPendingStatus] = useState<Record<string, string>>({})
  const [pendingTracking, setPendingTracking] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !isAdmin) return
    setLoading(true)
    ordersApi.getAll()
      .then((res) => setOrders(res.data.orders ?? res.data.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [isLoaded, isSignedIn, isAdmin])

  if (!isLoaded) return null
  if (!isSignedIn || !isAdmin) return <Navigate to="/mi-cuenta" replace />

  const filtered = filterStatus === 'all'
    ? orders
    : orders.filter((o) => o.status === filterStatus)

  const order = selectedOrder ? orders.find((o) => o.id === selectedOrder) : null

  async function handleSaveOrder(orderId: string) {
    setSavingId(orderId)
    try {
      await ordersApi.updateStatus(orderId, pendingStatus[orderId] ?? '', pendingTracking[orderId])
      const res = await ordersApi.getAll()
      setOrders(res.data.orders ?? res.data.data ?? [])
    } catch {
      // silenciar
    } finally {
      setSavingId(null)
    }
  }

  return (
    <>
      <Helmet>
        <title>Pedidos — Admin Double-I TCG</title>
      </Helmet>

      <div className="bg-night min-h-screen pt-20">
        <div className="page-container py-8">
          {/* Admin nav */}
          <div className="flex gap-3 mb-6 overflow-x-auto pb-2">
            {[
              { to: '/admin', label: 'Dashboard' },
              { to: '/admin/productos', label: 'Productos' },
              { to: '/admin/pedidos', label: 'Pedidos' },
              { to: '/admin/blog', label: 'Blog' },
            ].map((link) => (
              <Link key={link.to} to={link.to} className="flex-shrink-0 font-agency text-xs uppercase tracking-wider px-4 py-2 border border-navy/40 hover:border-dragon/60 text-ash hover:text-dragon transition-colors">
                {link.label}
              </Link>
            ))}
          </div>

          <h1 className="section-title mb-6">Pedidos</h1>

          {/* Status filter */}
          <div className="flex flex-wrap gap-2 mb-6">
            <button
              onClick={() => setFilterStatus('all')}
              className={cn('font-agency text-xs uppercase tracking-wider px-3 py-1.5 border transition-colors', filterStatus === 'all' ? 'border-dragon text-dragon' : 'border-navy/40 text-ash hover:border-navy/80')}
            >
              Todos ({orders.length})
            </button>
            {STATUS_OPTIONS.map((s) => {
              const count = orders.filter((o) => o.status === s).length
              return (
                <button
                  key={s}
                  onClick={() => setFilterStatus(s)}
                  className={cn('font-agency text-xs uppercase tracking-wider px-3 py-1.5 border transition-colors', filterStatus === s ? 'border-dragon text-dragon' : 'border-navy/40 text-ash hover:border-navy/80')}
                >
                  {ORDER_STATUS_LABELS[s]} ({count})
                </button>
              )
            })}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Orders list */}
            <div className="lg:col-span-2 space-y-3">
              {loading ? (
                <div className="flex items-center justify-center py-20">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-dragon" />
                </div>
              ) : filtered.length === 0 ? (
                <div className="bg-deep border border-navy/40 p-10 text-center">
                  <p className="font-exo text-ash text-sm">Sin pedidos con este filtro.</p>
                </div>
              ) : (
                filtered.map((o) => (
                  <button
                    key={o.id}
                    onClick={() => setSelectedOrder(o.id === selectedOrder ? null : o.id)}
                    className={cn(
                      'w-full text-left bg-deep border p-4 transition-colors',
                      selectedOrder === o.id ? 'border-dragon/60' : 'border-navy/40 hover:border-navy/80'
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-agency text-sm text-dragon">{o.orderNumber}</p>
                        <p className="font-exo text-xs text-frost mt-0.5">{o.customer?.fullName ?? '—'}</p>
                        <p className="font-exo text-xs text-ash">
                          {new Date(o.createdAt).toLocaleDateString('es-MX')}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <span
                          className="badge-base text-xs block mb-1"
                          style={{
                            backgroundColor: ORDER_STATUS_COLORS[o.status!] + '22',
                            color: ORDER_STATUS_COLORS[o.status!],
                            border: `1px solid ${ORDER_STATUS_COLORS[o.status!]}44`,
                          }}
                        >
                          {ORDER_STATUS_LABELS[o.status!]}
                        </span>
                        <p className="font-agency text-sm text-white">{formatPrice(o.total)}</p>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>

            {/* Order detail panel */}
            <div>
              {order ? (
                <div className="bg-deep border border-navy/40 p-5 sticky top-24">
                  <h2 className="font-agency text-sm text-ash uppercase tracking-widest mb-4">{order.orderNumber}</h2>

                  {/* Items */}
                  <div className="space-y-2 mb-4">
                    {order.items.map((item) => (
                      <div key={item.productId} className="flex justify-between text-xs font-exo">
                        <span className="text-ash">{item.name} ×{item.quantity}</span>
                        <span className="text-frost">{formatPrice(item.price * item.quantity)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between text-xs font-exo border-t border-navy/40 pt-2">
                      <span className="text-ash">Envío</span>
                      <span className="text-frost">{formatPrice(order.shippingCost)}</span>
                    </div>
                    <div className="flex justify-between font-agency text-sm border-t border-navy/40 pt-2">
                      <span className="text-ash uppercase">Total</span>
                      <span className="text-white">{formatPrice(order.total)}</span>
                    </div>
                  </div>

                  {/* Customer */}
                  <div className="border-t border-navy/40 pt-4 mb-4">
                    <p className="font-agency text-xs text-ash uppercase tracking-widest mb-2">Cliente</p>
                    <p className="font-exo text-xs text-frost">{order.customer?.fullName ?? '—'}</p>
                    <p className="font-exo text-xs text-ash">{order.customer?.email ?? '—'}</p>
                    <p className="font-exo text-xs text-ash">{order.customer?.phone ?? '—'}</p>
                  </div>

                  {/* Address */}
                  <div className="border-t border-navy/40 pt-4 mb-4">
                    <p className="font-agency text-xs text-ash uppercase tracking-widest mb-2">Dirección</p>
                    <p className="font-exo text-xs text-frost leading-relaxed">
                      {order.address?.street ?? ''} {order.address?.number ?? ''}, {order.address?.colonia ?? ''}, {order.address?.city ?? ''}, {order.address?.state ?? ''} CP {order.address?.zip ?? ''}
                    </p>
                  </div>

                  {/* Update status */}
                  <div className="border-t border-navy/40 pt-4 space-y-3">
                    <p className="font-agency text-xs text-ash uppercase tracking-widest">Actualizar estado</p>
                    <select
                      value={pendingStatus[order.id] ?? order.status ?? ''}
                      className="input-dark text-xs cursor-pointer w-full"
                      onChange={(e) => setPendingStatus((p) => ({ ...p, [order.id]: e.target.value }))}
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s} className="bg-abyss">{ORDER_STATUS_LABELS[s]}</option>
                      ))}
                    </select>
                    <input
                      type="text"
                      placeholder="Número de guía (opcional)"
                      value={pendingTracking[order.id] ?? order.trackingNumber ?? ''}
                      onChange={(e) => setPendingTracking((p) => ({ ...p, [order.id]: e.target.value }))}
                      className="input-dark text-xs w-full"
                    />
                    <button
                      onClick={() => handleSaveOrder(order.id)}
                      disabled={savingId === order.id}
                      className="btn-primary w-full text-xs py-2 disabled:opacity-60"
                    >
                      {savingId === order.id ? 'Guardando...' : 'Guardar cambios'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-deep border border-navy/40 p-8 text-center">
                  <p className="font-exo text-ash text-xs">Selecciona un pedido para ver el detalle.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
