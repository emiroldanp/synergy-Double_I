import { Router } from 'express'
import { getProducts, getProductBySlug, getCategories, getRarities } from '../controllers/productsController'

export const productsRoutes = Router()

productsRoutes.get('/', getProducts)
productsRoutes.get('/categories', getCategories)
productsRoutes.get('/rarities', getRarities)
productsRoutes.get('/:slug', getProductBySlug)
