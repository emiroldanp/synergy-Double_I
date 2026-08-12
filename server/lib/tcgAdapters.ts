/**
 * Adaptadores para las 3 APIs de cartas TCG.
 * Cada uno normaliza la respuesta al formato común TcgCardResult.
 *
 * Las funciones de búsqueda (searchPokemon/searchScryfall/searchLorcast) NO
 * atrapan errores de red/timeout/5xx internamente — los dejan propagar (después
 * de reintentar con withRetry) para que el controlador los convierta en un
 * `warning` visible en el admin. Antes se devolvía silenciosamente un array
 * vacío, lo que hacía parecer que "mostrar más resultados" no hacía nada
 * cuando en realidad la API pública fallaba (timeout / 500 intermitentes,
 * comunes en pokemontcg.io sin verse como error explícito).
 */
import { withRetry } from './retry'
import { prisma } from './prisma'

export interface TcgCardResult {
  externalId: string
  externalSource: 'pokemontcg' | 'scryfall' | 'lorcast' | 'tcgdex'
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

function normalizePokemonCacheRow(row: {
  id: string
  name: string
  cardNumber: string | null
  setName: string | null
  rarity: string | null
  imageUrl: string | null
  imageSmallUrl: string | null
  externalUrl: string | null
  metadata: unknown
}): TcgCardResult {
  return {
    externalId: row.id,
    externalSource: 'pokemontcg',
    name: row.name,
    cardNumber: row.cardNumber,
    setName: row.setName,
    rarity: row.rarity,
    language: 'en',
    imageUrl: row.imageUrl,
    // El mirror local no trae precio (el dataset de GitHub no lo incluye) —
    // se consulta en vivo solo al seleccionar la carta, ver getPokemonCard().
    marketPriceUsd: null,
    externalUrl: row.externalUrl,
    metadata: { ...(row.metadata as Record<string, unknown>), imageSmall: row.imageSmallUrl },
  }
}

async function searchPokemonLocal(query: string, page: number): Promise<TcgSearchResult> {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean)
  const where = { AND: words.map((w) => ({ nameLower: { contains: w } })) }
  const skip = (page - 1) * TCG_PAGE_SIZE

  const [rows, total] = await Promise.all([
    prisma.pokemonCardCache.findMany({
      where,
      orderBy: [{ releaseDate: 'desc' }, { id: 'asc' }],
      skip,
      take: TCG_PAGE_SIZE,
    }),
    prisma.pokemonCardCache.count({ where }),
  ])

  return {
    results: rows.map(normalizePokemonCacheRow),
    hasMore: skip + rows.length < total,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// TCGdex (api.tcgdex.net/v2/graphql) — respaldo en vivo para Pokémon cuando el
// mirror local no tiene la carta (ej. set recién salido, aún no sincronizado)
// ─────────────────────────────────────────────────────────────────────────────

const TCGDEX_GRAPHQL_URL = 'https://api.tcgdex.net/v2/graphql'

function normalizeTcgdex(card: any): TcgCardResult {
  return {
    externalId: card.id,
    externalSource: 'tcgdex',
    name: card.name,
    cardNumber: card.localId ?? null,
    setName: card.set?.name ?? null,
    rarity: card.rarity && card.rarity !== 'None' ? card.rarity : null,
    language: 'en',
    imageUrl: card.image ? `${card.image}/high.png` : null,
    // TCGdex no expone precio de mercado en esta consulta — es un respaldo
    // ocasional, no la fuente principal, así que se acepta sin precio de ref.
    marketPriceUsd: null,
    externalUrl: null,
    metadata: { category: card.category },
  }
}

async function searchTcgdexPokemon(query: string, page: number): Promise<TcgSearchResult> {
  const cacheKey = `tcgdex:${query}`
  let all = getCached(cacheKey)

  if (!all) {
    const body = {
      query: `query($name: String!) { cards(filters: { name: $name }) { id localId name image rarity category set { name } } }`,
      variables: { name: query.trim() },
    }

    const json = await withRetry(
      async () => {
        const res = await fetchWithTimeout(TCGDEX_GRAPHQL_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        if (!res.ok) throw new Error(`TCGdex API respondió ${res.status}`)
        const parsed = await res.json()
        if (parsed.errors) throw new Error(`TCGdex GraphQL error: ${parsed.errors[0]?.message}`)
        return parsed
      },
      { label: 'TCGdex search (respaldo Pokémon)', shouldRetry: () => true }
    )

    const results: TcgCardResult[] = (json.data?.cards ?? []).map(normalizeTcgdex)
    all = { results, hasMore: false }
    setCached(cacheKey, all)
  }

  const start = (page - 1) * TCG_PAGE_SIZE
  const end = page * TCG_PAGE_SIZE
  return {
    results: all.results.slice(start, end),
    hasMore: all.results.length > end,
  }
}

export async function searchPokemon(query: string, page = 1): Promise<TcgSearchResult> {
  const local = await searchPokemonLocal(query, page)
  if (local.results.length > 0) return local

  // Sin coincidencias en el mirror local (carta de un set aún no sincronizado,
  // o mirror recién creado y sin poblar todavía) — respaldo en vivo. Se deja
  // esta señal en logs porque este mismo plan existe por una falla silenciosa
  // anterior: un mirror vacío o sin sincronizar debe ser visible para el equipo.
  console.warn(`[tcg] mirror local de Pokémon sin resultados para "${query}" — usando respaldo TCGdex`)
  return searchTcgdexPokemon(query, page)
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
    const url = `https://api.scryfall.com/cards/search?q=name:${encodeURIComponent(query)}&unique=prints&order=released&dir=desc`

    const json = await withRetry(
      async () => {
        const res = await fetchWithTimeout(url, { headers: SCRYFALL_HEADERS })
        // Scryfall responde 404 cuando el query no matchea ninguna carta —
        // es un resultado vacío legítimo, no una falla de la API (no reintentar).
        if (res.status === 404) return { data: [] }
        if (!res.ok) throw new Error(`Scryfall API respondió ${res.status}`)
        return res.json()
      },
      { label: 'Scryfall search', shouldRetry: () => true }
    )

    const results = (json.data ?? []).map(normalizeScryfall)
    all = { results, hasMore: false }
    setCached(cacheKey, all)
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
    const url = `https://api.lorcast.com/v0/cards/search?q=${encodeURIComponent(query)}&sort=-released_at`

    const json = await withRetry(
      async () => {
        const res = await fetchWithTimeout(url)
        if (!res.ok) throw new Error(`Lorcast API respondió ${res.status}`)
        return res.json()
      },
      { label: 'Lorcast search', shouldRetry: () => true }
    )

    const results = (json.results ?? []).map(normalizeLorcast)
    all = { results, hasMore: false }
    setCached(cacheKey, all)
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
