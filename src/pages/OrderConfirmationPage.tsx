import { useLocation, Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { formatPrice } from '@/lib/utils'

export default function OrderConfirmationPage() {
  const { state } = useLocation()
  const orderNumber = `DI-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000)}`

  return (
    <>
      <Helmet>
        <title>Pedido confirmado — Double-I TCG</title>
      </Helmet>

      <div className="bg-night min-h-screen pt-20">
        <div className="page-container py-16">
          <div className="max-w-lg mx-auto text-center">
            {/* Success icon */}
            <div className="w-20 h-20 mx-auto mb-6 flex items-center justify-center bg-royal/20 border border-dragon/40">
              <svg className="w-10 h-10 text-dragon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>

            <h1 className="font-agency text-3xl text-white uppercase tracking-wider mb-2">
              ¡Pedido confirmado!
            </h1>
            <p className="font-exo text-ash text-sm mb-4">
              Número de pedido:
            </p>
            <div className="inline-block bg-deep border border-dragon/40 px-6 py-3 mb-6">
              <span className="font-agency text-xl text-dragon tracking-widest">{orderNumber}</span>
            </div>

            <p className="font-exo text-ash text-sm leading-relaxed mb-8">
              Recibirás un correo de confirmación con el resumen de tu pedido.
              {state?.contact?.email && (
                <> Enviado a <span className="text-frost">{state.contact.email}</span>.</>
              )}
            </p>

            {state?.shipping && (
              <div className="bg-deep border border-navy/40 p-5 text-left mb-8">
                <h2 className="font-agency text-xs text-ash uppercase tracking-widest mb-3">Detalle de envío</h2>
                <p className="font-exo text-sm text-frost">{state.shipping.service}</p>
                <p className="font-exo text-xs text-ash">{state.shipping.eta}</p>
                <p className="font-agency text-sm text-dragon mt-1">{formatPrice(state.shipping.price)}</p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link to="/" className="btn-primary text-sm px-8 py-3">
                Ir al inicio
              </Link>
              <Link to="/catalogo" className="btn-secondary text-sm px-8 py-3">
                Seguir comprando
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
