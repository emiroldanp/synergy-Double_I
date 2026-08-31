import { Request, Response, NextFunction } from 'express'
import axios from 'axios'
import { prisma } from '../lib/prisma'
import { withRetry } from '../lib/retry'

// Base URL de la API REST de Brevo
const BREVO_API = 'https://api.brevo.com/v3'

function brevoHeaders() {
  return {
    'api-key': process.env.BREVO_API_KEY!,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  }
}

/**
 * POST /api/email/subscribe
 * Suscribe un email a la lista principal de Brevo y guarda en EmailSubscriber.
 * Si ya existe, devuelve 200 sin error.
 */
export async function subscribeEmail(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, fullName, source } = req.body

    if (!email || !source) {
      return res.status(400).json({ error: 'email y source son requeridos' })
    }

    // Validar formato de email antes de llamar a Brevo
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Formato de email inválido' })
    }

    const validSources = ['homepage_form', 'checkout', 'manual']
    if (!validSources.includes(source)) {
      return res.status(400).json({ error: `source inválido. Valores permitidos: ${validSources.join(', ')}` })
    }

    const listId = parseInt(process.env.BREVO_MAIN_LIST_ID || '0', 10)

    // Crear o actualizar contacto en Brevo
    let isNewContact = false
    try {
      // Alta de contacto con updateEnabled:true es idempotente → seguro reintentar.
      await withRetry(
        () =>
          axios.post(
            `${BREVO_API}/contacts`,
            {
              email,
              firstName: fullName ? fullName.split(' ')[0] : undefined,
              lastName: fullName ? fullName.split(' ').slice(1).join(' ') : undefined,
              listIds: listId ? [listId] : [],
              updateEnabled: true,
            },
            { headers: brevoHeaders() }
          ),
        { label: 'Brevo alta contacto' }
      )
      isNewContact = true
    } catch (err: any) {
      // 400 con duplicate_parameter significa que ya existe — OK
      if (err?.response?.data?.code !== 'duplicate_parameter') {
        throw err
      }
    }

    // Guardar o actualizar en base de datos local (skipDuplicates via upsert)
    await prisma.emailSubscriber.upsert({
      where: { email },
      update: { fullName: fullName || undefined },
      create: {
        email,
        fullName: fullName || null,
        source: source as any,
      },
    })

    // Si es nuevo suscriptor, disparar email de bienvenida
    if (isNewContact) {
      const displayName = fullName || email
      await withRetry(
        () =>
          axios.post(
            `${BREVO_API}/smtp/email`,
            {
              to: [{ email, name: displayName }],
              sender: { email: process.env.BREVO_SENDER_EMAIL, name: process.env.BREVO_SENDER_NAME },
              subject: '¡Bienvenido a Double-I Cards! 🃏',
              textContent: `Hola ${displayName},\n\nGracias por suscribirte a Double-I Cards. Serás el primero en enterarte de nuevas cartas, promociones exclusivas y artículos de colección.\n\n— El equipo de Double-I Cards\nhttps://doubleicards.com`,
              htmlContent: buildWelcomeHtml(displayName),
            },
            { headers: brevoHeaders() }
          ),
        { label: 'Brevo email bienvenida' }
      ).catch((err) =>
        console.error(`Error enviando bienvenida a ${email}:`, err?.response?.data || err.message)
      )
    }

    res.json({ success: true })
  } catch (error) {
    next(error)
  }
}

/**
 * Función interna — se llama desde el webhook de Mercado Pago tras confirmar el pago.
 * Envía email de confirmación de pedido con detalles de los items.
 */
