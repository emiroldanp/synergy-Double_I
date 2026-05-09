import { useState, useCallback, useMemo } from 'react'
import { MOCK_PRODUCTS } from '@/lib/mockData'
import type { FilterState, Product } from '@/types'

const PAGE_SIZE = 12

const DEFAULT_FILTERS: FilterState = {
  franchise: [],
  productType: [],
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

function applyFilters(products: Product[], filters: FilterState): Product[] {
  let result = products.filter((p) => p.isActive)

  if (filters.franchise.length > 0) {
    result = result.filter((p) => filters.franchise.includes(p.franchise))
  }
  if (filters.productType.length > 0) {
    result = result.filter((p) => filters.productType.includes(p.productType))
  }
  if (filters.rarity.length > 0) {
    result = result.filter((p) => filters.rarity.includes(p.rarity))
  }
  if (filters.edition.length > 0) {
    result = result.filter((p) => filters.edition.includes(p.edition))
  }
  if (filters.condition.length > 0) {
    result = result.filter((p) => filters.condition.includes(p.condition))
  }
  if (filters.variant.length > 0) {
    result = result.filter((p) => filters.variant.includes(p.variant))
  }
  if (filters.language.length > 0) {
    result = result.filter((p) => filters.language.includes(p.language))
  }
  if (filters.priceMin !== null) {
    result = result.filter((p) => p.price >= filters.priceMin!)
  }
  if (filters.priceMax !== null) {
    result = result.filter((p) => p.price <= filters.priceMax!)
  }
  if (filters.search.trim()) {
    const q = filters.search.toLowerCase()
    result = result.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.set.toLowerCase().includes(q) ||
        (p.cardNumber?.toLowerCase().includes(q) ?? false)
    )
  }

  if (filters.sortBy === 'price_asc') {
    result.sort((a, b) => a.price - b.price)
  } else if (filters.sortBy === 'price_desc') {
    result.sort((a, b) => b.price - a.price)
  } else {
    result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }

  return result
}

export function useInfiniteProducts(initialFilters: Partial<FilterState> = {}) {
  const [filters, setFilters] = useState<FilterState>({ ...DEFAULT_FILTERS, ...initialFilters })
  const [page, setPage] = useState(1)

  const allFiltered = useMemo(() => applyFilters(MOCK_PRODUCTS, filters), [filters])

  const products = useMemo(() => allFiltered.slice(0, page * PAGE_SIZE), [allFiltered, page])

  const hasMore = products.length < allFiltered.length

  const loadMore = useCallback(() => {
    if (hasMore) setPage((p) => p + 1)
  }, [hasMore])

  const updateFilter = useCallback(<K extends keyof FilterState>(key: K, value: FilterState[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
    setPage(1)
  }, [])

  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS)
    setPage(1)
  }, [])

  return {
    products,
    totalProducts: allFiltered.length,
    hasMore,
    loadMore,
    filters,
    updateFilter,
    resetFilters,
  }
}
