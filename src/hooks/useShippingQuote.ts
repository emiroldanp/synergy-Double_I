import { useState } from 'react'
import type { ShippingOption } from '@/types'

type Status = 'idle' | 'loading' | 'success' | 'error'

// Tamaños de caja según cantidad de piezas en el carrito. Antes se cotizaba
// siempre con una sola caja fija sin importar el pedido, lo que hacía que la
// cotización mostrada al cliente no se pareciera en nada al costo real que
// Irving termina pagando al generar la guía con un pedido grande/pesado.
// Valores iniciales — ajustar con datos reales de Irving conforme los tenga.
const PARCEL_TIERS = [
  { maxQuantity: 2, parcel: { weight: 0.5, length: 30, width: 22, height: 8 } },
  { maxQuantity: 6, parcel: { weight: 1.5, length: 35, width: 25, height: 15 } },
  { maxQuantity: Infinity, parcel: { weight: 3, length: 40, width: 30, height: 20 } },
]

function getParcelForQuantity(totalQuantity: number) {
  const tier = PARCEL_TIERS.find((t) => totalQuantity <= t.maxQuantity)
  return tier!.parcel
}

// Estados que califican como zona local (coordinar envío por WhatsApp con Irving)
const LOCAL_ZONE_PATTERNS = [
  /cdmx/i,
  /ciudad\s+de\s+m[eé]xico/i,
  /distrito\s+federal/i,
  /^d\.?f\.?$/i,
  /estado\s+de\s+m[eé]xico/i,
  /edomex/i,
  /edo\.?\s*m[eé]x/i,
]

export function isLocalZone(state: string): boolean {
  const s = state.trim()
  return LOCAL_ZONE_PATTERNS.some((re) => re.test(s))
}

// Opción sintética que se muestra cuando el destino es zona local
const LOCAL_SHIPPING_OPTION: ShippingOption = {
  id: 'whatsapp_local',
  carrier: 'whatsapp_local',
  service: 'whatsapp_local',
  price: 0,
  eta: 'A coordinar por WhatsApp',
}

export function useShippingQuote() {
  const [status, setStatus] = useState<Status>('idle')
  const [options, setOptions] = useState<ShippingOption[]>([])
  const [selected, setSelected] = useState<ShippingOption | null>(null)
  const [isLocal, setIsLocal] = useState(false)

  const fetchQuote = async (
    address: {
      street: string
      number: string
      colonia: string
      city: string
      state: string
      zip: string
    },
    totalQuantity: number
  ) => {
    // Zona local → skip Skydropx, mostrar opción WhatsApp directamente
    if (isLocalZone(address.state)) {
      setIsLocal(true)
      setOptions([LOCAL_SHIPPING_OPTION])
      setSelected(LOCAL_SHIPPING_OPTION)
      setStatus('success')
      return
    }

    setIsLocal(false)
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
          parcel: getParcelForQuantity(totalQuantity),
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

  return { status, options, selected, setSelected, fetchQuote, isLocal }
}
