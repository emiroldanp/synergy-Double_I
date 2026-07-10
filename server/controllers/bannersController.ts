import { Request, Response, NextFunction } from 'express'
import { prisma } from '../lib/prisma'

/** GET /api/banners — banners activos para el HeroBanner público */
export async function listPublicBanners(req: Request, res: Response, next: NextFunction) {
  try {
    const slides = await prisma.bannerSlide.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    })
    res.json({ data: slides })
  } catch (error) {
    next(error)
  }
}

/** GET /api/admin/banners — todos los banners (admin) */
export async function listAllBanners(req: Request, res: Response, next: NextFunction) {
  try {
    const slides = await prisma.bannerSlide.findMany({ orderBy: { sortOrder: 'asc' } })
    res.json({ data: slides })
  } catch (error) {
    next(error)
  }
}

/** POST /api/admin/banners */
export async function createBanner(req: Request, res: Response, next: NextFunction) {
  try {
    const { imageUrl, title, subtitle, ctaLabel, ctaHref, isActive, sortOrder } = req.body
    if (!imageUrl || !title || !subtitle) {
      return res.status(400).json({ error: 'imageUrl, title y subtitle son requeridos' })
    }
    const slide = await prisma.bannerSlide.create({
      data: {
        imageUrl,
        title,
        subtitle,
        ctaLabel: ctaLabel ?? 'Ver ahora',
        ctaHref: ctaHref ?? '/catalogo',
        isActive: isActive ?? true,
        sortOrder: sortOrder ?? 0,
      },
    })
    res.status(201).json({ data: slide })
  } catch (error) {
    next(error)
  }
}

/** PATCH /api/admin/banners/:id */
export async function updateBanner(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params
    const { imageUrl, title, subtitle, ctaLabel, ctaHref, isActive, sortOrder } = req.body
    const slide = await prisma.bannerSlide.update({
      where: { id },
      data: {
        ...(imageUrl !== undefined && { imageUrl }),
        ...(title !== undefined && { title }),
        ...(subtitle !== undefined && { subtitle }),
        ...(ctaLabel !== undefined && { ctaLabel }),
        ...(ctaHref !== undefined && { ctaHref }),
        ...(isActive !== undefined && { isActive }),
        ...(sortOrder !== undefined && { sortOrder }),
      },
    })
    res.json({ data: slide })
  } catch (error) {
    next(error)
  }
}

/** DELETE /api/admin/banners/:id */
export async function deleteBanner(req: Request, res: Response, next: NextFunction) {
  try {
    await prisma.bannerSlide.delete({ where: { id: req.params.id } })
    res.json({ data: { deleted: true } })
  } catch (error) {
    next(error)
  }
}