export async function sendOrderConfirmationEmail(orderId: string): Promise<void> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: {
        include: {
          product: {
            select: { name: true, price: true },
          },
        },
      },
      customer: true,
    },
  })

  if (!order) {
    console.error(`sendOrderConfirmationEmail: orden no encontrada ${orderId}`)
    return
  }

  const recipientEmail = order.guestEmail || order.customer?.email
  const recipientName = order.guestName || 'Cliente'

  if (!recipientEmail) {
    console.error(`sendOrderConfirmationEmail: sin email para orden ${orderId}`)
    return
  }

  const orderLabel = `#${orderId.slice(0, 8).toUpperCase()}`

  await withRetry(
    () =>
      axios.post(
    `${BREVO_API}/smtp/email`,
    {
      to: [{ email: recipientEmail, name: recipientName }],
      sender: {
        email: process.env.BREVO_SENDER_EMAIL,
        name: process.env.BREVO_SENDER_NAME,
      },
      subject: `Tu pedido fue confirmado ${orderLabel} — Double-I Cards`,
      textContent: [
        `¡Pedido confirmado!`,
        ``,
        `Hola ${recipientName}, tu pago fue procesado exitosamente.`,
        `Pedido: ${orderLabel}`,
        ``,
        `Productos:`,
        ...order.items.map((i) => `- ${i.product.name} x${i.quantity}  $${Number(i.unitPrice).toFixed(2)} c/u`),
        ``,
        `Total: $${Number(order.total).toFixed(2)} MXN`,
        `Envío: ${order.shippingMethod || 'Por confirmar'}`,
        ``,
        `Gracias por tu compra en Double-I Cards.`,
      ].join('\n'),
      htmlContent: buildOrderConfirmationHtml(order, recipientName, orderLabel),
    },
    { headers: brevoHeaders() }
      ),
    { label: 'Brevo confirmación pedido' }
  )

  // Marcar como comprador en la tabla local si existe el suscriptor
  await prisma.emailSubscriber
    .update({
      where: { email: recipientEmail },
      data: { isBuyer: true },
    })
    .catch(() => {
      // Si no está en la lista de suscriptores, no es error
    })
}

/**
 * Función interna — se llama desde el webhook de Mercado Pago tras confirmar el pago.
 * Notifica a la tienda (Irving) que se completó una venta, para que la atienda.
 * Requiere ADMIN_NOTIFICATION_EMAIL en las env vars de Hostinger; si no está
 * configurada, se omite silenciosamente (no debe romper la confirmación del pedido).
 */
export async function sendAdminSaleNotificationEmail(orderId: string): Promise<void> {
  const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL
  if (!adminEmail) {
    console.error('sendAdminSaleNotificationEmail: falta ADMIN_NOTIFICATION_EMAIL en las env vars')
    return
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: { include: { product: { select: { name: true } } } },
      customer: true,
    },
  })

  if (!order) {
    console.error(`sendAdminSaleNotificationEmail: orden no encontrada ${orderId}`)
    return
  }

  const buyerName = order.guestName || order.customer?.fullName || 'Cliente'
  const buyerEmail = order.guestEmail || order.customer?.email || 'sin email'
  const orderLabel = `#${orderId.slice(0, 8).toUpperCase()}`
  const itemsText = order.items.map((i) => `- ${i.product.name} x${i.quantity}`).join('\n')

  await withRetry(
    () =>
      axios.post(
        `${BREVO_API}/smtp/email`,
        {
          to: [{ email: adminEmail, name: 'Double-I Cards' }],
          sender: {
            email: process.env.BREVO_SENDER_EMAIL,
            name: process.env.BREVO_SENDER_NAME,
          },
          subject: `🛒 Nueva venta ${orderLabel} — $${Number(order.total).toFixed(2)} MXN`,
          textContent: [
            `¡Se completó una venta!`,
            ``,
            `Pedido: ${orderLabel}`,
            `Cliente: ${buyerName} (${buyerEmail})`,
            ``,
            `Productos:`,
            itemsText,
            ``,
            `Total: $${Number(order.total).toFixed(2)} MXN`,
            `Método de pago: ${order.paymentMethod || 'N/D'}`,
            ``,
            `Revísalo en el panel admin de doubleicards.com.`,
          ].join('\n'),
        },
        { headers: brevoHeaders() }
      ),
    { label: 'Brevo notificación de venta a admin' }
  )
}

