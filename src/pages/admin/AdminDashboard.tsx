import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { formatPrice, ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from '@/lib/utils'
import { dashboardApi, ordersApi } from '@/lib/api'
import type { DashboardStats, Order, OrderStatus } from '@/types'

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-deep border border-navy/40 p-5">
      <p className="font-agency text-xs text-ash uppercase tracking-widest mb-2">{label}</p>
      <p className="font-agency text-2xl text-white">{value}</p>
      {sub && <p className="font-exo text-xs text-ash/60 mt-1">{sub}</p>}
    </div>
  )
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [recentOrders, setRecentOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      dashboardApi.getStats(),
      ordersApi.getAll({ limit: 5, sortBy: 'newest' }),
    ]).then(([statsRes, ordersRes]) => {
      setStats(statsRes.data)
      setRecentOrders(ordersRes.data.orders ?? ordersRes.data.data ?? [])
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  return (
    <>
      <Helmet>
        <title>Admin Dashboard — Double-I TCG</title>
      </Helmet>

      <div className="bg-night min-h-screen pt-20">
        <div className="page-container py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <p className="section-subtitle mb-1">Panel de administración</p>
              <h1 className="section-title">Dashboard</h1>
            </div>
            <div className="flex gap-3">
              <Link to="/admin/productos" className="btn-primary text-xs px-4 py-2">+ Producto</Link>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex gap-3 mb-8 overflow-x-auto pb-2">
            {[
              { to: '/admin', label: 'Dashboard' },
              { to: '/admin/productos', label: 'Productos' },
              { to: '/admin/pedidos', label: 'Pedidos' },
              { to: '/admin/blog', label: 'Blog' },
            ].map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="flex-shrink-0 font-agency text-xs uppercase tracking-wider px-4 py-2 border border-navy/40 hover:border-dragon/60 text-ash hover:text-dragon transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-dragon" />
            </div>
          ) : (
            <>
              {/* Revenue stats */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                <StatCard label="Ingresos hoy" value={formatPrice(stats?.revenueToday ?? 0)} />
                <StatCard label="Esta semana" value={formatPrice(stats?.revenueWeek ?? 0)} />
                <StatCard label="Este mes" value={formatPrice(stats?.revenueMonth ?? 0)} />
              </div>

              {/* Product stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                <StatCard label="Total productos" value={String(stats?.totalProducts ?? 0)} />
                <StatCard label="Stock bajo" value={String(stats?.lowStockProducts ?? 0)} sub="1 o menos unidades" />
                <StatCard label="Pedidos totales" value={String(Object.values(stats?.ordersByStatus ?? {}).reduce((a, b) => a + b, 0))} />
                <StatCard label="Enviados" value={String(stats?.ordersByStatus?.enviado ?? 0)} />
              </div>

              {/* Orders by status */}
              {stats?.ordersByStatus && (
                <div className="bg-deep border border-navy/40 p-6 mb-8">
                  <h2 className="font-agency text-sm text-ash uppercase tracking-widest mb-4">Pedidos por estado</h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    {(Object.entries(stats.ordersByStatus) as [OrderStatus, number][]).map(([status, count]) => (
                      <div
                        key={status}
                        className="text-center p-3 border"
                        style={{ borderColor: ORDER_STATUS_COLORS[status] + '40' }}
                      >
                        <p className="font-agency text-2xl" style={{ color: ORDER_STATUS_COLORS[status] }}>
                          {count}
                        </p>
                        <p className="font-exo text-xs text-ash mt-1 leading-tight">
                          {ORDER_STATUS_LABELS[status]}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent orders */}
              <div className="bg-deep border border-navy/40 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-agency text-sm text-ash uppercase tracking-widest">Pedidos recientes</h2>
                  <Link to="/admin/pedidos" className="text-xs text-dragon hover:text-frost transition-colors font-exo">
                    Ver todos →
                  </Link>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs font-exo">
                    <thead>
                      <tr className="border-b border-navy/40">
                        {['# Pedido', 'Cliente', 'Total', 'Estado'].map((h) => (
                          <th key={h} className="text-left text-ash uppercase tracking-wider pb-2 pr-4">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {recentOrders.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="py-8 text-center text-ash font-exo text-xs">Sin pedidos aún.</td>
                        </tr>
                      ) : recentOrders.map((order) => (
                        <tr key={order.id} className="border-b border-navy/20 hover:bg-abyss/50 transition-colors">
                          <td className="py-3 pr-4 text-dragon font-agency">{order.orderNumber}</td>
                          <td className="py-3 pr-4 text-frost">{order.customer?.fullName ?? order.guestName ?? '—'}</td>
                          <td className="py-3 pr-4 text-white font-agency">{formatPrice(order.total)}</td>
                          <td className="py-3">
                            <span
                              className="badge-base text-xs"
                              style={{
                                backgroundColor: ORDER_STATUS_COLORS[order.status!] + '22',
                                color: ORDER_STATUS_COLORS[order.status!],
                                border: `1px solid ${ORDER_STATUS_COLORS[order.status!]}44`,
                              }}
                            >
                              {ORDER_STATUS_LABELS[order.status!]}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}
