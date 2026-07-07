/**
 * Crea las 3 plantillas de email en Brevo via API REST.
 * Ejecutar: node server/scripts/create-brevo-templates.mjs
 * Requiere BREVO_API_KEY en el entorno (o en server/.env).
 *
 * Nota: Brevo soporta variables {{ params.VAR }} pero NO Handlebars helpers
 * (#if, #each). Para items del pedido se usa htmlContent dinámico desde el
 * controller (buildOrderConfirmationHtml) cuando templateId no está configurado.
 */

import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Cargar server/.env si no está en el entorno
const envPath = resolve(__dirname, '../.env')
try {
  const lines = readFileSync(envPath, 'utf8').split('\n')
  for (const line of lines) {
    const match = line.match(/^([^#=]+)=(.*)$/)
    if (match) process.env[match[1].trim()] ??= match[2].trim().replace(/^"|"$/g, '')
  }
} catch {}

const API_KEY = process.env.BREVO_API_KEY
if (!API_KEY) {
  console.error('ERROR: BREVO_API_KEY no está definida.')
  process.exit(1)
}

const BREVO = 'https://api.brevo.com/v3'
const HEADERS = { 'api-key': API_KEY, 'Content-Type': 'application/json', Accept: 'application/json' }

async function createTemplate(body) {
  const res = await fetch(`${BREVO}/smtp/templates`, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify(body),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(`Brevo error ${res.status}: ${JSON.stringify(data)}`)
  return data.id
}

// Usar el sender verificado disponible (cambiar a hola@doubleicards.com tras verificar dominio)
const senderEmail = process.env.BREVO_SENDER_EMAIL || 'irving.gallart@gmail.com'
const senderName  = process.env.BREVO_SENDER_NAME  || 'Double-I Cards'

// ── Plantilla 1: Bienvenida al newsletter ──────────────────────────────────
// params: FULLNAME
const welcomeHtml = `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0d0d0d;font-family:Arial,sans-serif;color:#e5e5e5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#151515;border-top:3px solid #e53e3e;">
    <tr><td style="padding:32px 40px 16px;text-align:center;">
      <img src="https://pub-c0ec2ca658064853a766252fdca0ebf1.r2.dev/logo-color.png" alt="Double-I Cards" width="120" style="display:block;margin:0 auto 24px;">
      <h1 style="color:#e53e3e;font-size:22px;margin:0 0 12px;">¡Bienvenido a Double-I Cards!</h1>
      <p style="color:#b0b0b0;font-size:15px;line-height:1.6;margin:0 0 24px;">
        Hola, <strong style="color:#e5e5e5;">{{ params.FULLNAME }}</strong>. Estás en la lista de los que se enteran primero.
      </p>
      <p style="color:#b0b0b0;font-size:14px;line-height:1.6;margin:0 0 32px;">
        Te avisaremos cuando lleguen nuevas cartas, sets exclusivos y promociones. Nada de spam — solo lo bueno del TCG.
      </p>
      <a href="https://doubleicards.com/catalogo" style="display:inline-block;background:#e53e3e;color:#fff;text-decoration:none;padding:14px 32px;border-radius:4px;font-size:15px;font-weight:bold;">Ver catálogo</a>
    </td></tr>
    <tr><td style="padding:24px 40px;border-top:1px solid #2a2a2a;text-align:center;">
      <p style="color:#555;font-size:12px;margin:0;">
        © 2026 Double-I Cards · <a href="https://doubleicards.com" style="color:#777;text-decoration:none;">doubleicards.com</a>
      </p>
    </td></tr>
  </table>
</body></html>`

// ── Plantilla 2: Confirmación de pedido ───────────────────────────────────
// params: ORDER_ID, CUSTOMER_NAME, ITEMS_HTML, TOTAL, SHIPPING_METHOD
// El controller construye ITEMS_HTML con los detalles del pedido
const orderConfirmHtml = `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0d0d0d;font-family:Arial,sans-serif;color:#e5e5e5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#151515;border-top:3px solid #e53e3e;">
    <tr><td style="padding:32px 40px 16px;text-align:center;">
      <img src="https://pub-c0ec2ca658064853a766252fdca0ebf1.r2.dev/logo-color.png" alt="Double-I Cards" width="120" style="display:block;margin:0 auto 24px;">
      <h1 style="color:#e53e3e;font-size:22px;margin:0 0 8px;">¡Pedido confirmado!</h1>
      <p style="color:#b0b0b0;font-size:14px;margin:0 0 4px;">Pedido <strong style="color:#e5e5e5;">#{{ params.ORDER_ID }}</strong></p>
      <p style="color:#b0b0b0;font-size:15px;margin:0 0 28px;">Hola <strong style="color:#e5e5e5;">{{ params.CUSTOMER_NAME }}</strong>, tu pago fue procesado exitosamente.</p>
    </td></tr>
    <tr><td style="padding:0 40px 24px;">
      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
        <thead>
          <tr style="background:#1e1e1e;">
            <th style="padding:10px 12px;text-align:left;font-size:12px;color:#888;font-weight:600;border-bottom:1px solid #2a2a2a;">PRODUCTO</th>
            <th style="padding:10px 12px;text-align:center;font-size:12px;color:#888;font-weight:600;border-bottom:1px solid #2a2a2a;">CANT.</th>
            <th style="padding:10px 12px;text-align:right;font-size:12px;color:#888;font-weight:600;border-bottom:1px solid #2a2a2a;">PRECIO</th>
          </tr>
        </thead>
        <tbody>
          {{ params.ITEMS_HTML }}
        </tbody>
        <tfoot>
          <tr>
            <td colspan="2" style="padding:12px;text-align:right;font-size:14px;color:#888;">Envío:</td>
            <td style="padding:12px;text-align:right;font-size:14px;color:#b0b0b0;">{{ params.SHIPPING_METHOD }}</td>
          </tr>
          <tr style="background:#1e1e1e;">
            <td colspan="2" style="padding:12px;text-align:right;font-size:16px;font-weight:bold;color:#e5e5e5;">Total:</td>
            <td style="padding:12px;text-align:right;font-size:16px;font-weight:bold;color:#e53e3e;">{{ params.TOTAL }} MXN</td>
          </tr>
        </tfoot>
      </table>
    </td></tr>
    <tr><td style="padding:8px 40px 32px;text-align:center;">
      <p style="color:#b0b0b0;font-size:14px;margin:0 0 20px;">Te enviaremos el número de guía en cuanto tu pedido sea despachado.</p>
      <a href="https://doubleicards.com/mi-cuenta" style="display:inline-block;background:#e53e3e;color:#fff;text-decoration:none;padding:12px 28px;border-radius:4px;font-size:14px;font-weight:bold;">Ver mis pedidos</a>
    </td></tr>
    <tr><td style="padding:24px 40px;border-top:1px solid #2a2a2a;text-align:center;">
      <p style="color:#555;font-size:12px;margin:0;">© 2026 Double-I Cards · <a href="https://doubleicards.com" style="color:#777;text-decoration:none;">doubleicards.com</a></p>
    </td></tr>
  </table>
</body></html>`

// ── Plantilla 3: Verificación de pago (OXXO / SPEI) ───────────────────────
// params: ORDER_ID, CUSTOMER_NAME, PAYMENT_METHOD, WHATSAPP_NUMBER
// Se dispara desde el webhook de MP cuando el pago llega por OXXO o
// transferencia y la orden queda en 'awaiting_verification'.
const paymentVerifHtml = `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0d0d0d;font-family:Arial,sans-serif;color:#e5e5e5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#151515;border-top:3px solid #06b6d4;">
    <tr><td style="padding:32px 40px 16px;text-align:center;">
      <img src="https://pub-c0ec2ca658064853a766252fdca0ebf1.r2.dev/logo-color.png" alt="Double-I Cards" width="120" style="display:block;margin:0 auto 24px;">
      <p style="color:#06b6d4;font-size:12px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;margin:0 0 8px;">Pago recibido — Verificando</p>
      <h1 style="color:#e5e5e5;font-size:22px;margin:0 0 8px;">¡Ya casi lo tenemos!</h1>
      <p style="color:#b0b0b0;font-size:14px;margin:0 0 4px;">Pedido <strong style="color:#e5e5e5;">#{{ params.ORDER_ID }}</strong></p>
    </td></tr>
    <tr><td style="padding:8px 40px 24px;">
      <p style="color:#b0b0b0;font-size:15px;line-height:1.6;margin:0 0 16px;">
        Hola <strong style="color:#e5e5e5;">{{ params.CUSTOMER_NAME }}</strong>, recibimos la notificación de tu pago por <strong style="color:#e5e5e5;">{{ params.PAYMENT_METHOD }}</strong>. Estamos verificando en nuestra cuenta antes de preparar tu envío.
      </p>
      <div style="background:#1e1e1e;border-left:3px solid #06b6d4;padding:16px 20px;margin:20px 0;">
        <p style="color:#e5e5e5;font-size:14px;font-weight:bold;margin:0 0 8px;">Para agilizar la verificación:</p>
        <p style="color:#b0b0b0;font-size:14px;line-height:1.6;margin:0;">
          Envíanos tu <strong style="color:#e5e5e5;">comprobante de pago</strong> por WhatsApp al <strong style="color:#06b6d4;">{{ params.WHATSAPP_NUMBER }}</strong>.
        </p>
      </div>
      <p style="color:#b0b0b0;font-size:14px;line-height:1.6;margin:0 0 20px;">
        En cuanto validemos tu pago te llegará un correo con la confirmación y comenzaremos a preparar tu pedido.
      </p>
    </td></tr>
    <tr><td style="padding:8px 40px 32px;text-align:center;">
      <a href="https://wa.me/{{ params.WHATSAPP_NUMBER }}" style="display:inline-block;background:#06b6d4;color:#fff;text-decoration:none;padding:14px 32px;border-radius:4px;font-size:15px;font-weight:bold;">Enviar comprobante por WhatsApp</a>
    </td></tr>
    <tr><td style="padding:24px 40px;border-top:1px solid #2a2a2a;text-align:center;">
      <p style="color:#555;font-size:12px;margin:0;">© 2026 Double-I Cards · <a href="https://doubleicards.com" style="color:#777;text-decoration:none;">doubleicards.com</a></p>
    </td></tr>
  </table>
</body></html>`

// ── Plantilla 4: Llegada de nuevo producto ────────────────────────────────
// params: PRODUCT_NAME, PRODUCT_DESCRIPTION, PRODUCT_PRICE, PRODUCT_SLUG, PRODUCT_IMAGE
const arrivalHtml = `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0d0d0d;font-family:Arial,sans-serif;color:#e5e5e5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#151515;border-top:3px solid #e53e3e;">
    <tr><td style="padding:32px 40px 16px;text-align:center;">
      <img src="https://pub-c0ec2ca658064853a766252fdca0ebf1.r2.dev/logo-color.png" alt="Double-I Cards" width="120" style="display:block;margin:0 auto 24px;">
      <p style="color:#e53e3e;font-size:12px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;margin:0 0 8px;">Nuevo en stock</p>
      <h1 style="color:#e5e5e5;font-size:22px;margin:0 0 12px;">{{ params.PRODUCT_NAME }}</h1>
      <img src="{{ params.PRODUCT_IMAGE }}" alt="{{ params.PRODUCT_NAME }}" style="max-width:240px;display:block;margin:16px auto;border-radius:8px;">
      <p style="color:#b0b0b0;font-size:15px;line-height:1.6;margin:0 0 8px;">{{ params.PRODUCT_DESCRIPTION }}</p>
      <p style="color:#e53e3e;font-size:22px;font-weight:bold;margin:16px 0 24px;">{{ params.PRODUCT_PRICE }} MXN</p>
      <a href="https://doubleicards.com/producto/{{ params.PRODUCT_SLUG }}" style="display:inline-block;background:#e53e3e;color:#fff;text-decoration:none;padding:14px 32px;border-radius:4px;font-size:15px;font-weight:bold;">Ver producto</a>
    </td></tr>
    <tr><td style="padding:24px 40px;border-top:1px solid #2a2a2a;text-align:center;">
      <p style="color:#555;font-size:12px;margin:0;">© 2026 Double-I Cards · <a href="https://doubleicards.com" style="color:#777;text-decoration:none;">doubleicards.com</a></p>
    </td></tr>
  </table>
</body></html>`

async function main() {
  console.log('Creando plantillas en Brevo...\n')

  try {
    const welcomeId = await createTemplate({
      templateName: 'Bienvenida Newsletter — Double-I',
      subject: '¡Bienvenido a Double-I Cards!',
      htmlContent: welcomeHtml,
      sender: { email: senderEmail, name: senderName },
      isActive: true,
    })
    console.log(`Plantilla bienvenida creada. ID: ${welcomeId}`)
    console.log(`   -> BREVO_WELCOME_TEMPLATE_ID=${welcomeId}`)

    const orderConfirmId = await createTemplate({
      templateName: 'Confirmacion de Pedido — Double-I',
      subject: 'Tu pedido fue confirmado — Double-I Cards',
      htmlContent: orderConfirmHtml,
      sender: { email: senderEmail, name: senderName },
      isActive: true,
    })
    console.log(`Plantilla confirmacion pedido creada. ID: ${orderConfirmId}`)
    console.log(`   -> BREVO_ORDER_CONFIRM_TEMPLATE_ID=${orderConfirmId}`)

    const paymentVerifId = await createTemplate({
      templateName: 'Verificacion de Pago — Double-I',
      subject: 'Estamos verificando tu pago — Pedido #{{ params.ORDER_ID }}',
      htmlContent: paymentVerifHtml,
      sender: { email: senderEmail, name: senderName },
      isActive: true,
    })
    console.log(`Plantilla verificacion de pago creada. ID: ${paymentVerifId}`)
    console.log(`   -> BREVO_PAYMENT_VERIFICATION_TEMPLATE_ID=${paymentVerifId}`)

    const arrivalId = await createTemplate({
      templateName: 'Llegada de Producto — Double-I',
      subject: 'Nuevo en stock: {{ params.PRODUCT_NAME }}',
      htmlContent: arrivalHtml,
      sender: { email: senderEmail, name: senderName },
      isActive: true,
    })
    console.log(`Plantilla llegada de producto creada. ID: ${arrivalId}`)
    console.log(`   -> BREVO_ARRIVAL_TEMPLATE_ID=${arrivalId}`)

    console.log('\n-----------------------------------------')
    console.log('Agrega estas lineas a server/.env:')
    console.log(`BREVO_WELCOME_TEMPLATE_ID=${welcomeId}`)
    console.log(`BREVO_ORDER_CONFIRM_TEMPLATE_ID=${orderConfirmId}`)
    console.log(`BREVO_PAYMENT_VERIFICATION_TEMPLATE_ID=${paymentVerifId}`)
    console.log(`BREVO_ARRIVAL_TEMPLATE_ID=${arrivalId}`)
    console.log('-----------------------------------------')
  } catch (err) {
    console.error('Error al crear plantillas:', err.message)
    process.exit(1)
  }
}

main()
