import { useState, useEffect, useRef, useCallback } from 'react'
import { Helmet } from 'react-helmet-async'
import { useSearchParams, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useInfiniteProducts } from '@/hooks/useInfiniteProducts'
import type { FilterState, CatalogTab } from '@/types'
import { FilterPanel } from '@/components/ui/FilterPanel'
import { ProductCard } from '@/components/ui/ProductCard'
import { Button } from '@/components/ui/Button'
import { fadeUp, staggerContainer } from '@/lib/animations'
import { productsApi } from '@/lib/api'
import { cn } from '@/lib/utils'

const SORT_OPTIONS = [
  { value: 'newest', label: 'Más recientes' },
  { value: 'price_asc', label: 'Precio: menor a mayor' },
  { value: 'price_desc', label: 'Precio: mayor a menor' },
] as const

const VALID_FRANCHISES = ['pokemon', 'lorcana', 'magic', 'accesorios'] as const
const VALID_SORTS = ['newest', 'price_asc', 'price_desc'] as const

function useInitialFiltersFromParams(): Partial<FilterState> {
  const [params] = useSearchParams()
  const { slug: franchiseFromPath } = useParams<{ slug?: string }>()
  const franchise = franchiseFromPath ?? params.get('franchise')
  const sort = params.get('sort')
  const tabParam = params.get('tab') as CatalogTab | null

  const filters: Partial<FilterState> = {
    tab: tabParam === 'singles' ? 'singles' : 'sealed',
  }

  if (franchise && VALID_FRANCHISES.includes(franchise as typeof VALID_FRANCHISES[number])) {
    filters.franchise = [franchise as FilterState['franchise'][number]]
  }
  if (sort && VALID_SORTS.includes(sort as typeof VALID_SORTS[number])) {
    filters.sortBy = sort as FilterState['sortBy']
  }

  return filters
}

