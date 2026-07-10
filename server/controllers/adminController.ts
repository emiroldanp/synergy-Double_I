import { Request, Response, NextFunction } from 'express'
import { prisma } from '../lib/prisma'
import { uploadToR2, deleteFromR2ByUrl } from '../lib/r2'
import { Prisma } from '@prisma/client'
import axios from 'axios'
import { createInvoice } from './invoicesController'
import { confirmOrderPayment } from './paymentsController'
import { withRetry } from '../lib/retry'

// Mapeo entre los valores del enum de DB (inglés) y los que usa el frontend (español)
const STATUS_TO_DB: Record<string, string> = {
  pendiente_pago: 'pending_payment',
  pago_confirmado: 'confirmed',
  en_preparacion: 'preparing',
  enviado: 'shipped',
  entregado: 'delivered',
  cancelado: 'cancelled',
}
const STATUS_TO_FRONTEND: Record<string, string> = {
  pending_payment: 'pendiente_pago',
  confirmed: 'pago_confirmado',
  preparing: 'en_preparacion',
  shipped: 'enviado',
  delivered: 'entregado',
  cancelled: 'cancelado',
}

const BREVO_API = 'https://api.brevo.com/v3'
const ARRIVAL_COOLDOWN_KEY = 'last_arrival_notification_at'

function brevoHeaders() {
  return {
    'api-key': process.env.BREVO_API_KEY!,
    'Content-Type': 'application/json',
  }
}

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
    const allowedFields = ['name', 'description', 'slug', 'cardNumber', 'setName', 'rarity', 'stock', 'edition', 'language', 'condition', 'variant']
    for (const field of allowedFields) {
      if (rest[field] !== undefined) (updateData as any)[field] = rest[field]
    }
    if (rest.categoryId !== undefined) {
      if (!rest.categoryId) return res.status(400).json({ error: 'categoryId es requerido' })
      updateData.category = { connect: { id: rest.categoryId } }
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
 * DELETE /api/admin/products/:id
 * Elimina un producto y sus imágenes asociadas.
 */
export async function deleteProduct(req: Request, res: Response, next: NextFunction) {
  try {
    const id = String(req.params.id)

    // Obtener URLs antes de que el cascade las elimine de la DB
    const images = await prisma.productImage.findMany({
      where: { productId: id },
      select: { url: true },
    })

    await prisma.product.delete({ where: { id } })

    // Borrar del bucket en paralelo — errores de R2 no bloquean la respuesta
    await Promise.allSettled(images.map((img) => deleteFromR2ByUrl(img.url)))

    res.json({ success: true })
  } catch (error: any) {
    if (error?.code === 'P2025') {
      return res.status(404).json({ error: 'Producto no encontrado' })
    }
    next(error)
  }
}

/**
 * GET /api/admin/products/:id
 * Devuelve un producto por ID con imágenes y categoría (para edición en el panel admin).
 */
export async function getProduct(req: Request, res: Response, next: NextFunction) {
  try {
    const id = String(req.params.id)
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        images: true,
        category: true,
      },
    })
    if (!product) {
      return res.status(404).json({ message: 'Producto no encontrado' })
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
      console.log('[R2 upload] iniciando subida a R2 — bucket:', process.env.CLOUDFLARE_R2_BUCKET_NAME, 'key:', `products/${id}/${filename}`)
      try {
        finalUrl = await uploadToR2(`products/${id}/${filename}`, buffer, mimeType)
        console.log('[R2 upload] éxito — url:', finalUrl)
      } catch (r2Err: any) {
        console.error('[R2 upload] error al subir a R2:', r2Err?.message, r2Err?.Code, r2Err?.$metadata)
        return res.status(500).json({ error: 'Error al subir imagen a R2', detail: r2Err?.message, code: r2Err?.Code })
      }
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
          invoice: {
            select: { status: true, pdfUrl: true, xmlUrl: true },
          },
        },
      }),
      prisma.order.count({ where }),
    ])

    const mapped = orders.map((o) => ({
      ...o,
      status: STATUS_TO_FRONTEND[o.orderStatus] ?? o.orderStatus,
    }))
    res.json({ data: mapped, meta: { page, limit, total } })
  } catch (error) {
    next(error)
  }
}

/**
 * PATCH /api/admin/orders/:id
 * Actualiza el estado y/o número de guía.
 * Cuando el estado cambia a 'pago_confirmado' y el pago no estaba confirmado,
 * dispara el flujo completo: stock, factura y email de confirmación.
 */
export async function updateOrder(req: Request, res: Response, next: NextFunction) {
  try {
    const id = String(req.params.id)
    // El frontend envía 'status' (valor en español como 'pago_confirmado')
    const { status, trackingNumber } = req.body

    const updateData: Prisma.OrderUpdateInput = {}
    const dbStatus = status ? (STATUS_TO_DB[status] ?? status) : undefined
    if (dbStatus) updateData.orderStatus = dbStatus as any
    if (trackingNumber !== undefined) updateData.trackingNumber = trackingNumber

    const order = await prisma.order.update({ where: { id }, data: updateData })

    // Si Irving confirmó el pago manualmente desde el dropdown, disparar flujo completo
    if (dbStatus === 'confirmed' && order.paymentStatus !== 'confirmed') {
      confirmOrderPayment({
        orderId: id,
        paymentReference: order.paymentReference,
        paymentMethod: order.paymentMethod,
      }).catch((err) =>
        console.error(`[updateOrder] Error al confirmar pago de orden ${id}:`, err)
      )
    }

    res.json({ data: { ...order, status: STATUS_TO_FRONTEND[order.orderStatus] ?? order.orderStatus } })
  } catch (error: any) {
    if (error?.code === 'P2025') {
      return res.status(404).json({ error: 'Registro no encontrado' })
    }
    next(error)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// FACTURAS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/admin/invoices
 * Lista facturas con filtro por status y paginación.
 * Query params: status (draft | valid | cancelled), page, limit
 */
export async function listInvoices(req: Request, res: Response, next: NextFunction) {
  try {
    const { status } = req.query
    const page = Math.max(1, parseInt(req.query.page as string) || 1)
    const limit = Math.min(100, parseInt(req.query.limit as string) || 20)
    const skip = (page - 1) * limit

    const where: Prisma.InvoiceWhereInput = {}
    if (status) where.status = status as any

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          order: {
            select: {
              id: true,
              guestEmail: true,
              total: true,
              createdAt: true,
              customer: { select: { email: true, fullName: true } },
            },
          },
        },
      }),
      prisma.invoice.count({ where }),
    ])

    res.json({ data: invoices, meta: { page, limit, total } })
  } catch (error) {
    next(error)
  }
}

