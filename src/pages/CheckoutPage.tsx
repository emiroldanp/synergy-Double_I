import { useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from 'react-router-dom'
import { useCart } from '@/hooks/useCart'
import { useShippingQuote } from '@/hooks/useShippingQuote'
import { useAuth } from '@/hooks/useAuth'
import { ordersApi } from '@/lib/api'
import { contactSchema, addressSchema, cfdiSchema } from '@/lib/schemas/checkout'
import type { ContactFormData, AddressFormData, CfdiFormData } from '@/lib/schemas/checkout'
import { formatPrice, CFDI_USES } from '@/lib/utils'
import { cn } from '@/lib/utils'

const STEPS = ['Contacto', 'Dirección', 'Envío', 'Facturación', 'Pago']

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-0 mb-8 overflow-x-auto pb-2">
      {STEPS.map((step, i) => (
        <div key={step} className="flex items-center flex-shrink-0">
          <div className={cn(
            'w-7 h-7 flex items-center justify-center text-xs font-agency transition-colors',
            i < current ? 'bg-royal text-white' :
            i === current ? 'bg-dragon text-night' :
            'bg-deep border border-navy/60 text-ash'
          )}>
            {i < current ? '✓' : i + 1}
          </div>
          <span className={cn(
            'font-agency text-xs uppercase tracking-wider ml-2 mr-4 hidden sm:block',
            i === current ? 'text-dragon' : i < current ? 'text-frost' : 'text-ash/50'
          )}>
            {step}
          </span>
          {i < STEPS.length - 1 && (
            <div className={cn('w-4 sm:w-8 h-px mr-2 sm:mr-0', i < current ? 'bg-royal' : 'bg-navy/40')} />
          )}
        </div>
      ))}
    </div>
  )
}

function FormField({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block font-agency text-xs text-ash uppercase tracking-wider mb-1.5">{label}</label>
      {children}
      {error && <p className="text-xs text-crimson mt-1">{error}</p>}
    </div>
  )
}

