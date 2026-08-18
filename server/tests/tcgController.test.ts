import request from 'supertest'
import express from 'express'
import './mocks/prisma.mock'

jest.mock('../lib/r2', () => ({
  uploadToR2: jest.fn().mockResolvedValue('https://test.r2.dev/products/temp/tcg-import-123.jpg'),
}))

jest.mock('@clerk/express', () => ({
  clerkMiddleware: () => (_req: any, _res: any, next: any) => next(),
  getAuth: () => ({ userId: 'user_admin_test', sessionClaims: { metadata: { role: 'admin' } } }),
}))

import { adminRoutes } from '../routes/admin'

const app = express()
app.use(express.json())
app.use('/api/admin', adminRoutes)

describe('POST /api/admin/tcg/import-image', () => {
  const originalFetch = global.fetch

  afterEach(() => {
    global.fetch = originalFetch
    jest.clearAllMocks()
  })

  // Reproduce el bug reportado: Scryfall (cards.scryfall.io) responde 400
  // "Your User-Agent header is currently set to default or generic value"
  // cuando la petición no manda un User-Agent descriptivo — como sí lo hacen
  // searchScryfall/getScryfallCard en tcgAdapters.ts, pero import-image no lo
  // reenvía porque descarga el binario directo con `fetch(imageUrl)` a secas.
  it('manda un User-Agent descriptivo al descargar la imagen (requerido por Scryfall)', async () => {
    let capturedHeaders: HeadersInit | undefined
    global.fetch = jest.fn(async (_url: any, options: any) => {
      capturedHeaders = options?.headers
      return {
        ok: true,
        headers: { get: () => 'image/jpeg' },
        arrayBuffer: async () => new ArrayBuffer(8),
      } as any
    }) as unknown as typeof fetch

    await request(app)
      .post('/api/admin/tcg/import-image')
      .send({ imageUrl: 'https://cards.scryfall.io/large/front/1/9/example.jpg' })
      .expect(200)

    const headers = new Headers(capturedHeaders)
    const userAgent = headers.get('User-Agent') ?? headers.get('user-agent')
    expect(userAgent).toBeTruthy()
    expect(userAgent).not.toBe('node')
  })
})
