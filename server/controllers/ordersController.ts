import { Request, Response, NextFunction } from 'express'
import { prisma } from '../lib/prisma'
import { Prisma } from '@prisma/client'

interface OrderItem {
  productId: string
  quantity: number
  // unitPrice lo ignoramos — el precio siempre viene de la BD para evitar price manipulation
}

interface CreateOrderBody {
  customerId?: string | null
  guestEmail?: string
  guestName?: string
  guestPhone?: string
  shippingAddress: object
  shippingMethod?: string
  shippingCost: number
  items: OrderItem[]
  requiresInvoice: boolean
  invoiceData?: {
    rfc: string
    razonSocial: string
    cfdiUse: string
  } | null
}

/**
 * POST /api/orders
 * Crea una nueva orden con estado pending_payment.
 * Valida stock antes de crear y ejecuta todo en una transacción Prisma.
 */
export async function createOrder(req: Request, res: Response, next: NextFunction) {
  try {
    const body = req.body as CreateOrderBody
    const { customerId, guestEmail, guestName, guestPhone, shippingAddress, shippingMethod, shippingCost, items, requiresInvoice, invoiceData } = body

    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'La orden debe tener al menos un item' })
    }

    // Crear orden e items en una sola transacción (validación de stock incluida para eliminar TOCTOU)
    const order = await prisma.$transaction(async (tx) => {
      // 1. Validar stock y obtener precios desde la BD — nunca del cliente
      const resolvedItems: { productId: string; quantity: number; unitPrice: Prisma.Decimal; subtotal: Prisma.Decimal }[] = []
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
        })
      }

      // 2. Calcular totales desde precios de BD
      const subtotal = resolvedItems.reduce((sum, i) => sum + Number(i.unitPrice) * i.quantity, 0)
      const total = subtotal + (shippingCost || 0)

      // 3. Crear orden e items
      const newOrder = await tx.order.create({
        data: {
          customerId: customerId || null,
          guestEmail: guestEmail || null,
          guestName: guestName || null,
          guestPhone: guestPhone || null,
          shippingAddress,
          shippingMethod: shippingMethod || null,
          shippingCost: new Prisma.Decimal(shippingCost || 0),
          subtotal: new Prisma.Decimal(subtotal),
          total: new Prisma.Decimal(total),
          requiresInvoice,
          items: {
            create: resolvedItems,
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
    // Errores de validación (stock, producto no disponible) lanzados dentro de la transacción
    const validationMessages = ['no disponible', 'Stock insuficiente']
    if (validationMessages.some(msg => error?.message?.includes(msg))) {
      return res.status(400).json({ error: error.message, code: 'INSUFFICIENT_STOCK' })
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

    res.json({ data: order })
  } catch (error) {
    next(error)
  }
}