export default function CatalogPage() {
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)
  const [availableRarities, setAvailableRarities] = useState<string[]>([])
  const initialFilters = useInitialFiltersFromParams()

  const { products, totalProducts, hasMore, loadMore, loading, filters, updateFilter, resetFilters } =
    useInfiniteProducts(initialFilters)

  // El tab activo se deriva directamente del estado de filtros
  const activeTab = filters.tab ?? 'sealed'

  // Al cambiar de tab: limpiar filtros secundarios y actualizar el tab
  const handleTabChange = useCallback((tab: CatalogTab) => {
    resetFilters()
    setTimeout(() => {
      updateFilter('tab', tab)
    }, 0)
  }, [resetFilters, updateFilter])

  useEffect(() => {
    productsApi.getRarities()
      .then((res) => setAvailableRarities(res.data?.data ?? []))
      .catch(() => {})
  }, [])

  const sentinelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore) loadMore()
      },
      { rootMargin: '200px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [hasMore, loadMore])

  return (
    <>
      <Helmet>
        <title>Catálogo — Double-I TCG</title>
        <meta
          name="description"
          content="Explora nuestro catálogo de tarjetas coleccionables Pokémon y Lorcana."
        />
      </Helmet>

      <div className="bg-night min-h-screen pt-32 md:pt-48">
        <div className="page-container py-8">
          {/* Header */}
          <motion.div
            className="mb-6 flex items-end justify-between"
            variants={fadeUp}
            initial="hidden"
            animate="visible"
          >
            <div>
              <h1 className="section-title mb-1">Catálogo</h1>
              {!loading && (
                <p className="font-exo text-ash text-sm">
                  {totalProducts} producto{totalProducts !== 1 ? 's' : ''} encontrado
                  {totalProducts !== 1 ? 's' : ''}
                </p>
              )}
            </div>
            <img
              src="/logo-color.png"
              alt="Double-I TCG"
              className="h-10 md:h-12 w-auto opacity-25 select-none pointer-events-none"
              aria-hidden="true"
            />
          </motion.div>

          {/* Tabs principales: Producto Cerrado / Singles */}
          <div className="flex gap-1 mb-6 border-b border-navy/40">
            <button
              onClick={() => handleTabChange('sealed')}
              className={cn(
                'font-agency uppercase tracking-wider text-sm px-5 py-2.5 border-b-2 -mb-px transition-colors duration-200',
                activeTab === 'sealed'
                  ? 'border-dragon text-white'
                  : 'border-transparent text-ash hover:text-frost'
              )}
            >
              Producto Cerrado
            </button>
            <button
              onClick={() => handleTabChange('singles')}
              className={cn(
                'font-agency uppercase tracking-wider text-sm px-5 py-2.5 border-b-2 -mb-px transition-colors duration-200',
                activeTab === 'singles'
                  ? 'border-dragon text-white'
                  : 'border-transparent text-ash hover:text-frost'
              )}
            >
              Singles
            </button>
          </div>

          {/* Search + Sort bar */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="relative flex-1">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ash"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                type="search"
                placeholder="Buscar por nombre, número o set..."
                value={filters.search}
                onChange={(e) => updateFilter('search', e.target.value)}
                className="input-dark pl-10 text-sm h-10"
                aria-label="Buscar productos"
              />
            </div>

            <select
              value={filters.sortBy}
              onChange={(e) =>
                updateFilter('sortBy', e.target.value as typeof filters.sortBy)
              }
              className="input-dark text-sm h-10 w-full sm:w-48 cursor-pointer"
              aria-label="Ordenar por"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value} className="bg-abyss">
                  {opt.label}
                </option>
              ))}
            </select>

            {/* Mobile filter button */}
            <Button
              variant="secondary"
              size="sm"
              className="sm:hidden h-10 px-4"
              onClick={() => setMobileFiltersOpen(true)}
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                />
              </svg>
              Filtros
            </Button>
          </div>

          <div className="flex gap-8">
            <FilterPanel
              filters={filters}
              onUpdate={updateFilter}
              onReset={resetFilters}
              isMobileOpen={mobileFiltersOpen}
              onMobileClose={() => setMobileFiltersOpen(false)}
              availableRarities={availableRarities}
              activeTab={activeTab}
            />

            <div className="flex-1 min-w-0">
              {loading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
                  {Array.from({ length: 12 }).map((_, i) => (
                    <div key={i}>
                      <div className="skeleton-box aspect-[3/4]" />
                      <div className="p-3 space-y-2 bg-deep border border-navy/20 border-t-0">
                        <div className="skeleton-box h-3 w-3/4 rounded" />
                        <div className="skeleton-box h-3 w-1/2 rounded" />
                        <div className="skeleton-box h-5 w-1/3 rounded mt-1" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : products.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <svg
                    className="w-16 h-16 text-navy mb-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1}
                      d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <p className="font-agency text-ash uppercase tracking-wider mb-4">
                    Sin resultados
                  </p>
                  <p className="font-exo text-ash/60 text-sm mb-6">
                    No encontramos productos con estos filtros.
                  </p>
                  <Button variant="secondary" size="sm" onClick={resetFilters}>
                    Limpiar filtros
                  </Button>
                </div>
              ) : (
                <>
                  <motion.div
                    className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4"
                    variants={staggerContainer}
                    initial="hidden"
                    animate="visible"
                  >
                    {products.map((product) => (
                      <motion.div key={product.id} variants={fadeUp}>
                        <ProductCard product={product} />
                      </motion.div>
                    ))}
                  </motion.div>

                  {/* Infinite scroll sentinel */}
                  <div ref={sentinelRef} className="h-16 flex items-center justify-center mt-6">
                    {hasMore && (
                      <div className="flex gap-1.5">
                        {[0, 1, 2].map((i) => (
                          <motion.div
                            key={i}
                            className="w-1.5 h-1.5 bg-dragon/60 rounded-full"
                            animate={{ y: [0, -6, 0] }}
                            transition={{
                              duration: 0.8,
                              repeat: Infinity,
                              delay: i * 0.15,
                            }}
                          />
                        ))}
                      </div>
                    )}
                    {!hasMore && products.length > 0 && (
                      <p className="font-agency text-xs text-ash/40 uppercase tracking-widest">
                        Fin del catálogo
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
