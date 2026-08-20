import { Request, Response, NextFunction } from 'express'
import { prisma } from '../lib/prisma'
import { Prisma } from '@prisma/client'
import { z } from 'zod'
import { calcDiscount, isCodeValid } from './discountCodesController'
import { evaluatePromotions, type PromotionRule, type CartLineForPromotion, type PromotionRuleType } from '../lib/promotionsEngine'

const createOrderSchema = z.object({
  customerId: z.string().optional().nullable(),
  guestEmail: z.string().email().optional().nullable(),
  guestName: z.string().max(100).optional().nullable(),
  guestPhone: z.string().max(20).optional().nullable(),
  shippingAddress: z.any(),
  shippingMethod: z.string().optional().nullable(),
  shippingCost: z.number().min(0, 'shippingCost no puede ser negativo').max(2000, 'shippingCost excede el máximo permitido'),
  items: z.array(z.object({
    productId: z.string().min(1),
    quantity: z.number().int().min(1).max(100),
  })).min(1, 'La orden debe tener al menos un item'),
  requiresInvoice: z.boolean(),
  invoiceData: z.object({
    rfc: z.string().min(1).max(13),
    razonSocial: z.string().min(1).max(200),
    cfdiUse: z.string().min(1),
  }).optional().nullable(),
  discountCode: z.string().max(50).optional().nullable(),
  paymentMethod: z.enum(['mercado_pago', 'transferencia_directa']).optional(),
})

/**
 * POST /api/orders
 * Crea una nueva orden con estado pending_payment.
 * Valida stock antes de crear y ejecuta todo en una transacción Prisma.
 */
export async function createOrder(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = createOrderSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ error: 'Datos de orden inválidos', details: parsed.error.flatten().fieldErrors })
    }
    const { customerId, guestEmail, guestName, guestPhone, shippingAddress, shippingMethod, shippingCost, items, requiresInvoice, invoiceData, discountCode, paymentMethod } = parsed.data

    // Crear orden e items en una sola transacción (validación de stock incluida para eliminar TOCTOU)
    const order = await prisma.$transaction(async (tx) => {
      // 1. Validar stock y obtener precios desde la BD — nunca del cliente
      const resolvedItems: { productId: string; quantity: number; unitPrice: Prisma.Decimal; subtotal: Prisma.Decimal; categoryId: string }[] = []
      for (const item of items) {
        const product = await tx.product.findUnique({ where: { id: item.productId } })
        if (!product || !product.isActive) throw new Error(`Producto ${item.productId} no disponible`)
        if (product.stock < item.quantity) throw new Error(`Stock insuficiente para ${product.name}`)
        const unitPrice = product.price
        resolvedItems.push({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice,
          subtotal: new Prisma.Decimal(Number(unitPrice) * item.quantity),
          categoryId: product.categoryId,
        })
      }

      // 2. Calcular subtotal desde precios de BD
      const subtotal = resolvedItems.reduce((sum, i) => sum + Number(i.unitPrice) * i.quantity, 0)

      // 3. Validar y aplicar código de descuento, O evaluar promociones automáticas
      // — son mutuamente excluyentes: si el cliente aplicó un código, se ignoran
      // las promociones automáticas (el código es una elección explícita del cliente).
      let discountAmount = 0
      let resolvedDiscountCodeId: string | null = null
      let resolvedPromotionId: string | null = null
      let effectiveShippingCost = shippingCost || 0

      if (discountCode) {
        const codeRecord = await tx.discountCode.findUnique({
          where: { code: discountCode.toUpperCase().trim() },
        })
        if (!codeRecord) throw new Error('Código de descuento no encontrado')
        const { valid, reason } = isCodeValid(codeRecord, subtotal)
        if (!valid) throw new Error(reason ?? 'Código inválido')

        discountAmount = calcDiscount(codeRecord.type, codeRecord.value, subtotal)
        resolvedDiscountCodeId = codeRecord.id

        // Incrementar usageCount dentro de la misma transacción
        await tx.discountCode.update({
          where: { id: codeRecord.id },
          data: { usageCount: { increment: 1 } },
        })
      } else {
        const cartLines: CartLineForPromotion[] = resolvedItems.map((i) => ({
          categoryId: i.categoryId,
          lineSubtotal: Number(i.subtotal),
        }))
        const rows = await tx.promotion.findMany({
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

        const effect = evaluatePromotions(rules, cartLines, subtotal, effectiveShippingCost)
        if (effect) {
          resolvedPromotionId = effect.promotionId
          discountAmount = effect.discountAmount
          if (effect.freeShipping) effectiveShippingCost = 0
        }
      }

      const total = subtotal + effectiveShippingCost - discountAmount

      // 4. Crear orden e items
      const newOrder = await tx.order.create({
        data: {
          customerId: customerId || null,
          guestEmail: guestEmail || null,
          guestName: guestName || null,
          guestPhone: guestPhone || null,
          shippingAddress,
          shippingMethod: shippingMethod || null,
          shippingCost: new Prisma.Decimal(effectiveShippingCost),
          subtotal: new Prisma.Decimal(subtotal),
          discountCodeId: resolvedDiscountCodeId,
          promotionId: resolvedPromotionId,
          discountAmount: new Prisma.Decimal(discountAmount),
          total: new Prisma.Decimal(total),
          // Transferencia directa se guarda desde la creación — no pasa por Mercado Pago,
          // así que no hay webhook que la sobreescriba luego (ver confirmOrderPayment)
          paymentMethod: paymentMethod === 'transferencia_directa' ? 'transferencia_directa' : null,
          requiresInvoice,
          items: {
            create: resolvedItems.map(({ categoryId, ...item }) => item),
          },
        },
      })

      // Si requiere factura, crear Invoice en estado draft
      if (requiresInvoice && invoiceData) {
        await tx.invoice.create({
          data: {
            orderId: newOrder.id,
            rfc: invoiceData.rfc,
            razonSocial: invoiceData.razonSocial,
            cfdiUse: invoiceData.cfdiUse,
            status: 'draft',
          },
        })
      }

      return newOrder
    })

    res.status(201).json({ data: { orderId: order.id } })
  } catch (error: any) {
    // Errores de validación (stock, producto no disponible, descuento) lanzados dentro de la transacción
    const validationMessages = ['no disponible', 'Stock insuficiente', 'Código de descuento', 'Código inválido', 'Código no encontrado', 'expirado', 'agotado']
    if (validationMessages.some(msg => error?.message?.includes(msg))) {
      const isDiscountError = ['Código', 'expirado', 'agotado'].some(msg => error?.message?.includes(msg))
      return res.status(400).json({
        error: error.message,
        code: isDiscountError ? 'DISCOUNT_INVALID' : 'INSUFFICIENT_STOCK',
      })
    }
    next(error)
  }
}

/**
 * GET /api/orders/:id
 * Devuelve la orden con sus items y datos públicos de cada producto.
 * No requiere autenticación — el cliente accede con el ID de su pedido.
 */
export async function getOrder(req: Request, res: Response, next: NextFunction) {
  try {
    const id = String(req.params.id)

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                price: true,
                slug: true,
                images: {
                  where: { isPrimary: true },
                  take: 1,
                },
              },
            },
          },
        },
      },
    })

    if (!order) {
      return res.status(404).json({ error: 'Pedido no encontrado', code: 'ORDER_NOT_FOUND' })
    }

    // Excluir guestPhone — PII innecesario en endpoint público (CN-006)
    const { guestPhone: _phone, ...publicOrder } = order as any
    res.json({ data: publicOrder })
  } catch (error) {
    next(error)
  }
}
