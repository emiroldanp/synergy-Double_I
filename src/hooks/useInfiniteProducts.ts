import { useState, useEffect, useCallback } from 'react'
import { productsApi } from '@/lib/api'
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

export function useInfiniteProducts(initialFilters: Partial<FilterState> = {}) {
  const [filters, setFilters] = useState<FilterState>({ ...DEFAULT_FILTERS, ...initialFilters })
  const [products, setProducts] = useState<Product[]>([])
  const [totalProducts, setTotalProducts] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    const params: Record<string, unknown> = {
      page: 1,
      limit: page * PAGE_SIZE,
      sortBy: filters.sortBy,
    }
    if (filters.search) params.search = filters.search
    if (filters.franchise.length) params.franchise = filters.franchise.join(',')
    if (filters.productType?.length) params.productType = filters.productType.join(',')
    if (filters.rarity.length) params.rarity = filters.rarity.join(',')
    if (filters.edition.length) params.edition = filters.edition.join(',')
    if (filters.condition.length) params.condition = filters.condition.join(',')
    if (filters.variant.length) params.variant = filters.variant.join(',')
    if (filters.language.length) params.language = filters.language.join(',')
    if (filters.priceMin !== null) params.priceMin = filters.priceMin
    if (filters.priceMax !== null) params.priceMax = filters.priceMax

    productsApi.getAll(params).then((res) => {
      if (cancelled) return
      const data = res.data
      const list: Product[] = data.products ?? data.data ?? []
      const total: number = data.total ?? list.length
      setProducts(list)
      setTotalProducts(total)
      setHasMore(list.length < total)
    }).catch(() => {
      if (!cancelled) setProducts([])
    }).finally(() => {
      if (!cancelled) setLoading(false)
    })
    return () => { cancelled = true }
  }, [filters, page])

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

  return { products, totalProducts, hasMore, loadMore, loading, filters, updateFilter, resetFilters }
}
