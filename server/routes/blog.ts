// server/routes/blog.ts
import { Router } from 'express'
import { listPosts, getPostBySlug } from '../controllers/blogController'

export const blogRoutes = Router()

blogRoutes.get('/', listPosts)
blogRoutes.get('/:slug', getPostBySlug)
