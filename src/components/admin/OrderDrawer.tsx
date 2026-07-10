import { useState, useEffect } from 'react'
import { useAdminApi } from '../../hooks/useAdminApi'
import StatusBadge from './StatusBadge'
import { Order } from '../../types'
import { formatPrice as formatMXN } from '../../lib/utils'

type OrderWithRelations = Order

const ORDER_STATUSES = [
  { value: 'pending_payment', label: 'Pago pendiente' },
  { value: 'confirmed', label: 'Confirmado' },
  { value: 'preparing', label: 'Preparando' },
  { value: 'shipped', label: 'Enviado' },
  { value: 'delivered', label: 'Entregado' },
  { value: 'cancelled', label: 'Cancelado' },
]

interface OrderDrawerProps {
  order: OrderWithRelations | null
  onClose: () => void
  onUpdated: () => void
}

export default function OrderDrawer({ order, onClose, onUpdated }: OrderDrawerProps) {
  const { apiFetch } = useAdminApi()
  const [status, setStatus] = useState(order?.orderStatus ?? '')
  const [trackingNumber, setTrackingNumber] = useState(order?.trackingNumber ?? '')
  const [saving, setSaving] = useState(false)
  const [markingPaid, setMarkingPaid] = useState(false)

  useEffect(() => {
    if (order) {
      setStatus(order.orderStatus ?? '')
      setTrackingNumber(order.trackingNumber ?? '')
    }
  }, [order?.id])

  const handleSave = async () => {
    if (!order) return
    setSaving(true)
    try {
      await apiFetch(`/api/admin/orders/${order.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status,
          trackingNumber: trackingNumber || undefined,
        }),
      })
      onUpdated()
      onClose()
    } catch (e: unknown) {
      alert(`Error: ${e instanceof Error ? e.message : 'Error desconocido'}`)
    } finally {
      setSaving(false)
    }
  }

  const handleMarkPaid = async () => {
    if (!order) return
    if (!confirm('¿Confirmas que ya recibiste el pago? Se descontará stock, se emitirá la factura si aplica y se enviará el correo al cliente.')) return
    setMarkingPaid(true)
    try {
      await apiFetch(`/api/admin/orders/${order.id}/mark-paid`, { method: 'POST' })
      onUpdated()
      onClose()
    } catch (e: unknown) {
      alert(`Error: ${e instanceof Error ? e.message : 'Error desconocido'}`)
    } finally {
      setMarkingPaid(false)
    }
  }

  const canMarkPaid = order?.paymentStatus === 'pending' || order?.paymentStatus === 'awaiting_verification'

  // Obtener email del cliente (usuario registrado o invitado)
  const customerEmail = order?.customer?.email ?? order?.guestEmail ?? '—'
  const customerName = order?.customer?.fullName ?? order?.guestName ?? null

  if (!order) return null

  return (
    <>
      {/* Fondo oscuro */}
      <div className="fixed inset-0 bg-black/30 z-20" onClick={onClose} />

      {/* Panel lateral */}
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-xl z-30 flex flex-col">
        {/* Encabezado */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <div>
            <h3 className="font-semibold text-gray-900">
              Pedido #{order.id.slice(0, 8)}
            </h3>
            <p className="text-sm text-gray-500">{customerEmail}</p>
            {customerName && (
              <p className="text-sm text-gray-400">{customerName}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        {/* Cuerpo */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Información del pedido */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Subtotal</span>
              <span className="text-gray-700">{formatMXN(order.subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Envío</span>
              <span className="text-gray-700">{formatMXN(order.shippingCost)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Total</span>
              <span className="font-semibold text-gray-900">{formatMXN(order.total)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Estado actual</span>
              <StatusBadge type="order" value={order.orderStatus ?? ''} />
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Pago</span>
              <span className="text-gray-700">{order.paymentMethod ?? '—'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Fecha</span>
              <span className="text-gray-700">
                {new Date(order.createdAt).toLocaleDateString('es-MX')}
              </span>
            </div>
          </div>

          {/* Dirección de envío */}
          {order.shippingAddress && (
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-1">Dirección de envío</h4>
              <p className="text-sm text-gray-600">
                {order.shippingAddress.street} {order.shippingAddress.number},{' '}
                {order.shippingAddress.neighborhood},{' '}
                {order.shippingAddress.city}, {order.shippingAddress.state}{' '}
                C.P. {order.shippingAddress.zipCode}
              </p>
            </div>
          )}

          {/* Productos del pedido */}
          {order.items && order.items.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Productos</h4>
              <div className="space-y-2">
                {order.items.map((item, i) => (
                  <div key={item.id ?? i} className="flex justify-between text-sm">
                    <span className="text-gray-700">
                      {item.product?.name ?? `Producto ${i + 1}`} × {item.quantity}
                    </span>
                    <span className="text-gray-900">{formatMXN(item.subtotal ?? item.price * item.quantity)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Botón de confirmar pago manual */}
          {canMarkPaid && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
              <p className="text-sm font-medium text-blue-800">
                {order.paymentStatus === 'awaiting_verification'
                  ? 'Pago pendiente de verificar'
                  : 'Pago no confirmado automáticamente'}
              </p>
              <p className="text-xs text-blue-600">
                Al confirmar se descuenta stock, se emite la factura si aplica y se envía el correo al cliente.
              </p>
              <button
                onClick={handleMarkPaid}
                disabled={markingPaid}
                className="w-full py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {markingPaid ? 'Confirmando...' : 'Confirmar pago manualmente'}
              </button>
            </div>
          )}

          {/* Controles de edición */}
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cambiar estado
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {ORDER_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Número de guía
              </label>
              <input
                type="text"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                placeholder="Ej. 1Z999AA10123456784"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Pie del panel */}
        <div className="px-5 py-4 border-t border-gray-200">
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </>
  )
}
