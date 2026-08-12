/**
 * Transformación pura del dataset público de PokemonTCG/pokemon-tcg-data
 * (mismo origen de datos que api.pokemontcg.io) al formato de PokemonCardCache.
 * Sin I/O — así se puede testear sin tocar red ni base de datos.
 */

export interface RawSet {
  id: string
  name: string
  series: string
  releaseDate: string
}

export interface RawCard {
  id: string
  name: string
  number?: string
  rarity?: string
  images?: { small?: string; large?: string }
  supertype?: string
  subtypes?: string[]
  hp?: string
  types?: string[]
  attacks?: unknown[]
  weaknesses?: unknown[]
  artist?: string
}

export interface PokemonCacheRow {
  id: string
  name: string
  nameLower: string
  cardNumber: string | null
  setName: string | null
  setSeries: string | null
  rarity: string | null
  imageUrl: string | null
  imageSmallUrl: string | null
  externalUrl: string | null
  releaseDate: Date | null
  metadata: Record<string, unknown>
}

/** El dataset usa fechas "YYYY/MM/DD". Devuelve null si no matchea ese formato. */
export function parseReleaseDate(raw: string): Date | null {
  const m = /^(\d{4})\/(\d{2})\/(\d{2})$/.exec(raw)
  if (!m) return null
  return new Date(`${m[1]}-${m[2]}-${m[3]}T00:00:00.000Z`)
}

export function buildCacheRow(card: RawCard, set: RawSet): PokemonCacheRow {
  return {
    id: card.id,
    name: card.name,
    nameLower: card.name.toLowerCase(),
    cardNumber: card.number ?? null,
    setName: set.name,
    setSeries: set.series,
    rarity: card.rarity ?? null,
    imageUrl: card.images?.large ?? card.images?.small ?? null,
    imageSmallUrl: card.images?.small ?? null,
    externalUrl: `https://www.tcgplayer.com/search/pokemon/product?productLineName=pokemon&q=${encodeURIComponent(card.name)}`,
    releaseDate: parseReleaseDate(set.releaseDate),
    metadata: {
      supertype: card.supertype,
      subtypes: card.subtypes,
      hp: card.hp,
      types: card.types,
      attacks: card.attacks,
      weaknesses: card.weaknesses,
      artist: card.artist,
      series: set.series,
      releaseDate: set.releaseDate,
    },
  }
}
