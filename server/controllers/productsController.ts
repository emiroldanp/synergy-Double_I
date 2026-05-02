import { Request, Response, NextFunction } from 'express'
import { prisma } from '../lib/prisma'
import { Prisma } from '@prisma/client'

/**
 * GET /api/products
 * Lista productos activos con filtros opcionales y paginación básica.
 * Query params: categorySlug, rarity, edition, condition, variant, language,
 *               minPrice, maxPrice, search, orderBy (price_asc|price_desc|newest)
 */
export async function getProducts(req: Request, res: Response, next: NextFunction) {
  try {
    const {
      categorySlug,
      rarity,
      edition,
      condition,
      variant,
      language,
      minPrice,
      maxPrice,
      search,
      orderBy,
    } = req.query

    // Solo productos activos
    const where: Prisma.ProductWhereInput = { isActive: true }

    if (categorySlug) {
      where.category = { slug: categorySlug as string }
    }
    if (rarity) where.rarity = rarity as string
    if (edition) where.edition = edition as any
    if (condition) where.condition = condition as any
    if (variant) where.variant = variant as any
    if (language) where.language = language as any

    if (minPrice || maxPrice) {
      where.price = {}
      if (minPrice) where.price.gte = new Prisma.Decimal(minPrice as string)
      if (maxPrice) where.price.lte = new Prisma.Decimal(maxPrice as string)
    }

    if (search) {
      where.name = { contains: search as string, mode: 'insensitive' }
    }

    // Orden
    let orderByClause: Prisma.ProductOrderByWithRelationInput = { createdAt: 'desc' }
    if (orderBy === 'price_asc') orderByClause = { price: 'asc' }
    else if (orderBy === 'price_desc') orderByClause = { price: 'desc' }
    else if (orderBy === 'newest') orderByClause = { createdAt: 'desc' }

    const products = await prisma.product.findMany({
      where,
      orderBy: orderByClause,
      include: {
        category: true,
        images: {
          where: { isPrimary: true },
          take: 1,
        },
      },
    })

    res.json({ data: products })
  } catch (error) {
    next(error)
  }
}

/**
 * GET /api/products/categories
 * Devuelve todas las categorías ordenadas por nombre.
 */
export async function getCategories(req: Request, res: Response, next: NextFunction) {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { name: 'asc' },
    })
    res.json({ data: categories })
  } catch (error) {
    next(error)
  }
}

/**
 * GET /api/products/:slug
 * Devuelve un producto por slug con todas sus imágenes ordenadas.
 */
export async function getProductBySlug(req: Request, res: Response, next: NextFunction) {
  try {
    const slug = String(req.params.slug)

    const product = await prisma.product.findUnique({
      where: { slug },
      include: {
        category: true,
        images: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    })

    if (!product) {
      return res.status(404).json({ error: 'Producto no encontrado', code: 'PRODUCT_NOT_FOUND' })
    }

    res.json({ data: product })
  } catch (error) {
    next(error)
  }
}
