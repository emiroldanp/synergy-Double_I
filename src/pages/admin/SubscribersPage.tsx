import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { useAdminApi } from '../../hooks/useAdminApi'
import ConfirmModal from '../../components/admin/ConfirmModal'
import { EmailSubscriber, PaginatedResponse } from '../../types/admin'

export default function SubscribersPage() {
  const { getToken } = useAuth()
  const { apiFetch } = useAdminApi()
  const [subscribers, setSubscribers] = useState<EmailSubscriber[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [confirmTarget, setConfirmTarget] = useState<EmailSubscriber | null>(null)
  const [exporting, setExporting] = useState(false)
  const PAGE_SIZE = 20

  const fetchSubscribers = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) })
    apiFetch<PaginatedResponse<EmailSubscriber>>(`/api/admin/subscribers?${params}`)
      .then((res) => {
        setSubscribers(res.data)
        setTotal(res.meta.total)
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [page, apiFetch])

  useEffect(() => {
    fetchSubscribers()
  }, [fetchSubscribers])

  const confirmDelete = async () => {
    if (!confirmTarget) return
    try {
      await apiFetch(`/api/admin/subscribers/${confirmTarget.id}`, { method: 'DELETE' })
      setConfirmTarget(null)
      fetchSubscribers()
    } catch (e: unknown) {
      setConfirmTarget(null)
      alert(`Error: ${e instanceof Error ? e.message : 'Error desconocido'}`)
    }
  }

  const handleExportCsv = async () => {
    setExporting(true)
    try {
      const token = await getToken()
      const base = import.meta.env.VITE_API_URL ?? 'http://localhost:3001'
      const res = await fetch(`${base}/api/admin/subscribers/export-csv`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error(res.statusText)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'suscriptores.csv'
      a.click()
      URL.revokeObjectURL(url)
    } catch (e: unknown) {
      alert(`Error al exportar: ${e instanceof Error ? e.message : 'Error desconocido'}`)
    } finally {
      setExporting(false)
    }
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-500">{total} suscriptores</span>
        <button
          onClick={handleExportCsv}
          disabled={exporting || loading}
          className="px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
        >
          {exporting ? 'Exportando...' : 'Exportar CSV'}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
          Error al cargar suscriptores: {error}
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Email</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Nombre</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Fuente</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Comprador</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Fecha</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto" />
                  </td>
                </tr>
              ) : subscribers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-gray-400">
                    Sin suscriptores
                  </td>
                </tr>
              ) : (
                subscribers.map((sub) => (
                  <tr key={sub.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-900">{sub.email}</td>
                    <td className="px-4 py-3 text-gray-700">{sub.fullName ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{sub.source}</td>
                    <td className="px-4 py-3">
                      {sub.isBuyer ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Sí</span>
                      ) : (
                        <span className="text-gray-400 text-xs">No</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {new Date(sub.subscribedAt).toLocaleDateString('es-MX')}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setConfirmTarget(sub)}
                        className="px-2 py-1 text-xs bg-red-50 text-red-600 rounded hover:bg-red-100 transition-colors"
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between text-sm">
            <span className="text-gray-500">{total} suscriptores en total</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ←
              </button>
              <span className="text-gray-700">{page} / {totalPages}</span>
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
        title="Eliminar suscriptor"
        message={`¿Eliminar a ${confirmTarget?.email}? Esta acción no se puede deshacer.`}
        confirmLabel="Sí, eliminar"
        onConfirm={confirmDelete}
        onCancel={() => setConfirmTarget(null)}
      />
    </div>
  )
}
