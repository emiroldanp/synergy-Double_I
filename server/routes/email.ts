import { Router } from 'express'
import { subscribeEmail } from '../controllers/emailController'

export const emailRoutes = Router()

emailRoutes.post('/subscribe', subscribeEmail)
