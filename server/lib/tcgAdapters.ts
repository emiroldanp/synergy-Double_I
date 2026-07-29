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

export interface TcgSearchResult {
  results: TcgCardResult[]
  hasMore: boolean
}

// Tamaño de cada página; "mostrar más" pide la siguiente página y se puede repetir
// mientras la API tenga más resultados disponibles
const TCG_PAGE_SIZE = 20

const TCG_TIMEOUT_MS = 5000
// Los datos de cartas TCG son estáticos — 1 hora evita llamadas repetidas sin perder frescura
const CACHE_TTL_MS = 60 * 60 * 1000

const cache = new Map<string, { data: TcgSearchResult; expiresAt: number }>()

function getCached(key: string): TcgSearchResult | null {
  const entry = cache.get(key)
  if (entry && entry.expiresAt > Date.now()) return entry.data
  cache.delete(key)
  return null
}

function setCached(key: string, data: TcgSearchResult): void {
  cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS })
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

export async function searchPokemon(query: string, page = 1): Promise<TcgSearchResult> {
  const cacheKey = `pokemon:${query}:${page}`
  const cached = getCached(cacheKey)
  if (cached) return cached

  try {
    const apiKey = process.env.POKEMON_TCG_API_KEY
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (apiKey) headers['X-Api-Key'] = apiKey

    // La API de Pokémon TCG (Lucene) no soporta wildcards en frases con espacios.
    // Usamos solo el primer término + wildcard; pageSize grande cubre variantes (ex, vmax, etc.)
    const firstTerm = query.trim().split(/\s+/)[0]
    const url = `https://api.pokemontcg.io/v2/cards?q=name:${encodeURIComponent(firstTerm)}*&pageSize=${TCG_PAGE_SIZE}&page=${page}&orderBy=-set.releaseDate`
    const res = await fetchWithTimeout(url, { headers })

    if (!res.ok) return { results: [], hasMore: false }

    const json = await res.json()
    const totalCount: number = json.totalCount ?? 0

    // Filtrar resultados por el query completo (case-insensitive) para afinar sin romper la búsqueda
    const lowerQuery = query.toLowerCase()
    const all: TcgCardResult[] = (json.data ?? []).map(normalizePokemon)
    const filtered = all.filter((c) => c.name.toLowerCase().includes(lowerQuery.split(/\s+/)[0]))

    // Si el query tiene más de una palabra, intentar sub-filtrar por ellas
    const words = lowerQuery.split(/\s+/).slice(1)
    const filteredResults = words.length
      ? filtered.filter((c) => words.every((w) => c.name.toLowerCase().includes(w)))
      : filtered

    const results = filteredResults.length ? filteredResults : all
    // hasMore: sigue habiendo páginas mientras no se haya llegado al total real de la API
    const hasMore = page * TCG_PAGE_SIZE < totalCount
    const output: TcgSearchResult = { results, hasMore }

    setCached(cacheKey, output)
    return output
  } catch {
    return { results: [], hasMore: false }
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

export async function searchScryfall(query: string, page = 1): Promise<TcgSearchResult> {
  // Scryfall ya devuelve hasta ~175 impresiones en una sola llamada (page size fijo de su API),
  // así que basta con cachear el set completo una vez y paginar el corte que se muestra.
  const cacheKey = `scryfall:${query}`
  let all = getCached(cacheKey)

  if (!all) {
    try {
      const url = `https://api.scryfall.com/cards/search?q=name:${encodeURIComponent(query)}&unique=prints&order=released&dir=desc`
      const res = await fetchWithTimeout(url, { headers: SCRYFALL_HEADERS })

      if (!res.ok) return { results: [], hasMore: false }

      const json = await res.json()
      const results = (json.data ?? []).map(normalizeScryfall)
      all = { results, hasMore: false }
      setCached(cacheKey, all)
    } catch {
      return { results: [], hasMore: false }
    }
  }

  const start = (page - 1) * TCG_PAGE_SIZE
  const end = page * TCG_PAGE_SIZE
  return {
    results: all.results.slice(start, end),
    hasMore: all.results.length > end,
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

export async function searchLorcast(query: string, page = 1): Promise<TcgSearchResult> {
  // Lorcast devuelve todas las coincidencias en una sola llamada — cacheamos el set
  // completo una vez y paginamos el corte que se muestra.
  const cacheKey = `lorcast:${query}`
  let all = getCached(cacheKey)

  if (!all) {
    try {
      const url = `https://api.lorcast.com/v0/cards/search?q=${encodeURIComponent(query)}&sort=-released_at`
      const res = await fetchWithTimeout(url)

      if (!res.ok) return { results: [], hasMore: false }

      const json = await res.json()
      const results = (json.results ?? []).map(normalizeLorcast)
      all = { results, hasMore: false }
      setCached(cacheKey, all)
    } catch {
      return { results: [], hasMore: false }
    }
  }

  const start = (page - 1) * TCG_PAGE_SIZE
  const end = page * TCG_PAGE_SIZE
  return {
    results: all.results.slice(start, end),
    hasMore: all.results.length > end,
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
