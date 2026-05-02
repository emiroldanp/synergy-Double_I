import { Request, Response, NextFunction } from 'express'
import MercadoPagoConfig, { Preference, Payment } from 'mercadopago'
import { prisma } from '../lib/prisma'
import { Prisma } from '@prisma/client'
import { createInvoice } from './invoicesController'
import { sendOrderConfirmationEmail } from './emailController'
import crypto from 'crypto'

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

    const preferenceData = {
      items: mpItems,
      payment_methods: {
        // Solo pagos en efectivo (OXXO) y transferencia (SPEI)
        excluded_payment_types: [{ id: 'account_money' }],
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
    const xSignature = req.headers['x-signature'] as string | undefined
    const webhookSecret = process.env.PAYMENT_WEBHOOK_SECRET

    if (webhookSecret && xSignature) {
      const [, signaturePart] = xSignature.split(',')
      const [, signatureValue] = (signaturePart || '').split('=')
      const xRequestId = req.headers['x-request-id'] as string | undefined
      const dataId = notification?.data?.id || ''

      const manifest = `id:${dataId};request-id:${xRequestId || ''};ts:${Date.now()};`
      const hmac = crypto.createHmac('sha256', webhookSecret).update(manifest).digest('hex')

      if (hmac !== signatureValue) {
        console.error('Webhook MP: firma inválida')
        return
      }
    }

    // Solo procesar eventos de tipo 'payment'
    if (notification?.type !== 'payment') return

    const paymentId = notification?.data?.id
    if (!paymentId) return

    // Consultar el pago directamente en la API de MP
    const client = getMpClient()
    const paymentClient = new Payment(client)
    const paymentData = await paymentClient.get({ id: paymentId })

    const status = paymentData.status
    const orderId = paymentData.external_reference

    if (!orderId) {
      console.error(`Webhook MP: pago ${paymentId} sin external_reference`)
      return
    }

    if (status === 'approved') {
      // Actualizar orden y descontar stock en una transacción
      await prisma.$transaction(async (tx) => {
        // Obtener la orden con sus items
        const order = await tx.order.findUnique({
          where: { id: orderId },
          include: { items: true, invoice: true },
        })

        if (!order) {
          console.error(`Webhook MP: orden no encontrada: ${orderId}`)
          return
        }

        // Actualizar estado de la orden
        await tx.order.update({
          where: { id: orderId },
          data: {
            paymentStatus: 'confirmed',
            orderStatus: 'confirmed',
            paymentReference: String(paymentId),
            paymentMethod: paymentData.payment_type_id || null,
          },
        })

        // Descontar stock de cada item
        for (const item of order.items) {
          const product = await tx.product.findUnique({ where: { id: item.productId } })
          if (product && product.stock - item.quantity < 0) {
            console.error(`Stock negativo en producto ${item.productId} — revisar manualmente`)
          }
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { decrement: item.quantity } },
          })
        }
      })

      // Obtener la orden actualizada para procesos post-transacción
      const updatedOrder = await prisma.order.findUnique({
        where: { id: orderId },
        include: { invoice: true },
      })

      // Emitir factura si aplica
      if (updatedOrder?.requiresInvoice && updatedOrder.invoice?.status === 'draft') {
        await createInvoice(orderId).catch((err) =>
          console.error(`Error al emitir factura para orden ${orderId}:`, err)
        )
      }

      // Enviar email de confirmación
      await sendOrderConfirmationEmail(orderId).catch((err) =>
        console.error(`Error al enviar email de confirmación para orden ${orderId}:`, err)
      )
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
