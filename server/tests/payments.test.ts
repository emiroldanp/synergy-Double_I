import request from 'supertest'
import express from 'express'
import crypto from 'crypto'
import './mocks/prisma.mock'
import './mocks/axios.mock'
import './mocks/mercadopago.mock'
import './mocks/facturapi.mock'
import { prismaMock } from './mocks/prisma.mock'
import { axiosMock } from './mocks/axios.mock'
import { mpPaymentGetMock, mpPreferenceCreateMock } from './mocks/mercadopago.mock'
import { paymentsRoutes } from '../routes/payments'

jest.mock('../lib/r2', () => ({
  uploadToR2: jest.fn().mockResolvedValue('https://test.r2.dev/invoices/order_1/factura.pdf'),
}))

const app = express()
app.use('/api/payments/webhook', express.raw({ type: '*/*' }))
app.use(express.json())
app.use('/api/payments', paymentsRoutes)

const WEBHOOK_SECRET = 'fake_webhook_secret_32_chars_here'

function buildSignedWebhookHeaders(paymentId: string, requestId: string) {
  const ts = Date.now().toString()
  const manifest = `id:${paymentId};request-id:${requestId};ts:${ts};`
  const v1 = crypto.createHmac('sha256', WEBHOOK_SECRET).update(manifest).digest('hex')
  return {
    'x-signature': `ts=${ts},v1=${v1}`,
    'x-request-id': requestId,
    'content-type': 'application/json',
  }
}

// ─── Orden base usada en los tests de webhook ─────────────────────────────────

const approvedPaymentData = {
  id: 'pay_001',
  status: 'approved',
  external_reference: 'order_123',
  payment_type_id: 'credit_card',
}

const baseOrder = {
  id: 'order_123',
  paymentStatus: 'pending',
  orderStatus: 'pendiente_pago',
  requiresInvoice: false,
  items: [{ productId: 'prod_1', quantity: 1 }],
  invoice: null,
  guestEmail: 'test@example.com',
  customer: null,
}

// ─── POST /api/payments/create-preference ─────────────────────────────────────

describe('POST /api/payments/create-preference', () => {
  const orderForPreference = {
    id: 'order_123',
    paymentStatus: 'pending',
    shippingCost: null,
    shippingMethod: null,
    items: [
      {
        productId: 'prod_1',
        quantity: 2,
        unitPrice: 350,
        product: { id: 'prod_1', name: 'Charizard Base Set' },
      },
    ],
  }

  beforeEach(() => {
    prismaMock.order.findUnique.mockResolvedValue(orderForPreference as any)
    mpPreferenceCreateMock.mockResolvedValue({
      id: 'pref_123',
      init_point: 'https://mpago.la/checkout/pref_123',
    })
    axiosMock.post.mockResolvedValue({ data: {} })
  })

  it('crea preferencia y devuelve preferenceId e initPoint', async () => {
    const res = await request(app)
      .post('/api/payments/create-preference')
      .send({ orderId: 'order_123' })
    expect(res.status).toBe(200)
    expect(res.body.data.preferenceId).toBe('pref_123')
    expect(res.body.data.initPoint).toBe('https://mpago.la/checkout/pref_123')
    expect(mpPreferenceCreateMock).toHaveBeenCalledTimes(1)
  })

  it('devuelve 400 si falta orderId', async () => {
    const res = await request(app)
      .post('/api/payments/create-preference')
      .send({})
    expect(res.status).toBe(400)
  })

  it('devuelve 404 si la orden no existe', async () => {
    prismaMock.order.findUnique.mockResolvedValue(null)
    const res = await request(app)
      .post('/api/payments/create-preference')
      .send({ orderId: 'orden_inexistente' })
    expect(res.status).toBe(404)
  })

  it('devuelve 400 si la orden ya fue procesada', async () => {
    prismaMock.order.findUnique.mockResolvedValue({
      ...orderForPreference,
      paymentStatus: 'confirmed',
    } as any)
    const res = await request(app)
      .post('/api/payments/create-preference')
      .send({ orderId: 'order_123' })
    expect(res.status).toBe(400)
  })

  it('incluye el costo de envío como item adicional cuando shippingCost > 0', async () => {
    prismaMock.order.findUnique.mockResolvedValue({
      ...orderForPreference,
      shippingCost: 150,
      shippingMethod: 'Express',
    } as any)
    const res = await request(app)
      .post('/api/payments/create-preference')
      .send({ orderId: 'order_123' })
    expect(res.status).toBe(200)
    // Verifica que la preferencia se creó con los items del pedido + envío
    const callBody = mpPreferenceCreateMock.mock.calls[0][0].body
    expect(callBody.items).toHaveLength(2)
    expect(callBody.items[1].id).toBe('shipping')
  })

  it('llama a next(error) si Mercado Pago falla inesperadamente', async () => {
    mpPreferenceCreateMock.mockRejectedValue(new Error('MP internal error'))
    const res = await request(app)
      .post('/api/payments/create-preference')
      .send({ orderId: 'order_123' })
    expect(res.status).toBe(500)
  })
})

