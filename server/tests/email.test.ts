import request from 'supertest'
import express from 'express'
import './mocks/prisma.mock'
import './mocks/axios.mock'
import { prismaMock } from './mocks/prisma.mock'
import { axiosMock } from './mocks/axios.mock'
import { emailRoutes } from '../routes/email'
import {
  sendOrderConfirmationEmail,
  sendPaymentVerificationEmail,
} from '../controllers/emailController'

const app = express()
app.use(express.json())
app.use('/api/email', emailRoutes)

// ─── POST /api/email/subscribe ───────────────────────────────────────────────

describe('POST /api/email/subscribe', () => {
  beforeEach(() => {
    prismaMock.emailSubscriber.upsert.mockResolvedValue({
      id: 'sub_1',
      email: 'test@example.com',
    } as any)
    axiosMock.post.mockResolvedValue({ data: { id: 'brevo_contact_123' } })
  })

  it('crea suscriptor y llama a Brevo para email nuevo', async () => {
    const res = await request(app)
      .post('/api/email/subscribe')
      .send({ email: 'nuevo@example.com', source: 'homepage_form' })
    expect(res.status).toBe(200)
    expect(prismaMock.emailSubscriber.upsert).toHaveBeenCalledTimes(1)
    expect(axiosMock.post).toHaveBeenCalled()
  })

  it('devuelve 400 para email con formato inválido', async () => {
    const res = await request(app)
      .post('/api/email/subscribe')
      .send({ email: 'no-es-un-email', source: 'homepage_form' })
    expect(res.status).toBe(400)
  })

  it('devuelve 400 si falta el campo email', async () => {
    const res = await request(app)
      .post('/api/email/subscribe')
      .send({ source: 'homepage_form' })
    expect(res.status).toBe(400)
  })

  it('devuelve 400 si falta el campo source', async () => {
    const res = await request(app)
      .post('/api/email/subscribe')
      .send({ email: 'test@example.com' })
    expect(res.status).toBe(400)
  })

  it('devuelve 400 para source con valor inválido', async () => {
    const res = await request(app)
      .post('/api/email/subscribe')
      .send({ email: 'test@example.com', source: 'fuente_invalida' })
    expect(res.status).toBe(400)
  })

  it('devuelve 200 aunque el email de bienvenida falle', async () => {
    // Primera llamada (crear contacto): éxito; segunda (welcome email): fallo silencioso
    axiosMock.post
      .mockResolvedValueOnce({ data: { id: 'contact_ok' } })
      .mockRejectedValueOnce(new Error('Brevo timeout'))
    const res = await request(app)
      .post('/api/email/subscribe')
      .send({ email: 'nuevo@example.com', source: 'homepage_form' })
    expect(res.status).toBe(200)
  })

  it('llama a next(error) cuando Brevo responde con error no duplicado', async () => {
    // El inner catch re-lanza → el outer catch llama next(error) → Express devuelve 500
    axiosMock.post.mockRejectedValueOnce({
      response: { data: { code: 'api_limit_reached' } },
    })
    const res = await request(app)
      .post('/api/email/subscribe')
      .send({ email: 'nuevo@example.com', source: 'homepage_form' })
    expect(res.status).toBe(500)
  })
})

// ─── POST /api/email/transactional ───────────────────────────────────────────

describe('POST /api/email/transactional', () => {
  beforeEach(() => {
    axiosMock.post.mockResolvedValue({ data: {} })
  })

  it('envía email transaccional con templateId válido', async () => {
    const res = await request(app)
      .post('/api/email/transactional')
      .send({ to: 'dest@example.com', templateId: 5, params: { KEY: 'val' } })
    expect(res.status).toBe(200)
    expect(axiosMock.post).toHaveBeenCalled()
  })

  it('devuelve 400 si falta el campo to', async () => {
    const res = await request(app)
      .post('/api/email/transactional')
      .send({ templateId: 5 })
    expect(res.status).toBe(400)
  })

  it('devuelve 400 si falta templateId', async () => {
    const res = await request(app)
      .post('/api/email/transactional')
      .send({ to: 'dest@example.com' })
    expect(res.status).toBe(400)
  })

  it('devuelve 400 para email inválido en campo to', async () => {
    const res = await request(app)
      .post('/api/email/transactional')
      .send({ to: 'no-es-email', templateId: 5 })
    expect(res.status).toBe(400)
  })

  it('devuelve 400 si templateId no es entero positivo', async () => {
    const res = await request(app)
      .post('/api/email/transactional')
      .send({ to: 'dest@example.com', templateId: -1 })
    expect(res.status).toBe(400)
  })

  it('propaga el error 400 de Brevo como respuesta 400', async () => {
    axiosMock.post.mockRejectedValueOnce({
      response: { status: 400, data: { message: 'Template no encontrado' } },
    })
    const res = await request(app)
      .post('/api/email/transactional')
      .send({ to: 'dest@example.com', templateId: 99 })
    expect(res.status).toBe(400)
    expect(res.body.error).toBe('Template no encontrado')
  })
})