/**
 * Función interna — se llama desde el webhook de Mercado Pago cuando un pago
 * llegó en OXXO o transferencia SPEI y la orden queda en 'awaiting_verification'.
 *
 * El correo informa al cliente que recibimos su pago pero necesitamos verificar
 * manualmente en la cuenta MP y le pide enviar el comprobante por WhatsApp.
 * Ver [[project-flujo-pago-manual]] en la memoria del proyecto.
 */
export async function sendPaymentVerificationEmail(
  orderId: string,
  paymentMethod: string | null
): Promise<void> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { customer: true },
  })

  if (!order) {
    console.error(`sendPaymentVerificationEmail: orden no encontrada ${orderId}`)
    return
  }

  const recipientEmail = order.guestEmail || order.customer?.email
  const recipientName = order.guestName || 'Cliente'

  if (!recipientEmail) {
    console.error(`sendPaymentVerificationEmail: sin email para orden ${orderId}`)
    return
  }

  const templateId = parseInt(process.env.BREVO_PAYMENT_VERIFICATION_TEMPLATE_ID || '0', 10)
  const whatsapp = process.env.WHATSAPP_NUMBER || ''
  const methodLabel =
    paymentMethod === 'ticket' ? 'OXXO'
    : paymentMethod === 'bank_transfer' ? 'transferencia SPEI'
    : paymentMethod === 'atm' ? 'cajero automático'
    : 'transferencia'

  await withRetry(
    () =>
      axios.post(
        `${BREVO_API}/smtp/email`,
        {
          to: [{ email: recipientEmail, name: recipientName }],
          sender: {
            email: process.env.BREVO_SENDER_EMAIL,
            name: process.env.BREVO_SENDER_NAME,
          },
          templateId: templateId || undefined,
          subject: templateId ? undefined : `Estamos verificando tu pago — Pedido #${orderId}`,
          htmlContent: templateId
            ? undefined
            : `
              <p>Hola ${recipientName},</p>
              <p>Recibimos la notificación de tu pago por <strong>${methodLabel}</strong> para el pedido <strong>#${orderId}</strong>. Estamos verificando en nuestra cuenta antes de preparar tu envío.</p>
              <p>Para agilizar la verificación, envíanos tu <strong>comprobante de pago</strong> por WhatsApp${whatsapp ? ` al <strong>${whatsapp}</strong>` : ''}.</p>
              <p>En cuanto validemos el pago te llegará un correo con la confirmación y comenzaremos a preparar tu pedido.</p>
              <p>Gracias por tu compra 🎴</p>
            `,
          params: {
            ORDER_ID: orderId,
            CUSTOMER_NAME: recipientName,
            PAYMENT_METHOD: methodLabel,
            WHATSAPP_NUMBER: whatsapp,
          },
        },
        { headers: brevoHeaders() }
      ),
    { label: 'Brevo verificación de pago' }
  )
}

/**
 * POST /api/email/transactional
 * Dispara un correo transaccional con cualquier template de Brevo.
 * Body: { to: string, name?: string, templateId: number, params?: Record<string, string> }
 */
export async function sendTransactionalEmail(req: Request, res: Response, next: NextFunction) {
  try {
    const { to, name, templateId, params } = req.body

    if (!to || !templateId) {
      return res.status(400).json({ error: 'to y templateId son requeridos' })
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(to)) {
      return res.status(400).json({ error: 'Formato de email inválido' })
    }

    const tid = parseInt(String(templateId), 10)
    if (isNaN(tid) || tid <= 0) {
      return res.status(400).json({ error: 'templateId debe ser un número entero positivo' })
    }

    await withRetry(
      () =>
        axios.post(
          `${BREVO_API}/smtp/email`,
          {
            to: [{ email: to, name: name || to }],
            sender: {
              email: process.env.BREVO_SENDER_EMAIL,
              name: process.env.BREVO_SENDER_NAME,
            },
            templateId: tid,
            params: params || {},
          },
          { headers: brevoHeaders() }
        ),
      { label: 'Brevo email transaccional' }
    )

    res.json({ success: true })
  } catch (error: any) {
    if (error?.response?.status === 400) {
      return res.status(400).json({ error: error.response.data?.message || 'Error de Brevo' })
    }
    next(error)
  }
}

