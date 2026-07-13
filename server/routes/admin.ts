import { Router } from 'express'
import { requireAdmin } from '../middleware/authAdmin'
import {
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  uploadProductImage,
  syncProductImages,
  listOrders,
  updateOrder,
  listInvoices,
  retryInvoice,
  getDashboard,
  listSubscribers,
  exportSubscribersCsv,
  deleteSubscriber,
} from '../controllers/adminController'
import {
  listAllPosts,
  createPost,
  updatePost,
  deletePost,
} from '../controllers/blogController'
import { markOrderPaid } from '../controllers/paymentsController'
import {
  listAllBanners,
  createBanner,
  updateBanner,
  deleteBanner,
} from '../controllers/bannersController'

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
adminRoutes.put('/products/:id/images/sync', syncProductImages)

// --- Pedidos ---
adminRoutes.get('/orders', listOrders)
adminRoutes.patch('/orders/:id', updateOrder)
adminRoutes.post('/orders/:id/mark-paid', markOrderPaid)

// --- Facturas ---
adminRoutes.get('/invoices', listInvoices)
adminRoutes.post('/invoices/:orderId/retry', retryInvoice)

// --- Dashboard ---
adminRoutes.get('/dashboard', getDashboard)

// --- Suscriptores ---
adminRoutes.get('/subscribers', listSubscribers)
adminRoutes.get('/subscribers/export-csv', exportSubscribersCsv)
adminRoutes.delete('/subscribers/:id', deleteSubscriber)

// --- Blog ---
adminRoutes.get('/blog', listAllPosts)
adminRoutes.post('/blog', createPost)
adminRoutes.patch('/blog/:id', updatePost)
adminRoutes.delete('/blog/:id', deletePost)

// --- Banners ---
adminRoutes.get('/banners', listAllBanners)
adminRoutes.post('/banners', createBanner)
adminRoutes.patch('/banners/:id', updateBanner)
adminRoutes.delete('/banners/:id', deleteBanner)
