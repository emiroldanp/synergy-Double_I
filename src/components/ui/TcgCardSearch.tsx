import { useState, useEffect, useRef, useCallback } from 'react'
import { tcgApi } from '@/lib/api'
import type { TcgCardResult } from '@/types'

type Franchise = 'pokemon' | 'magic' | 'lorcana'

interface Props {
  franchise: Franchise
  onSelect: (card: TcgCardResult) => void
  onImageImported?: (url: string) => void
}

const FRANCHISE_LABEL: Record<Franchise, string> = {
  pokemon: 'Pokémon TCG',
  magic: 'Scryfall (Magic)',
  lorcana: 'Lorcast (Lorcana)',
}

export function TcgCardSearch({ franchise, onSelect, onImageImported }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<TcgCardResult[]>([])
  const [loading, setLoading] = useState(false)
  const [apiWarning, setApiWarning] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [importingImage, setImportingImage] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const search = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([])
      setOpen(false)
      return
    }

    setLoading(true)
    setApiWarning(null)

    try {
      const { data } = await tcgApi.search(franchise, q)
      setResults(data.data ?? [])
      setApiWarning(data.warning ?? null)
      setOpen(true)
    } catch {
      setResults([])
      setApiWarning('No se pudo conectar con la API. Ingresa los datos manualmente.')
      setOpen(true)
    } finally {
      setLoading(false)
    }
  }, [franchise])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(query), 650)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query, search])

  // Limpiar al cambiar franquicia
  useEffect(() => {
    setQuery('')
    setResults([])
    setOpen(false)
    setApiWarning(null)
  }, [franchise])

  // Cerrar al hacer click fuera
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  async function handleSelect(card: TcgCardResult) {
    setOpen(false)
    setQuery(card.name)
    onSelect(card)

    // Descargar imagen a R2 si hay URL externa
    if (card.imageUrl && onImageImported) {
      setImportingImage(true)
      try {
        const { data } = await tcgApi.importImage(card.imageUrl)
        if (data.data?.url) onImageImported(data.data.url)
      } catch {
        // Si falla la descarga, no bloquemos — el admin puede subir imagen manualmente
      } finally {
        setImportingImage(false)
      }
    }
  }

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder={`Buscar carta en ${FRANCHISE_LABEL[franchise]}…`}
          className="w-full rounded-lg border border-gray-600 bg-gray-800 px-4 py-2.5 pr-10 text-sm text-white placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
        <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
          {loading ? (
            <svg className="h-4 w-4 animate-spin text-gray-400" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
          ) : (
            <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
            </svg>
          )}
        </div>
      </div>

      {importingImage && (
        <p className="mt-1 text-xs text-indigo-400">Descargando imagen al servidor…</p>
      )}

      {apiWarning && (
        <p className="mt-1 text-xs text-yellow-400">{apiWarning}</p>
      )}

      {open && (results.length > 0 || apiWarning) && (
        <ul className="absolute z-50 mt-1 max-h-72 w-full overflow-y-auto rounded-lg border border-gray-600 bg-gray-800 shadow-xl">
          {results.length === 0 && (
            <li className="px-4 py-3 text-sm text-gray-400">No se encontraron resultados</li>
          )}
          {results.map((card) => (
            <li key={card.externalId}>
              <button
                type="button"
                onClick={() => handleSelect(card)}
                className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-gray-700"
              >
                {card.imageUrl ? (
                  <img
                    src={card.imageUrl}
                    alt={card.name}
                    className="h-12 w-9 flex-shrink-0 rounded object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="h-12 w-9 flex-shrink-0 rounded bg-gray-700" />
                )}
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-white">{card.name}</p>
                  <p className="truncate text-xs text-gray-400">
                    {[card.setName, card.cardNumber && `#${card.cardNumber}`, card.rarity]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                  {card.marketPriceUsd && (
                    <p className="text-xs text-green-400">${card.marketPriceUsd.toFixed(2)} USD ref.</p>
                  )}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