/**
 * POST /api/email/add-to-list
 * Agrega un contacto existente (o lo crea) a una lista específica de Brevo.
 * Body: { email: string, listId: number, fullName?: string }
 */
export async function addContactToList(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, listId, fullName } = req.body

    if (!email || !listId) {
      return res.status(400).json({ error: 'email y listId son requeridos' })
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Formato de email inválido' })
    }

    const lid = parseInt(String(listId), 10)
    if (isNaN(lid) || lid <= 0) {
      return res.status(400).json({ error: 'listId debe ser un número entero positivo' })
    }

    // Crear o actualizar contacto con la lista (idempotente → seguro reintentar)
    await withRetry(
      () =>
        axios.post(
          `${BREVO_API}/contacts`,
          {
            email,
            firstName: fullName ? fullName.split(' ')[0] : undefined,
            lastName: fullName ? fullName.split(' ').slice(1).join(' ') : undefined,
            listIds: [lid],
            updateEnabled: true,
          },
          { headers: brevoHeaders() }
        ),
      { label: 'Brevo alta contacto a lista' }
    )

    res.json({ success: true })
  } catch (error: any) {
    if (error?.response?.data?.code === 'duplicate_parameter') {
      // Contacto ya existe — intentar solo agregar a la lista
      try {
        const { email, listId } = req.body
        await withRetry(
          () =>
            axios.post(
              `${BREVO_API}/contacts/lists/${listId}/contacts/add`,
              { emails: [email] },
              { headers: brevoHeaders() }
            ),
          { label: 'Brevo agregar a lista' }
        )
        return res.json({ success: true })
      } catch {
        // Si ya estaba en la lista, es OK
        return res.json({ success: true })
      }
    }
    next(error)
  }
}

function buildWelcomeHtml(displayName: string): string {
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background-color:#0a0a0a;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0a0a;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background-color:#141414;border-radius:8px;overflow:hidden;">

        <!-- Header -->
        <tr><td style="background-color:#111111;padding:24px 32px;text-align:center;border-bottom:1px solid #222;">
          <p style="margin:0;font-size:22px;font-weight:700;color:#ffffff;letter-spacing:1px;">Double-I Cards</p>
          <p style="margin:4px 0 0;font-size:12px;color:#888;letter-spacing:2px;text-transform:uppercase;">Pokémon · Lorcana</p>
        </td></tr>

        <!-- Cuerpo -->
        <tr><td style="padding:40px 32px;text-align:center;">
          <p style="margin:0 0 8px;font-size:28px;font-weight:700;color:#e63946;">¡Bienvenido! 🃏</p>
          <p style="margin:16px 0 0;font-size:15px;color:#b0b0b0;">Hola <strong style="color:#ffffff;">${displayName}</strong>,</p>
          <p style="margin:12px 0 0;font-size:14px;color:#888;line-height:1.6;">Gracias por suscribirte a Double-I Cards. Serás el primero en enterarte de nuevas cartas, promociones exclusivas y artículos de colección.</p>
          <a href="https://doubleicards.com/catalogo" style="display:inline-block;margin-top:28px;padding:14px 32px;background-color:#e63946;color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;border-radius:4px;letter-spacing:1px;">Explorar catálogo</a>
        </td></tr>

        <!-- Footer -->
        <tr><td style="background-color:#0f0f0f;padding:16px 32px;text-align:center;border-top:1px solid #222;">
          <p style="margin:0;font-size:12px;color:#555;">© 2025 Double-I Cards · Made by <a href="https://synergy-mx.tech" style="color:#666;text-decoration:none;">Synergy</a></p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}

