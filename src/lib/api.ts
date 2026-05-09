import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001',
  headers: { 'Content-Type': 'application/json' },
})

let authToken: string | null = null

export function setAuthToken(token: string | null) {
  authToken = token
}

api.interceptors.request.use((config) => {
  if (authToken) config.headers.Authorization = `Bearer ${authToken}`
  return config
})

export default api

export const emailApi = {
  subscribe: (email: string, name?: string) =>
    api.post('/api/email/subscribe', { email, name }),
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

export const ordersApi = {
  create: (order: unknown) => api.post('/api/orders', order),
  getByUser: () => api.get('/api/orders/me'),
  getById: (id: string) => api.get(`/api/orders/${id}`),
  updateStatus: (id: string, status: string, trackingNumber?: string) =>
    api.patch(`/api/admin/orders/${id}`, { status, trackingNumber }),
}

export const productsApi = {
  getAll: (params?: Record<string, unknown>) => api.get('/api/products', { params }),
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
  create: (data: unknown) => api.post('/api/admin/blog', data),
  update: (id: string, data: unknown) => api.patch(`/api/admin/blog/${id}`, data),
}

export const dashboardApi = {
  getStats: () => api.get('/api/admin/dashboard'),
}
