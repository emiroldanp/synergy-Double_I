import { Router } from 'express'
import { subscribeEmail, sendTransactionalEmail, addContactToList } from '../controllers/emailController'
import { requireAdmin } from '../middleware/authAdmin'

export const emailRoutes = Router()

// Pública — formulario de newsletter del sitio (con rate limiting en index.ts)
emailRoutes.post('/subscribe', subscribeEmail)

// Requieren admin — disparan emails o modifican listas de Brevo
emailRoutes.post('/transactional', requireAdmin as any, sendTransactionalEmail)
emailRoutes.post('/add-to-list', requireAdmin as any, addContactToList)
