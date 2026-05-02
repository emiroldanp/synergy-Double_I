import { Request, Response, NextFunction } from 'express'
import { prisma } from '../lib/prisma'
import { uploadToR2 } from '../lib/r2'
import { Prisma } from '@prisma/client'
import axios from 'axios'

const BREVO_API = 'https://api.brevo.com/v3'

function brevoHeaders() {
  return {
    'api-key': process.env.BREVO_API_KEY!,
    'Content-Type': 'application/json',
  }
}

// Control de cooldown para arrival notifications (en memoria — se resetea al reiniciar)
let lastArrivalNotificationAt: Date | null = null

// ─────────────────────────────────────────────────────────────────────────────
// PRODUCTOS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/admin/products
 * Lista todos los productos (activos e inactivos) con paginación.
 * Query params: page (default 1), limit (default 20)
 */
export async function listProducts(req: Request, res: Response, next: NextFunction) {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1)
    const limit = Math.min(100, parseInt(req.query.limit as string) || 20)
    const skip = (page - 1) * limit

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          category: true,
          images: { orderBy: { sortOrder: 'asc' } },
        },
      }),
      prisma.product.count(),
    ])

    res.json({ data: products, meta: { page, limit, total } })
  } catch (error) {
    next(error)
  }
}

/**
 * POST /api/admin/products
 * Crea un producto. Si isActive: true, dispara arrival notification a Brevo.
 */
export async function createProduct(req: Request, res: Response, next: NextFunction) {
  try {
    // Whitelist de campos permitidos — nunca spread req.body directo a Prisma
    const {
      categoryId, name, cardNumber, setName, edition, language,
      rarity, condition, variant, price, stock, slug, description, isActive
    } = req.body

    const product = await prisma.product.create({
      data: {
        categoryId, name, cardNumber, setName, edition, language,
        rarity, condition, variant,
        price: new Prisma.Decimal(price),
        stock,
        slug,
        description,
        isActive: isActive ?? true,
      },
    })

    if (isActive) {
      triggerArrivalNotification(product.id).catch((err) =>
        console.error(`Error en arrival notification para ${product.id}:`, err)
      )
    }

    res.status(201).json({ data: product })
  } catch (error) {
    next(error)
  }
}

/**
 * PATCH /api/admin/products/:id
 * Edita campos de un producto.
 * Si isActive cambia de false a true, dispara arrival notification.
 */
export async function updateProduct(req: Request, res: Response, next: NextFunction) {
  try {
    const id = String(req.params.id)
    const { isActive, price, ...rest } = req.body

    // Obtener el estado actual para detectar cambio de inactivo → activo
    const existing = await prisma.product.findUnique({ where: { id }, select: { isActive: true } })
    if (!existing) {
      return res.status(404).json({ error: 'Producto no encontrado' })
    }

    // Construir el objeto de update excluyendo campos que se manejan por separado
    const updateData: Prisma.ProductUpdateInput = {}
    // Copiar solo campos permitidos del body (evitar asignar relaciones u objetos complejos)
    const allowedFields = ['name', 'description', 'slug', 'cardNumber', 'setName', 'rarity', 'stock', 'edition', 'language', 'condition', 'variant', 'categoryId']
    for (const field of allowedFields) {
      if (rest[field] !== undefined) (updateData as any)[field] = rest[field]
    }
    if (price !== undefined) updateData.price = new Prisma.Decimal(price)
    if (isActive !== undefined) updateData.isActive = Boolean(isActive)

    const product = await prisma.product.update({ where: { id }, data: updateData })

    // Disparar notification si se publicó por primera vez
    const justActivated = !existing.isActive && isActive === true
    if (justActivated) {
      triggerArrivalNotification(id).catch((err) =>
        console.error(`Error en arrival notification para ${id}:`, err)
      )
    }

    res.json({ data: product })
  } catch (error) {
    next(error)
  }
}

/**
 * POST /api/admin/products/:id/images
 * Sube imagen en base64 o URL a Cloudflare R2 y crea ProductImage.
 * Body: { base64?: string, imageUrl?: string, mimeType?: string, isPrimary?: boolean, sortOrder?: number }
 */
