import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import rateLimit from 'express-rate-limit'

import { shippingRoutes } from './routes/shipping'
import { ordersRoutes } from './routes/orders'
import { paymentsRoutes } from './routes/payments'
import { invoicesRoutes } from './routes/invoices'
import { emailRoutes } from './routes/email'
import { adminRoutes } from './routes/admin'
import { bannerAdminRoutes } from './routes/banners'
import { productsRoutes } from './routes/products'
import { blogRoutes } from './routes/blog'
import { discountCodesRoutes } from './routes/discountCodes'
import { listPublicBanners } from './controllers/bannersController'
import { errorHandler } from './middleware/errorHandler'

const app = express()
const PORT = process.env.PORT || 3001

// Hostinger corre detrás de un reverse proxy — necesario para que express-rate-limit
// lea el IP real desde X-Forwarded-For en lugar de la IP del proxy
app.set('trust proxy', 1)

// Seguridad de cabeceras HTTP — CSP explícita para servidor API
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'none'"],
      frameAncestors: ["'none'"],
    },
  },
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
}))

// CORS: en dev acepta cualquier puerto de localhost; en prod usa FRONTEND_URL.
// FRONTEND_URL puede contener varios orígenes separados por coma (ej. producción + staging).
const allowedOrigins = (process.env.FRONTEND_URL ?? '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean)
const corsOrigin = (
  origin: string | undefined,
  cb: (e: Error | null, ok?: boolean) => void
) => {
  const isProd = process.env.NODE_ENV === 'production'
  const okDev = !isProd && (!origin || origin.startsWith('http://localhost'))
  // origin === undefined → request sin Origin (curl, server-to-server) — permitido
  // origin === 'null' → documento file:// o iframe sandbox — bloqueado
  const okProd = origin === undefined || (origin !== 'null' && allowedOrigins.includes(origin))
  cb(null, okDev || okProd)
}
app.use(cors({ origin: corsOrigin, credentials: true }))

// Logging — 'combined' en producción para observabilidad, 'dev' en desarrollo
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'))

// Rate limiting — protección contra abuso y DoS
const orderLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas solicitudes, intenta más tarde' },
})

const subscribeLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas suscripciones desde esta IP' },
})

const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas solicitudes de pago' },
})

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 150,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas solicitudes' },
})

// El webhook de Mercado Pago necesita el body raw para verificar la firma
// — debe registrarse ANTES de express.json()
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }))

// Subida de imágenes en base64 (admin) — límite elevado solo para esa ruta, antes del parser global
app.use('/api/admin/products', express.json({ limit: '10mb' }))

// Parseo de JSON — límite conservador para el resto de las rutas
app.use(express.json({ limit: '100kb' }))

// Rutas públicas
app.use('/api/products', generalLimiter, productsRoutes)
app.use('/api/blog', generalLimiter, blogRoutes)
app.get('/api/banners', generalLimiter, listPublicBanners)
app.use('/api/shipping', generalLimiter, shippingRoutes)
app.use('/api/orders', orderLimiter, ordersRoutes)
app.use('/api/discount-codes', generalLimiter, discountCodesRoutes)
app.use('/api/payments', paymentLimiter, paymentsRoutes)
app.use('/api/email/subscribe', subscribeLimiter)
app.use('/api/email', emailRoutes)

// Rutas de facturas (extensión futura)
app.use('/api/invoices', generalLimiter, invoicesRoutes)

// Banners admin — acepta rol admin y banner_editor (debe ir antes que adminRoutes)
app.use('/api/admin/banners', generalLimiter, bannerAdminRoutes)

// Panel de administración — requiere Clerk + rol admin
app.use('/api/admin', generalLimiter, adminRoutes)

// Manejador global de errores — siempre al final
app.use(errorHandler)

app.listen(PORT, () => {
  console.log(`Servidor Irving TCG corriendo en puerto ${PORT}`)
})
