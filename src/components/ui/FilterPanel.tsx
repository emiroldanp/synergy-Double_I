import { cn } from '@/lib/utils'
import {
  FRANCHISE_LABELS,
  CONDITION_LABELS,
  RARITY_LABELS,
  EDITION_LABELS,
  VARIANT_LABELS,
  LANGUAGE_LABELS,
} from '@/lib/utils'
import type { FilterState, Franchise, Condition, Rarity, Edition, Variant, Language } from '@/types'

interface FilterPanelProps {
  filters: FilterState
  onUpdate: <K extends keyof FilterState>(key: K, value: FilterState[K]) => void
  onReset: () => void
  isMobileOpen?: boolean
  onMobileClose?: () => void
}

function FilterSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-navy/40 pb-4 mb-4">
      <h3 className="font-agency text-xs text-ash uppercase tracking-widest mb-3">{title}</h3>
      {children}
    </div>
  )
}

function CheckboxGroup<T extends string>({
  options,
  labels,
  selected,
  onChange,
}: {
  options: T[]
  labels: Record<T, string>
  selected: T[]
  onChange: (val: T[]) => void
}) {
  const toggle = (val: T) => {
    onChange(selected.includes(val) ? selected.filter((v) => v !== val) : [...selected, val])
  }
  return (
    <div className="space-y-2">
      {options.map((opt) => (
        <label key={opt} className="flex items-center gap-2 cursor-pointer group" onClick={() => toggle(opt)}>
          <div
            className={cn(
              'w-4 h-4 border flex items-center justify-center flex-shrink-0 transition-colors',
              selected.includes(opt)
                ? 'bg-royal border-royal'
                : 'border-navy/60 group-hover:border-dragon/60'
            )}
          >
            {selected.includes(opt) && (
              <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 10 10" fill="currentColor">
                <path d="M8.5 2L4 7.5 1.5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              </svg>
            )}
          </div>
          <span
            className={cn(
              'text-xs font-exo transition-colors',
              selected.includes(opt) ? 'text-frost' : 'text-ash group-hover:text-frost'
            )}
          >
            {labels[opt]}
          </span>
        </label>
      ))}
    </div>
  )
}

export function FilterPanel({
  filters,
  onUpdate,
  onReset,
  isMobileOpen,
  onMobileClose,
}: FilterPanelProps) {
  const content = (
    <div className="space-y-0">
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-agency text-white uppercase tracking-wider">Filtros</h2>
        <button
          onClick={onReset}
          className="text-xs text-dragon hover:text-frost transition-colors font-exo"
        >
          Limpiar todo
        </button>
      </div>

      <FilterSection title="Franquicia">
        <CheckboxGroup<Franchise>
          options={['pokemon', 'yugioh', 'lorcana']}
          labels={FRANCHISE_LABELS}
          selected={filters.franchise}
          onChange={(v) => onUpdate('franchise', v)}
        />
      </FilterSection>

      <FilterSection title="Condición">
        <CheckboxGroup<Condition>
          options={['mint', 'near_mint', 'lightly_played']}
          labels={CONDITION_LABELS}
          selected={filters.condition}
          onChange={(v) => onUpdate('condition', v)}
        />
      </FilterSection>

      <FilterSection title="Rareza">
        <CheckboxGroup<Rarity>
          options={['comun', 'poco_comun', 'rara', 'ultra_rara', 'secret_rare', 'full_art', 'gold_rare', 'prismatic']}
          labels={RARITY_LABELS}
          selected={filters.rarity}
          onChange={(v) => onUpdate('rarity', v)}
        />
      </FilterSection>

      <FilterSection title="Edición">
        <CheckboxGroup<Edition>
          options={['primera', 'shadowless', 'ilimitada']}
          labels={EDITION_LABELS}
          selected={filters.edition}
          onChange={(v) => onUpdate('edition', v)}
        />
      </FilterSection>

      <FilterSection title="Variante">
        <CheckboxGroup<Variant>
          options={['holo', 'reverse_holo', 'standard']}
          labels={VARIANT_LABELS}
          selected={filters.variant}
          onChange={(v) => onUpdate('variant', v)}
        />
      </FilterSection>

      <FilterSection title="Idioma">
        <CheckboxGroup<Language>
          options={['es', 'en', 'jp']}
          labels={LANGUAGE_LABELS}
          selected={filters.language}
          onChange={(v) => onUpdate('language', v)}
        />
      </FilterSection>

      <FilterSection title="Precio (MXN)">
        <div className="flex gap-2">
          <input
            type="number"
            placeholder="Mín"
            value={filters.priceMin ?? ''}
            onChange={(e) => onUpdate('priceMin', e.target.value ? Number(e.target.value) : null)}
            className="input-dark flex-1 text-xs"
            min={0}
          />
          <input
            type="number"
            placeholder="Máx"
            value={filters.priceMax ?? ''}
            onChange={(e) => onUpdate('priceMax', e.target.value ? Number(e.target.value) : null)}
            className="input-dark flex-1 text-xs"
            min={0}
          />
        </div>
      </FilterSection>
    </div>
  )

  return (
    <>
      {/* Desktop */}
      <aside className="hidden lg:block w-56 flex-shrink-0">
        {content}
      </aside>

      {/* Mobile drawer */}
      <>
        <div
          className={cn(
            'lg:hidden fixed inset-0 bg-black/70 z-40 transition-opacity duration-300',
            isMobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
          )}
          onClick={onMobileClose}
        />
        <div
          className={cn(
            'lg:hidden fixed top-0 left-0 h-full w-72 bg-abyss border-r border-navy/50 z-50 flex flex-col transition-transform duration-300 ease-in-out overflow-y-auto',
            isMobileOpen ? 'translate-x-0' : '-translate-x-full'
          )}
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-navy/50">
            <h2 className="font-agency text-white uppercase tracking-wider">Filtros</h2>
            <button onClick={onMobileClose} className="text-ash hover:text-white transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="px-5 py-4 flex-1">
            {content}
          </div>
        </div>
      </>
    </>
  )
}
