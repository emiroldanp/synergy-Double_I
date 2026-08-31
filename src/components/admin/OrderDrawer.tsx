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

  // Obtener email/teléfono del cliente (usuario registrado o invitado) — el teléfono
  // es obligatorio en el checkout, pero solo vive en guestPhone si no hay cuenta.
  const customerEmail = order?.customer?.email ?? order?.guestEmail ?? '—'
  const customerName = order?.customer?.fullName ?? order?.guestName ?? null
  const customerPhone = order?.customer?.phone ?? order?.guestPhone ?? null

  // Envío local CDMX/EDOMEX coordinado por WhatsApp
  const isLocalWhatsapp =
    order?.shippingOption?.carrier === 'whatsapp_local' || order?.shippingMethod === 'whatsapp_local'

  // Paquetería elegida por el cliente al momento del checkout
  const shippingMethodLabel =
    order?.shippingMethod === 'whatsapp_local'
      ? 'Envío local (WhatsApp)'
      : order?.shippingMethod || null

  const buildWhatsappUrl = (): string | null => {
    const phone = customerPhone
    if (!phone) return null
    const name = customerName ?? customerEmail
    const items = (order?.items ?? [])
      .map((item) => `- ${item.product?.name ?? 'Producto'} x${item.quantity}`)
      .join('\n')
    const text = encodeURIComponent(
      `Hola ${name}! Soy Irving de Double-I Cards 🃏\n\nTe escribo por tu pedido #${order!.id.slice(0, 8)}.\n\nProductos:\n${items}\n\nTotal: $${order!.total} MXN\n\n¿A qué hora y lugar te queda bien para la entrega?`
    )
    const digits = phone.replace(/\D/g, '')
    return `https://wa.me/${digits}?text=${text}`
  }

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
            {customerPhone ? (
              <a
                href={`https://wa.me/${customerPhone.replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-green-600 hover:text-green-700 hover:underline"
              >
                {customerPhone}
              </a>
            ) : (
              <p className="text-sm text-red-500">Sin teléfono</p>
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
              {isLocalWhatsapp ? (
                <span className="text-yellow-600 font-medium">Local (WhatsApp) · Cotizar con cliente</span>
              ) : (
                <span className="text-gray-700">{formatMXN(order.shippingCost)}</span>
              )}
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
                {order.shippingAddress.colonia},{' '}
                {order.shippingAddress.city}, {order.shippingAddress.state}{' '}
                C.P. {order.shippingAddress.zip}
              </p>
              {shippingMethodLabel && (
                <p className="text-sm text-gray-600 mt-1">
                  <span className="text-gray-500">Paquetería: </span>
                  {shippingMethodLabel}
                </p>
              )}
            </div>
          )}

          {/* Productos del pedido */}
          {order.items && order.items.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Productos</h4>
              <div className="space-y-2">
                {order.items.map((item, i) => (
                  <div key={item.id ?? i} className="flex items-center gap-3 text-sm">
                    <div className="w-10 h-10 flex-shrink-0 bg-gray-100 rounded overflow-hidden border border-gray-200">
                      {item.product?.images?.[0] ? (
                        <img
                          src={item.product.images[0]}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[8px] text-gray-400 uppercase text-center leading-tight px-0.5">
                          Sin foto
                        </div>
                      )}
                    </div>
                    <span className="text-gray-700 flex-1 min-w-0 truncate">
                      {item.product?.name ?? `Producto ${i + 1}`} × {item.quantity}
                    </span>
                    <span className="text-gray-900 flex-shrink-0">{formatMXN(item.subtotal ?? item.price * item.quantity)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Envío local WhatsApp — card para contactar al cliente */}
          {isLocalWhatsapp && (() => {
            const waUrl = buildWhatsappUrl()
            return (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-2">
                <p className="text-sm font-medium text-green-800">Envío local — coordinar por WhatsApp</p>
                <p className="text-xs text-green-700">
                  El cliente eligió envío en CDMX / Estado de México. Contáctalo para acordar la entrega.
                </p>
                {waUrl ? (
                  <a
                    href={waUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                      <path d="M11.99 0C5.376 0 0 5.376 0 11.99c0 2.117.554 4.1 1.523 5.824L0 24l6.335-1.498A11.955 11.955 0 0011.99 23.98C18.604 23.98 24 18.604 24 11.99 24 5.376 18.604 0 11.99 0zm0 21.98a9.975 9.975 0 01-5.19-1.449l-.37-.22-3.762.89.924-3.664-.242-.382A9.95 9.95 0 012.02 11.99c0-5.496 4.474-9.97 9.97-9.97s9.97 4.474 9.97 9.97-4.474 9.97-9.97 9.97z" />
                    </svg>
                    Contactar cliente por WhatsApp
                  </a>
                ) : (
                  <p className="text-xs text-green-600 italic">
                    Sin teléfono registrado — contácta al cliente por email: {customerEmail}
                  </p>
                )}
              </div>
            )
          })()}

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