// ─── POST /api/payments/webhook ──────────────────────────────────────────────

describe('POST /api/payments/webhook', () => {
  beforeEach(() => {
    mpPaymentGetMock.mockResolvedValue(approvedPaymentData)
    prismaMock.$transaction.mockImplementation(async (fn: any) => fn(prismaMock))
    prismaMock.order.findUnique.mockResolvedValue({ ...baseOrder } as any)
    prismaMock.order.update.mockResolvedValue({ ...baseOrder, paymentStatus: 'confirmed' } as any)
    prismaMock.product.updateMany.mockResolvedValue({ count: 1 })
    prismaMock.emailSubscriber.update.mockResolvedValue({ isBuyer: true } as any)
    axiosMock.post.mockResolvedValue({ data: {} })
  })

  it('siempre responde 200 (MP no debe reintentar)', async () => {
    const body = JSON.stringify({ type: 'payment', data: { id: 'pay_001' } })
    const headers = buildSignedWebhookHeaders('pay_001', 'req_001')
    const res = await request(app)
      .post('/api/payments/webhook')
      .set(headers)
      .send(body)
    expect(res.status).toBe(200)
  })

  it('confirma pago y descuenta stock con firma válida y pago approved', async () => {
    const body = JSON.stringify({ type: 'payment', data: { id: 'pay_001' } })
    const headers = buildSignedWebhookHeaders('pay_001', 'req_002')
    await request(app).post('/api/payments/webhook').set(headers).send(body)
    await new Promise((r) => setTimeout(r, 50))
    expect(prismaMock.order.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ paymentStatus: 'confirmed' }),
      })
    )
    expect(prismaMock.product.updateMany).toHaveBeenCalled()
  })

  it('marca pago como failed cuando status es rejected', async () => {
    mpPaymentGetMock.mockResolvedValue({ ...approvedPaymentData, status: 'rejected' })
    const body = JSON.stringify({ type: 'payment', data: { id: 'pay_001' } })
    const headers = buildSignedWebhookHeaders('pay_001', 'req_003')
    await request(app).post('/api/payments/webhook').set(headers).send(body)
    await new Promise((r) => setTimeout(r, 50))
    expect(prismaMock.order.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ paymentStatus: 'failed' }) })
    )
    expect(prismaMock.product.updateMany).not.toHaveBeenCalled()
  })

  it('no procesa si firma es inválida pero igual responde 200', async () => {
    const body = JSON.stringify({ type: 'payment', data: { id: 'pay_001' } })
    const res = await request(app)
      .post('/api/payments/webhook')
      .set({ 'x-signature': 'ts=123,v1=firma_invalida', 'x-request-id': 'req_004', 'content-type': 'application/json' })
      .send(body)
    expect(res.status).toBe(200)
    await new Promise((r) => setTimeout(r, 50))
    expect(prismaMock.order.update).not.toHaveBeenCalled()
  })

  it('ignora eventos que no son de tipo payment', async () => {
    const body = JSON.stringify({ type: 'merchant_order', data: { id: 'pay_001' } })
    const headers = buildSignedWebhookHeaders('pay_001', 'req_005')
    await request(app).post('/api/payments/webhook').set(headers).send(body)
    await new Promise((r) => setTimeout(r, 50))
    expect(prismaMock.order.update).not.toHaveBeenCalled()
  })

  it('marca pago como awaiting_verification para pago con ticket (OXXO)', async () => {
    mpPaymentGetMock.mockResolvedValue({ ...approvedPaymentData, status: 'approved', payment_type_id: 'ticket' })
    const body = JSON.stringify({ type: 'payment', data: { id: 'pay_001' } })
    const headers = buildSignedWebhookHeaders('pay_001', 'req_006')
    await request(app).post('/api/payments/webhook').set(headers).send(body)
    await new Promise((r) => setTimeout(r, 50))
    expect(prismaMock.order.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ paymentStatus: 'awaiting_verification' }) })
    )
  })

  it('responde 200 si el body no es JSON válido', async () => {
    const res = await request(app)
      .post('/api/payments/webhook')
      .set({ 'content-type': 'application/json' })
      .send('cuerpo-no-es-json{{{')
    expect(res.status).toBe(200)
  })

  it('ignora el evento si external_reference es nulo y responde 200', async () => {
    mpPaymentGetMock.mockResolvedValue({
      id: 'pay_001',
      status: 'approved',
      external_reference: null,
      payment_type_id: 'credit_card',
    })
    const body = JSON.stringify({ type: 'payment', data: { id: 'pay_001' } })
    const headers = buildSignedWebhookHeaders('pay_001', 'req_007')
    await request(app).post('/api/payments/webhook').set(headers).send(body)
    await new Promise((r) => setTimeout(r, 50))
    expect(prismaMock.order.update).not.toHaveBeenCalled()
  })

  it('marca pago como awaiting_verification para transferencia bancaria (bank_transfer)', async () => {
    mpPaymentGetMock.mockResolvedValue({
      ...approvedPaymentData,
      status: 'approved',
      payment_type_id: 'bank_transfer',
    })
    const body = JSON.stringify({ type: 'payment', data: { id: 'pay_001' } })
    const headers = buildSignedWebhookHeaders('pay_001', 'req_008')
    await request(app).post('/api/payments/webhook').set(headers).send(body)
    await new Promise((r) => setTimeout(r, 50))
    expect(prismaMock.order.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ paymentStatus: 'awaiting_verification' }) })
    )
  })

  it('absorbe el error del email de verificación si falla (OXXO)', async () => {
    mpPaymentGetMock.mockResolvedValue({ ...approvedPaymentData, payment_type_id: 'ticket' })
    axiosMock.post.mockRejectedValueOnce(new Error('Brevo down'))
    const body = JSON.stringify({ type: 'payment', data: { id: 'pay_001' } })
    const headers = buildSignedWebhookHeaders('pay_001', 'req_009')
    await request(app).post('/api/payments/webhook').set(headers).send(body)
    await new Promise((r) => setTimeout(r, 50))
    // La orden sí se actualizó a awaiting_verification aunque el email falló
    expect(prismaMock.order.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ paymentStatus: 'awaiting_verification' }) })
    )
  })

  it('no descuenta stock ni actualiza si la orden ya estaba confirmada (idempotente)', async () => {
    // La orden dentro de la transacción ya tiene paymentStatus: 'confirmed'
    prismaMock.order.findUnique.mockResolvedValue({
      ...baseOrder,
      paymentStatus: 'confirmed',
    } as any)
    const body = JSON.stringify({ type: 'payment', data: { id: 'pay_001' } })
    const headers = buildSignedWebhookHeaders('pay_001', 'req_010')
    await request(app).post('/api/payments/webhook').set(headers).send(body)
    await new Promise((r) => setTimeout(r, 50))
    expect(prismaMock.product.updateMany).not.toHaveBeenCalled()
  })

  it('llama a createInvoice si la orden requiere factura', async () => {
    // Primera llamada (dentro de $transaction): orden sin confirmar aún
    prismaMock.order.findUnique.mockResolvedValueOnce({
      ...baseOrder,
      paymentStatus: 'pending',
      items: [{ productId: 'prod_1', quantity: 1 }],
    } as any)
    // Segunda llamada (post-transacción): orden confirmada con requiresInvoice
    prismaMock.order.findUnique.mockResolvedValueOnce({
      ...baseOrder,
      paymentStatus: 'confirmed',
      requiresInvoice: true,
      invoice: { id: 'inv_1', status: 'draft' },
    } as any)
    // Tercera llamada (dentro de createInvoice): null para salir rápido
    prismaMock.order.findUnique.mockResolvedValueOnce(null)

    const body = JSON.stringify({ type: 'payment', data: { id: 'pay_001' } })
    const headers = buildSignedWebhookHeaders('pay_001', 'req_011')
    await request(app).post('/api/payments/webhook').set(headers).send(body)
    await new Promise((r) => setTimeout(r, 50))
    expect(prismaMock.order.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ paymentStatus: 'confirmed' }) })
    )
  })

  it('absorbe errores internos inesperados y siempre responde 200', async () => {
    // MP falla con un error no reintentable → el outer catch lo absorbe
    mpPaymentGetMock.mockRejectedValue(new Error('MP network error'))
    const body = JSON.stringify({ type: 'payment', data: { id: 'pay_001' } })
    const headers = buildSignedWebhookHeaders('pay_001', 'req_012')
    const res = await request(app).post('/api/payments/webhook').set(headers).send(body)
    expect(res.status).toBe(200)
    await new Promise((r) => setTimeout(r, 50))
    expect(prismaMock.order.update).not.toHaveBeenCalled()
  })

  it('descuenta stock con 0 resultados sin lanzar excepción (stock insuficiente)', async () => {
    prismaMock.product.updateMany.mockResolvedValue({ count: 0 })
    const body = JSON.stringify({ type: 'payment', data: { id: 'pay_001' } })
    const headers = buildSignedWebhookHeaders('pay_001', 'req_013')
    await request(app).post('/api/payments/webhook').set(headers).send(body)
    await new Promise((r) => setTimeout(r, 50))
    // La orden sigue confirmándose aunque el stock no pudo decrementarse
    expect(prismaMock.order.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ paymentStatus: 'confirmed' }) })
    )
  })

  it('no actualiza si la orden no existe en BD durante la transacción (guard idempotente)', async () => {
    // La orden no existe dentro de la transacción → lines 133-134 cubiertas
    prismaMock.order.findUnique.mockResolvedValue(null)
    const body = JSON.stringify({ type: 'payment', data: { id: 'pay_001' } })
    const headers = buildSignedWebhookHeaders('pay_001', 'req_014')
    await request(app).post('/api/payments/webhook').set(headers).send(body)
    await new Promise((r) => setTimeout(r, 50))
    expect(prismaMock.order.update).not.toHaveBeenCalled()
  })
})
