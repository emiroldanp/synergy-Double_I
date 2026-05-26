import { Router } from 'express'
import { subscribeEmail, sendTransactionalEmail, addContactToList } from '../controllers/emailController'

export const emailRoutes = Router()

emailRoutes.post('/subscribe', subscribeEmail)
emailRoutes.post('/transactional', sendTransactionalEmail)
emailRoutes.post('/add-to-list', addContactToList)
