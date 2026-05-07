import { useEffect, useState } from 'react'
import { useAdminApi } from '../../hooks/useAdminApi'
import StatsCard from '../../components/admin/StatsCard'
import StatusBadge from '../../components/admin/StatusBadge'
import { DashboardData } from '../../types/admin'
import { formatPrice as formatMXN } from '../../lib/utils'

export default function DashboardPage() {
  const { apiFetch } = useAdminApi()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    apiFetch<{ data: DashboardData }>('/api/admin/dashboard')
      .then((res) => setData(res.data))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
        Error al cargar el dashboard: {error}
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="space-y-6">
      {/* Tarjetas de métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatsCard label="Ingresos hoy" value={formatMXN(data.revenueToday)} icon="💰" />
        <StatsCard label="Ingresos esta semana" value={formatMXN(data.revenueWeek)} icon="📈" />
        <StatsCard label="Ingresos este mes" value={formatMXN(data.revenueMonth)} icon="🗓️" />
        <StatsCard label="Pedidos pendientes" value={data.pendingOrders} icon="⏳" />
      </div>

      {/* Tabla de pedidos recientes */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900">Últimos pedidos</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">ID</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Cliente</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Monto</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.recentOrders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 font-mono text-gray-700">{order.id.slice(0, 8)}…</td>
                  <td className="px-5 py-3 text-gray-700">{order.customerEmail}</td>
                  <td className="px-5 py-3 text-gray-900 font-medium">{formatMXN(order.total)}</td>
                  <td className="px-5 py-3">
                    <StatusBadge type="order" value={order.status} />
                  </td>
                </tr>
              ))}
              {data.recentOrders.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-5 py-8 text-center text-gray-400">
                    Sin pedidos recientes
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
