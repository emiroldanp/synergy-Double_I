import { Router } from 'express'
import { requireAdmin } from '../middleware/authAdmin'
import {
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  uploadProductImage,
  listOrders,
  updateOrder,
  listInvoices,
  retryInvoice,
  getDashboard,
  listSubscribers,
  deleteSubscriber,
} from '../controllers/adminController'

export const adminRoutes = Router()

// Todas las rutas de admin requieren autenticación Clerk con rol 'admin'
adminRoutes.use(requireAdmin as any)

// --- Productos ---
adminRoutes.get('/products', listProducts)
adminRoutes.get('/products/:id', getProduct)
adminRoutes.post('/products', createProduct)
adminRoutes.patch('/products/:id', updateProduct)
adminRoutes.delete('/products/:id', deleteProduct)
adminRoutes.post('/products/:id/images', uploadProductImage)

// --- Pedidos ---
adminRoutes.get('/orders', listOrders)
adminRoutes.patch('/orders/:id', updateOrder)

// --- Facturas ---
adminRoutes.get('/invoices', listInvoices)
adminRoutes.post('/invoices/:orderId/retry', retryInvoice)

// --- Dashboard ---
adminRoutes.get('/dashboard', getDashboard)

// --- Suscriptores ---
adminRoutes.get('/subscribers', listSubscribers)
adminRoutes.delete('/subscribers/:id', deleteSubscriber)
