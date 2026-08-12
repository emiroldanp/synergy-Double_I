import { prismaMock } from './mocks/prisma.mock'

jest.mock('../lib/prisma', () => ({ prisma: prismaMock }))

import { searchPokemon } from '../lib/tcgAdapters'

describe('searchPokemon', () => {
  const originalFetch = global.fetch

  afterEach(() => {
    jest.clearAllMocks()
    global.fetch = originalFetch
  })

  it('devuelve resultados del mirror local sin llamar a ninguna API externa', async () => {
    ;(prismaMock.pokemonCardCache.findMany as jest.Mock).mockResolvedValue([
      {
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
      },
    ])
    ;(prismaMock.pokemonCardCache.count as jest.Mock).mockResolvedValue(1)
    global.fetch = jest.fn()

    const result = await searchPokemon('Alakazam')

    expect(result.results).toHaveLength(1)
    expect(result.results[0]).toMatchObject({
      externalId: 'base1-1',
      externalSource: 'pokemontcg',
      name: 'Alakazam',
      marketPriceUsd: null,
    })
    expect(result.hasMore).toBe(false)
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('cae a TCGdex cuando el mirror local no tiene coincidencias', async () => {
    ;(prismaMock.pokemonCardCache.findMany as jest.Mock).mockResolvedValue([])
    ;(prismaMock.pokemonCardCache.count as jest.Mock).mockResolvedValue(0)

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          cards: [
            {
              id: 'basep-1',
              localId: '1',
              name: 'Pikachu',
              image: 'https://assets.tcgdex.net/en/base/basep/1',
              rarity: 'Common',
              category: 'Pokemon',
              set: { name: 'Wizards Black Star Promos' },
            },
          ],
        },
      }),
    }) as unknown as typeof fetch

    const result = await searchPokemon('Pikachu (set nuevo sin sincronizar)')

    expect(result.results).toHaveLength(1)
    expect(result.results[0]).toMatchObject({
      externalId: 'basep-1',
      externalSource: 'tcgdex',
      name: 'Pikachu',
      imageUrl: 'https://assets.tcgdex.net/en/base/basep/1/high.png',
      marketPriceUsd: null,
    })
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.tcgdex.net/v2/graphql',
      expect.objectContaining({ method: 'POST' })
    )
  })
})
