import { Router } from 'express'
import { createOrder, getOrder } from '../controllers/ordersController'

export const ordersRoutes = Router()

ordersRoutes.post('/', createOrder)
ordersRoutes.get('/:id', getOrder)
