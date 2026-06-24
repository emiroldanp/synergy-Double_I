import { useSearchParams, Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'

export default function OrderPendingPage() {
  const [searchParams] = useSearchParams()
  const orderId = searchParams.get('external_reference')

  return (
    <>
      <Helmet>
        <title>Pago pendiente — Double-I TCG</title>
      </Helmet>

      <div className="bg-night min-h-screen pt-32 md:pt-48">
        <div className="page-container py-16">
          <div className="max-w-lg mx-auto text-center">
            {/* Ícono de reloj */}
            <div className="w-20 h-20 mx-auto mb-6 flex items-center justify-center bg-yellow-500/10 border border-yellow-500/40">
              <svg className="w-10 h-10 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>

            <h1 className="font-agency text-3xl text-white uppercase tracking-wider mb-2">
              Pago pendiente
            </h1>

            {orderId && (
              <div className="inline-block bg-deep border border-yellow-500/30 px-6 py-3 mb-6">
                <span className="font-agency text-sm text-yellow-400 tracking-widest">{orderId}</span>
              </div>
            )}

            <p className="font-exo text-ash text-sm leading-relaxed mb-4">
              Tu pedido fue registrado y está esperando la confirmación del pago.
            </p>
            <p className="font-exo text-ash text-sm leading-relaxed mb-8">
              Si pagaste en <span className="text-frost">OXXO</span>, el pago puede tardar hasta{' '}
              <span className="text-frost">72 horas</span> en confirmarse. Si pagaste por{' '}
              <span className="text-frost">SPEI</span>, puede tardar entre{' '}
              <span className="text-frost">20 minutos y 2 horas</span>.
            </p>

            <div className="bg-deep border border-navy/40 p-5 text-left mb-8">
              <h2 className="font-agency text-xs text-ash uppercase tracking-widest mb-3">¿Qué sigue?</h2>
              <ul className="space-y-2 font-exo text-xs text-ash">
                <li className="flex items-start gap-2">
                  <span className="text-dragon mt-0.5">→</span>
                  <span>Cuando el pago se confirme, recibirás un correo con el resumen de tu pedido.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-dragon mt-0.5">→</span>
                  <span>Puedes revisar el estado de tu pedido en <span className="text-frost">Mi cuenta</span>.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-dragon mt-0.5">→</span>
                  <span>Si tienes dudas, escríbenos por{' '}
                    <a
                      href={`https://wa.me/${import.meta.env.VITE_WHATSAPP_NUMBER}?text=Hola, tengo una pregunta sobre mi pedido${orderId ? ` ${orderId}` : ''}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-frost hover:underline"
                    >WhatsApp</a>.
                  </span>
                </li>
              </ul>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link to="/mi-cuenta" className="btn-primary text-sm px-8 py-3">Ver mis pedidos</Link>
              <Link to="/" className="btn-secondary text-sm px-8 py-3">Ir al inicio</Link>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
