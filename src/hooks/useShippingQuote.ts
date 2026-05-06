import { useState } from 'react'
import type { ShippingOption } from '@/types'

type Status = 'idle' | 'loading' | 'success' | 'error'

const MOCK_SHIPPING_OPTIONS: ShippingOption[] = [
  { id: 'estafeta-express', carrier: 'estafeta', service: 'Estafeta Express', price: 120, eta: '2-3 días hábiles' },
  { id: 'dhl-express', carrier: 'dhl', service: 'DHL Express', price: 185, eta: '1-2 días hábiles' },
  { id: 'fedex-economy', carrier: 'fedex', service: 'FedEx Economy', price: 145, eta: '3-5 días hábiles' },
]

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

    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('timeout')), 5000)
    )

    try {
      const result = await Promise.race([
        fetch(`${import.meta.env.VITE_API_URL}/api/shipping/quote`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ address }),
        }).then((r) => r.json()),
        timeout,
      ])
      setOptions(result.options || MOCK_SHIPPING_OPTIONS)
      setStatus('success')
    } catch {
      setOptions(MOCK_SHIPPING_OPTIONS)
      setStatus('success')
    }
  }

  return { status, options, selected, setSelected, fetchQuote }
}
