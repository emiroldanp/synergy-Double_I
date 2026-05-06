import { useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { useProducts } from '@/hooks/useProducts'
import { FilterPanel } from '@/components/ui/FilterPanel'
import { ProductCard } from '@/components/ui/ProductCard'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

const SORT_OPTIONS = [
  { value: 'newest', label: 'Más recientes' },
  { value: 'price_asc', label: 'Precio: menor a mayor' },
  { value: 'price_desc', label: 'Precio: mayor a menor' },
] as const

export default function CatalogPage() {
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)
  const { products, totalProducts, totalPages, filters, updateFilter, resetFilters } = useProducts()

  return (
    <>
      <Helmet>
        <title>Catálogo — Double-I TCG</title>
        <meta name="description" content="Explora nuestro catálogo de tarjetas coleccionables Pokémon, Yu-Gi-Oh! y Lorcana." />
      </Helmet>

      <div className="bg-night min-h-screen pt-20">
        <div className="page-container py-8">
          {/* Header */}
          <div className="mb-6">
            <h1 className="section-title mb-1">Catálogo</h1>
            <p className="font-exo text-ash text-sm">{totalProducts} producto{totalProducts !== 1 ? 's' : ''} encontrado{totalProducts !== 1 ? 's' : ''}</p>
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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
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
              onChange={(e) => updateFilter('sortBy', e.target.value as typeof filters.sortBy)}
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
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
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
              {products.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <svg className="w-16 h-16 text-navy mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
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
                  <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
                    {products.map((product, i) => (
                      <div
                        key={product.id}
                        style={{ animation: `fadeIn 0.3s ease-out ${i * 0.04}s both` }}
                      >
                        <ProductCard product={product} />
                      </div>
                    ))}
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-2 mt-10">
                      <button
                        onClick={() => updateFilter('page', Math.max(1, filters.page - 1))}
                        disabled={filters.page === 1}
                        className={cn(
                          'w-9 h-9 border font-agency text-sm transition-colors',
                          filters.page === 1
                            ? 'border-navy/30 text-ash/30 cursor-not-allowed'
                            : 'border-navy/60 text-ash hover:border-dragon/60 hover:text-dragon'
                        )}
                      >
                        ‹
                      </button>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                        <button
                          key={page}
                          onClick={() => updateFilter('page', page)}
                          className={cn(
                            'w-9 h-9 border font-agency text-sm transition-colors',
                            page === filters.page
                              ? 'border-dragon bg-royal/20 text-dragon'
                              : 'border-navy/60 text-ash hover:border-dragon/60 hover:text-dragon'
                          )}
                        >
                          {page}
                        </button>
                      ))}
                      <button
                        onClick={() => updateFilter('page', Math.min(totalPages, filters.page + 1))}
                        disabled={filters.page === totalPages}
                        className={cn(
                          'w-9 h-9 border font-agency text-sm transition-colors',
                          filters.page === totalPages
                            ? 'border-navy/30 text-ash/30 cursor-not-allowed'
                            : 'border-navy/60 text-ash hover:border-dragon/60 hover:text-dragon'
                        )}
                      >
                        ›
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
