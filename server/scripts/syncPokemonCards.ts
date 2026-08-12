/**
 * sync:pokemon — vuelca el dataset público de PokemonTCG/pokemon-tcg-data
 * (GitHub, mismo origen que api.pokemontcg.io pero sin rate limit ni caídas
 * intermitentes) en la tabla PokemonCardCache. No trae precios — el precio
 * de referencia se sigue consultando en vivo, pero solo al seleccionar una
 * carta puntual (ver getPokemonCard en tcgAdapters.ts), no en cada búsqueda.
 *
 * Uso:
 *   npm run sync:pokemon
 */
import 'dotenv/config'
import { PrismaPg } from '@prisma/adapter-pg'
import { Prisma, PrismaClient } from '@prisma/client'
import { withRetry } from '../lib/retry'
import { buildCacheRow, RawCard, RawSet } from './pokemonSyncTransform'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

const DATASET_BASE = 'https://raw.githubusercontent.com/PokemonTCG/pokemon-tcg-data/master'
const UPSERT_BATCH_SIZE = 50

async function fetchJson<T>(url: string): Promise<T> {
  return withRetry(
    async () => {
      const res = await fetch(url)
      if (!res.ok) throw new Error(`Dataset de GitHub respondió ${res.status} en ${url}`)
      return res.json() as Promise<T>
    },
    { label: `sync:pokemon ${url}`, shouldRetry: () => true }
  )
}

export async function syncPokemonCards(): Promise<{ totalSets: number; totalCards: number }> {
  console.log('[sync:pokemon] descargando catálogo de sets…')
  const sets = await fetchJson<RawSet[]>(`${DATASET_BASE}/sets/en.json`)
  console.log(`[sync:pokemon] ${sets.length} sets encontrados`)

  let totalCards = 0

  for (const set of sets) {
    const cards = await fetchJson<RawCard[]>(`${DATASET_BASE}/cards/en/${set.id}.json`)
    const rows = cards.map((card) => buildCacheRow(card, set))

    for (let i = 0; i < rows.length; i += UPSERT_BATCH_SIZE) {
      const batch = rows.slice(i, i + UPSERT_BATCH_SIZE)
      await Promise.all(
        batch.map((row) => {
          // Prisma 7 tipa `metadata` como InputJsonValue — el tipo puro
          // PokemonCacheRow (Task 2, no se toca) usa Record<string, unknown>,
          // que no es asignable estructuralmente. Cast puntual acá, no en la
          // transformación pura.
          const data = { ...row, metadata: row.metadata as Prisma.InputJsonValue }
          return prisma.pokemonCardCache.upsert({
            where: { id: row.id },
            create: data,
            update: data,
          })
        })
      )
    }

    totalCards += rows.length
    console.log(`[sync:pokemon] ${set.id} (${set.name}): ${rows.length} cartas`)
  }

  console.log(`[sync:pokemon] listo — ${totalCards} cartas en ${sets.length} sets`)
  return { totalSets: sets.length, totalCards }
}

if (require.main === module) {
  syncPokemonCards()
    .catch((err) => {
      console.error('[sync:pokemon] falló:', err)
      process.exitCode = 1
    })
    .finally(() => prisma.$disconnect())
}
