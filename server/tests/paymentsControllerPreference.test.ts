import request from 'supertest'
import express from 'express'
import { Prisma } from '@prisma/client'
import './mocks/prisma.mock'
import { prismaMock } from './mocks/prisma.mock'
import './mocks/mercadopago.mock'
import { mpPreferenceCreateMock } from './mocks/mercadopago.mock'

import { paymentsRoutes } from '../routes/payments'

const app = express()
app.use(express.json())
app.use('/api/payments', paymentsRoutes)

describe('POST /api/payments/create-preference', () => {
  afterEach(() => jest.clearAllMocks())

  it('sin descuento: itemiza productos + envío por separado y el total cuadra', async () => {
    prismaMock.order.findUnique.mockResolvedValue({
      id: 'order_1',
      paymentStatus: 'pending',
      subtotal: new Prisma.Decimal(2000),
      shippingCost: new Prisma.Decimal(150),
      total: new Prisma.Decimal(2150),
      discountAmount: new Prisma.Decimal(0),
      shippingMethod: 'estandar',
      items: [
        { productId: 'p1', quantity: 1, unitPrice: new Prisma.Decimal(2000), product: { id: 'p1', name: 'Carta' } },
      ],
    } as any)
    mpPreferenceCreateMock.mockResolvedValue({ id: 'pref_1', init_point: 'https://mp.test/pref_1' })

    await request(app)
      .post('/api/payments/create-preference')
      .send({ orderId: 'order_1' })
      .expect(200)

    const items = mpPreferenceCreateMock.mock.calls[0][0].body.items
    const sum = items.reduce((acc: number, i: any) => acc + i.unit_price * i.quantity, 0)
    expect(sum).toBe(2150)
  })

  it('con descuento (código o promoción automática): colapsa a una línea neta y el total cuadra exacto', async () => {
    prismaMock.order.findUnique.mockResolvedValue({
      id: 'order_1',
      paymentStatus: 'pending',
      subtotal: new Prisma.Decimal(2000),
      shippingCost: new Prisma.Decimal(150),
      total: new Prisma.Decimal(1950),
      discountAmount: new Prisma.Decimal(200),
      shippingMethod: 'estandar',
      items: [
        { productId: 'p1', quantity: 1, unitPrice: new Prisma.Decimal(2000), product: { id: 'p1', name: 'Carta' } },
      ],
    } as any)
    mpPreferenceCreateMock.mockResolvedValue({ id: 'pref_1', init_point: 'https://mp.test/pref_1' })

    await request(app)
      .post('/api/payments/create-preference')
      .send({ orderId: 'order_1' })
      .expect(200)

    const items = mpPreferenceCreateMock.mock.calls[0][0].body.items
    const sum = items.reduce((acc: number, i: any) => acc + i.unit_price * i.quantity, 0)
    expect(sum).toBe(1950)
  })
})
