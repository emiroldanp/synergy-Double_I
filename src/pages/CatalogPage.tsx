import { useState, useEffect, useRef } from 'react'
import { Helmet } from 'react-helmet-async'
import { useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useInfiniteProducts } from '@/hooks/useInfiniteProducts'
import type { FilterState } from '@/types'
import { FilterPanel } from '@/components/ui/FilterPanel'
import { ProductCard } from '@/components/ui/ProductCard'
import { Button } from '@/components/ui/Button'
import { fadeUp, staggerContainer } from '@/lib/animations'

const SORT_OPTIONS = [
  { value: 'newest', label: 'Más recientes' },
  { value: 'price_asc', label: 'Precio: menor a mayor' },
  { value: 'price_desc', label: 'Precio: mayor a menor' },
] as const

const VALID_FRANCHISES = ['pokemon', 'yugioh', 'lorcana'] as const
const VALID_SORTS = ['newest', 'price_asc', 'price_desc'] as const

function useInitialFiltersFromParams(): Partial<FilterState> {
  const [params] = useSearchParams()
  const franchise = params.get('franchise')
  const sort = params.get('sort')
  const productType = params.get('productType')
  const filters: Partial<FilterState> = {}
  if (franchise && VALID_FRANCHISES.includes(franchise as typeof VALID_FRANCHISES[number])) {
    filters.franchise = [franchise as FilterState['franchise'][number]]
  }
  if (sort && VALID_SORTS.includes(sort as typeof VALID_SORTS[number])) {
    filters.sortBy = sort as FilterState['sortBy']
  }
  if (productType) {
    // 'accessory' agrupa sleeve + playmat en la UI pero no existe en BD — expandir a ambos tipos
    if (productType === 'accessory') {
      filters.productType = ['sleeve', 'playmat']
    } else {
      filters.productType = [productType as FilterState['productType'][number]]
    }
  }
  return filters
}

export default function CatalogPage() {
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)
  const initialFilters = useInitialFiltersFromParams()
  const { products, totalProducts, hasMore, loadMore, loading, filters, updateFilter, resetFilters } =
    useInfiniteProducts(initialFilters)

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
          content="Explora nuestro catálogo de tarjetas coleccionables Pokémon, Yu-Gi-Oh! y Lorcana."
        />
      </Helmet>

      <div className="bg-night min-h-screen pt-20">
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
