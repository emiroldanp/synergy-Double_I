import { Router } from 'express'
import { validateDiscountCode } from '../controllers/discountCodesController'

export const discountCodesRoutes = Router()

discountCodesRoutes.post('/validate', validateDiscountCode)
