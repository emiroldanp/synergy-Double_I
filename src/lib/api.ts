import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001',
  headers: { 'Content-Type': 'application/json' },
})

// Almacenamos la función getToken de Clerk (no el token) para obtener siempre un token fresco
let getTokenFn: (() => Promise<string | null>) | null = null

export function setAuthToken(_token: string | null) {
  // Mantenemos compatibilidad con código existente; la lógica real usa setGetTokenFn
}

export function setGetTokenFn(fn: (() => Promise<string | null>) | null) {
  getTokenFn = fn
}

api.interceptors.request.use(async (config) => {
  if (getTokenFn) {
    const token = await getTokenFn()
    if (token) config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export default api

export const emailApi = {
  subscribe: (email: string, name?: string, source = 'homepage_form') =>
    api.post('/api/email/subscribe', { email, fullName: name, source }),
}

export const shippingApi = {
  quote: (address: {
    street: string
    number: string
    colonia: string
    city: string
    state: string
    zip: string
  }) => api.post('/api/shipping/quote', { address }),
}

export const paymentsApi = {
  createPreference: (orderId: string) =>
    api.post('/api/payments/create-preference', { orderId }),
}

export const ordersApi = {
  create: (order: unknown) => api.post('/api/orders', order),
  getByUser: () => api.get('/api/orders/me'),
  getById: (id: string) => api.get(`/api/orders/${id}`),
  getAll: (params?: Record<string, unknown>) => api.get('/api/admin/orders', { params }),
  updateStatus: (id: string, status: string, trackingNumber?: string) =>
    api.patch(`/api/admin/orders/${id}`, { status, trackingNumber }),
  retryInvoice: (orderId: string) =>
    api.post(`/api/admin/invoices/${orderId}/retry`),
  markPaid: (orderId: string) =>
    api.post(`/api/admin/orders/${orderId}/mark-paid`),
}

export const productsApi = {
  getAll: (params?: Record<string, unknown>) => api.get('/api/products', { params }),
  getRarities: () => api.get('/api/products/rarities'),
  getBySlug: (slug: string) => api.get(`/api/products/${slug}`),
  create: (data: unknown) => api.post('/api/admin/products', data),
  update: (id: string, data: unknown) => api.patch(`/api/admin/products/${id}`, data),
  uploadImages: (id: string, files: FormData) =>
    api.post(`/api/admin/products/${id}/images`, files, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
}

export const blogApi = {
  getAll: (params?: Record<string, unknown>) => api.get('/api/blog', { params }),
  getBySlug: (slug: string) => api.get(`/api/blog/${slug}`),
  listAll: (params?: Record<string, unknown>) => api.get('/api/admin/blog', { params }),
  create: (data: unknown) => api.post('/api/admin/blog', data),
  update: (id: string, data: unknown) => api.patch(`/api/admin/blog/${id}`, data),
  delete: (id: string) => api.delete(`/api/admin/blog/${id}`),
}

export const dashboardApi = {
  getStats: () => api.get('/api/admin/dashboard'),
}

export const tcgApi = {
  search: (franchise: string, q: string, page = 1) =>
    api.get('/api/admin/tcg/search', { params: { franchise, q, page } }),
  getCard: (franchise: string, id: string) =>
    api.get('/api/admin/tcg/card', { params: { franchise, id } }),
  importImage: (imageUrl: string, productId?: string) =>
    api.post('/api/admin/tcg/import-image', { imageUrl, productId }),
  syncPokemon: () => api.post('/api/admin/tcg/sync/pokemon'),
}

export const discountCodesApi = {
  validate: (code: string, subtotal: number) =>
    api.post('/api/discount-codes/validate', { code, subtotal }),
  list: () => api.get('/api/admin/discount-codes'),
  create: (data: {
    code: string
    type: 'percentage' | 'fixed'
    value: number
    minAmount?: number | null
    usageLimit?: number | null
    expiresAt?: string | null
    isActive?: boolean
  }) => api.post('/api/admin/discount-codes', data),
  update: (id: string, data: Partial<{
    code: string
    type: 'percentage' | 'fixed'
    value: number
    minAmount: number | null
    usageLimit: number | null
    expiresAt: string | null
    isActive: boolean
  }>) => api.patch(`/api/admin/discount-codes/${id}`, data),
  remove: (id: string) => api.delete(`/api/admin/discount-codes/${id}`),
}
