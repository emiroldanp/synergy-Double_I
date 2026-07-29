import { useLocation, useSearchParams, Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'

const BANK_NAME = import.meta.env.VITE_BANK_NAME || '[PLACEHOLDER — confirmar banco con Irving]'
const BANK_HOLDER = import.meta.env.VITE_BANK_HOLDER || '[PLACEHOLDER — confirmar titular con Irving]'
const BANK_CLABE = import.meta.env.VITE_BANK_CLABE || '[PLACEHOLDER — confirmar CLABE con Irving]'
const BANK_ACCOUNT_NUMBER = import.meta.env.VITE_BANK_ACCOUNT_NUMBER || '[PLACEHOLDER — confirmar cuenta con Irving]'
const BANK_BRANCH = import.meta.env.VITE_BANK_BRANCH || '[PLACEHOLDER — confirmar sucursal con Irving]'

export default function OrderTransferPendingPage() {
  const { state } = useLocation()
  const [searchParams] = useSearchParams()

  // orderId puede venir del state (navegación interna desde el checkout) o del query param
  const orderId: string | null = state?.orderId ?? searchParams.get('orderId')

  const waText = encodeURIComponent(
    `Hola! Ya hice mi transferencia del pedido${orderId ? ` ${orderId}` : ''}. Te comparto el comprobante:`
  )
  const waUrl = `https://wa.me/${import.meta.env.VITE_WHATSAPP_NUMBER}?text=${waText}`
  const mailtoUrl = `mailto:hola@doubleicards.com?subject=${encodeURIComponent(
    `Comprobante de pago — pedido${orderId ? ` ${orderId}` : ''}`
  )}`

  return (
    <>
      <Helmet>
        <title>Falta confirmar tu pago — Double-I TCG</title>
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
              ¡Gracias por tu pedido!
            </h1>

            {orderId && (
              <div className="inline-block bg-deep border border-yellow-500/30 px-6 py-3 mb-6">
                <span className="font-agency text-sm text-yellow-400 tracking-widest">{orderId}</span>
              </div>
            )}

            <p className="font-exo text-ash text-sm leading-relaxed mb-6">
              Falta confirmar tu pago. Transfiere el total de tu pedido a la siguiente cuenta y envíanos tu
              comprobante para que podamos verificarlo.
            </p>

            {/* Datos bancarios */}
            <div className="bg-deep border border-navy/40 p-5 text-left mb-6 space-y-1.5 font-exo text-sm">
              <p className="text-ash">Banco: <span className="text-frost">{BANK_NAME}</span></p>
              <p className="text-ash">Titular: <span className="text-frost">{BANK_HOLDER}</span></p>
              <p className="text-ash">CLABE: <span className="text-frost">{BANK_CLABE}</span></p>
              <p className="text-ash">Cuenta: <span className="text-frost">{BANK_ACCOUNT_NUMBER}</span></p>
              <p className="text-ash">Sucursal: <span className="text-frost">{BANK_BRANCH}</span></p>
            </div>

            <div className="bg-deep border border-navy/40 p-5 text-left mb-8">
              <h2 className="font-agency text-xs text-ash uppercase tracking-widest mb-3">¿Qué sigue?</h2>
              <ul className="space-y-2 font-exo text-xs text-ash">
                <li className="flex items-start gap-2">
                  <span className="text-dragon mt-0.5">→</span>
                  <span>Envíanos tu comprobante de pago por WhatsApp o correo.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-dragon mt-0.5">→</span>
                  <span>Cuando verifiquemos tu pago, recibirás un correo con la confirmación de tu pedido.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-dragon mt-0.5">→</span>
                  <span>Puedes revisar el estado de tu pedido en <span className="text-frost">Mi cuenta</span>.</span>
                </li>
              </ul>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center mb-4">
              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary text-sm px-8 py-3"
              >
                Enviar comprobante por WhatsApp
              </a>
              <a href={mailtoUrl} className="btn-secondary text-sm px-8 py-3">
                Enviar por correo
              </a>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link to="/mi-cuenta" className="btn-ghost text-sm px-8 py-3">Ver mis pedidos</Link>
              <Link to="/" className="btn-ghost text-sm px-8 py-3">Ir al inicio</Link>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