/**
 * POST /api/admin/invoices/:orderId/retry
 * Reintenta la emisión de CFDI para una factura en estado 'draft'.
 * Solo aplicable cuando Facturapi falló en el webhook de pago.
 */
export async function retryInvoice(req: Request, res: Response, next: NextFunction) {
  try {
    const orderId = String(req.params.orderId)

    const invoice = await prisma.invoice.findUnique({
      where: { orderId },
      select: { status: true },
    })

    if (!invoice) {
      return res.status(404).json({ error: 'Factura no encontrada' })
    }

    if (invoice.status !== 'draft') {
      return res.status(409).json({ error: `La factura ya tiene status '${invoice.status}'. Solo se pueden reintentar facturas en 'draft'.` })
    }

    // Ejecutar de forma asíncrona — puede tardar varios segundos
    createInvoice(orderId).catch((err) =>
      console.error(`Error en reintento de factura para orden ${orderId}:`, err)
    )

    res.json({ success: true, message: 'Reintento de emisión CFDI iniciado.' })
  } catch (error) {
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

    const [today, week, month, byStatus, recentOrders, pendingOrders] = await Promise.all([
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
      prisma.order.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          guestEmail: true,
          total: true,
          orderStatus: true,
        },
      }),
      prisma.order.count({ where: { orderStatus: 'pending_payment' } }),
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
        pendingOrders,
        recentOrders: recentOrders.map((o) => ({
          id: o.id,
          customerEmail: o.guestEmail ?? '—',
          total: Number(o.total),
          status: o.orderStatus,
        })),
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
 * GET /api/admin/subscribers/export-csv
 * Exporta todos los suscriptores como archivo CSV.
 */
export async function exportSubscribersCsv(req: Request, res: Response, next: NextFunction) {
  try {
    const subscribers = await prisma.emailSubscriber.findMany({
      orderBy: { subscribedAt: 'desc' },
      select: { email: true, fullName: true, isBuyer: true, source: true, subscribedAt: true, unsubscribedAt: true },
    })

    const header = 'Email,Nombre,Comprador,Fuente,Suscrito el,Dado de baja'
    const rows = subscribers.map((s) =>
      [
        s.email,
        s.fullName ?? '',
        s.isBuyer ? 'Sí' : 'No',
        s.source,
        new Date(s.subscribedAt).toLocaleDateString('es-MX'),
        s.unsubscribedAt ? new Date(s.unsubscribedAt).toLocaleDateString('es-MX') : '',
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(',')
    )

    const csv = [header, ...rows].join('\n')
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', 'attachment; filename="suscriptores.csv"')
    res.send('﻿' + csv) // BOM para compatibilidad con Excel
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
 * Cooldown de 10 min persistido en SystemConfig — sobrevive reinicios del servidor.
 */
async function triggerArrivalNotification(productId: string): Promise<void> {
  const now = new Date()
  const cooldownMs = 10 * 60 * 1000

  // Leer el último disparo desde la base de datos
  const config = await prisma.systemConfig.findUnique({
    where: { key: ARRIVAL_COOLDOWN_KEY },
  })

  if (config) {
    const lastSentAt = new Date(config.value)
    if (now.getTime() - lastSentAt.getTime() < cooldownMs) {
      return
    }
  }

  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      images: { where: { isPrimary: true }, take: 1 },
      category: true,
    },
  })

  if (!product) return

  const templateId = parseInt(process.env.BREVO_ARRIVAL_TEMPLATE_ID || '0', 10)
  const listId = process.env.BREVO_MAIN_LIST_ID

  if (!templateId || !listId) return

  // Enlace público al detalle del producto en el catálogo (/catalogo/:slug).
  // FRONTEND_URL puede traer varios orígenes separados por coma — usamos el primero.
  const baseUrl = (process.env.FRONTEND_URL ?? '').split(',')[0].trim().replace(/\/$/, '')
  const productUrl = `${baseUrl}/catalogo/${product.slug}`

  // RNF-005: el envío a la lista es idempotente respecto a efectos persistentes
  // (no crea órdenes ni cobros) → seguro reintentar ante fallos transitorios.
  await withRetry(
    () =>
      axios.post(
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
            PRODUCT_URL: productUrl,
          },
        },
        { headers: brevoHeaders() }
      ),
    { label: 'Brevo new arrivals' }
  )

  // Persistir timestamp en la base de datos
  await prisma.systemConfig.upsert({
    where: { key: ARRIVAL_COOLDOWN_KEY },
    update: { value: now.toISOString() },
    create: { key: ARRIVAL_COOLDOWN_KEY, value: now.toISOString() },
  })
}
