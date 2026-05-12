import { useState, useMemo } from 'react'
import { MOCK_PRODUCTS } from '@/lib/mockData'
import type { FilterState, Product } from '@/types'

const DEFAULT_FILTERS: FilterState = {
  franchise: [],
  rarity: [],
  edition: [],
  condition: [],
  variant: [],
  language: [],
  priceMin: null,
  priceMax: null,
  search: '',
  sortBy: 'newest',
  page: 1,
}

const PAGE_SIZE = 12

export function useProducts(initialFilters?: Partial<FilterState>) {
  const [filters, setFilters] = useState<FilterState>({
    ...DEFAULT_FILTERS,
    ...initialFilters,
  })

  const filtered = useMemo(() => {
    let result = MOCK_PRODUCTS.filter((p) => p.isActive)

    if (filters.franchise.length) {
      result = result.filter((p) => p.franchise && filters.franchise.includes(p.franchise))
    }
    if (filters.rarity.length) {
      result = result.filter((p) => p.rarity && filters.rarity.includes(p.rarity as import('@/types').Rarity))
    }
    if (filters.edition.length) {
      result = result.filter((p) => p.edition && filters.edition.includes(p.edition as import('@/types').Edition))
    }
    if (filters.condition.length) {
      result = result.filter((p) => p.condition && filters.condition.includes(p.condition as import('@/types').Condition))
    }
    if (filters.variant.length) {
      result = result.filter((p) => p.variant && filters.variant.includes(p.variant as import('@/types').Variant))
    }
    if (filters.language.length) {
      result = result.filter((p) => p.language && filters.language.includes(p.language as import('@/types').Language))
    }
    if (filters.priceMin !== null) {
      result = result.filter((p) => p.price >= filters.priceMin!)
    }
    if (filters.priceMax !== null) {
      result = result.filter((p) => p.price <= filters.priceMax!)
    }
    if (filters.search) {
      const q = filters.search.toLowerCase()
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.set ?? '').toLowerCase().includes(q) ||
          (p.cardNumber?.toLowerCase().includes(q) ?? false)
      )
    }

    switch (filters.sortBy) {
      case 'price_asc':
        result = [...result].sort((a, b) => a.price - b.price)
        break
      case 'price_desc':
        result = [...result].sort((a, b) => b.price - a.price)
        break
      case 'newest':
        result = [...result].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
        break
    }

    return result
  }, [filters])

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated = filtered.slice((filters.page - 1) * PAGE_SIZE, filters.page * PAGE_SIZE)

  const updateFilter = <K extends keyof FilterState>(key: K, value: FilterState[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value, page: key !== 'page' ? 1 : prev.page }))
  }

  const resetFilters = () => setFilters(DEFAULT_FILTERS)

  return {
    products: paginated,
    totalProducts: filtered.length,
    totalPages,
    filters,
    updateFilter,
    resetFilters,
  }
}

export function useProductBySlug(slug: string): Product | undefined {
  return MOCK_PRODUCTS.find((p) => p.slug === slug && p.isActive)
}

export function useNovedades(): Product[] {
  return [...MOCK_PRODUCTS]
    .filter((p) => p.isActive)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 8)
}

export function useBestsellers(): Product[] {
  return [...MOCK_PRODUCTS]
    .filter((p) => p.isActive && (p.salesCount ?? 0) > 0)
    .sort((a, b) => (b.salesCount ?? 0) - (a.salesCount ?? 0))
    .slice(0, 8)
}
