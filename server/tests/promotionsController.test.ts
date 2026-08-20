import request from 'supertest'
import express from 'express'
import { prismaMock } from './mocks/prisma.mock'

jest.mock('@clerk/express', () => ({
  clerkMiddleware: () => (_req: any, _res: any, next: any) => next(),
  getAuth: () => ({ userId: 'user_admin_test', sessionClaims: { metadata: { role: 'admin' } } }),
}))

import { promotionsPublicRoutes } from '../routes/promotionsPublic'
import { promotionAdminRoutes } from '../routes/promotions'

const app = express()
app.use(express.json())
app.use('/api/promotions', promotionsPublicRoutes)
app.use('/api/admin/promotions', promotionAdminRoutes)

describe('POST /api/promotions/evaluate', () => {
  afterEach(() => jest.clearAllMocks())

  it('devuelve la promoción de mayor beneficio para el carrito', async () => {
    prismaMock.product.findMany.mockResolvedValue([
      { id: 'prod_1', price: 2000, categoryId: 'cat_lorcana' },
    ] as any)
    prismaMock.promotion.findMany.mockResolvedValue([
      {
        id: 'promo_1', title: '15% Lorcana', type: 'percentage_off', categoryId: 'cat_lorcana',
        value: 15, minAmount: null, startsAt: null, endsAt: null,
      },
    ] as any)

    const res = await request(app)
      .post('/api/promotions/evaluate')
      .send({ items: [{ productId: 'prod_1', quantity: 1 }], shippingCost: 150 })
      .expect(200)

    expect(res.body.data.promotion).toEqual({
      id: 'promo_1', title: '15% Lorcana', discountAmount: 300, freeShipping: false,
    })
  })

  it('devuelve promotion: null si nada califica', async () => {
    prismaMock.product.findMany.mockResolvedValue([{ id: 'prod_1', price: 100, categoryId: 'cat_x' }] as any)
    prismaMock.promotion.findMany.mockResolvedValue([])

    const res = await request(app)
      .post('/api/promotions/evaluate')
      .send({ items: [{ productId: 'prod_1', quantity: 1 }] })
      .expect(200)

    expect(res.body.data.promotion).toBeNull()
  })

  it('rechaza items vacíos', async () => {
    await request(app).post('/api/promotions/evaluate').send({ items: [] }).expect(400)
  })
})

describe('POST /api/admin/promotions — validación de reglas', () => {
  afterEach(() => jest.clearAllMocks())

  it('rechaza percentage_off sin value', async () => {
    const res = await request(app)
      .post('/api/admin/promotions')
      .send({ title: 'X', description: 'Y', type: 'percentage_off' })
      .expect(400)
    expect(res.body.error).toBeTruthy()
  })

  it('rechaza free_shipping con categoryId', async () => {
    const res = await request(app)
      .post('/api/admin/promotions')
      .send({ title: 'X', description: 'Y', type: 'free_shipping', categoryId: 'cat_1' })
      .expect(400)
    expect(res.body.error).toBeTruthy()
  })

  it('acepta un free_shipping válido', async () => {
    prismaMock.promotion.create.mockResolvedValue({ id: 'promo_1', title: 'X', type: 'free_shipping' } as any)
    await request(app)
      .post('/api/admin/promotions')
      .send({ title: 'X', description: 'Y', type: 'free_shipping', minAmount: 3500 })
      .expect(201)
    expect(prismaMock.promotion.create).toHaveBeenCalled()
  })
})
