import { Router } from 'express'
import { requireAdmin } from '../middleware/authAdmin'
import {
  listAllPromotions,
  createPromotion,
  updatePromotion,
  deletePromotion,
} from '../controllers/promotionsController'

export const promotionAdminRoutes = Router()

promotionAdminRoutes.use(requireAdmin as any)

promotionAdminRoutes.get('/', listAllPromotions)
promotionAdminRoutes.post('/', createPromotion)
promotionAdminRoutes.patch('/:id', updatePromotion)
promotionAdminRoutes.delete('/:id', deletePromotion)
