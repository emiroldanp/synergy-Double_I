import { Request, Response, NextFunction } from 'express'
import axios from 'axios'
import { prisma } from '../lib/prisma'

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

/**
 * POST /api/shipping/quote
 * Cotiza envíos vía Skydropx y guarda el resultado en ShippingQuote.
 * Si Skydropx no responde en 5 segundos, devuelve 503 con mensaje amigable.
 */
export async function quoteShipping(req: Request, res: Response, next: NextFunction) {
  try {
    const { destination, parcel, sessionId } = req.body as QuoteRequestBody

    if (!destination || !parcel || !sessionId) {
      return res.status(400).json({ error: 'Faltan campos requeridos: destination, parcel, sessionId' })
    }

    const payload = {
      origin_address: {
        zip_code: process.env.SKYDROPX_ORIGIN_ZIP,
      },
      destination_address: {
        street: destination.street,
        number: destination.number,
        neighborhood: destination.neighborhood,
        city: destination.city,
        state: destination.state,
        zip_code: destination.zip_code,
      },
      parcel: {
        weight: parcel.weight,
        length: parcel.length,
        width: parcel.width,
        height: parcel.height,
      },
    }

    let skydropxData: any

    try {
      const response = await axios.post('https://api.skydropx.com/v1/quotations', payload, {
        headers: {
          Authorization: `Token token=${process.env.SKYDROPX_API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 5000,
      })
      skydropxData = response.data
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

    // Transforma la respuesta de Skydropx al formato simplificado
    const quotes = (skydropxData?.data || []).map((q: any) => ({
      carrier: q.attributes?.carrier || q.carrier,
      service: q.attributes?.service || q.service,
      price: q.attributes?.total_pricing || q.total_pricing,
      eta: q.attributes?.days_transit || q.days_transit,
    }))

    // Expira en 15 minutos
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000)

    await prisma.shippingQuote.create({
      data: {
        sessionId,
        // Cast explícito a JsonNull | InputJsonValue requerido por Prisma para campos Json
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
