import type { Product } from '@/types'

interface Props {
  product: Product
}

function DetailRow({ label, value }: { label: string; value?: string | number | null }) {
  if (!value && value !== 0) return null
  return (
    <div className="flex justify-between px-4 py-2.5 border-b border-navy/20 last:border-0">
      <span className="font-exo text-xs text-ash">{label}</span>
      <span className="font-exo text-xs text-frost text-right max-w-[60%]">{String(value)}</span>
    </div>
  )
}

function PokemonDetails({ meta }: { meta: Record<string, unknown> }) {
  const attacks = meta.attacks as Array<{ name: string; damage: string; text: string }> | undefined
  return (
    <>
      <DetailRow label="Tipo" value={Array.isArray(meta.types) ? (meta.types as string[]).join(', ') : null} />
      <DetailRow label="HP" value={meta.hp as string} />
      <DetailRow label="Supertipo" value={meta.supertype as string} />
      <DetailRow label="Subtipo" value={Array.isArray(meta.subtypes) ? (meta.subtypes as string[]).join(', ') : null} />
      <DetailRow label="Artista" value={meta.artist as string} />
      <DetailRow label="Serie" value={meta.series as string} />
      <DetailRow label="Fecha de lanzamiento" value={meta.releaseDate as string} />
      {attacks && attacks.length > 0 && (
        <div className="px-4 py-3 border-b border-navy/20">
          <p className="font-exo text-xs text-ash mb-2">Ataques</p>
          <ul className="space-y-1">
            {attacks.map((a) => (
              <li key={a.name} className="text-xs text-frost">
                <span className="font-semibold">{a.name}</span>
                {a.damage && <span className="text-ash ml-2">— {a.damage}</span>}
                {a.text && <p className="text-ash/70 mt-0.5">{a.text}</p>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  )
}

function MagicDetails({ meta }: { meta: Record<string, unknown> }) {
  return (
    <>
      <DetailRow label="Costo de maná" value={meta.manaCost as string} />
      <DetailRow label="CMC" value={meta.cmc as number} />
      <DetailRow label="Tipo" value={meta.typeLine as string} />
      <DetailRow label="Color" value={Array.isArray(meta.colors) && (meta.colors as string[]).length > 0 ? (meta.colors as string[]).join(', ') : 'Incoloro'} />
      <DetailRow label="Artista" value={meta.artist as string} />
      <DetailRow label="Fecha de lanzamiento" value={meta.releaseDate as string} />
      {meta.oracleText && (
        <div className="px-4 py-3 border-b border-navy/20">
          <p className="font-exo text-xs text-ash mb-1">Texto de reglas</p>
          <p className="text-xs text-frost/80 whitespace-pre-line">{meta.oracleText as string}</p>
        </div>
      )}
    </>
  )
}

function LorcanaDetails({ meta }: { meta: Record<string, unknown> }) {
  return (
    <>
      <DetailRow label="Tinta" value={meta.ink as string} />
      <DetailRow label="Costo" value={meta.cost as number} />
      <DetailRow label="Tipo" value={meta.type as string} />
      <DetailRow label="Fuerza" value={meta.strength as number} />
      <DetailRow label="Voluntad" value={meta.willpower as number} />
      <DetailRow label="Lore" value={meta.lore as number} />
      <DetailRow label="Clasificaciones" value={Array.isArray(meta.classifications) ? (meta.classifications as string[]).join(', ') : null} />
      <DetailRow label="Ilustrador" value={Array.isArray(meta.illustrators) ? (meta.illustrators as string[]).join(', ') : null} />
      {meta.text && (
        <div className="px-4 py-3 border-b border-navy/20">
          <p className="font-exo text-xs text-ash mb-1">Texto de carta</p>
          <p className="text-xs text-frost/80 whitespace-pre-line">{meta.text as string}</p>
        </div>
      )}
      {meta.flavorText && (
        <div className="px-4 py-3">
          <p className="text-xs text-ash/60 italic">{meta.flavorText as string}</p>
        </div>
      )}
    </>
  )
}

const EXTERNAL_SOURCE_LABEL: Record<string, string> = {
  pokemontcg: 'Pokémon TCG',
  scryfall: 'Scryfall',
  lorcast: 'Lorcast',
}

// Solo se renderiza si el producto tiene tcgMetadata cargado desde la API
export function TcgCardDetails({ product }: Props) {
  const meta = product.tcgMetadata
  const source = product.externalSource

  if (!meta || !source) return null

  const externalUrl =
    source === 'scryfall' && product.externalId
      ? null // scryfall_uri ya está en metadata
      : source === 'lorcast' && product.externalId
      ? `https://lorcast.com/cards/${product.externalId}`
      : source === 'pokemontcg' && product.externalId
      ? `https://www.tcgplayer.com/search/pokemon/product?productLineName=pokemon&q=${encodeURIComponent(product.name)}`
      : null

  const scryfallUri = source === 'scryfall' ? (meta as any).scryfallUri ?? null : null
  const finalExternalUrl = scryfallUri ?? externalUrl

  return (
    <div className="mt-8">
      <h3 className="font-exo text-sm font-semibold text-frost mb-3">Detalles de la carta</h3>
      <div className="border border-navy/40 divide-y divide-navy/30">
        {source === 'pokemontcg' && <PokemonDetails meta={meta} />}
        {source === 'scryfall' && <MagicDetails meta={meta} />}
        {source === 'lorcast' && <LorcanaDetails meta={meta} />}
      </div>

      {finalExternalUrl && (
        <a
          href={finalExternalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
        >
          Ver ficha completa en {EXTERNAL_SOURCE_LABEL[source] ?? source}
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
      )}
    </div>
  )
}
