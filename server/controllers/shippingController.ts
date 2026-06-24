import { Request, Response, NextFunction } from 'express'
import axios from 'axios'
import { prisma } from '../lib/prisma'
import { withRetry } from '../lib/retry'

interface ShippingDestination {
  street: string
  number: string
  neighborhood: string
  city: string
  state: string
  zip_code: string
}

interface ShippingParcel {
  weight: number
  length: number
  width: number
  height: number
}

interface QuoteRequestBody {
  destination: ShippingDestination
  parcel: ShippingParcel
  sessionId: string
}

// Cache simple del access token de Skydropx Pro.
// El token tiene TTL declarado en expires_in (segundos); refrescamos
// con un margen de 60 s para evitar usarlo justo en el límite.
let cachedToken: { value: string; expiresAt: number } | null = null

async function getSkydropxToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.value
  }

  // Obtener token es idempotente (solo lectura de credenciales) → seguro reintentar.
  const response = await withRetry(
    () =>
      axios.post(
        'https://pro.skydropx.com/api/v1/oauth/token',
        {
          client_id: process.env.SKYDROPX_API_KEY,
          client_secret: process.env.SKYDROPX_API_SECRET,
          grant_type: 'client_credentials',
        },
        { headers: { 'Content-Type': 'application/json' }, timeout: 10000 }
      ),
    { label: 'Skydropx token' }
  )

  const { access_token, expires_in } = response.data
  cachedToken = {
    value: access_token,
    expiresAt: Date.now() + (expires_in - 60) * 1000,
  }
  return access_token
}

/**
 * POST /api/shipping/quote
 * Cotiza envíos vía Skydropx Pro (API v2 con OAuth2) y guarda el
 * resultado en ShippingQuote. Si Skydropx no responde en 10 s,
 * devuelve 503 con mensaje amigable.
 */
export async function quoteShipping(req: Request, res: Response, next: NextFunction) {
  try {
    const { destination, parcel, sessionId } = req.body as QuoteRequestBody

    if (!destination || !parcel || !sessionId) {
      return res.status(400).json({ error: 'Faltan campos requeridos: destination, parcel, sessionId' })
    }

    const payload = {
      quotation: {
        address_from: {
          country_code: 'MX',
          postal_code: process.env.SKYDROPX_ORIGIN_ZIP,
          area_level1: process.env.SKYDROPX_ORIGIN_STATE,
          area_level2: process.env.SKYDROPX_ORIGIN_CITY,
          area_level3: process.env.SKYDROPX_ORIGIN_NEIGHBORHOOD,
        },
        address_to: {
          country_code: 'MX',
          postal_code: destination.zip_code,
          area_level1: destination.state,
          area_level2: destination.city,
          area_level3: destination.neighborhood,
        },
        parcel: {
          weight: parcel.weight,
          length: parcel.length,
          width: parcel.width,
          height: parcel.height,
        },
        requested_carriers: ['estafeta', 'fedex', 'dhl', 'redpack', 'paquetexpress'],
      },
    }

    let skydropxData: any

    try {
      const token = await getSkydropxToken()

      // 1) Crea la cotización — devuelve un ID pero las rates aún están "pending".
      //    Crear una cotización no genera cargos ni órdenes (no es escritura con
      //    efectos secundarios persistentes/cobrables) → seguro reintentar.
      const createResp = await withRetry(
        () =>
          axios.post(
            'https://pro.skydropx.com/api/v1/quotations',
            payload,
            {
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
              timeout: 10000,
            }
          ),
        { label: 'Skydropx crear cotización' }
      )

      const quotationId = createResp.data?.data?.id || createResp.data?.id
      if (!quotationId) {
        skydropxData = createResp.data
      } else {
        // 2) Polling al GET /quotations/{id} hasta tener rates con precio > 0
        //    o alcanzar el timeout total de ~8 segundos.
        const maxAttempts = 8
        const delayMs = 1000
        const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

        for (let i = 0; i < maxAttempts; i++) {
          await sleep(delayMs)
          // GET de polling es idempotente. Reintentos cortos (2) para absorber
          // un blip de red puntual sin abortar todo el ciclo de polling.
          const pollResp = await withRetry(
            () =>
              axios.get(
                `https://pro.skydropx.com/api/v1/quotations/${quotationId}`,
                {
                  headers: { Authorization: `Bearer ${token}` },
                  timeout: 5000,
                }
              ),
            { retries: 2, label: 'Skydropx polling' }
          )
          skydropxData = pollResp.data
          const ratesPreview = pollResp.data?.data?.attributes?.rates
            || pollResp.data?.included
            || []
          const hasPrice = Array.isArray(ratesPreview) && ratesPreview.some((r: any) => {
            const attrs = r.attributes || r
            return Number(attrs.total || attrs.amount_local || attrs.total_pricing || 0) > 0
          })
          if (hasPrice) break
        }
      }
    } catch (axiosError: any) {
      console.error('[Skydropx] status:', axiosError?.response?.status)
      console.error('[Skydropx] data:', JSON.stringify(axiosError?.response?.data))
      console.error('[Skydropx] message:', axiosError?.message)
      return res.status(503).json({
        error: 'shipping_timeout',
        message: 'No pudimos cotizar envíos en este momento. Intenta de nuevo.',
        _debug: {
          status: axiosError?.response?.status,
          data: axiosError?.response?.data,
          message: axiosError?.message,
        },
      })
    }

    // Skydropx Pro v2: las cotizaciones llegan en `data.attributes.rates`
    // o como recursos `included`. Mapeamos defensivamente.
    const rawRates = skydropxData?.data?.attributes?.rates
      || skydropxData?.included
      || skydropxData?.rates
      || skydropxData?.data
      || []

    const quotes = (Array.isArray(rawRates) ? rawRates : [])
      .filter((q: any) => {
        // Solo nos quedamos con recursos tipo "rates" si vienen en `included`
        if (q.type && q.type !== 'rates') return false
        return true
      })
      .map((q: any) => {
        const attrs = q.attributes || q
        return {
          carrier: attrs.provider_name || attrs.carrier_name || attrs.carrier,
          service: attrs.provider_service_name || attrs.service_level_name || attrs.service,
          price: Number(attrs.total || attrs.amount_local || attrs.total_pricing || 0),
          eta: attrs.days || attrs.days_transit,
        }
      })
      .filter((q: any) => q.price > 0)

    // Expira en 15 minutos
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000)

    await prisma.shippingQuote.create({
      data: {
        sessionId,
        destinationAddress: destination as any,
        quotesResponse: skydropxData as any,
        expiresAt,
      },
    })

    res.json({ data: quotes })
  } catch (error) {
    next(error)
  }
}
