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

// Normaliza números de carta para comparar entre fuentes que los formatean
// distinto (ej. mirror local "60" sin padding vs TCGdex "060" con padding).
function normalizeCardNumber(n: string | null): string {
  if (!n) return ''
  return /^\d+$/.test(n) ? String(parseInt(n, 10)) : n.trim().toLowerCase()
}

// Permite buscar por nombre solo, o nombre + número de carta con separador
// "-", "#" o un espacio: "Umbreon ex - 176", "Umbreon ex #176", "Umbreon ex 176".
function parseCardQuery(raw: string): { name: string; cardNumber: string | null } {
  const trimmed = raw.trim()
  const m = /^(.+?)\s*(?:[-#]\s*|\s+)(\d+)\s*$/.exec(trimmed)
  if (m && m[1].trim().length > 0) {
    return { name: m[1].trim(), cardNumber: m[2] }
  }
  return { name: trimmed, cardNumber: null }
}

function dedupeKey(card: TcgCardResult): string {
  // Se despoja todo lo que no sea letra/número (espacios, guiones, etc.)
  // porque el mismo nombre viene distinto entre fuentes: el mirror local usa
  // "Umbreon-EX" (guion) y TCGdex devuelve "Umbreon EX" (espacio) para la
  // misma carta física — sin esto se mostraría duplicada.
  const normalizedName = card.name.toLowerCase().replace(/[^a-z0-9]/g, '')
  return `${normalizedName}|${normalizeCardNumber(card.cardNumber)}`
}

async function searchPokemonLocalAll(name: string, cardNumber: string | null): Promise<TcgCardResult[]> {
  const words = name.trim().toLowerCase().split(/\s+/).filter(Boolean)
  const where = {
    AND: words.map((w) => ({ nameLower: { contains: w } })),
    ...(cardNumber ? { cardNumber } : {}),
  }

  const rows = await prisma.pokemonCardCache.findMany({
    where,
    orderBy: [{ releaseDate: 'desc' }, { id: 'asc' }],
  })

  return rows.map(normalizePokemonCacheRow)
}

// ─────────────────────────────────────────────────────────────────────────────
// TCGdex (api.tcgdex.net/v2/graphql) — se consulta SIEMPRE junto al mirror local
// (no solo cuando el mirror da cero resultados) para cubrir cartas que el
// dataset de GitHub todavía no sincronizó, típicamente promocionales que se
// agregan de forma continua a un set ya existente (ej. "svp"). TCGdex también
// indexa Pokémon TCG Pocket (juego digital, serie "tcgp") — se excluye porque
// esas cartas no existen físicamente y no aplican a una tienda de cartas.
// ─────────────────────────────────────────────────────────────────────────────

const TCGDEX_GRAPHQL_URL = 'https://api.tcgdex.net/v2/graphql'

let pocketSetIdsCache: { ids: Set<string>; expiresAt: number } | null = null

// Lista de sets de Pokémon TCG Pocket (serie "tcgp"), para excluirlos de los
// resultados. Se pide en una consulta aparte — pedir `serie` anidado dentro
// de cada carta hace que TCGdex anule la carta ENTERA (no solo ese campo)
// cuando esa carta puntual no tiene serie resuelta en su backend (visto en
// vivo: 10/10 cartas devueltas como `null` al pedir `set { serie { id } }`).
async function getPocketSetIds(): Promise<Set<string>> {
  if (pocketSetIdsCache && pocketSetIdsCache.expiresAt > Date.now()) {
    return pocketSetIdsCache.ids
  }

  try {
    const json = await withRetry(
      async () => {
        const res = await fetchWithTimeout(TCGDEX_GRAPHQL_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: `{ serie(id: "tcgp") { sets { id } } }` }),
        })
        if (!res.ok) throw new Error(`TCGdex API respondió ${res.status}`)
        const parsed = await res.json()
        if (!parsed.data) throw new Error('TCGdex: no se pudo obtener sets de Pokémon TCG Pocket')
        return parsed
      },
      { label: 'TCGdex pocket set ids', shouldRetry: () => true }
    )

    const ids: string[] = (json.data?.serie?.sets ?? []).map((s: any) => s.id)
    pocketSetIdsCache = { ids: new Set(ids), expiresAt: Date.now() + CACHE_TTL_MS }
    return pocketSetIdsCache.ids
  } catch {
    // Si no se puede traer la lista, mejor no filtrar nada (no perder cartas
    // físicas reales) que bloquear la búsqueda por esto.
    return new Set()
  }
}

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
    // TCGdex no expone precio de mercado en esta consulta — se consulta en
    // vivo solo al seleccionar la carta, igual que las cartas del mirror.
    marketPriceUsd: null,
    externalUrl: null,
    metadata: { category: card.category },
  }
}

async function fetchTcgdexAll(name: string): Promise<TcgCardResult[]> {
  const cacheKey = `tcgdex:${name.toLowerCase()}`
  const cached = getCached(cacheKey)
  if (cached) return cached.results

  const body = {
    query: `query($name: String!) { cards(filters: { name: $name }) { id localId name image rarity category set { id name } } }`,
    variables: { name: name.trim() },
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
      // GraphQL puede devolver `errors` junto con `data` parcial (ej. un campo
      // no-nulo que no resolvió para una carta puntual) — solo tratamos como
      // fallo real si no hay `data` utilizable, no por cualquier error parcial.
      if (!parsed.data) throw new Error(`TCGdex GraphQL error: ${parsed.errors?.[0]?.message ?? 'respuesta sin data'}`)
      return parsed
    },
    { label: 'TCGdex search', shouldRetry: () => true }
  )

  const cards: any[] = json.data?.cards ?? []
  const pocketSetIds = await getPocketSetIds()
  const physicalOnly = cards.filter((c) => !pocketSetIds.has(c.set?.id))
  const results = physicalOnly.map(normalizeTcgdex)

  setCached(cacheKey, { results, hasMore: false })
  return results
}

export async function searchPokemon(query: string, page = 1): Promise<TcgSearchResult> {
  const { name, cardNumber } = parseCardQuery(query)

  const local = await searchPokemonLocalAll(name, cardNumber)
  if (local.length === 0) {
    // Se deja esta señal en logs porque este mismo plan existe por una falla
    // silenciosa anterior: un mirror vacío o sin sincronizar debe ser visible.
    console.warn(`[tcg] mirror local de Pokémon sin resultados para "${query}" — buscando también en TCGdex`)
  }

  let tcgdex: TcgCardResult[] = []
  try {
    tcgdex = await fetchTcgdexAll(name)
    if (cardNumber) {
      const target = normalizeCardNumber(cardNumber)
      tcgdex = tcgdex.filter((c) => normalizeCardNumber(c.cardNumber) === target)
    }
  } catch {
    // TCGdex no disponible — seguimos solo con lo que haya en el mirror local,
    // no bloqueamos la búsqueda por esto.
  }

  const seen = new Set(local.map(dedupeKey))
  const extra = tcgdex.filter((c) => !seen.has(dedupeKey(c)))
  const merged = [...local, ...extra]

  const start = (page - 1) * TCG_PAGE_SIZE
  const end = page * TCG_PAGE_SIZE
  return {
    results: merged.slice(start, end),
    hasMore: merged.length > end,
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

// Solo para tests: las cachés de este módulo son a nivel de módulo (sobreviven
// entre `it()` de un mismo archivo) — sin esto, el mock de fetch de un test
// no se volvería a llamar en el siguiente si la clave de caché coincide.
export function __resetTcgCachesForTests(): void {
  cache.clear()
  pocketSetIdsCache = null
}
