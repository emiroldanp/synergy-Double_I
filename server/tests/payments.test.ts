import request from 'supertest'
import express from 'express'
import crypto from 'crypto'
import './mocks/prisma.mock'
import './mocks/axios.mock'
import './mocks/mercadopago.mock'
import './mocks/facturapi.mock'
import { prismaMock } from './mocks/prisma.mock'
import { mpPaymentGetMock } from './mocks/mercadopago.mock'
import { paymentsRoutes } from '../routes/payments'

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

describe('POST /api/payments/webhook', () => {
  beforeEach(() => {
    mpPaymentGetMock.mockResolvedValue(approvedPaymentData)
    prismaMock.$transaction.mockImplementation(async (fn: any) => fn(prismaMock))
    prismaMock.order.findUnique.mockResolvedValue({ ...baseOrder } as any)
    prismaMock.order.update.mockResolvedValue({ ...baseOrder, paymentStatus: 'confirmed' } as any)
    prismaMock.product.updateMany.mockResolvedValue({ count: 1 })
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
    // Dar tiempo al proceso asíncrono
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
})
