import { clerkMiddleware, getAuth } from '@clerk/express'
import { Request, Response, NextFunction } from 'express'

// Middleware compuesto: verifica sesión Clerk y que el usuario tenga rol 'admin'
export const requireAdmin = [
  clerkMiddleware(),
  (req: Request, res: Response, next: NextFunction) => {
    const { userId, sessionClaims } = getAuth(req)

    if (!userId) {
      return res.status(401).json({ error: 'No autenticado' })
    }

    const role = (sessionClaims?.metadata as any)?.role
    if (role !== 'admin') {
      return res.status(403).json({ error: 'Acceso denegado — solo admins' })
    }

    next()
  },
]

// Acepta rol 'admin' o 'banner_editor' — solo para rutas de banners
export const requireBannerAccess = [
  clerkMiddleware(),
  (req: Request, res: Response, next: NextFunction) => {
    const { userId, sessionClaims } = getAuth(req)

    if (!userId) {
      return res.status(401).json({ error: 'No autenticado' })
    }

    const role = (sessionClaims?.metadata as any)?.role
    if (role !== 'admin' && role !== 'banner_editor') {
      return res.status(403).json({ error: 'Acceso denegado' })
    }

    next()
  },
]
