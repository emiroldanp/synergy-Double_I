import request from 'supertest'
import express from 'express'
import './mocks/prisma.mock'
import './mocks/axios.mock'
import './mocks/facturapi.mock'
import { prismaMock } from './mocks/prisma.mock'

jest.mock('../lib/r2', () => ({
  uploadToR2: jest.fn().mockResolvedValue('https://test.r2.dev/invoices/order_1/factura.pdf'),
}))

// Mock de Clerk sin autenticación para tests de rutas admin
jest.mock('@clerk/express', () => ({
  clerkMiddleware: () => (_req: any, _res: any, next: any) => next(),
  getAuth: () => ({ userId: 'user_admin_test', sessionClaims: { metadata: { role: 'admin' } } }),
}))

import { adminRoutes } from '../routes/admin'

const app = express()
app.use(express.json())
app.use('/api/admin', adminRoutes)

describe('Rutas /api/admin', () => {
  it('PATCH /api/admin/orders/:id actualiza status y trackingNumber', async () => {
    prismaMock.order.update.mockResolvedValue({
      id: 'order_1',
      orderStatus: 'enviado',
      trackingNumber: 'GUIDE123',
    } as any)
    const res = await request(app)
      .patch('/api/admin/orders/order_1')
      .send({ status: 'enviado', trackingNumber: 'GUIDE123' })
    expect(res.status).toBe(200)
    expect(prismaMock.order.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ trackingNumber: 'GUIDE123' }),
      })
    )
  })

  it('POST /api/admin/invoices/:orderId/retry devuelve 404 si factura no existe', async () => {
    prismaMock.invoice.findUnique.mockResolvedValue(null)
    const res = await request(app).post('/api/admin/invoices/orden_sin_factura/retry')
    expect(res.status).toBe(404)
  })

  it('POST /api/admin/invoices/:orderId/retry devuelve 409 si factura ya es valid', async () => {
    prismaMock.invoice.findUnique.mockResolvedValue({ status: 'valid' } as any)
    const res = await request(app).post('/api/admin/invoices/order_ya_facturada/retry')
    expect(res.status).toBe(409)
  })

  it('POST /api/admin/invoices/:orderId/retry devuelve 200 para factura en draft', async () => {
    prismaMock.invoice.findUnique.mockResolvedValue({ status: 'draft' } as any)
    prismaMock.order.findUnique.mockResolvedValue(null)
    const res = await request(app).post('/api/admin/invoices/order_draft/retry')
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
  })

  it('POST /api/admin/orders/:id/mark-paid devuelve 404 si orden no existe', async () => {
    prismaMock.order.findUnique.mockResolvedValue(null)
    const res = await request(app).post('/api/admin/orders/orden_inexistente/mark-paid')
    expect(res.status).toBe(404)
  })

  it('POST /api/admin/orders/:id/mark-paid devuelve 200 con alreadyConfirmed si ya fue pagada', async () => {
    prismaMock.order.findUnique.mockResolvedValue({
      id: 'order_1',
      paymentStatus: 'confirmed',
      paymentReference: 'ref_123',
      paymentMethod: 'credit_card',
    } as any)
    const res = await request(app).post('/api/admin/orders/order_1/mark-paid')
    expect(res.status).toBe(200)
    expect(res.body.data.alreadyConfirmed).toBe(true)
  })

  it('POST /api/admin/orders/:id/mark-paid devuelve 409 si la orden no está en awaiting_verification', async () => {
    prismaMock.order.findUnique.mockResolvedValue({
      id: 'order_1',
      paymentStatus: 'pending',
      paymentReference: null,
      paymentMethod: null,
    } as any)
    const res = await request(app).post('/api/admin/orders/order_1/mark-paid')
    expect(res.status).toBe(409)
  })

  it('POST /api/admin/orders/:id/mark-paid llama a next(error) si la transacción falla', async () => {
    prismaMock.order.findUnique.mockResolvedValue({
      id: 'order_1',
      paymentStatus: 'awaiting_verification',
      paymentReference: null,
      paymentMethod: null,
    } as any)
    prismaMock.$transaction.mockRejectedValue(new Error('DB connection lost'))
    const res = await request(app).post('/api/admin/orders/order_1/mark-paid')
    expect(res.status).toBe(500)
  })

  it('POST /api/admin/orders/:id/mark-paid confirma la orden cuando está en awaiting_verification', async () => {
    // Primera llamada (en markOrderPaid): orden en awaiting_verification
    prismaMock.order.findUnique.mockResolvedValueOnce({
      id: 'order_1',
      paymentStatus: 'awaiting_verification',
      paymentReference: 'oxxo_ref',
      paymentMethod: 'ticket',
    } as any)
    // Segunda llamada (dentro de $transaction en confirmOrderPayment)
    prismaMock.order.findUnique.mockResolvedValueOnce({
      id: 'order_1',
      paymentStatus: 'awaiting_verification',
      items: [],
    } as any)
    // Tercera llamada (post-transacción, para requiresInvoice check)
    prismaMock.order.findUnique.mockResolvedValueOnce({
      id: 'order_1',
      paymentStatus: 'confirmed',
      requiresInvoice: false,
      invoice: null,
    } as any)

    prismaMock.$transaction.mockImplementation(async (fn: any) => fn(prismaMock))
    prismaMock.order.update.mockResolvedValue({ id: 'order_1', paymentStatus: 'confirmed' } as any)

    const res = await request(app).post('/api/admin/orders/order_1/mark-paid')
    await new Promise((r) => setTimeout(r, 50))
    expect(res.status).toBe(200)
    expect(res.body.data.confirmed).toBe(true)
  })
})
