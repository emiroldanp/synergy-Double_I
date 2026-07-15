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
      franchise,
      categorySlug,
      rarity,
      productType,
      edition,
      condition,
      variant,
      language,
      minPrice,
      maxPrice,
      priceMin,
      priceMax,
      search,
      orderBy,
      sortBy,
      page,
      limit,
    } = req.query

    // Solo productos activos
    const where: Prisma.ProductWhereInput = { isActive: true }

    // franchise toma precedencia sobre categorySlug (valores: pokemon, yugioh, lorcana)
    if (franchise) {
      const slugs = (franchise as string).split(',').map((s) => s.trim()).filter(Boolean)
      where.category = { slug: { in: slugs } }
    } else if (categorySlug) {
      where.category = { slug: categorySlug as string }
    }

    if (rarity) {
      const rarityList = (rarity as string).split(',').map((s) => s.trim()).filter(Boolean)
      where.rarity = rarityList.length === 1 ? rarityList[0] : { in: rarityList }
    }
    if (productType) {
      const typeList = (productType as string).split(',').map((s) => s.trim()).filter(Boolean)
      ;(where as any).productType = typeList.length === 1 ? typeList[0] : { in: typeList }
    }
    if (edition) where.edition = edition as any
    if (condition) where.condition = condition as any
    if (variant) where.variant = variant as any
    if (language) where.language = language as any

    // Acepta tanto minPrice/maxPrice como priceMin/priceMax
    const effectiveMin = (minPrice || priceMin) as string | undefined
    const effectiveMax = (maxPrice || priceMax) as string | undefined
    if (effectiveMin || effectiveMax) {
      where.price = {}
      if (effectiveMin) where.price.gte = new Prisma.Decimal(effectiveMin)
      if (effectiveMax) where.price.lte = new Prisma.Decimal(effectiveMax)
    }

    if (search) {
      where.name = { contains: search as string, mode: 'insensitive' }
    }

    // Acepta tanto orderBy como sortBy
    const sort = (orderBy || sortBy) as string | undefined
    let orderByClause: Prisma.ProductOrderByWithRelationInput = { createdAt: 'desc' }
    if (sort === 'price_asc') orderByClause = { price: 'asc' }
    else if (sort === 'price_desc') orderByClause = { price: 'desc' }
    else if (sort === 'newest') orderByClause = { createdAt: 'desc' }
    else if (sort === 'bestsellers') orderByClause = { createdAt: 'desc' }

    const pageNum = Math.max(1, parseInt((page as string) || '1', 10))
    const pageSize = Math.min(100, Math.max(1, parseInt((limit as string) || '12', 10)))
    const skip = (pageNum - 1) * pageSize

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy: orderByClause,
        skip,
        take: pageSize,
        include: {
          category: true,
          images: {
            where: { isPrimary: true },
            take: 1,
          },
        },
      }),
      prisma.product.count({ where }),
    ])

    const totalPages = Math.ceil(total / pageSize)

    res.json({ data: { products, total, totalPages, page: pageNum } })
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
 * GET /api/products/rarities
 * Devuelve las rarezas únicas registradas en productos activos (excluye accesorios).
 * Permite que el filtro del catálogo muestre rarezas dinámicas además de las estáticas.
 */
export async function getRarities(req: Request, res: Response, next: NextFunction) {
  try {
    // Incluir productos sin productType (NULL = creados antes del campo) pero excluir accesorios
    const where: any = {
      isActive: true,
      rarity: { not: null },
      OR: [{ productType: null }, { productType: { not: 'accessory' } }],
    }
    const results = await prisma.product.findMany({
      where,
      select: { rarity: true },
      distinct: ['rarity'],
    })
    const rarities = results.map((r) => r.rarity).filter(Boolean) as string[]
    res.json({ data: rarities })
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
