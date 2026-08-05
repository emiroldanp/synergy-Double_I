import { Request, Response, NextFunction } from 'express'
import { prisma } from '../lib/prisma'

/** GET /api/promotions — promociones activas para la homepage */
export async function listPublicPromotions(req: Request, res: Response, next: NextFunction) {
  try {
    const promotions = await prisma.promotion.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    })
    res.json({ data: promotions })
  } catch (error) {
    next(error)
  }
}

/** GET /api/admin/promotions — todas las promociones (admin) */
export async function listAllPromotions(req: Request, res: Response, next: NextFunction) {
  try {
    const promotions = await prisma.promotion.findMany({ orderBy: { sortOrder: 'asc' } })
    res.json({ data: promotions })
  } catch (error) {
    next(error)
  }
}

/** POST /api/admin/promotions */
export async function createPromotion(req: Request, res: Response, next: NextFunction) {
  try {
    const { badgeLabel, title, description, ctaHref, isActive, sortOrder } = req.body
    if (!title || !description) {
      return res.status(400).json({ error: 'title y description son requeridos' })
    }
    const promotion = await prisma.promotion.create({
      data: {
        badgeLabel: badgeLabel ?? 'Oferta especial',
        title,
        description,
        ctaHref: ctaHref ?? '/catalogo',
        isActive: isActive ?? true,
        sortOrder: sortOrder ?? 0,
      },
    })
    res.status(201).json({ data: promotion })
  } catch (error) {
    next(error)
  }
}

/** PATCH /api/admin/promotions/:id */
export async function updatePromotion(req: Request, res: Response, next: NextFunction) {
  try {
    const id = String(req.params.id)
    const { badgeLabel, title, description, ctaHref, isActive, sortOrder } = req.body
    const promotion = await prisma.promotion.update({
      where: { id },
      data: {
        ...(badgeLabel !== undefined && { badgeLabel }),
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(ctaHref !== undefined && { ctaHref }),
        ...(isActive !== undefined && { isActive }),
        ...(sortOrder !== undefined && { sortOrder }),
      },
    })
    res.json({ data: promotion })
  } catch (error) {
    next(error)
  }
}

/** DELETE /api/admin/promotions/:id */
export async function deletePromotion(req: Request, res: Response, next: NextFunction) {
  try {
    await prisma.promotion.delete({ where: { id: String(req.params.id) } })
    res.json({ data: { deleted: true } })
  } catch (error) {
    next(error)
  }
}
