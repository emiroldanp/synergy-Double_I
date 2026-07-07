import { Request, Response, NextFunction } from 'express'
import MercadoPagoConfig, { Preference, Payment } from 'mercadopago'
import { prisma } from '../lib/prisma'
import { Prisma } from '@prisma/client'
import { createInvoice } from './invoicesController'
import { sendOrderConfirmationEmail, sendPaymentVerificationEmail } from './emailController'
import { withRetry } from '../lib/retry'
import crypto from 'crypto'

// Verificar en producción que el webhook secret esté configurado
if (process.env.NODE_ENV === 'production' && !process.env.PAYMENT_WEBHOOK_SECRET) {
  throw new Error('PAYMENT_WEBHOOK_SECRET es requerido en producción')
}

// Inicializar cliente de Mercado Pago
function getMpClient() {
  return new MercadoPagoConfig({ accessToken: process.env.PAYMENT_ACCESS_TOKEN! })
}

/**
 * POST /api/payments/create-preference
 * Crea una preferencia de pago en Mercado Pago para una orden existente.
 * Devuelve { preferenceId, initPoint } para que el frontend redirija al checkout de MP.
 */
export async function createPreference(req: Request, res: Response, next: NextFunction) {
  try {
    const { orderId } = req.body

    if (!orderId) {
      return res.status(400).json({ error: 'orderId es requerido' })
    }

    // Buscar la orden con sus items y productos
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            product: {
              select: { id: true, name: true },
            },
          },
        },
      },
    })

    if (!order) {
      return res.status(404).json({ error: 'Pedido no encontrado' })
    }

    if (order.paymentStatus !== 'pending') {
      return res.status(400).json({ error: 'Este pedido ya fue procesado' })
    }

    const client = getMpClient()
    const preferenceClient = new Preference(client)

    // Construir items para Mercado Pago
    const mpItems = order.items.map((item) => ({
      id: item.productId,
      title: item.product.name,
      quantity: item.quantity,
      unit_price: Number(item.unitPrice),
      currency_id: 'MXN',
    }))

    // Agregar el costo de envío como item adicional para que se sume al total
    // cobrado por Mercado Pago. Aparece como una línea más en el checkout.
    const shippingCost = Number(order.shippingCost || 0)
    if (shippingCost > 0) {
      mpItems.push({
        id: 'shipping',
        title: `Envío${order.shippingMethod ? ` (${order.shippingMethod})` : ''}`,
        quantity: 1,
        unit_price: shippingCost,
        currency_id: 'MXN',
      })
    }

    const preferenceData = {
      items: mpItems,
      payment_methods: {
        // Sin exclusiones a nivel de preferencia: MP no permite excluir
        // account_money en este tipo de cuenta. Si Irving quiere restringir
        // a tarjeta/OXXO/SPEI, debe configurarlo en el panel de MP.
        installments: 1,
      },
      back_urls: {
        success: `${process.env.FRONTEND_URL}/pedido/confirmacion`,
        failure: `${process.env.FRONTEND_URL}/checkout`,
        pending: `${process.env.FRONTEND_URL}/pedido/pendiente`,
      },
      auto_return: 'approved' as const,
      notification_url: `${process.env.BACKEND_URL}/api/payments/webhook`,
      external_reference: orderId,
    }

    const preference = await preferenceClient.create({ body: preferenceData })

    res.json({
      data: {
        preferenceId: preference.id,
        initPoint: preference.init_point,
      },
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Confirma un pago aprobado: cambia el estado de la orden a 'confirmed',
 * descuenta stock, emite factura si aplica y dispara el email de confirmación.
 *
 * Es idempotente: si la orden ya está 'confirmed' no vuelve a descontar stock.
 * Se comparte entre el webhook automático (tarjeta / saldo MP) y el marcado
 * manual desde admin (OXXO / SPEI verificados por Irving).
 */
async function confirmOrderPayment(params: {
  orderId: string
  paymentReference: string | null
  paymentMethod: string | null
}): Promise<void> {
  const { orderId, paymentReference, paymentMethod } = params

  const alreadyConfirmed = await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    })

    if (!order) {
      console.error(`confirmOrderPayment: orden no encontrada: ${orderId}`)
      return true
    }

    // Guard idempotente: si otro proceso ya la confirmó, no volver a descontar.
    if (order.paymentStatus === 'confirmed') return true

    await tx.order.update({
      where: { id: orderId },
      data: {
        paymentStatus: 'confirmed',
        orderStatus: 'confirmed',
        paymentReference: paymentReference ?? order.paymentReference,
        paymentMethod: paymentMethod ?? order.paymentMethod,
      },
    })

    for (const item of order.items) {
      const updated = await tx.product.updateMany({
        where: { id: item.productId, stock: { gte: item.quantity } },
        data: { stock: { decrement: item.quantity } },
      })
      if (updated.count === 0) {
        console.error('[STOCK] Stock insuficiente para producto', item.productId)
      }
    }

    return false
  })

  if (alreadyConfirmed) return

  // Procesos post-transacción (facturación y email) se hacen fuera para no
  // mantener abierta la conexión de Postgres mientras se llama a APIs externas.
  const updatedOrder = await prisma.order.findUnique({
    where: { id: orderId },
    include: { invoice: true },
  })

  if (updatedOrder?.requiresInvoice && updatedOrder.invoice?.status === 'draft') {
    await createInvoice(orderId).catch((err) =>
      console.error(`Error al emitir factura para orden ${orderId}:`, err)
    )
  }

  await sendOrderConfirmationEmail(orderId).catch((err) =>
    console.error(`Error al enviar email de confirmación para orden ${orderId}:`, err)
  )
}

