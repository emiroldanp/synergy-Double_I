/**
 * Adaptadores para las 3 APIs de cartas TCG.
 * Cada uno normaliza la respuesta al formato común TcgCardResult.
 * Si una API no responde, el adaptador devuelve array vacío en lugar de lanzar error.
 */

export interface TcgCardResult {
  externalId: string
  externalSource: 'pokemontcg' | 'scryfall' | 'lorcast'
  name: string
  cardNumber: string | null
  setName: string | null
  rarity: string | null
  language: string | null
  imageUrl: string | null
  marketPriceUsd: number | null
  externalUrl: string | null
  metadata: Record<string, unknown>
}

const TCG_TIMEOUT_MS = 5000

// Cache en memoria con TTL de 2 minutos para evitar múltiples llamadas idénticas
const cache = new Map<string, { data: TcgCardResult[]; expiresAt: number }>()

function getCached(key: string): TcgCardResult[] | null {
  const entry = cache.get(key)
  if (entry && entry.expiresAt > Date.now()) return entry.data
  cache.delete(key)
  return null
}

function setCached(key: string, data: TcgCardResult[]): void {
  cache.set(key, { data, expiresAt: Date.now() + 2 * 60 * 1000 })
}

async function fetchWithTimeout(url: string, options: RequestInit = {}): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TCG_TIMEOUT_MS)
  try {
    return await fetch(url, { ...options, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Pokémon TCG API  (api.pokemontcg.io/v2)
// ─────────────────────────────────────────────────────────────────────────────

function parsePokemonPrice(card: any): number | null {
  const t = card.tcgplayer?.prices
  if (t?.holofoil?.market) return t.holofoil.market
  if (t?.normal?.market) return t.normal.market
  if (t?.['1stEditionHolofoil']?.market) return t['1stEditionHolofoil'].market
  const cm = card.cardmarket?.prices?.averageSellPrice
  return cm ?? null
}

function normalizePokemon(card: any): TcgCardResult {
  return {
    externalId: card.id,
    externalSource: 'pokemontcg',
    name: card.name,
    cardNumber: card.number ?? null,
    setName: card.set?.name ?? null,
    rarity: card.rarity ?? null,
    language: 'en',
    imageUrl: card.images?.large ?? card.images?.small ?? null,
    marketPriceUsd: parsePokemonPrice(card),
    externalUrl: `https://www.tcgplayer.com/search/pokemon/product?productLineName=pokemon&q=${encodeURIComponent(card.name)}`,
    metadata: {
      supertype: card.supertype,
      subtypes: card.subtypes,
      hp: card.hp,
      types: card.types,
      attacks: card.attacks,
      weaknesses: card.weaknesses,
      artist: card.artist,
      series: card.set?.series,
      releaseDate: card.set?.releaseDate,
      imageSmall: card.images?.small,
    },
  }
}

export async function searchPokemon(query: string): Promise<TcgCardResult[]> {
  const cacheKey = `pokemon:${query}`
  const cached = getCached(cacheKey)
  if (cached) return cached

  try {
    const apiKey = process.env.POKEMON_TCG_API_KEY
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (apiKey) headers['X-Api-Key'] = apiKey

    // La API de Pokémon TCG (Lucene) no soporta wildcards en frases con espacios.
    // Usamos solo el primer término + wildcard; pageSize grande cubre variantes (ex, vmax, etc.)
    const firstTerm = query.trim().split(/\s+/)[0]
    const url = `https://api.pokemontcg.io/v2/cards?q=name:${encodeURIComponent(firstTerm)}*&pageSize=50&orderBy=-set.releaseDate`
    const res = await fetchWithTimeout(url, { headers })

    if (!res.ok) return []

    const json = await res.json()
    // Filtrar resultados por el query completo (case-insensitive) para afinar sin romper la búsqueda
    const lowerQuery = query.toLowerCase()
    const all: TcgCardResult[] = (json.data ?? []).map(normalizePokemon)
    const filtered = all.filter((c) => c.name.toLowerCase().includes(lowerQuery.split(/\s+/)[0]))

    // Si el query tiene más de una palabra, intentar sub-filtrar por ellas
    const words = lowerQuery.split(/\s+/).slice(1)
    const results = words.length
      ? filtered.filter((c) => words.every((w) => c.name.toLowerCase().includes(w)))
      : filtered

    setCached(cacheKey, results.length ? results : all.slice(0, 20))
    return results.length ? results : all.slice(0, 20)
  } catch {
    return []
  }
}

export async function getPokemonCard(id: string): Promise<TcgCardResult | null> {
  try {
    const apiKey = process.env.POKEMON_TCG_API_KEY
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (apiKey) headers['X-Api-Key'] = apiKey

    const res = await fetchWithTimeout(`https://api.pokemontcg.io/v2/cards/${encodeURIComponent(id)}`, { headers })
    if (!res.ok) return null

    const json = await res.json()
    return normalizePokemon(json.data)
  } catch {
    return null
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Scryfall  (api.scryfall.com) — Magic: The Gathering
// ─────────────────────────────────────────────────────────────────────────────

const SCRYFALL_HEADERS = {
  'User-Agent': 'DoubleICards/1.0 hola@doubleicards.com',
  Accept: 'application/json',
}

function normalizeScryfall(card: any): TcgCardResult {
  const imageUrl =
    card.image_uris?.large ??
    card.image_uris?.normal ??
    card.card_faces?.[0]?.image_uris?.large ??
    null

  const priceStr = card.prices?.usd ?? card.prices?.usd_foil ?? null
  const marketPriceUsd = priceStr ? parseFloat(priceStr) : null

  return {
    externalId: card.id,
    externalSource: 'scryfall',
    name: card.name,
    cardNumber: card.collector_number ?? null,
    setName: card.set_name ?? null,
    rarity: card.rarity ?? null,
    language: card.lang ?? 'en',
    imageUrl,
    marketPriceUsd,
    externalUrl: card.scryfall_uri ?? null,
    metadata: {
      manaCost: card.mana_cost,
      cmc: card.cmc,
      typeLine: card.type_line,
      oracleText: card.oracle_text,
      colors: card.colors,
      keywords: card.keywords,
      artist: card.artist,
      releaseDate: card.released_at,
      setCode: card.set,
      priceFoil: card.prices?.usd_foil ?? null,
      imageSmall: card.image_uris?.small ?? card.card_faces?.[0]?.image_uris?.small ?? null,
    },
  }
}

export async function searchScryfall(query: string): Promise<TcgCardResult[]> {
  const cacheKey = `scryfall:${query}`
  const cached = getCached(cacheKey)
  if (cached) return cached

  try {
    const url = `https://api.scryfall.com/cards/search?q=name:${encodeURIComponent(query)}&unique=prints&order=released&dir=desc`
    const res = await fetchWithTimeout(url, { headers: SCRYFALL_HEADERS })

    if (!res.ok) return []

    const json = await res.json()
    const results = (json.data ?? []).slice(0, 20).map(normalizeScryfall)
    setCached(cacheKey, results)
    return results
  } catch {
    return []
  }
}

export async function getScryfallCard(id: string): Promise<TcgCardResult | null> {
  try {
    const res = await fetchWithTimeout(
      `https://api.scryfall.com/cards/${encodeURIComponent(id)}`,
      { headers: SCRYFALL_HEADERS }
    )
    if (!res.ok) return null

    const json = await res.json()
    return normalizeScryfall(json)
  } catch {
    return null
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Lorcast  (api.lorcast.com/v0) — Disney Lorcana
// ─────────────────────────────────────────────────────────────────────────────

function normalizeLorcast(card: any): TcgCardResult {
  const imageUrl =
    card.image_uris?.digital?.large ??
    card.image_uris?.digital?.normal ??
    null

  const priceStr = card.prices?.usd ?? card.prices?.usd_foil ?? null
  const marketPriceUsd = priceStr ? parseFloat(priceStr) : null

  return {
    externalId: card.id,
    externalSource: 'lorcast',
    name: card.name,
    cardNumber: card.collector_number ? String(card.collector_number) : null,
    setName: card.set?.name ?? null,
    rarity: card.rarity ?? null,
    language: 'en',
    imageUrl,
    marketPriceUsd,
    externalUrl: `https://lorcast.com/cards/${card.id}`,
    metadata: {
      version: card.version,
      type: card.type,
      classifications: card.classifications,
      text: card.text,
      cost: card.cost,
      ink: card.ink,
      strength: card.strength,
      willpower: card.willpower,
      lore: card.lore,
      keywords: card.keywords,
      illustrators: card.illustrators,
      flavorText: card.flavor_text,
      setCode: card.set?.code,
      priceFoil: card.prices?.usd_foil ?? null,
      imageSmall: card.image_uris?.digital?.small ?? null,
    },
  }
}

export async function searchLorcast(query: string): Promise<TcgCardResult[]> {
  const cacheKey = `lorcast:${query}`
  const cached = getCached(cacheKey)
  if (cached) return cached

  try {
    const url = `https://api.lorcast.com/v0/cards/search?q=${encodeURIComponent(query)}&sort=-released_at`
    const res = await fetchWithTimeout(url)

    if (!res.ok) return []

    const json = await res.json()
    const results = (json.results ?? []).slice(0, 20).map(normalizeLorcast)
    setCached(cacheKey, results)
    return results
  } catch {
    return []
  }
}

export async function getLorcastCard(id: string): Promise<TcgCardResult | null> {
  try {
    const res = await fetchWithTimeout(`https://api.lorcast.com/v0/cards/${encodeURIComponent(id)}`)
    if (!res.ok) return null

    const json = await res.json()
    return normalizeLorcast(json)
  } catch {
    return null
  }
}
