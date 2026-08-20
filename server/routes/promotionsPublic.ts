import { Router } from 'express'
import { listPublicPromotions, evaluatePromotion } from '../controllers/promotionsController'

export const promotionsPublicRoutes = Router()

promotionsPublicRoutes.get('/', listPublicPromotions)
promotionsPublicRoutes.post('/evaluate', evaluatePromotion)
