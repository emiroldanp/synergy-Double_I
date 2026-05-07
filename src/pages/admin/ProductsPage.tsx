import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAdminApi } from '../../hooks/useAdminApi'
import StatusBadge from '../../components/admin/StatusBadge'
import ConfirmModal from '../../components/admin/ConfirmModal'
import { Product } from '../../types'
import { PaginatedResponse } from '../../types/admin'
import { formatPrice as formatMXN } from '../../lib/utils'

export default function ProductsPage() {
  const { apiFetch } = useAdminApi()
  const navigate = useNavigate()

  const [products, setProducts] = useState<Product[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [confirmTarget, setConfirmTarget] = useState<Product | null>(null)
  const PAGE_SIZE = 20

  // Debounce de búsqueda
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(timer)
  }, [search])

  const fetchProducts = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(PAGE_SIZE),
      ...(debouncedSearch && { search: debouncedSearch }),
    })
    apiFetch<PaginatedResponse<Product>>(`/api/admin/products?${params}`)
      .then((res) => {
        setProducts(res.data)
        setTotal(res.total)
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [page, debouncedSearch, apiFetch])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  // Resetear a página 1 cuando cambia la búsqueda
  useEffect(() => {
    setPage(1)
  }, [debouncedSearch])

  const handleToggleActive = async (product: Product) => {
    try {
      await apiFetch(`/api/admin/products/${product.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: !product.isActive }),
      })
      fetchProducts()
    } catch (e: unknown) {
      alert(`Error: ${e instanceof Error ? e.message : 'Error desconocido'}`)
    }
  }

  const handleDelete = async (product: Product) => {
    setConfirmTarget(product)
  }

  const confirmDelete = async () => {
    if (!confirmTarget) return
    try {
      await apiFetch(`/api/admin/products/${confirmTarget.id}`, { method: 'DELETE' })
      setConfirmTarget(null)
      fetchProducts()
    } catch (e: unknown) {
      setConfirmTarget(null)
      alert(`Error: ${e instanceof Error ? e.message : 'Error desconocido'}`)
    }
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="space-y-4">
      {/* Barra de herramientas */}
      <div className="flex items-center gap-3">
        <input
          type="text"
          placeholder="Buscar productos..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={() => navigate('/admin/productos/nuevo')}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors whitespace-nowrap"
        >
          + Nuevo producto
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
          Error al cargar productos: {error}
        </div>
      )}

      {/* Tabla */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Producto</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Precio</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Stock</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Estado</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto" />
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-gray-400">
                    Sin productos
                  </td>
                </tr>
              ) : (
                products.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50">
                    {/* Imagen + nombre */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded bg-gray-100 overflow-hidden flex-shrink-0">
                          {product.images?.[0]?.url ? (
                            <img
                              src={product.images[0].url}
                              alt={product.name}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <div className="w-full h-full bg-gray-200" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 leading-tight">{product.name}</p>
                          {/* setName como subtítulo — campo equivalente a "franquicia/set" */}
                          <p className="text-xs text-gray-400">{product.setName ?? '—'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-900">{formatMXN(product.price)}</td>
                    <td className="px-4 py-3">
                      <StatusBadge type="stock" value={product.stock} />
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          product.isActive
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {product.isActive ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => navigate(`/admin/productos/${product.id}/editar`)}
                          className="px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded hover:bg-blue-100 transition-colors"
                          title="Editar"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleToggleActive(product)}
                          className={`px-2 py-1 text-xs rounded transition-colors ${
                            product.isActive
                              ? 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                              : 'bg-green-50 text-green-700 hover:bg-green-100'
                          }`}
                          title={product.isActive ? 'Desactivar' : 'Activar'}
                        >
                          {product.isActive ? 'Desactivar' : 'Activar'}
                        </button>
                        <button
                          onClick={() => handleDelete(product)}
                          className="px-2 py-1 text-xs bg-red-50 text-red-600 rounded hover:bg-red-100 transition-colors"
                          title="Eliminar"
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between text-sm">
            <span className="text-gray-500">{total} productos en total</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ←
              </button>
              <span className="text-gray-700">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                →
              </button>
            </div>
          </div>
        )}
      </div>
      <ConfirmModal
        open={confirmTarget !== null}
        title="Eliminar producto"
        message={`¿Eliminar "${confirmTarget?.name}"? Se borrarán también sus imágenes del bucket. Esta acción no se puede deshacer.`}
        confirmLabel="Sí, eliminar"
        onConfirm={confirmDelete}
        onCancel={() => setConfirmTarget(null)}
      />
    </div>
  )
}