/**
 * POST /api/admin/orders/:id/mark-paid
 * Solo aplica cuando la orden está en 'awaiting_verification' (pagos OXXO/SPEI
 * pendientes de verificar en la cuenta MP de Irving). Idempotente.
 */
export async function markOrderPaid(req: Request, res: Response, next: NextFunction) {
  try {
    const orderId = String(req.params.id)

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, paymentStatus: true, paymentReference: true, paymentMethod: true },
    })

    if (!order) {
      return res.status(404).json({ error: 'Pedido no encontrado' })
    }

    if (order.paymentStatus === 'confirmed') {
      return res.json({ data: { orderId, alreadyConfirmed: true } })
    }

    if (order.paymentStatus !== 'awaiting_verification') {
      return res.status(409).json({
        error: `No se puede marcar como pagado: la orden está en estado '${order.paymentStatus}'.`,
      })
    }

    await confirmOrderPayment({
      orderId,
      paymentReference: order.paymentReference,
      paymentMethod: order.paymentMethod,
    })

    res.json({ data: { orderId, confirmed: true } })
  } catch (error) {
    next(error)
  }
}

/**
 * POST /api/payments/webhook
 * Recibe notificaciones de Mercado Pago.
 * El body llega como Buffer (raw) — se parsea manualmente.
 * Siempre responde 200 para evitar reintentos de MP.
 */
export async function handleWebhook(req: Request, res: Response, next: NextFunction) {
  // Siempre responder 200 primero para evitar reintentos de Mercado Pago
  res.sendStatus(200)

  try {
    // Parsear body raw
    const rawBody = req.body instanceof Buffer ? req.body.toString('utf-8') : JSON.stringify(req.body)
    let notification: any

    try {
      notification = JSON.parse(rawBody)
    } catch {
      console.error('Webhook MP: body inválido')
      return
    }

    // Verificar firma si está configurado el webhook secret
    const xSignature = req.headers['x-signature'] as string || ''
    const xRequestId = req.headers['x-request-id'] as string || ''
    const webhookSecret = process.env.PAYMENT_WEBHOOK_SECRET

    if (webhookSecret && xSignature) {
      const paymentId = notification?.data?.id || ''

      // Parsear ts y v1 del header x-signature (formato: ts=TIMESTAMP,v1=HASH)
      const parts = xSignature.split(',')
      let ts = ''
      let v1 = ''
      for (const part of parts) {
        const [key, value] = part.split('=')
        if (key === 'ts') ts = value
        if (key === 'v1') v1 = value
      }

      const manifest = `id:${paymentId};request-id:${xRequestId};ts:${ts};`
      const hmac = crypto.createHmac('sha256', webhookSecret).update(manifest).digest('hex')

      if (hmac !== v1) {
        console.error('Webhook MP: firma inválida')
        return
      }
    }

    // Solo procesar eventos de tipo 'payment'
    if (notification?.type !== 'payment') return

    const paymentId = notification?.data?.id
    if (!paymentId) return

    // Consultar el pago directamente en la API de MP.
    // RNF-005: consultar el estado de un pago es una LECTURA IDEMPOTENTE → seguro
    // reintentar. (La creación de preferencias/pagos NO se reintenta nunca para
    // evitar cobros o preferencias duplicadas.)
    const client = getMpClient()
    const paymentClient = new Payment(client)
    const paymentData = await withRetry(
      () => paymentClient.get({ id: paymentId }),
      { label: 'MercadoPago consultar pago' }
    )

    const status = paymentData.status
    const orderId = paymentData.external_reference

    if (!orderId) {
      console.error(`Webhook MP: pago ${paymentId} sin external_reference`)
      return
    }

    if (status === 'approved') {
      const paymentType = paymentData.payment_type_id || null

      // MP aprobó el pago, pero para OXXO (ticket) y transferencia (bank_transfer, atm)
      // Irving quiere verificar manualmente en su cuenta antes de confirmar.
      // Ver [[project-flujo-pago-manual]] en memoria del proyecto.
      const requiresManualVerification =
        paymentType === 'ticket' ||
        paymentType === 'bank_transfer' ||
        paymentType === 'atm'

      if (requiresManualVerification) {
        await prisma.order.update({
          where: { id: orderId },
          data: {
            paymentStatus: 'awaiting_verification',
            paymentReference: String(paymentId),
            paymentMethod: paymentType,
          },
        })

        // Avisar al cliente que necesitamos verificar y pedirle comprobante.
        // No relanzar si el email falla — la orden ya quedó registrada.
        await sendPaymentVerificationEmail(orderId, paymentType).catch((err) =>
          console.error(`Error al enviar email de verificación para orden ${orderId}:`, err)
        )
      } else {
        await confirmOrderPayment({
          orderId,
          paymentReference: String(paymentId),
          paymentMethod: paymentType,
        })
      }
    } else if (status === 'rejected' || status === 'cancelled') {
      await prisma.order.update({
        where: { id: orderId },
        data: { paymentStatus: 'failed' },
      })
    }
  } catch (error) {
    // No relanzar — la respuesta 200 ya fue enviada
    console.error('Error procesando webhook de Mercado Pago:', error)
  }
}
