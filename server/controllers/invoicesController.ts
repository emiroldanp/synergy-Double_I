import { prisma } from '../lib/prisma'
import { uploadToR2 } from '../lib/r2'
import axios from 'axios'

// Lazy init de Facturapi para evitar error si la key no está en dev
function getFacturapi() {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const Facturapi = require('facturapi').default || require('facturapi')
  return new Facturapi(process.env.FACTURAPI_API_KEY!)
}

/**
 * Función interna — no es ruta pública.
 * Se llama desde el webhook de Mercado Pago cuando se confirma el pago
 * y la orden requiere factura (CFDI).
 *
 * Si Facturapi falla, deja la Invoice en estado 'draft' para reintento manual.
 */
export async function createInvoice(orderId: string): Promise<void> {
  // Buscar la orden con todos los datos necesarios
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: {
        include: {
          product: {
            select: { name: true },
          },
        },
      },
      invoice: true,
      customer: true,
    },
  })

  if (!order || !order.invoice) {
    console.error(`createInvoice: orden o invoice no encontrada para ${orderId}`)
    return
  }

  const inv = order.invoice
  const buyerEmail = order.guestEmail || order.customer?.email || ''

  // Determinar forma de pago según método registrado
  // '03' = transferencia electrónica, '31' = Intermediario pagos
  const paymentForm = order.paymentMethod?.includes('bank_transfer') ? '03' : '31'

  const invoicePayload = {
    customer: {
      legal_name: inv.razonSocial,
      tax_id: inv.rfc,
      email: buyerEmail,
      tax_system: '616',
    },
    items: order.items.map((item) => ({
      product: {
        description: item.product.name,
        product_key: '44122300', // Juguetes y juegos — código SAT para tarjetas coleccionables
        unit_key: 'H87',
        price: Number(item.unitPrice),
      },
      quantity: item.quantity,
    })),
    use: inv.cfdiUse,
    payment_form: paymentForm,
  }

  try {
    const facturapi = getFacturapi()

    // Emitir factura
    const factura = await facturapi.invoices.create(invoicePayload)

    // Descargar PDF y XML
    const [pdfBuffer, xmlBuffer] = await Promise.all([
      facturapi.invoices.downloadPdf(factura.id) as Promise<Buffer>,
      facturapi.invoices.downloadXml(factura.id) as Promise<Buffer>,
    ])

    // Subir a Cloudflare R2
    const [pdfUrl, xmlUrl] = await Promise.all([
      uploadToR2(`invoices/${orderId}/factura.pdf`, pdfBuffer, 'application/pdf'),
      uploadToR2(`invoices/${orderId}/factura.xml`, xmlBuffer, 'application/xml'),
    ])

    // Actualizar Invoice con datos de Facturapi
    await prisma.invoice.update({
      where: { orderId },
      data: {
        facturapiInvoiceId: factura.id,
        pdfUrl,
        xmlUrl,
        status: 'valid',
      },
    })

    // Enviar email con factura adjunta vía Brevo
    await sendInvoiceEmail(buyerEmail, orderId, pdfUrl, xmlUrl).catch((err) =>
      console.error(`Error enviando email de factura para orden ${orderId}:`, err)
    )
  } catch (error) {
    // Dejar en draft para reintento manual
    console.error(`Facturapi error para orden ${orderId}:`, error)
  }
}

/**
 * Envía email con los archivos de factura adjuntos vía Brevo.
 */
async function sendInvoiceEmail(
  toEmail: string,
  orderId: string,
  pdfUrl: string,
  xmlUrl: string
): Promise<void> {
  if (!toEmail) return

  await axios.post(
    'https://api.brevo.com/v3/smtp/email',
    {
      sender: {
        email: process.env.BREVO_SENDER_EMAIL,
        name: process.env.BREVO_SENDER_NAME,
      },
      to: [{ email: toEmail }],
      subject: `Tu factura — Pedido ${orderId}`,
      htmlContent: `
        <p>Hola,</p>
        <p>Tu factura está lista. Puedes descargarla aquí:</p>
        <ul>
          <li><a href="${pdfUrl}">Descargar PDF</a></li>
          <li><a href="${xmlUrl}">Descargar XML</a></li>
        </ul>
        <p>Gracias por tu compra.</p>
      `,
    },
    {
      headers: {
        'api-key': process.env.BREVO_API_KEY!,
        'Content-Type': 'application/json',
      },
    }
  )
}
