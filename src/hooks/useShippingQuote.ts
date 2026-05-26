import { useState } from 'react'
import type { ShippingOption } from '@/types'

type Status = 'idle' | 'loading' | 'success' | 'error'

// Dimensiones estándar para tarjetas TCG selladas (ETB, booster bundle, etc.)
const DEFAULT_PARCEL = {
  weight: 0.5,
  length: 30,
  width: 22,
  height: 8,
}

export function useShippingQuote() {
  const [status, setStatus] = useState<Status>('idle')
  const [options, setOptions] = useState<ShippingOption[]>([])
  const [selected, setSelected] = useState<ShippingOption | null>(null)

  const fetchQuote = async (address: {
    street: string
    number: string
    colonia: string
    city: string
    state: string
    zip: string
  }) => {
    setStatus('loading')
    setOptions([])
    setSelected(null)

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/shipping/quote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          destination: {
            street: address.street,
            number: address.number,
            neighborhood: address.colonia,
            city: address.city,
            state: address.state,
            zip_code: address.zip,
          },
          parcel: DEFAULT_PARCEL,
          sessionId: crypto.randomUUID(),
        }),
      })

      if (!res.ok) {
        setStatus('error')
        return
      }

      const json = await res.json()
      const quotes: ShippingOption[] = (json.data ?? []).map((q: any, i: number) => ({
        id: `${q.carrier}-${i}`,
        carrier: (q.carrier ?? 'estafeta').toLowerCase() as ShippingOption['carrier'],
        service: q.service ?? q.carrier,
        price: Number(q.price ?? 0),
        eta: q.eta ? `${q.eta} días hábiles` : 'A confirmar',
      }))

      if (quotes.length === 0) {
        setStatus('error')
        return
      }

      setOptions(quotes)
      setStatus('success')
    } catch {
      setStatus('error')
    }
  }

  return { status, options, selected, setSelected, fetchQuote }
}
