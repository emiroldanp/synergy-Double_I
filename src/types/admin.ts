// Tipos TypeScript para el panel de administración

// Factura CFDI
export interface Invoice {
  id: string
  orderId: string
  status: 'draft' | 'valid' | 'cancelled'
  pdfUrl?: string
  xmlUrl?: string
  createdAt: string
}

// Suscriptor de email
export interface EmailSubscriber {
  id: string
  email: string
  name?: string
  source: string
  isBuyer: boolean
  createdAt: string
}

// Datos del dashboard
export interface DashboardData {
  revenueToday: number
  revenueWeek: number
  revenueMonth: number
  pendingOrders: number
  recentOrders: RecentOrder[]
}

export interface RecentOrder {
  id: string
  customerEmail: string
  total: number
  status: string
  createdAt: string
}

// Respuesta paginada genérica
export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
}
