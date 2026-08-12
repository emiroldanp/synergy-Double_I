import { prismaMock } from './mocks/prisma.mock'

jest.mock('../lib/prisma', () => ({ prisma: prismaMock }))

import { searchPokemon, __resetTcgCachesForTests } from '../lib/tcgAdapters'

/**
 * Mockea las dos llamadas que hace fetchTcgdexAll: la lista de sets de
 * Pokémon TCG Pocket (para excluirlos) y la búsqueda de cartas en sí.
 * Distingue una de otra por el contenido de la query GraphQL enviada.
 */
function mockTcgdexFetch(cards: any[], pocketSetIds: string[] = []) {
  global.fetch = jest.fn(async (_url: any, options: any) => {
    const body = JSON.parse(options.body)
    if (body.query.includes('serie(id: "tcgp")')) {
      return {
        ok: true,
        json: async () => ({ data: { serie: { sets: pocketSetIds.map((id) => ({ id })) } } }),
      } as any
    }
    return {
      ok: true,
      json: async () => ({ data: { cards } }),
    } as any
  }) as unknown as typeof fetch
}

function mockLocal(rows: any[]) {
  ;(prismaMock.pokemonCardCache.findMany as jest.Mock).mockResolvedValue(rows)
}

const alakazamRow = {
  id: 'base1-1',
  name: 'Alakazam',
  nameLower: 'alakazam',
  cardNumber: '1',
  setName: 'Base',
  setSeries: 'Base',
  rarity: 'Rare Holo',
  imageUrl: 'https://images.pokemontcg.io/base1/1.png',
  imageSmallUrl: 'https://images.pokemontcg.io/base1/1_small.png',
  externalUrl: 'https://www.tcgplayer.com/search/pokemon/product?q=Alakazam',
  releaseDate: new Date('1999-01-09'),
  metadata: { hp: '80' },
  syncedAt: new Date(),
}

describe('searchPokemon', () => {
  const originalFetch = global.fetch

  afterEach(() => {
    jest.clearAllMocks()
    global.fetch = originalFetch
    __resetTcgCachesForTests()
  })

  it('devuelve resultados del mirror local aunque TCGdex no aporte nada nuevo', async () => {
    mockLocal([alakazamRow])
    mockTcgdexFetch([
      {
        id: 'base1-1-tcgdex',
        localId: '1',
        name: 'Alakazam',
        image: null,
        rarity: 'Rare Holo',
        category: 'Pokemon',
        set: { id: 'base1', name: 'Base' },
      },
    ])

    const result = await searchPokemon('Alakazam')

    expect(result.results).toHaveLength(1)
    expect(result.results[0]).toMatchObject({
      externalId: 'base1-1',
      externalSource: 'pokemontcg',
      name: 'Alakazam',
      marketPriceUsd: null,
    })
    expect(result.hasMore).toBe(false)
  })

  it('suma cartas de TCGdex que el mirror local no tiene, sin duplicar las que ya están', async () => {
    mockLocal([alakazamRow])
    mockTcgdexFetch([
      // Misma carta que ya está en el mirror local — no debe duplicarse
      { id: 'base1-1-tcgdex', localId: '1', name: 'Alakazam', image: null, rarity: 'Rare Holo', category: 'Pokemon', set: { id: 'base1', name: 'Base' } },
      // Carta nueva que el mirror todavía no sincronizó
      { id: 'svp-176', localId: '176', name: 'Umbreon ex', image: null, rarity: 'Promo', category: 'Pokemon', set: { id: 'svp', name: 'SVP Black Star Promos' } },
    ])

    const result = await searchPokemon('Alakazam')

    expect(result.results).toHaveLength(2)
    expect(result.results.map((r) => r.externalId)).toEqual(['base1-1', 'svp-176'])
    expect(result.results[1]).toMatchObject({ externalSource: 'tcgdex', name: 'Umbreon ex', cardNumber: '176' })
  })

  it('no duplica cuando el mismo nombre viene formateado distinto entre fuentes (guion vs espacio)', async () => {
    mockLocal([
      { ...alakazamRow, id: 'xy10-55', name: 'Umbreon-EX', nameLower: 'umbreon-ex', cardNumber: '55', setName: 'Fates Collide' },
    ])
    mockTcgdexFetch([
      { id: 'xy10-55', localId: '55', name: 'Umbreon EX', image: null, rarity: 'Ultra Rare', category: 'Pokemon', set: { id: 'xy10', name: 'Fates Collide' } },
    ])

    const result = await searchPokemon('Umbreon EX')

    expect(result.results).toHaveLength(1)
    expect(result.results[0].externalSource).toBe('pokemontcg')
  })

  it('parsea "nombre - número" y "nombre #número" y filtra por ese número exacto', async () => {
    mockLocal([])
    mockTcgdexFetch([
      { id: 'svp-176', localId: '176', name: 'Umbreon ex', image: null, rarity: 'Promo', category: 'Pokemon', set: { id: 'svp', name: 'SVP Black Star Promos' } },
      { id: 'sv08.5-060', localId: '060', name: 'Umbreon ex', image: null, rarity: 'Double rare', category: 'Pokemon', set: { id: 'sv08.5', name: 'Prismatic Evolutions' } },
    ])

    const withDash = await searchPokemon('Umbreon ex - 176')
    expect(withDash.results).toHaveLength(1)
    expect(withDash.results[0].externalId).toBe('svp-176')

    const withHash = await searchPokemon('Umbreon ex #176')
    expect(withHash.results).toHaveLength(1)
    expect(withHash.results[0].externalId).toBe('svp-176')
  })

  it('compara números de carta sin importar ceros a la izquierda (ej. "60" vs "060")', async () => {
    mockLocal([])
    mockTcgdexFetch([
      { id: 'sv08.5-060', localId: '060', name: 'Umbreon ex', image: null, rarity: 'Double rare', category: 'Pokemon', set: { id: 'sv08.5', name: 'Prismatic Evolutions' } },
    ])

    const result = await searchPokemon('Umbreon ex - 60')

    expect(result.results).toHaveLength(1)
    expect(result.results[0].externalId).toBe('sv08.5-060')
  })

  it('excluye cartas de Pokémon TCG Pocket (serie "tcgp", no son cartas físicas)', async () => {
    mockLocal([])
    mockTcgdexFetch(
      [
        { id: 'A4-112', localId: '112', name: 'Umbreon ex', image: null, rarity: 'Four Diamond', category: 'Pokemon', set: { id: 'A4', name: 'Wisdom of Sea and Sky' } },
        { id: 'ex10-112', localId: '112', name: 'Umbreon ex', image: null, rarity: 'Rare', category: 'Pokemon', set: { id: 'ex10', name: 'Unseen Forces' } },
      ],
      ['A4']
    )

    const result = await searchPokemon('Umbreon ex')

    expect(result.results).toHaveLength(1)
    expect(result.results[0].externalId).toBe('ex10-112')
  })

  it('si TCGdex falla, sigue devolviendo lo que haya en el mirror local sin romperse', async () => {
    mockLocal([alakazamRow])
    global.fetch = jest.fn().mockRejectedValue(new Error('network down'))

    const result = await searchPokemon('Alakazam')

    expect(result.results).toHaveLength(1)
    expect(result.results[0].externalSource).toBe('pokemontcg')
  })

  it('si el mirror local no tiene nada y TCGdex tampoco, devuelve vacío sin error', async () => {
    mockLocal([])
    mockTcgdexFetch([])

    const result = await searchPokemon('asdfqwertyzxcv')

    expect(result.results).toHaveLength(0)
    expect(result.hasMore).toBe(false)
  })
})
