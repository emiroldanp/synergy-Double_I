import { Router } from 'express'
import { getProducts, getProductBySlug, getCategories } from '../controllers/productsController'

export const productsRoutes = Router()

productsRoutes.get('/', getProducts)
productsRoutes.get('/categories', getCategories)
productsRoutes.get('/:slug', getProductBySlug)
