import { Router } from 'express'
import { createPreference, handleWebhook } from '../controllers/paymentsController'

export const paymentsRoutes = Router()

paymentsRoutes.post('/create-preference', createPreference)
// El body raw de /webhook ya se configura en index.ts antes de express.json()
paymentsRoutes.post('/webhook', handleWebhook)
