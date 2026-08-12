import { parseReleaseDate, buildCacheRow } from '../scripts/pokemonSyncTransform'

describe('parseReleaseDate', () => {
  it('parsea fecha en formato YYYY/MM/DD del dataset', () => {
    expect(parseReleaseDate('1999/01/09')).toEqual(new Date('1999-01-09T00:00:00.000Z'))
  })

  it('devuelve null si el formato no coincide', () => {
    expect(parseReleaseDate('fecha inválida')).toBeNull()
  })
})

describe('buildCacheRow', () => {
  const set = { id: 'base1', name: 'Base', series: 'Base', releaseDate: '1999/01/09' }
  const card = {
    id: 'base1-1',
    name: 'Alakazam',
    number: '1',
    rarity: 'Rare Holo',
    images: {
      small: 'https://images.pokemontcg.io/base1/1_small.png',
      large: 'https://images.pokemontcg.io/base1/1.png',
    },
    supertype: 'Pokémon',
    subtypes: ['Stage 2'],
    hp: '80',
    types: ['Psychic'],
    artist: 'Ken Sugimori',
  }

  it('arma la fila combinando datos de la carta y del set', () => {
    const row = buildCacheRow(card, set)
    expect(row.id).toBe('base1-1')
    expect(row.name).toBe('Alakazam')
    expect(row.nameLower).toBe('alakazam')
    expect(row.cardNumber).toBe('1')
    expect(row.setName).toBe('Base')
    expect(row.setSeries).toBe('Base')
    expect(row.rarity).toBe('Rare Holo')
    expect(row.imageUrl).toBe('https://images.pokemontcg.io/base1/1.png')
    expect(row.imageSmallUrl).toBe('https://images.pokemontcg.io/base1/1_small.png')
    expect(row.releaseDate).toEqual(new Date('1999-01-09T00:00:00.000Z'))
    expect(row.externalUrl).toBe(
      'https://www.tcgplayer.com/search/pokemon/product?productLineName=pokemon&q=Alakazam'
    )
    expect(row.metadata).toMatchObject({ hp: '80', artist: 'Ken Sugimori', types: ['Psychic'] })
  })

  it('usa la imagen small si la carta no trae large', () => {
    const cardSinLarge = { ...card, images: { small: 'https://x/small.png' } }
    const row = buildCacheRow(cardSinLarge, set)
    expect(row.imageUrl).toBe('https://x/small.png')
  })

  it('deja campos opcionales en null cuando la carta no los trae', () => {
    const cardMinima = { id: 'xy1-1', name: 'Pidgey' }
    const row = buildCacheRow(cardMinima, set)
    expect(row.cardNumber).toBeNull()
    expect(row.rarity).toBeNull()
    expect(row.imageUrl).toBeNull()
  })
})
