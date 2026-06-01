import { useState, useEffect, useCallback, useRef } from 'react'
import { productsApi } from '@/lib/api'
import type { FilterState, Product } from '@/types'
import { normalizeProductList } from '@/lib/normalizeProduct'

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
  const [loadingMore, setLoadingMore] = useState(false)

  // Acumula resultados entre páginas; se limpia cuando cambian filtros
  const accumulated = useRef<Product[]>([])
  // Evita que un loadMore en vuelo solape con un reset de filtros
  const pageForFetch = useRef(1)

  useEffect(() => {
    let cancelled = false
    const currentPage = page
    pageForFetch.current = currentPage
    const isFirstPage = currentPage === 1

    if (isFirstPage) {
      accumulated.current = []
      setLoading(true)
      setLoadingMore(false)
    } else {
      setLoadingMore(true)
    }

    const params: Record<string, unknown> = {
      page: currentPage,
      limit: PAGE_SIZE,
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
      if (cancelled || pageForFetch.current !== currentPage) return
      const data = res.data?.data ?? res.data
      const newItems = normalizeProductList(res.data)
      const total: number = data.total ?? newItems.length

      accumulated.current = isFirstPage
        ? newItems
        : [...accumulated.current, ...newItems]

      setProducts([...accumulated.current])
      setTotalProducts(total)
      setHasMore(accumulated.current.length < total)
    }).catch(() => {
      if (!cancelled && isFirstPage) setProducts([])
    }).finally(() => {
      if (!cancelled) {
        setLoading(false)
        setLoadingMore(false)
      }
    })

    return () => { cancelled = true }
  }, [filters, page])

  const loadMore = useCallback(() => {
    if (hasMore && !loadingMore) setPage((p) => p + 1)
  }, [hasMore, loadingMore])

  const updateFilter = useCallback(<K extends keyof FilterState>(key: K, value: FilterState[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
    setPage(1)
  }, [])

  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS)
    setPage(1)
  }, [])

  return { products, totalProducts, hasMore, loadMore, loading, loadingMore, filters, updateFilter, resetFilters }
}