// ─── POST /api/email/add-to-list ─────────────────────────────────────────────

describe('POST /api/email/add-to-list', () => {
  beforeEach(() => {
    axiosMock.post.mockResolvedValue({ data: {} })
  })

  it('agrega contacto a lista correctamente', async () => {
    const res = await request(app)
      .post('/api/email/add-to-list')
      .send({ email: 'cliente@example.com', listId: 2 })
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
  })

  it('devuelve 400 si falta email', async () => {
    const res = await request(app)
      .post('/api/email/add-to-list')
      .send({ listId: 2 })
    expect(res.status).toBe(400)
  })

  it('devuelve 400 si falta listId', async () => {
    const res = await request(app)
      .post('/api/email/add-to-list')
      .send({ email: 'cliente@example.com' })
    expect(res.status).toBe(400)
  })

  it('devuelve 400 para email inválido', async () => {
    const res = await request(app)
      .post('/api/email/add-to-list')
      .send({ email: 'no-es-email', listId: 2 })
    expect(res.status).toBe(400)
  })

  it('devuelve 400 para listId no numérico', async () => {
    const res = await request(app)
      .post('/api/email/add-to-list')
      .send({ email: 'cliente@example.com', listId: 'abc' })
    expect(res.status).toBe(400)
  })

  it('devuelve 200 si el contacto ya existe (duplicate_parameter)', async () => {
    // Primera llamada (crear/actualizar contacto): duplicate; segunda (agregar a lista): éxito
    axiosMock.post
      .mockRejectedValueOnce({ response: { data: { code: 'duplicate_parameter' } } })
      .mockResolvedValueOnce({ data: {} })
    const res = await request(app)
      .post('/api/email/add-to-list')
      .send({ email: 'existente@example.com', listId: 2 })
    expect(res.status).toBe(200)
  })

  it('devuelve 200 si el contacto ya estaba en la lista (fallo en la adición)', async () => {
    // Duplicate en creación, y también falla la adición directa → aún así 200
    axiosMock.post
      .mockRejectedValueOnce({ response: { data: { code: 'duplicate_parameter' } } })
      .mockRejectedValueOnce(new Error('already in list'))
    const res = await request(app)
      .post('/api/email/add-to-list')
      .send({ email: 'existente@example.com', listId: 2 })
    expect(res.status).toBe(200)
  })
})

// ─── sendOrderConfirmationEmail (función interna exportada) ──────────────────

describe('sendOrderConfirmationEmail', () => {
  beforeEach(() => {
    axiosMock.post.mockResolvedValue({ data: {} })
  })

  it('retorna sin error si la orden no existe', async () => {
    prismaMock.order.findUnique.mockResolvedValue(null)
    await expect(sendOrderConfirmationEmail('orden_inexistente')).resolves.toBeUndefined()
  })

  it('retorna sin error si la orden no tiene email', async () => {
    prismaMock.order.findUnique.mockResolvedValue({
      id: 'order_sin_email',
      guestEmail: null,
      guestName: null,
      customer: null,
      items: [],
      total: 0,
      shippingMethod: null,
    } as any)
    await expect(sendOrderConfirmationEmail('order_sin_email')).resolves.toBeUndefined()
  })

  it('envía el email y marca al suscriptor como comprador', async () => {
    prismaMock.order.findUnique.mockResolvedValue({
      id: 'order_1',
      guestEmail: 'comprador@example.com',
      guestName: 'Test User',
      total: 500,
      shippingMethod: 'Estándar',
      items: [
        { product: { name: 'Pikachu V', price: 350 }, quantity: 1, unitPrice: 350 },
      ],
      customer: null,
    } as any)
    prismaMock.emailSubscriber.update.mockResolvedValue({ id: 'sub_1', isBuyer: true } as any)
    await sendOrderConfirmationEmail('order_1')
    expect(axiosMock.post).toHaveBeenCalled()
    expect(prismaMock.emailSubscriber.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { isBuyer: true } })
    )
  })
})

// ─── sendPaymentVerificationEmail (función interna exportada) ─────────────────

describe('sendPaymentVerificationEmail', () => {
  it('retorna sin error si la orden no existe', async () => {
    prismaMock.order.findUnique.mockResolvedValue(null)
    await expect(
      sendPaymentVerificationEmail('orden_inexistente', 'ticket')
    ).resolves.toBeUndefined()
  })

  it('retorna sin error si la orden no tiene email', async () => {
    prismaMock.order.findUnique.mockResolvedValue({
      id: 'order_sin_email',
      guestEmail: null,
      guestName: null,
      customer: null,
    } as any)
    await expect(
      sendPaymentVerificationEmail('order_sin_email', 'bank_transfer')
    ).resolves.toBeUndefined()
  })
})
