type OrderStatus = 'pending_payment' | 'confirmed' | 'preparing' | 'shipped' | 'delivered' | 'cancelled'
type InvoiceStatus = 'draft' | 'valid' | 'cancelled'

interface StatusBadgeProps {
  type: 'order' | 'invoice' | 'stock'
  value: string | number
}

const orderColors: Record<OrderStatus, string> = {
  pending_payment: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-blue-100 text-blue-800',
  preparing: 'bg-indigo-100 text-indigo-800',
  shipped: 'bg-purple-100 text-purple-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
}

const orderLabels: Record<OrderStatus, string> = {
  pending_payment: 'Pago pendiente',
  confirmed: 'Confirmado',
  preparing: 'Preparando',
  shipped: 'Enviado',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
}

const invoiceColors: Record<InvoiceStatus, string> = {
  draft: 'bg-yellow-100 text-yellow-800',
  valid: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
}

const invoiceLabels: Record<InvoiceStatus, string> = {
  draft: 'Borrador',
  valid: 'Válida',
  cancelled: 'Cancelada',
}

function getStockColor(stock: number): string {
  if (stock === 0) return 'bg-red-100 text-red-800'
  if (stock <= 3) return 'bg-yellow-100 text-yellow-800'
  return 'bg-green-100 text-green-800'
}

export default function StatusBadge({ type, value }: StatusBadgeProps) {
  let className = 'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium'
  let label: string

  if (type === 'order') {
    const status = value as OrderStatus
    className += ` ${orderColors[status] ?? 'bg-gray-100 text-gray-800'}`
    label = orderLabels[status] ?? String(value)
  } else if (type === 'invoice') {
    const status = value as InvoiceStatus
    className += ` ${invoiceColors[status] ?? 'bg-gray-100 text-gray-800'}`
    label = invoiceLabels[status] ?? String(value)
  } else {
    // stock
    const stock = Number(value)
    className += ` ${getStockColor(stock)}`
    label = stock === 0 ? 'Agotado' : String(stock)
  }

  return <span className={className}>{label}</span>
}
