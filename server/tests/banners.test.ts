import request from 'supertest'
import express from 'express'
import './mocks/prisma.mock'

jest.mock('../lib/r2', () => ({
  uploadToR2: jest.fn().mockResolvedValue('https://test.r2.dev/banners/1234.jpg'),
}))

jest.mock('@clerk/express', () => ({
  clerkMiddleware: () => (_req: any, _res: any, next: any) => next(),
  getAuth: () => ({ userId: 'user_admin_test', sessionClaims: { metadata: { role: 'admin' } } }),
}))

import { bannerAdminRoutes } from '../routes/banners'
import { errorHandler } from '../middleware/errorHandler'

// Reproduce el mismo orden de middlewares que index.ts, incluyendo el override de límite
// para /api/admin/banners (10mb) antes del parser global conservador (100kb) y errorHandler al final.
function buildApp() {
  const app = express()
  app.use('/api/admin/banners', express.json({ limit: '10mb' }))
  app.use(express.json({ limit: '100kb' }))
  app.use('/api/admin/banners', bannerAdminRoutes)
  app.use(errorHandler)
  return app
}

// Sin el override de límite — así estaba montada la ruta en producción antes del fix,
// bajo solo el parser global de 100kb.
function buildAppSinOverride() {
  const app = express()
  app.use(express.json({ limit: '100kb' }))
  app.use('/api/admin/banners', bannerAdminRoutes)
  app.use(errorHandler)
  return app
}

describe('POST /api/admin/banners/upload-image', () => {
  it('sube una imagen base64 de ~500kb sin devolver 500 por límite de body', async () => {
    const bigBase64 = Buffer.alloc(500 * 1024, 'a').toString('base64')
    const res = await request(buildApp())
      .post('/api/admin/banners/upload-image')
      .send({ base64: bigBase64, mimeType: 'image/jpeg' })

    expect(res.status).toBe(200)
    expect(res.body.url).toBe('https://test.r2.dev/banners/1234.jpg')
  })

  it('sin el override de límite, una imagen de ~500kb rompía con 413/500 (root cause del bug reportado)', async () => {
    const bigBase64 = Buffer.alloc(500 * 1024, 'a').toString('base64')
    const res = await request(buildAppSinOverride())
      .post('/api/admin/banners/upload-image')
      .send({ base64: bigBase64, mimeType: 'image/jpeg' })

    expect(res.status).not.toBe(200)
  })
})

describe('errorHandler — payload demasiado grande', () => {
  it('devuelve 413 con mensaje claro en vez de "Error interno del servidor"', async () => {
    // Simula una ruta sin override de límite recibiendo un body grande —
    // debe seguir dando un mensaje útil, no un 500 genérico.
    const app = express()
    app.use(express.json({ limit: '100kb' }))
    app.post('/api/test', (_req, res) => res.json({ ok: true }))
    app.use(errorHandler)

    const bigBase64 = Buffer.alloc(500 * 1024, 'a').toString('base64')
    const res = await request(app).post('/api/test').send({ base64: bigBase64 })

    expect(res.status).toBe(413)
    expect(res.body.error).not.toBe('Error interno del servidor')
  })
})
