import { Request, Response, NextFunction } from 'express'
import axios from 'axios'
import { prisma } from '../lib/prisma'

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
      await axios.post(
        `${BREVO_API}/contacts`,
        {
          email,
          firstName: fullName ? fullName.split(' ')[0] : undefined,
          lastName: fullName ? fullName.split(' ').slice(1).join(' ') : undefined,
          listIds: listId ? [listId] : [],
          updateEnabled: true,
        },
        { headers: brevoHeaders() }
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
    const templateId = parseInt(process.env.BREVO_WELCOME_TEMPLATE_ID || '0', 10)
    if (isNewContact && templateId) {
      await axios
        .post(
          `${BREVO_API}/smtp/email`,
          {
            to: [{ email }],
            templateId,
            params: { FULLNAME: fullName || email },
          },
          { headers: brevoHeaders() }
        )
        .catch((err) =>
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

  const templateId = parseInt(process.env.BREVO_ORDER_CONFIRM_TEMPLATE_ID || '0', 10)

  await axios.post(
    `${BREVO_API}/smtp/email`,
    {
      to: [{ email: recipientEmail, name: recipientName }],
      sender: {
        email: process.env.BREVO_SENDER_EMAIL,
        name: process.env.BREVO_SENDER_NAME,
      },
      templateId: templateId || undefined,
      subject: templateId ? undefined : `Confirmación de pedido #${orderId}`,
      htmlContent: templateId
        ? undefined
        : buildOrderConfirmationHtml(order),
      params: {
        ORDER_ID: orderId,
        CUSTOMER_NAME: recipientName,
        ITEMS_HTML: order.items
          .map(
            (item) =>
              `<tr><td style="padding:10px 12px;font-size:14px;border-bottom:1px solid #1e1e1e;">${item.product.name}</td>` +
              `<td style="padding:10px 12px;text-align:center;font-size:14px;color:#b0b0b0;border-bottom:1px solid #1e1e1e;">${item.quantity}</td>` +
              `<td style="padding:10px 12px;text-align:right;font-size:14px;border-bottom:1px solid #1e1e1e;">$${Number(item.unitPrice).toFixed(2)}</td></tr>`
          )
          .join(''),
        TOTAL: Number(order.total).toFixed(2),
        SHIPPING_METHOD: order.shippingMethod || 'Por confirmar',
      },
    },
    { headers: brevoHeaders() }
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

    await axios.post(
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

    // Crear o actualizar contacto con la lista
    await axios.post(
      `${BREVO_API}/contacts`,
      {
        email,
        firstName: fullName ? fullName.split(' ')[0] : undefined,
        lastName: fullName ? fullName.split(' ').slice(1).join(' ') : undefined,
        listIds: [lid],
        updateEnabled: true,
      },
      { headers: brevoHeaders() }
    )

    res.json({ success: true })
  } catch (error: any) {
    if (error?.response?.data?.code === 'duplicate_parameter') {
      // Contacto ya existe — intentar solo agregar a la lista
      try {
        const { email, listId } = req.body
        await axios.post(
          `${BREVO_API}/contacts/lists/${listId}/contacts/add`,
          { emails: [email] },
          { headers: brevoHeaders() }
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

/** Genera HTML simple de confirmación si no hay template configurado */
function buildOrderConfirmationHtml(order: any): string {
  const itemsHtml = order.items
    .map(
      (item: any) =>
        `<tr><td>${item.product.name}</td><td>${item.quantity}</td><td>$${Number(item.unitPrice).toFixed(2)}</td></tr>`
    )
    .join('')

  return `
    <h2>¡Tu pedido fue confirmado!</h2>
    <p>Número de pedido: <strong>${order.id}</strong></p>
    <table border="1" cellpadding="8">
      <thead><tr><th>Producto</th><th>Cantidad</th><th>Precio</th></tr></thead>
      <tbody>${itemsHtml}</tbody>
    </table>
    <p>Total: <strong>$${Number(order.total).toFixed(2)} MXN</strong></p>
    <p>Método de envío: ${order.shippingMethod || 'Por confirmar'}</p>
  `
}
