import { Router } from 'express'
import { quoteShipping } from '../controllers/shippingController'

export const shippingRoutes = Router()

shippingRoutes.post('/quote', quoteShipping)
