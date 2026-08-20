import request from 'supertest'
import express from 'express'
import { prismaMock } from './mocks/prisma.mock'
// POST /api/orders es una ruta pública (checkout de invitado) — no requiere
// Clerk, así que no hace falta mockearlo aquí.
import { ordersRoutes } from '../routes/orders'

const app = express()
app.use(express.json())
app.use('/api/orders', ordersRoutes)

const baseItem = { id: 'prod_1', name: 'Carta', isActive: true, stock: 10, price: 2000, categoryId: 'cat_lorcana' }

function basePayload(overrides: Record<string, unknown> = {}) {
  return {
    guestEmail: 'test@test.com',
    guestName: 'Test',
    guestPhone: '5512345678',
    shippingAddress: { street: 'A', city: 'CDMX', state: 'CDMX', zip: '06700' },
    shippingCost: 150,
    items: [{ productId: 'prod_1', quantity: 1 }],
    requiresInvoice: false,
    ...overrides,
  }
}

describe('POST /api/orders — promociones automáticas', () => {
  beforeEach(() => {
    prismaMock.$transaction.mockImplementation(async (fn: any) => fn(prismaMock))
    prismaMock.product.findUnique.mockResolvedValue({ ...baseItem } as any)
    prismaMock.order.create.mockImplementation(async ({ data }: any) => ({ id: 'order_1', ...data }))
    prismaMock.promotion.findMany.mockResolvedValue([])
    prismaMock.discountCode.update.mockResolvedValue({} as any)
  })
  afterEach(() => jest.clearAllMocks())

  it('aplica envío gratis automático cuando el subtotal alcanza el mínimo', async () => {
    prismaMock.promotion.findMany.mockResolvedValue([
      { id: 'promo_envio', title: 'Envío gratis', type: 'free_shipping', categoryId: null, value: null, minAmount: 1000, startsAt: null, endsAt: null },
    ] as any)

    const res = await request(app).post('/api/orders').send(basePayload()).expect(201)

    expect(res.status).toBe(201)
    const createCall = prismaMock.order.create.mock.calls[0][0]
    expect(createCall.data.promotionId).toBe('promo_envio')
    expect(Number(createCall.data.shippingCost)).toBe(0)
  })

  it('no aplica ninguna promoción si el subtotal no alcanza el mínimo', async () => {
    prismaMock.promotion.findMany.mockResolvedValue([
      { id: 'promo_envio', title: 'Envío gratis', type: 'free_shipping', categoryId: null, value: null, minAmount: 5000, startsAt: null, endsAt: null },
    ] as any)

    await request(app).post('/api/orders').send(basePayload()).expect(201)

    const createCall = prismaMock.order.create.mock.calls[0][0]
    expect(createCall.data.promotionId).toBeNull()
    expect(Number(createCall.data.shippingCost)).toBe(150)
  })

  it('un código de descuento gana sobre una promoción automática que también califica', async () => {
    prismaMock.promotion.findMany.mockResolvedValue([
      { id: 'promo_envio', title: 'Envío gratis', type: 'free_shipping', categoryId: null, value: null, minAmount: 1000, startsAt: null, endsAt: null },
    ] as any)
    prismaMock.discountCode.findUnique.mockResolvedValue({
      id: 'code_1', code: 'PROMO10', type: 'fixed', value: 100, minAmount: null, usageLimit: null, usageCount: 0, isActive: true, expiresAt: null,
    } as any)

    await request(app).post('/api/orders').send(basePayload({ discountCode: 'PROMO10' })).expect(201)

    expect(prismaMock.promotion.findMany).not.toHaveBeenCalled()
    const createCall = prismaMock.order.create.mock.calls[0][0]
    expect(createCall.data.promotionId).toBeNull()
    expect(createCall.data.discountCodeId).toBe('code_1')
    expect(Number(createCall.data.shippingCost)).toBe(150)
  })

  it('aplica un descuento de porcentaje automático y calcula el total correctamente', async () => {
    prismaMock.promotion.findMany.mockResolvedValue([
      { id: 'promo_10pct', title: '10% off', type: 'percentage_off', categoryId: null, value: 10, minAmount: 1000, startsAt: null, endsAt: null },
    ] as any)

    await request(app).post('/api/orders').send(basePayload()).expect(201)

    const createCall = prismaMock.order.create.mock.calls[0][0]
    expect(createCall.data.promotionId).toBe('promo_10pct')
    expect(Number(createCall.data.discountAmount)).toBe(200) // 10% de 2000 (baseItem.price=2000, qty=1)
    expect(Number(createCall.data.shippingCost)).toBe(150) // percentage_off no toca el envío
    expect(Number(createCall.data.total)).toBe(1950) // 2000 + 150 - 200
  })
})