function buildOrderConfirmationHtml(order: any, recipientName: string, orderLabel: string): string {
  const itemsHtml = order.items
    .map(
      (item: any) =>
        `<tr>` +
        `<td style="padding:10px 12px;font-size:14px;color:#e0e0e0;border-bottom:1px solid #2a2a2a;">${item.product.name}</td>` +
        `<td style="padding:10px 12px;font-size:14px;color:#a0a0a0;text-align:center;border-bottom:1px solid #2a2a2a;">${item.quantity}</td>` +
        `<td style="padding:10px 12px;font-size:14px;color:#e0e0e0;text-align:right;border-bottom:1px solid #2a2a2a;">$${Number(item.unitPrice).toFixed(2)}</td>` +
        `</tr>`
    )
    .join('')

  const shippingCost = Number(order.shippingCost || 0)
  const total = Number(order.total)

  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background-color:#0a0a0a;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0a0a;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#141414;border-radius:8px;overflow:hidden;">

        <!-- Header -->
        <tr><td style="background-color:#111111;padding:24px 32px;text-align:center;border-bottom:1px solid #222;">
          <p style="margin:0;font-size:22px;font-weight:700;color:#ffffff;letter-spacing:1px;">Double-I Cards</p>
          <p style="margin:4px 0 0;font-size:12px;color:#888;letter-spacing:2px;text-transform:uppercase;">Pokémon · Lorcana</p>
        </td></tr>

        <!-- Título -->
        <tr><td style="padding:32px 32px 8px;text-align:center;">
          <p style="margin:0;font-size:28px;font-weight:700;color:#e63946;">¡Pedido confirmado!</p>
          <p style="margin:8px 0 0;font-size:14px;color:#888;">Pedido <strong style="color:#ffffff;">${orderLabel}</strong></p>
        </td></tr>

        <!-- Saludo -->
        <tr><td style="padding:16px 32px 24px;text-align:center;">
          <p style="margin:0;font-size:15px;color:#b0b0b0;">Hola <strong style="color:#ffffff;">${recipientName}</strong>, tu pago fue procesado exitosamente.</p>
        </td></tr>

        <!-- Tabla de productos -->
        <tr><td style="padding:0 32px 24px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border:1px solid #2a2a2a;border-radius:6px;overflow:hidden;">
            <thead>
              <tr style="background-color:#1a1a1a;">
                <th style="padding:10px 12px;font-size:12px;color:#888;text-align:left;font-weight:600;text-transform:uppercase;letter-spacing:1px;">Producto</th>
                <th style="padding:10px 12px;font-size:12px;color:#888;text-align:center;font-weight:600;text-transform:uppercase;letter-spacing:1px;">Cant.</th>
                <th style="padding:10px 12px;font-size:12px;color:#888;text-align:right;font-weight:600;text-transform:uppercase;letter-spacing:1px;">Precio</th>
              </tr>
            </thead>
            <tbody>${itemsHtml}</tbody>
            <tfoot>
              ${shippingCost > 0 ? `<tr><td colspan="2" style="padding:10px 12px;font-size:14px;color:#888;border-top:1px solid #2a2a2a;">Envío (${order.shippingMethod || 'estándar'})</td><td style="padding:10px 12px;font-size:14px;color:#e0e0e0;text-align:right;border-top:1px solid #2a2a2a;">$${shippingCost.toFixed(2)}</td></tr>` : ''}
              <tr style="background-color:#1a1a1a;"><td colspan="2" style="padding:12px;font-size:15px;font-weight:700;color:#ffffff;border-top:1px solid #2a2a2a;">Total</td><td style="padding:12px;font-size:15px;font-weight:700;color:#e63946;text-align:right;border-top:1px solid #2a2a2a;">$${total.toFixed(2)} MXN</td></tr>
            </tfoot>
          </table>
        </td></tr>

        <!-- Mensaje siguiente paso -->
        <tr><td style="padding:0 32px 32px;text-align:center;">
          <p style="margin:0;font-size:14px;color:#888;">Te avisaremos cuando tu pedido esté en camino.<br>Cualquier duda escríbenos por WhatsApp.</p>
        </td></tr>

        <!-- Footer -->
        <tr><td style="background-color:#0f0f0f;padding:16px 32px;text-align:center;border-top:1px solid #222;">
          <p style="margin:0;font-size:12px;color:#555;">© 2025 Double-I Cards · Made by <a href="https://synergy-mx.tech" style="color:#666;text-decoration:none;">Synergy</a></p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}
