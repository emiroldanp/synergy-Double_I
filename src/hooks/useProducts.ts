import { useState, useEffect, useMemo, useCallback } from 'react'
import { productsApi } from '@/lib/api'
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
  const [products, setProducts] = useState<Product[]>([])
  const [totalProducts, setTotalProducts] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    const params: Record<string, unknown> = {
      page: filters.page,
      limit: PAGE_SIZE,
      sortBy: filters.sortBy,
    }
    if (filters.search) params.search = filters.search
    if (filters.franchise.length) params.franchise = filters.franchise.join(',')
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
      setProducts(data.products ?? data.data ?? [])
      setTotalProducts(data.total ?? 0)
      setTotalPages(data.totalPages ?? Math.ceil((data.total ?? 0) / PAGE_SIZE))
    }).catch(() => {
      if (!cancelled) setProducts([])
    }).finally(() => {
      if (!cancelled) setLoading(false)
    })
    return () => { cancelled = true }
  }, [filters])

  const updateFilter = useCallback(<K extends keyof FilterState>(key: K, value: FilterState[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value, page: key !== 'page' ? 1 : (value as number) }))
  }, [])

  const resetFilters = useCallback(() => setFilters(DEFAULT_FILTERS), [])

  return { products, totalProducts, totalPages, loading, filters, updateFilter, resetFilters }
}

export function useProductBySlug(slug: string) {
  const [product, setProduct] = useState<Product | undefined>(undefined)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!slug) return
    setLoading(true)
    productsApi.getBySlug(slug)
      .then((res) => setProduct(res.data?.product ?? res.data))
      .catch(() => setError('Producto no encontrado'))
      .finally(() => setLoading(false))
  }, [slug])

  return { product, loading, error }
}

export function useNovedades() {
  const [products, setProducts] = useState<Product[]>([])

  useEffect(() => {
    productsApi.getAll({ sortBy: 'newest', limit: 8 })
      .then((res) => setProducts(res.data.products ?? res.data.data ?? []))
      .catch(() => {})
  }, [])

  return products
}

export function useBestsellers() {
  const [products, setProducts] = useState<Product[]>([])

  useEffect(() => {
    productsApi.getAll({ sortBy: 'bestsellers', limit: 8 })
      .then((res) => setProducts(res.data.products ?? res.data.data ?? []))
      .catch(() => {})
  }, [])

  return products
}

export function useInfiniteProductsLegacy(initialFilters?: Partial<FilterState>) {
  return useProducts(initialFilters)
}

export { DEFAULT_FILTERS }

export type { FilterState }

export const useMemoFiltered = (products: Product[], filters: FilterState) =>
  useMemo(() => products, [products, filters])