export default function CheckoutPage() {
  const [step, setStep] = useState(0)
  const [contact, setContact] = useState<ContactFormData | null>(null)
  const [address, setAddress] = useState<AddressFormData | null>(null)
  const [paying, setPaying] = useState(false)
  const [payError, setPayError] = useState<string | null>(null)
  const { items, subtotal, clearCart } = useCart()
  const shipping = useShippingQuote()
  const { user, isSignedIn } = useAuth()
  const navigate = useNavigate()

  const contactForm = useForm<ContactFormData>({ resolver: zodResolver(contactSchema) })
  const addressForm = useForm<AddressFormData>({ resolver: zodResolver(addressSchema) })
  const cfdiForm = useForm<CfdiFormData>({ resolver: zodResolver(cfdiSchema), defaultValues: { requestCfdi: false } })

  const watchCfdi = cfdiForm.watch('requestCfdi')

  if (items.length === 0) {
    navigate('/carrito', { replace: true })
    return null
  }

  const handleContact = contactForm.handleSubmit((data) => {
    setContact(data)
    setStep(1)
  })

  const handleAddress = addressForm.handleSubmit((data) => {
    setAddress(data)
    shipping.fetchQuote(data)
    setStep(2)
  })

  const handleShipping = () => {
    if (!shipping.selected) return
    setStep(3)
  }

  const handleCfdi = cfdiForm.handleSubmit(() => {
    setStep(4)
  })

  const handlePay = async () => {
    if (!contact || !address || !shipping.selected) return
    setPaying(true)
    setPayError(null)

    const cfdiValues = cfdiForm.getValues()

    try {
      const orderPayload = {
        customerId: isSignedIn ? (user as any)?.id ?? null : null,
        guestName: contact.name,
        guestEmail: contact.email,
        guestPhone: contact.phone,
        shippingAddress: address,
        shippingMethod: shipping.selected.service,
        shippingCost: shipping.selected.price,
        items: items.map((item) => ({
          productId: item.product.id,
          quantity: item.quantity,
          unitPrice: item.product.price,
        })),
        requiresInvoice: cfdiValues.requestCfdi,
        invoiceData: cfdiValues.requestCfdi
          ? { rfc: cfdiValues.rfc!, razonSocial: cfdiValues.razonSocial!, cfdiUse: cfdiValues.usoCfdi! }
          : null,
      }

      const res = await ordersApi.create(orderPayload)
      const orderId: string = res.data?.data?.orderId ?? res.data?.orderId

      clearCart()
      navigate('/pedido/confirmacion', {
        state: { orderId, contact, shipping: shipping.selected, subtotal },
      })
    } catch (err: any) {
      const msg = err?.response?.data?.error ?? 'Error al crear el pedido. Intenta de nuevo.'
      setPayError(msg)
      setPaying(false)
    }
  }

  return (
    <>
      <Helmet>
        <title>Checkout — Double-I TCG</title>
      </Helmet>

      <div className="bg-night min-h-screen pt-20">
        <div className="page-container py-8">
          <h1 className="section-title mb-6">Checkout</h1>
          <StepIndicator current={step} />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              {/* Step 0: Contacto */}
              {step === 0 && (
                <form onSubmit={handleContact} noValidate>
                  <div className="bg-deep border border-navy/40 p-6 space-y-4">
                    <h2 className="font-agency text-white uppercase tracking-wider text-lg mb-4">Datos de contacto</h2>
                    <FormField label="Nombre completo" error={contactForm.formState.errors.name?.message}>
                      <input {...contactForm.register('name')} className="input-dark" placeholder="Tu nombre" />
                    </FormField>
                    <FormField label="Correo electrónico" error={contactForm.formState.errors.email?.message}>
                      <input {...contactForm.register('email')} type="email" className="input-dark" placeholder="tu@correo.com" />
                    </FormField>
                    <FormField label="Teléfono (10 dígitos)" error={contactForm.formState.errors.phone?.message}>
                      <input {...contactForm.register('phone')} type="tel" className="input-dark" placeholder="5512345678" maxLength={10} />
                    </FormField>
                    <button type="submit" className="btn-primary w-full mt-2">Continuar →</button>
                  </div>
                </form>
              )}

              {/* Step 1: Dirección */}
              {step === 1 && (
                <form onSubmit={handleAddress} noValidate>
                  <div className="bg-deep border border-navy/40 p-6 space-y-4">
                    <h2 className="font-agency text-white uppercase tracking-wider text-lg mb-4">Dirección de envío</h2>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2 sm:col-span-1">
                        <FormField label="Calle" error={addressForm.formState.errors.street?.message}>
                          <input {...addressForm.register('street')} className="input-dark" placeholder="Av. Insurgentes Sur" />
                        </FormField>
                      </div>
                      <FormField label="Número" error={addressForm.formState.errors.number?.message}>
                        <input {...addressForm.register('number')} className="input-dark" placeholder="123" />
                      </FormField>
                      <div className="col-span-2">
                        <FormField label="Colonia" error={addressForm.formState.errors.colonia?.message}>
                          <input {...addressForm.register('colonia')} className="input-dark" placeholder="Roma Norte" />
                        </FormField>
                      </div>
                      <FormField label="Ciudad" error={addressForm.formState.errors.city?.message}>
                        <input {...addressForm.register('city')} className="input-dark" placeholder="Ciudad de México" />
                      </FormField>
                      <FormField label="Estado" error={addressForm.formState.errors.state?.message}>
                        <input {...addressForm.register('state')} className="input-dark" placeholder="CDMX" />
                      </FormField>
                      <div className="col-span-2 sm:col-span-1">
                        <FormField label="Código Postal" error={addressForm.formState.errors.zip?.message}>
                          <input {...addressForm.register('zip')} className="input-dark" placeholder="06700" maxLength={5} />
                        </FormField>
                      </div>
                    </div>
                    <div className="flex gap-3 mt-2">
                      <button type="button" onClick={() => setStep(0)} className="btn-ghost text-sm px-4 py-3">← Atrás</button>
                      <button type="submit" className="btn-primary flex-1">Continuar →</button>
                    </div>
                  </div>
                </form>
              )}

              {/* Step 2: Envío */}
              {step === 2 && (
                <div className="bg-deep border border-navy/40 p-6">
                  <h2 className="font-agency text-white uppercase tracking-wider text-lg mb-4">Método de envío</h2>
                  {shipping.status === 'loading' && (
                    <div className="flex items-center gap-3 py-8 justify-center">
                      <svg className="animate-spin h-6 w-6 text-dragon" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      <span className="font-exo text-ash text-sm">Cotizando envíos...</span>
                    </div>
                  )}
                  {shipping.status === 'error' && (
                    <div className="text-center py-6">
                      <p className="font-exo text-crimson text-sm mb-3">No pudimos cotizar el envío. Intenta de nuevo.</p>
                      <button onClick={() => address && shipping.fetchQuote(address)} className="btn-secondary text-xs px-4 py-2">
                        Reintentar
                      </button>
                    </div>
                  )}
                  {shipping.status === 'success' && (
                    <div className="space-y-3">
                      {shipping.options.map((opt) => (
                        <label
                          key={opt.id}
                          className={cn(
                            'flex items-center justify-between p-4 border cursor-pointer transition-colors',
                            shipping.selected?.id === opt.id
                              ? 'border-dragon bg-royal/10'
                              : 'border-navy/40 hover:border-navy/80'
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              'w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors',
                              shipping.selected?.id === opt.id ? 'border-dragon' : 'border-navy/60'
                            )}>
                              {shipping.selected?.id === opt.id && (
                                <div className="w-2 h-2 rounded-full bg-dragon" />
                              )}
                            </div>
                            <input
                              type="radio"
                              name="shipping"
                              value={opt.id}
                              className="sr-only"
                              onChange={() => shipping.setSelected(opt)}
                            />
                            <div>
                              <p className="font-agency text-sm text-white uppercase tracking-wide">{opt.service}</p>
                              <p className="font-exo text-xs text-ash">{opt.eta}</p>
                            </div>
                          </div>
                          <span className="font-agency text-sm text-dragon">{formatPrice(opt.price)}</span>
                        </label>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-3 mt-6">
                    <button onClick={() => setStep(1)} className="btn-ghost text-sm px-4 py-3">← Atrás</button>
                    <button
                      onClick={handleShipping}
                      disabled={!shipping.selected}
                      className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Continuar →
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3: Facturación CFDI */}
              {step === 3 && (
                <form onSubmit={handleCfdi} noValidate>
                  <div className="bg-deep border border-navy/40 p-6 space-y-4">
                    <h2 className="font-agency text-white uppercase tracking-wider text-lg mb-2">Facturación CFDI</h2>
                    <p className="font-exo text-ash text-xs mb-4">La factura es opcional. Si no la necesitas, avanza al siguiente paso.</p>

                    <label className="flex items-center gap-3 cursor-pointer">
                      <div className={cn(
                        'w-5 h-5 border-2 flex items-center justify-center transition-colors flex-shrink-0',
                        watchCfdi ? 'bg-royal border-royal' : 'border-navy/60'
                      )}>
                        {watchCfdi && (
                          <svg className="w-3 h-3 text-white" viewBox="0 0 10 10" fill="none">
                            <path d="M8.5 2L4 7.5 1.5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </div>
                      <input type="checkbox" {...cfdiForm.register('requestCfdi')} className="sr-only" />
                      <span className="font-agency text-sm text-frost uppercase tracking-wider">
                        Solicitar factura CFDI
                      </span>
                    </label>

                    {watchCfdi && (
                      <div className="space-y-4 border border-navy/30 p-4">
                        <FormField label="RFC" error={cfdiForm.formState.errors.rfc?.message}>
                          <input {...cfdiForm.register('rfc')} className="input-dark uppercase" placeholder="XAXX010101000" />
                        </FormField>
                        <FormField label="Razón Social" error={cfdiForm.formState.errors.razonSocial?.message}>
                          <input {...cfdiForm.register('razonSocial')} className="input-dark" placeholder="Mi Empresa SA de CV" />
                        </FormField>
                        <FormField label="Uso del CFDI" error={cfdiForm.formState.errors.usoCfdi?.message}>
                          <select {...cfdiForm.register('usoCfdi')} className="input-dark cursor-pointer">
                            <option value="">Seleccionar...</option>
                            {CFDI_USES.map((u) => (
                              <option key={u.value} value={u.value} className="bg-abyss">{u.label}</option>
                            ))}
                          </select>
                        </FormField>
                      </div>
                    )}

                    <div className="flex gap-3 mt-2">
                      <button type="button" onClick={() => setStep(2)} className="btn-ghost text-sm px-4 py-3">← Atrás</button>
                      <button type="submit" className="btn-primary flex-1">Continuar →</button>
                    </div>
                  </div>
                </form>
              )}

              {/* Step 4: Pago */}
              {step === 4 && (
                <div className="bg-deep border border-navy/40 p-6">
                  <h2 className="font-agency text-white uppercase tracking-wider text-lg mb-4">Pago</h2>
                  <div className="bg-abyss border border-navy/30 p-6 text-center mb-6">
                    <p className="font-agency text-dragon uppercase tracking-wider text-sm mb-2">
                      [PLACEHOLDER — Integración Mercado Pago]
                    </p>
                    <p className="font-exo text-ash text-xs">
                      La pasarela de pagos se configurará con las credenciales de Mercado Pago de Irving.
                      Métodos: tarjeta, OXXO Pay, SPEI.
                    </p>
                  </div>
                  <div className="border border-navy/30 p-4 mb-6">
                    <h3 className="font-agency text-sm text-ash uppercase tracking-wider mb-3">Resumen final</h3>
                    {items.map((item) => (
                      <div key={item.product.id} className="flex justify-between text-xs font-exo py-1">
                        <span className="text-ash">{item.product.name} ×{item.quantity}</span>
                        <span className="text-frost">{formatPrice(item.product.price * item.quantity)}</span>
                      </div>
                    ))}
                    {shipping.selected && (
                      <div className="flex justify-between text-xs font-exo py-1 border-t border-navy/30 mt-2 pt-2">
                        <span className="text-ash">Envío ({shipping.selected.service})</span>
                        <span className="text-frost">{formatPrice(shipping.selected.price)}</span>
                      </div>
                    )}
                    <div className="flex justify-between mt-2 pt-2 border-t border-navy/40">
                      <span className="font-agency text-sm text-ash uppercase">Total</span>
                      <span className="font-agency text-lg text-white">
                        {formatPrice(subtotal + (shipping.selected?.price ?? 0))}
                      </span>
                    </div>
                  </div>
                  {payError && (
                    <p className="font-exo text-xs text-crimson mb-3">{payError}</p>
                  )}
                  <div className="flex gap-3">
                    <button onClick={() => setStep(3)} className="btn-ghost text-sm px-4 py-3" disabled={paying}>← Atrás</button>
                    <button onClick={handlePay} className="btn-primary flex-1 disabled:opacity-60" disabled={paying}>
                      {paying ? 'Creando pedido...' : 'Confirmar pedido'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Order summary sidebar */}
            <div>
              <div className="bg-deep border border-navy/40 p-5 sticky top-24">
                <h2 className="font-agency text-sm text-ash uppercase tracking-wider mb-4">Tu pedido</h2>
                <div className="space-y-3 max-h-64 overflow-y-auto mb-4">
                  {items.map((item) => (
                    <div key={item.product.id} className="flex gap-2">
                      <img
                        src={item.product.images[0]}
                        alt={item.product.name}
                        className="w-10 h-14 object-cover flex-shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="font-agency text-xs text-white uppercase leading-tight line-clamp-2">
                          {item.product.name}
                        </p>
                        <p className="font-exo text-ash text-xs">×{item.quantity}</p>
                        <p className="font-agency text-xs text-dragon">{formatPrice(item.product.price * item.quantity)}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="border-t border-navy/40 pt-3 space-y-1 text-xs font-exo">
                  <div className="flex justify-between text-ash">
                    <span>Subtotal</span>
                    <span className="text-frost">{formatPrice(subtotal)}</span>
                  </div>
                  {shipping.selected && (
                    <div className="flex justify-between text-ash">
                      <span>Envío</span>
                      <span className="text-frost">{formatPrice(shipping.selected.price)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-agency text-sm pt-2 border-t border-navy/40 mt-2">
                    <span className="text-ash uppercase">Total</span>
                    <span className="text-white">{formatPrice(subtotal + (shipping.selected?.price ?? 0))}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
