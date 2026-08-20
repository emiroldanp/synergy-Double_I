import { Request, Response, NextFunction } from 'express'
import { prisma } from '../lib/prisma'
import { z } from 'zod'
import { evaluatePromotions, type PromotionRule, type CartLineForPromotion, type PromotionRuleType } from '../lib/promotionsEngine'

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

const evaluateSchema = z.object({
  items: z.array(z.object({
    productId: z.string().min(1),
    quantity: z.number().int().min(1),
  })).min(1, 'items no puede estar vacío'),
  shippingCost: z.number().min(0).optional(),
})

/**
 * POST /api/promotions/evaluate
 * Resuelve el carrito contra la BD (nunca confía en precios del cliente) y
 * devuelve la promoción automática de mayor beneficio que aplique, o null.
 * Es solo un preview para el checkout — la fuente de verdad es createOrder.
 */
export async function evaluatePromotion(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = evaluateSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ error: 'Datos inválidos', details: parsed.error.flatten().fieldErrors })
    }
    const { items, shippingCost } = parsed.data

    const products = await prisma.product.findMany({
      where: { id: { in: items.map((i) => i.productId) }, isActive: true },
      select: { id: true, price: true, categoryId: true },
    })
    const byId = new Map(products.map((p) => [p.id, p]))

    const cartLines: CartLineForPromotion[] = []
    let cartSubtotal = 0
    for (const item of items) {
      const product = byId.get(item.productId)
      if (!product) continue
      const lineSubtotal = Number(product.price) * item.quantity
      cartSubtotal += lineSubtotal
      cartLines.push({ categoryId: product.categoryId, lineSubtotal })
    }

    const rows = await prisma.promotion.findMany({
      where: { isActive: true, type: { not: null } },
      orderBy: { sortOrder: 'asc' },
    })
    const rules: PromotionRule[] = rows.map((r) => ({
      id: r.id,
      title: r.title,
      type: r.type as PromotionRuleType,
      categoryId: r.categoryId,
      value: r.value != null ? Number(r.value) : null,
      minAmount: r.minAmount != null ? Number(r.minAmount) : null,
      startsAt: r.startsAt,
      endsAt: r.endsAt,
    }))

    const effect = evaluatePromotions(rules, cartLines, cartSubtotal, shippingCost ?? 0)

    res.json({
      data: {
        promotion: effect
          ? { id: effect.promotionId, title: effect.title, discountAmount: effect.discountAmount, freeShipping: effect.freeShipping }
          : null,
      },
    })
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

const ruleFieldsSchema = {
  badgeLabel: z.string().min(1).optional(),
  ctaHref: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
  type: z.enum(['free_shipping', 'percentage_off', 'fixed_off']).nullable().optional(),
  categoryId: z.string().nullable().optional(),
  value: z.number().positive().nullable().optional(),
  minAmount: z.number().positive().nullable().optional(),
  startsAt: z.string().nullable().optional(),
  endsAt: z.string().nullable().optional(),
}

function refineRuleCrossFields<T extends z.ZodTypeAny>(schema: T) {
  return schema
    .refine(
      (d: any) => d.type !== 'percentage_off' || (d.value != null && d.value > 0 && d.value <= 100),
      { message: 'El porcentaje debe ser mayor a 0 y menor o igual a 100', path: ['value'] }
    )
    .refine(
      (d: any) => d.type !== 'fixed_off' || (d.value != null && d.value > 0),
      { message: 'El monto de descuento es requerido', path: ['value'] }
    )
    .refine(
      (d: any) => d.type !== 'free_shipping' || d.categoryId == null,
      { message: 'El envío gratis no puede limitarse a una categoría', path: ['categoryId'] }
    )
    .refine(
      (d: any) => !d.startsAt || !d.endsAt || new Date(d.startsAt) <= new Date(d.endsAt),
      { message: 'La fecha de fin debe ser posterior a la de inicio', path: ['endsAt'] }
    )
}

const createPromotionSchema = refineRuleCrossFields(
  z.object({
    title: z.string().min(1),
    description: z.string().min(1),
    ...ruleFieldsSchema,
  })
)

const updatePromotionSchema = refineRuleCrossFields(
  z.object({
    title: z.string().min(1).optional(),
    description: z.string().min(1).optional(),
    ...ruleFieldsSchema,
  })
)

/** POST /api/admin/promotions */
export async function createPromotion(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = createPromotionSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ error: 'Datos inválidos', details: parsed.error.flatten().fieldErrors })
    }
    const { title, description, badgeLabel, ctaHref, isActive, sortOrder, type, categoryId, value, minAmount, startsAt, endsAt } = parsed.data

    const promotion = await prisma.promotion.create({
      data: {
        title,
        description,
        badgeLabel: badgeLabel ?? 'Oferta especial',
        ctaHref: ctaHref ?? '/catalogo',
        isActive: isActive ?? true,
        sortOrder: sortOrder ?? 0,
        type: type ?? null,
        categoryId: categoryId ?? null,
        value: value ?? null,
        minAmount: minAmount ?? null,
        startsAt: startsAt ? new Date(startsAt) : null,
        endsAt: endsAt ? new Date(endsAt) : null,
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
    const parsed = updatePromotionSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ error: 'Datos inválidos', details: parsed.error.flatten().fieldErrors })
    }
    const { title, description, badgeLabel, ctaHref, isActive, sortOrder, type, categoryId, value, minAmount, startsAt, endsAt } = parsed.data

    const promotion = await prisma.promotion.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(badgeLabel !== undefined && { badgeLabel }),
        ...(ctaHref !== undefined && { ctaHref }),
        ...(isActive !== undefined && { isActive }),
        ...(sortOrder !== undefined && { sortOrder }),
        ...(type !== undefined && { type }),
        ...(categoryId !== undefined && { categoryId }),
        ...(value !== undefined && { value }),
        ...(minAmount !== undefined && { minAmount }),
        ...(startsAt !== undefined && { startsAt: startsAt ? new Date(startsAt) : null }),
        ...(endsAt !== undefined && { endsAt: endsAt ? new Date(endsAt) : null }),
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