export async function uploadProductImage(req: Request, res: Response, next: NextFunction) {
  try {
    const id = String(req.params.id)
    const { base64, imageUrl, mimeType = 'image/jpeg', isPrimary = false, sortOrder = 0 } = req.body

    let finalUrl: string

    if (base64) {
      const buffer = Buffer.from(base64, 'base64')
      const ext = mimeType.split('/')[1] || 'jpg'
      const filename = `${Date.now()}.${ext}`
      finalUrl = await uploadToR2(`products/${id}/${filename}`, buffer, mimeType)
    } else if (imageUrl) {
      // Validar que imageUrl es HTTPS y no apunta a red interna (prevenir SSRF)
      const parsedUrl = new URL(imageUrl) // lanza si mal formada
      if (parsedUrl.protocol !== 'https:') {
        return res.status(400).json({ error: 'Solo se permiten URLs HTTPS' })
      }
      const blockedHosts = ['169.254.169.254', '169.254.170.2', 'metadata.google.internal', '::1', '127.0.0.1', 'localhost']
      if (blockedHosts.some(h => parsedUrl.hostname === h)) {
        return res.status(400).json({ error: 'URL no permitida' })
      }

      // Descargar la imagen y subirla a R2
      const response = await axios.get(imageUrl, { responseType: 'arraybuffer' })
      const buffer = Buffer.from(response.data)
      const contentType = response.headers['content-type'] || mimeType
      const ext = contentType.split('/')[1]?.split(';')[0] || 'jpg'
      const filename = `${Date.now()}.${ext}`
      finalUrl = await uploadToR2(`products/${id}/${filename}`, buffer, contentType)
    } else {
      return res.status(400).json({ error: 'Se requiere base64 o imageUrl' })
    }

    // Si se marca como primaria, desmarcar las demás
    if (isPrimary) {
      await prisma.productImage.updateMany({
        where: { productId: id },
        data: { isPrimary: false },
      })
    }

    const image = await prisma.productImage.create({
      data: {
        productId: id,
        url: finalUrl,
        isPrimary: Boolean(isPrimary),
        sortOrder: Number(sortOrder),
      },
    })

    res.status(201).json({ data: image })
  } catch (error) {
    next(error)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PEDIDOS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/admin/orders
 * Lista pedidos con filtro por status y paginación.
 * Query params: status, page, limit
 */
export async function listOrders(req: Request, res: Response, next: NextFunction) {
  try {
    const { status } = req.query
    const page = Math.max(1, parseInt(req.query.page as string) || 1)
    const limit = Math.min(100, parseInt(req.query.limit as string) || 20)
    const skip = (page - 1) * limit

    const where: Prisma.OrderWhereInput = {}
    if (status) where.orderStatus = status as any

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          items: {
            include: { product: { select: { name: true, price: true } } },
          },
          customer: true,
        },
      }),
      prisma.order.count({ where }),
    ])

    res.json({ data: orders, meta: { page, limit, total } })
  } catch (error) {
    next(error)
  }
}

/**
 * PATCH /api/admin/orders/:id
 * Actualiza orderStatus y/o trackingNumber.
 */
