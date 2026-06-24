import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'

import { shippingRoutes } from './routes/shipping'
import { ordersRoutes } from './routes/orders'
import { paymentsRoutes } from './routes/payments'
import { invoicesRoutes } from './routes/invoices'
import { emailRoutes } from './routes/email'
import { adminRoutes } from './routes/admin'
import { productsRoutes } from './routes/products'
import { blogRoutes } from './routes/blog'
import { errorHandler } from './middleware/errorHandler'

const app = express()
const PORT = process.env.PORT || 3001

// Seguridad de cabeceras HTTP
app.use(helmet())

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
  const okDev =
    process.env.NODE_ENV !== 'production' &&
    (!origin || origin.startsWith('http://localhost'))
  const okProd = !origin || allowedOrigins.includes(origin)
  cb(null, okDev || okProd)
}
app.use(cors({ origin: corsOrigin }))

// Logging de requests (solo activo en desarrollo)
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'))
}

// El webhook de Mercado Pago necesita el body raw para verificar la firma
// — debe registrarse ANTES de express.json()
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }))

// Parseo de JSON para el resto de las rutas — límite 10mb para subida de imágenes en base64
app.use(express.json({ limit: '10mb' }))

// Rutas públicas
app.use('/api/products', productsRoutes)
app.use('/api/blog', blogRoutes)
app.use('/api/shipping', shippingRoutes)
app.use('/api/orders', ordersRoutes)
app.use('/api/payments', paymentsRoutes)
app.use('/api/email', emailRoutes)

// Rutas de facturas (extensión futura)
app.use('/api/invoices', invoicesRoutes)

// Panel de administración — requiere Clerk + rol admin
app.use('/api/admin', adminRoutes)

// Manejador global de errores — siempre al final
app.use(errorHandler)

app.listen(PORT, () => {
  console.log(`Servidor Irving TCG corriendo en puerto ${PORT}`)
})
