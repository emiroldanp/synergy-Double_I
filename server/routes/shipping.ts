import { Router } from 'express'
import axios from 'axios'
import { quoteShipping } from '../controllers/shippingController'

export const shippingRoutes = Router()

shippingRoutes.post('/quote', quoteShipping)

// GET /api/shipping/health — diagnóstico de conexión con Skydropx (solo staging/dev)
shippingRoutes.get('/health', async (_req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ error: 'not found' })
  }
  const key    = process.env.SKYDROPX_API_KEY    || ''
  const secret = process.env.SKYDROPX_API_SECRET || ''
  const result: Record<string, unknown> = {
    key_set:    key.length > 0,
    secret_set: secret.length > 0,
    key_preview: key ? key.slice(0, 6) + '…' : '(vacío)',
    origin_zip: process.env.SKYDROPX_ORIGIN_ZIP || '(vacío)',
  }
  try {
    const resp = await axios.post(
      'https://pro.skydropx.com/api/v1/oauth/token',
      { client_id: key, client_secret: secret, grant_type: 'client_credentials' },
      { timeout: 8000 }
    )
    result.token_ok      = true
    result.token_preview = String(resp.data.access_token || '').slice(0, 10) + '…'
    result.expires_in    = resp.data.expires_in
  } catch (e: any) {
    result.token_ok      = false
    result.token_error   = e.response?.status ?? e.code ?? e.message
    result.token_body    = e.response?.data ?? null
  }
  return res.json(result)
})