export async function updateOrder(req: Request, res: Response, next: NextFunction) {
  try {
    const id = String(req.params.id)
    const { orderStatus, trackingNumber } = req.body

    const updateData: Prisma.OrderUpdateInput = {}
    if (orderStatus) updateData.orderStatus = orderStatus
    if (trackingNumber !== undefined) updateData.trackingNumber = trackingNumber

    const order = await prisma.order.update({ where: { id }, data: updateData })

    res.json({ data: order })
  } catch (error: any) {
    if (error?.code === 'P2025') {
      return res.status(404).json({ error: 'Registro no encontrado' })
    }
    next(error)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// DASHBOARD
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/admin/dashboard
 * Métricas de ventas confirmadas: ingresos del día, semana, mes y conteo por status.
 */
export async function getDashboard(req: Request, res: Response, next: NextFunction) {
  try {
    const now = new Date()
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const startOfWeek = new Date(now)
    startOfWeek.setDate(now.getDate() - now.getDay())
    startOfWeek.setHours(0, 0, 0, 0)
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    // Ingresos solo de órdenes con pago confirmado
    const confirmedFilter = (from: Date): Prisma.OrderWhereInput => ({
      paymentStatus: 'confirmed',
      createdAt: { gte: from },
    })

    const [today, week, month, byStatus] = await Promise.all([
      prisma.order.aggregate({
        where: confirmedFilter(startOfDay),
        _sum: { total: true },
      }),
      prisma.order.aggregate({
        where: confirmedFilter(startOfWeek),
        _sum: { total: true },
      }),
      prisma.order.aggregate({
        where: confirmedFilter(startOfMonth),
        _sum: { total: true },
      }),
      prisma.order.groupBy({
        by: ['orderStatus'],
        _count: { id: true },
      }),
    ])

    // Construir mapa de conteo por status con todos los valores del enum
    const orderStatusMap: Record<string, number> = {
      pending_payment: 0,
      confirmed: 0,
      preparing: 0,
      shipped: 0,
      delivered: 0,
      cancelled: 0,
    }
    for (const row of byStatus) {
      orderStatusMap[row.orderStatus] = row._count.id
    }

    res.json({
      data: {
        revenueToday: Number(today._sum.total || 0),
        revenueWeek: Number(week._sum.total || 0),
        revenueMonth: Number(month._sum.total || 0),
        ordersByStatus: orderStatusMap,
      },
    })
  } catch (error) {
    next(error)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SUSCRIPTORES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/admin/subscribers
 * Lista suscriptores con paginación.
 */
export async function listSubscribers(req: Request, res: Response, next: NextFunction) {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1)
    const limit = Math.min(100, parseInt(req.query.limit as string) || 20)
    const skip = (page - 1) * limit

    const [subscribers, total] = await Promise.all([
      prisma.emailSubscriber.findMany({
        skip,
        take: limit,
        orderBy: { subscribedAt: 'desc' },
        select: {
          id: true,
          email: true,
          fullName: true,
          isBuyer: true,
          source: true,
          subscribedAt: true,
          unsubscribedAt: true,
        },
      }),
      prisma.emailSubscriber.count(),
    ])

    res.json({ data: subscribers, meta: { page, limit, total } })
  } catch (error) {
    next(error)
  }
}

/**
 * DELETE /api/admin/subscribers/:id
 * Elimina el suscriptor de la tabla local.
 * La gestión en Brevo se hace desde su dashboard.
 */
export async function deleteSubscriber(req: Request, res: Response, next: NextFunction) {
  try {
    const id = String(req.params.id)
    await prisma.emailSubscriber.delete({ where: { id } })
    res.json({ success: true })
  } catch (error: any) {
    if (error?.code === 'P2025') {
      return res.status(404).json({ error: 'Registro no encontrado' })
    }
    next(error)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ARRIVAL NOTIFICATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Dispara una notificación de nuevo producto a toda la lista de Brevo.
 * Agrupación: si en los últimos 10 minutos ya se disparó una, no se dispara otra.
 */
async function triggerArrivalNotification(productId: string): Promise<void> {
  const now = new Date()
  const cooldownMs = 10 * 60 * 1000 // 10 minutos

  if (lastArrivalNotificationAt && now.getTime() - lastArrivalNotificationAt.getTime() < cooldownMs) {
    return
  }

  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      images: {
        where: { isPrimary: true },
        take: 1,
      },
      category: true,
    },
  })

  if (!product) return

  const templateId = parseInt(process.env.BREVO_ARRIVAL_TEMPLATE_ID || '0', 10)
  const listId = process.env.BREVO_MAIN_LIST_ID

  if (!templateId || !listId) return

  await axios.post(
    `${BREVO_API}/smtp/email`,
    {
      sender: {
        email: process.env.BREVO_SENDER_EMAIL,
        name: process.env.BREVO_SENDER_NAME,
      },
      to: [{ email: `list+${listId}@list.brevo.com` }],
      templateId,
      params: {
        PRODUCT_NAME: product.name,
        FRANCHISE: product.category?.name || '',
        PRICE: Number(product.price),
        IMAGE_URL: product.images[0]?.url || '',
      },
    },
    { headers: brevoHeaders() }
  )

  lastArrivalNotificationAt = now
}
