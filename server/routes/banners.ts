import { Router } from 'express'
import { requireBannerAccess } from '../middleware/authAdmin'
import {
  listAllBanners,
  createBanner,
  updateBanner,
  deleteBanner,
  uploadBannerImage,
} from '../controllers/bannersController'

export const bannerAdminRoutes = Router()

bannerAdminRoutes.use(requireBannerAccess as any)

bannerAdminRoutes.get('/', listAllBanners)
bannerAdminRoutes.post('/upload-image', uploadBannerImage)
bannerAdminRoutes.post('/', createBanner)
bannerAdminRoutes.patch('/:id', updateBanner)
bannerAdminRoutes.delete('/:id', deleteBanner)
