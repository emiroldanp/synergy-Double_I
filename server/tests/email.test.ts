import request from 'supertest'
import express from 'express'
import './mocks/prisma.mock'
import './mocks/axios.mock'
import { prismaMock } from './mocks/prisma.mock'
import { axiosMock } from './mocks/axios.mock'
import { emailRoutes } from '../routes/email'

const app = express()
app.use(express.json())
app.use('/api/email', emailRoutes)

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
})
