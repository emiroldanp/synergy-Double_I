import { lazy, Suspense, useState, useEffect } from 'react'
import { Helmet } from 'react-helmet-async'
import { useAuth } from '@/hooks/useAuth'
import { ordersApi } from '@/lib/api'
import { formatPrice, ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from '@/lib/utils'
import { Link } from 'react-router-dom'
import type { Order } from '@/types'

const HAS_CLERK = Boolean(
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY &&
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY !== 'pk_test_placeholder'
)

const ClerkSignIn = HAS_CLERK
  ? lazy(() => import('@/components/auth/ClerkSignIn'))
  : null

const ClerkUserProfile = HAS_CLERK
  ? lazy(() => import('@/components/auth/ClerkUserProfile'))
  : null

export default function AccountPage() {
  const { isSignedIn, isLoaded, user } = useAuth()
  const [orders, setOrders] = useState<Order[]>([])
  const [ordersLoading, setOrdersLoading] = useState(false)

  useEffect(() => {
    if (!isSignedIn) return
    setOrdersLoading(true)
    ordersApi.getByUser()
      .then((res) => setOrders(res.data.orders ?? res.data.data ?? res.data ?? []))
      .catch(() => {})
      .finally(() => setOrdersLoading(false))
  }, [isSignedIn])

  if (!isLoaded) {
    return (
      <div className="bg-night min-h-screen pt-32 md:pt-48 flex items-center justify-center">
        <svg className="animate-spin h-8 w-8 text-dragon" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    )
  }

  if (!isSignedIn) {
    return (
      <>
        <Helmet><title>Mi cuenta — Double-I TCG</title></Helmet>
        <div className="bg-night min-h-screen pt-32 md:pt-48 flex items-center justify-center px-4">
          <div className="w-full max-w-sm text-center">
            <h1 className="section-title mb-6">Mi cuenta</h1>
            {ClerkSignIn ? (
              <Suspense fallback={<div className="text-ash font-exo text-sm">Cargando...</div>}>
                <ClerkSignIn />
              </Suspense>
            ) : (
              <div className="bg-deep border border-navy/40 p-8">
                <p className="font-exo text-ash text-sm mb-4">
                  Autenticación con Clerk — pendiente de configurar la clave pública.
                </p>
                <Link to="/" className="btn-secondary text-xs px-6 py-2 inline-block">Volver al inicio</Link>
              </div>
            )}
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <Helmet><title>Mi cuenta — Double-I TCG</title></Helmet>
      <div className="bg-night min-h-screen pt-32 md:pt-48">
        <div className="page-container py-8">
          <h1 className="section-title mb-2">Mi cuenta</h1>
          <p className="font-exo text-ash text-sm mb-8">
            Hola, <span className="text-frost">{user?.firstName || user?.emailAddresses?.[0]?.emailAddress}</span>
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <h2 className="font-agency text-sm text-ash uppercase tracking-widest mb-4">Historial de pedidos</h2>
              {ordersLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-dragon" />
                </div>
              ) : orders.length === 0 ? (
                <div className="bg-deep border border-navy/40 p-10 text-center">
                  <p className="font-exo text-ash text-sm">Aún no tienes pedidos.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {orders.map((order) => (
                    <div key={order.id} className="bg-deep border border-navy/40 p-5">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div>
                          <p className="font-agency text-sm text-white tracking-wide">{order.orderNumber}</p>
                          <p className="font-exo text-xs text-ash mt-0.5">
                            {new Date(order.createdAt).toLocaleDateString('es-MX', {
                              year: 'numeric', month: 'long', day: 'numeric',
                            })}
                          </p>
                        </div>
                        <span
                          className="badge-base text-xs"
                          style={{
                            backgroundColor: ORDER_STATUS_COLORS[order.status!] + '22',
                            border: `1px solid ${ORDER_STATUS_COLORS[order.status!]}44`,
                            color: ORDER_STATUS_COLORS[order.status!],
                          }}
                        >
                          {ORDER_STATUS_LABELS[order.status!]}
                        </span>
                      </div>
                      <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
                        {order.items.map((item) => (
                          <img key={item.productId} src={item.image} alt={item.name} loading="lazy" className="w-12 h-16 object-cover flex-shrink-0" />
                        ))}
                      </div>
                      <div className="flex items-center justify-between">
                        {order.trackingNumber && (
                          <p className="font-exo text-xs text-ash">
                            Guía: <span className="text-dragon">{order.trackingNumber}</span>
                          </p>
                        )}
                        <span className="font-agency text-sm text-white ml-auto">{formatPrice(order.total)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h2 className="font-agency text-sm text-ash uppercase tracking-widest mb-4">Datos de perfil</h2>
              {ClerkUserProfile ? (
                <Suspense fallback={<div className="text-ash font-exo text-sm">Cargando...</div>}>
                  <ClerkUserProfile />
                </Suspense>
              ) : (
                <div className="bg-deep border border-navy/40 p-6">
                  <p className="font-exo text-ash text-xs">Perfil disponible cuando Clerk esté configurado.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
