import { useState, useEffect } from 'react'
import { Helmet } from 'react-helmet-async'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from 'react-router-dom'
import { useCart } from '@/hooks/useCart'
import { useShippingQuote } from '@/hooks/useShippingQuote'
import { useAuth } from '@/hooks/useAuth'
import { ordersApi, paymentsApi, discountCodesApi, promotionsApi } from '@/lib/api'
import { contactSchema, addressSchema, cfdiSchema } from '@/lib/schemas/checkout'
import type { ContactFormData, AddressFormData, CfdiFormData } from '@/lib/schemas/checkout'
import type { AppliedPromotion } from '@/types'
import { formatPrice, CFDI_USES } from '@/lib/utils'
import { cn } from '@/lib/utils'

const STEPS = ['Contacto', 'Dirección', 'Envío', 'Facturación', 'Pago']

const BANK_NAME = import.meta.env.VITE_BANK_NAME || '[PLACEHOLDER — confirmar banco con Irving]'
const BANK_HOLDER = import.meta.env.VITE_BANK_HOLDER || '[PLACEHOLDER — confirmar titular con Irving]'
const BANK_CLABE = import.meta.env.VITE_BANK_CLABE || '[PLACEHOLDER — confirmar CLABE con Irving]'
const BANK_ACCOUNT_NUMBER = import.meta.env.VITE_BANK_ACCOUNT_NUMBER || '[PLACEHOLDER — confirmar cuenta con Irving]'
const BANK_BRANCH = import.meta.env.VITE_BANK_BRANCH || '[PLACEHOLDER — confirmar sucursal con Irving]'

function formatEta(days: unknown): string | null {
  if (typeof days === 'number' && days >= 1) {
    return days === 1 ? '1 día hábil' : `${days} días hábiles`
  }
  if (typeof days === 'string' && days.trim().length > 0) return days
  return null
}

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
  const [paymentMethod, setPaymentMethod] = useState<'transferencia_directa' | 'mercado_pago'>('transferencia_directa')
  const [paying, setPaying] = useState(false)
  const [payError, setPayError] = useState<string | null>(null)
  const [discountCode, setDiscountCode] = useState('')
  const [discountValidating, setDiscountValidating] = useState(false)
  const [discountError, setDiscountError] = useState<string | null>(null)
  const [discountApplied, setDiscountApplied] = useState<{ code: string; amount: number } | null>(null)
  const [appliedPromotion, setAppliedPromotion] = useState<AppliedPromotion | null>(null)
  const { items, subtotal, clearCart } = useCart()
  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0)
  const shipping = useShippingQuote()
  const effectiveShippingCost = !discountApplied && appliedPromotion?.freeShipping ? 0 : (shipping.selected?.price ?? 0)
  const effectiveDiscountAmount = discountApplied ? discountApplied.amount : (appliedPromotion?.discountAmount ?? 0)
  const { user, isSignedIn } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    // Las promociones automáticas y los códigos de descuento no se combinan —
    // si el cliente ya aplicó un código, no mostramos ni evaluamos promociones.
    if (discountApplied || !shipping.selected || items.length === 0) {
      setAppliedPromotion(null)
      return
    }
    const effectiveShippingCostForEval = shipping.isLocal ? 0 : shipping.selected.price
    promotionsApi
      .evaluate(items.map((i) => ({ productId: i.product.id, quantity: i.quantity })), effectiveShippingCostForEval)
      .then((res) => {
        const promo = res.data?.data?.promotion ?? res.data?.promotion ?? null
        setAppliedPromotion(promo)
      })
      .catch(() => setAppliedPromotion(null))
  }, [items, shipping.selected, shipping.isLocal, discountApplied])

  const applyDiscount = async () => {
    if (!discountCode.trim()) return
    setDiscountValidating(true)
    setDiscountError(null)
    try {
      const res = await discountCodesApi.validate(discountCode.trim(), subtotal)
      const { discountAmount: amount } = res.data?.data ?? res.data
      setDiscountApplied({ code: discountCode.trim().toUpperCase(), amount })
      setDiscountError(null)
    } catch (err: any) {
      const msg = err?.response?.data?.error ?? 'Código inválido'
      setDiscountError(msg)
      setDiscountApplied(null)
    } finally {
      setDiscountValidating(false)
    }
  }

  const removeDiscount = () => {
    setDiscountCode('')
    setDiscountApplied(null)
    setDiscountError(null)
  }

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
    shipping.fetchQuote(data, totalQuantity)
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
        discountCode: discountApplied?.code ?? null,
        paymentMethod,
      }

      const res = await ordersApi.create(orderPayload)
      const orderId: string = res.data?.data?.orderId ?? res.data?.orderId

      // Transferencia directa: el pedido se queda en "pending" esperando el comprobante,
      // Irving lo confirma manualmente desde el admin — no pasa por Mercado Pago.
      if (paymentMethod === 'transferencia_directa') {
        clearCart()
        navigate(`/pedido/transferencia?orderId=${orderId}`, { state: { orderId, contact } })
        return
      }

      // Crear preferencia de pago en Mercado Pago y redirigir al checkout de MP.
      // El carrito se limpia al volver desde MP a /pedido/confirmacion (back_url).
      const prefRes = await paymentsApi.createPreference(orderId)
      const initPoint: string | undefined =
        prefRes.data?.data?.initPoint ?? prefRes.data?.initPoint

      if (!initPoint) {
        throw new Error('No se obtuvo la URL de pago de Mercado Pago')
      }

      // Persistimos el contexto para mostrarlo al volver desde MP
      sessionStorage.setItem(
        'checkout:lastOrder',
        JSON.stringify({ orderId, contact, shipping: shipping.selected, subtotal })
      )

      clearCart()
      window.location.href = initPoint
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

      <div className="bg-night min-h-screen pt-32 md:pt-48">
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
                      <button type="button" onClick={() => { removeDiscount(); setStep(0) }} className="btn-ghost text-sm px-4 py-3">← Atrás</button>
                      <button type="submit" className="btn-primary flex-1">Continuar →</button>
                    </div>
                  </div>
                </form>
              )}

              {/* Step 2: Envío */}
              {step === 2 && (
                <div className="bg-deep border border-navy/40 p-6">
                  <h2 className="font-agency text-white uppercase tracking-wider text-lg mb-4">Método de envío</h2>

                  {/* Zona local (CDMX / EDOMEX) — opción directa por WhatsApp */}
                  {shipping.isLocal && shipping.status === 'success' && (
                    <div className="space-y-4">
                      <div className="border border-[#25D366]/40 bg-[#25D366]/5 p-4">
                        <div className="flex items-start gap-3">
                          <svg className="w-6 h-6 text-[#25D366] flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                            <path d="M11.998 2C6.477 2 2 6.477 2 12c0 1.99.58 3.842 1.58 5.395L2.05 22l4.737-1.502A9.96 9.96 0 0 0 12 21.999c5.523 0 10-4.477 10-10S17.523 2 11.998 2zm.002 18.108a8.113 8.113 0 0 1-4.141-1.132l-.297-.176-3.084.978.93-3.07-.194-.315A8.108 8.108 0 0 1 12 3.892c4.473 0 8.108 3.635 8.108 8.108 0 4.472-3.635 8.108-8.108 8.108z"/>
                          </svg>
                          <div className="flex-1 min-w-0">
                            <p className="font-agency text-sm text-white tracking-wide uppercase">
                              Envío local — CDMX / Estado de México
                            </p>
                            <p className="font-exo text-xs text-ash mt-1">
                              Irving te contactará por WhatsApp para coordinar la entrega en tu zona.
                            </p>
                            <p className="font-agency text-sm text-[#25D366] mt-2">Costo de envío a cotizar por WhatsApp</p>
                          </div>
                          <div className="w-4 h-4 rounded-full border-2 border-[#25D366] flex items-center justify-center flex-shrink-0">
                            <div className="w-2 h-2 rounded-full bg-[#25D366]" />
                          </div>
                        </div>
                      </div>
                      <p className="font-exo text-xs text-ash/60">
                        Al completar tu pedido recibirás un mensaje de WhatsApp para acordar la entrega. Tu pago queda protegido por Mercado Pago.
                      </p>
                    </div>
                  )}

                  {/* Zona foránea — cotización Skydropx */}
                  {!shipping.isLocal && shipping.status === 'loading' && (
                    <div className="flex items-center gap-3 py-8 justify-center">
                      <svg className="animate-spin h-6 w-6 text-dragon" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      <span className="font-exo text-ash text-sm">Cotizando envíos...</span>
                    </div>
                  )}
                  {!shipping.isLocal && shipping.status === 'error' && (
                    <div className="text-center py-6">
                      <p className="font-exo text-crimson text-sm mb-3">No pudimos cotizar el envío. Intenta de nuevo.</p>
                      <button onClick={() => address && shipping.fetchQuote(address, totalQuantity)} className="btn-secondary text-xs px-4 py-2">
                        Reintentar
                      </button>
                    </div>
                  )}
                  {!shipping.isLocal && shipping.status === 'success' && (
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
                              <p className="font-agency text-sm text-white tracking-wide">{opt.carrier}</p>
                              <p className="font-exo text-xs text-ash">{opt.service}{formatEta(opt.eta) ? ` · ${formatEta(opt.eta)}` : ''}</p>
                            </div>
                          </div>
                          <span className="font-agency text-sm text-dragon">{formatPrice(opt.price)}</span>
                        </label>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-3 mt-6">
                    <button onClick={() => { removeDiscount(); setStep(1) }} className="btn-ghost text-sm px-4 py-3">← Atrás</button>
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
                      <button type="button" onClick={() => { removeDiscount(); setStep(2) }} className="btn-ghost text-sm px-4 py-3">← Atrás</button>
                      <button type="submit" className="btn-primary flex-1">Continuar →</button>
                    </div>
                  </div>
                </form>
              )}

              {/* Step 4: Pago */}
              {step === 4 && (
                <div className="bg-deep border border-navy/40 p-6">
                  <h2 className="font-agency text-white uppercase tracking-wider text-lg mb-4">Pago</h2>

                  {/* Selector de método de pago */}
                  <div className="space-y-3 mb-6">
                    <label className={cn(
                      'flex items-center justify-between gap-3 border p-4 cursor-pointer transition-colors',
                      paymentMethod === 'transferencia_directa' ? 'border-dragon bg-abyss' : 'border-navy/30'
                    )}>
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          'w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors flex-shrink-0',
                          paymentMethod === 'transferencia_directa' ? 'border-dragon' : 'border-navy/60'
                        )}>
                          {paymentMethod === 'transferencia_directa' && <div className="w-2 h-2 rounded-full bg-dragon" />}
                        </div>
                        <div>
                          <p className="font-agency text-sm text-white tracking-wide uppercase">1. Transferencia directa</p>
                          <p className="font-exo text-xs text-ash">Sin comisión — transfiere directo y envía tu comprobante</p>
                        </div>
                      </div>
                      <input
                        type="radio"
                        name="paymentMethod"
                        className="sr-only"
                        checked={paymentMethod === 'transferencia_directa'}
                        onChange={() => setPaymentMethod('transferencia_directa')}
                      />
                    </label>

                    <label className={cn(
                      'flex items-center justify-between gap-3 border p-4 cursor-pointer transition-colors',
                      paymentMethod === 'mercado_pago' ? 'border-dragon bg-abyss' : 'border-navy/30'
                    )}>
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          'w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors flex-shrink-0',
                          paymentMethod === 'mercado_pago' ? 'border-dragon' : 'border-navy/60'
                        )}>
                          {paymentMethod === 'mercado_pago' && <div className="w-2 h-2 rounded-full bg-dragon" />}
                        </div>
                        <div>
                          <p className="font-agency text-sm text-white tracking-wide uppercase">2. Mercado Pago</p>
                          <p className="font-exo text-xs text-ash">Tarjeta, OXXO o SPEI vía Mercado Pago</p>
                        </div>
                      </div>
                      <input
                        type="radio"
                        name="paymentMethod"
                        className="sr-only"
                        checked={paymentMethod === 'mercado_pago'}
                        onChange={() => setPaymentMethod('mercado_pago')}
                      />
                    </label>
                  </div>

                  {paymentMethod === 'transferencia_directa' ? (
                    <div className="bg-abyss border border-navy/30 p-6 mb-6">
                      <p className="font-agency text-white uppercase tracking-wider text-sm mb-3">
                        Datos para tu transferencia
                      </p>
                      <div className="space-y-1.5 font-exo text-sm">
                        <p className="text-ash">Banco: <span className="text-frost">{BANK_NAME}</span></p>
                        <p className="text-ash">Titular: <span className="text-frost">{BANK_HOLDER}</span></p>
                        <p className="text-ash">CLABE: <span className="text-frost">{BANK_CLABE}</span></p>
                        <p className="text-ash">Cuenta: <span className="text-frost">{BANK_ACCOUNT_NUMBER}</span></p>
                        <p className="text-ash">Sucursal: <span className="text-frost">{BANK_BRANCH}</span></p>
                      </div>
                      <p className="font-exo text-ash text-xs mt-4">
                        Al confirmar tu pedido, transfiere el total y envíanos el comprobante por WhatsApp o correo para verificar tu pago.
                      </p>
                    </div>
                  ) : (
                    <div className="bg-abyss border border-navy/30 p-6 text-center mb-6">
                      <p className="font-agency text-white uppercase tracking-wider text-sm mb-2">
                        Pago con Mercado Pago
                      </p>
                      <p className="font-exo text-ash text-xs">
                        Al confirmar el pedido te redirigiremos al checkout seguro de Mercado Pago para que pagues con tarjeta, OXXO o transferencia (SPEI).
                      </p>
                    </div>
                  )}
                  {/* Campo de código de descuento */}
                  <div className="border border-navy/30 p-4 mb-4">
                    <h3 className="font-agency text-sm text-ash uppercase tracking-wider mb-3">Código de descuento</h3>
                    {discountApplied ? (
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-agency text-sm text-dragon tracking-wider">{discountApplied.code}</span>
                          <span className="font-exo text-xs text-ash ml-3">
                            −${discountApplied.amount.toFixed(2)}
                          </span>
                        </div>
                        <button
                          onClick={removeDiscount}
                          className="font-agency text-xs text-ash/60 hover:text-crimson uppercase tracking-wider transition-colors"
                        >
                          Quitar
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <input
                          value={discountCode}
                          onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
                          onKeyDown={(e) => e.key === 'Enter' && applyDiscount()}
                          placeholder="PROMO10"
                          className="input-dark flex-1 uppercase text-sm"
                          disabled={discountValidating}
                        />
                        <button
                          onClick={applyDiscount}
                          disabled={discountValidating || !discountCode.trim()}
                          className="btn-secondary text-xs px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                        >
                          {discountValidating ? '...' : 'Aplicar'}
                        </button>
                      </div>
                    )}
                    {discountError && (
                      <p className="text-xs text-crimson mt-2">{discountError}</p>
                    )}
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
                        <span className="text-ash">
                          {shipping.isLocal ? 'Envío local (WhatsApp)' : `Envío (${shipping.selected.service})`}
                        </span>
                        <span className="text-frost">
                          {shipping.isLocal
                            ? 'A cotizar por WhatsApp'
                            : !discountApplied && appliedPromotion?.freeShipping
                              ? <><span className="line-through text-ash/50 mr-1.5">{formatPrice(shipping.selected.price)}</span>GRATIS</>
                              : formatPrice(shipping.selected.price)}
                        </span>
                      </div>
                    )}
                    {shipping.isLocal && (
                      <p className="text-xs text-ash/60 font-exo mt-2 border-t border-navy/20 pt-2">
                        Irving te contactará por WhatsApp para cotizar el envío y coordinar la entrega.
                      </p>
                    )}
                    {discountApplied && (
                      <div className="flex justify-between text-xs font-exo py-1">
                        <span className="text-ash">Descuento ({discountApplied.code})</span>
                        <span className="text-dragon">−${discountApplied.amount.toFixed(2)}</span>
                      </div>
                    )}
                    {!discountApplied && appliedPromotion && (
                      <div className="flex justify-between text-xs font-exo py-1">
                        <span className="text-ash">🎉 {appliedPromotion.title}</span>
                        <span className="text-dragon">
                          {appliedPromotion.freeShipping ? 'Envío gratis' : `−$${appliedPromotion.discountAmount.toFixed(2)}`}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between mt-2 pt-2 border-t border-navy/40">
                      <span className="font-agency text-sm text-ash uppercase">Total</span>
                      <span className="font-agency text-lg text-white">
                        {formatPrice(subtotal + effectiveShippingCost - effectiveDiscountAmount)}
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
                        loading="lazy"
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
                      <span className="text-frost">
                        {shipping.isLocal
                          ? 'A cotizar por WhatsApp'
                          : !discountApplied && appliedPromotion?.freeShipping
                            ? <><span className="line-through text-ash/50 mr-1.5">{formatPrice(shipping.selected.price)}</span>GRATIS</>
                            : formatPrice(shipping.selected.price)}
                      </span>
                    </div>
                  )}
                  {discountApplied && (
                    <div className="flex justify-between text-ash">
                      <span>Descuento</span>
                      <span className="text-dragon">−${discountApplied.amount.toFixed(2)}</span>
                    </div>
                  )}
                  {!discountApplied && appliedPromotion && (
                    <div className="flex justify-between text-ash">
                      <span>🎉 {appliedPromotion.title}</span>
                      <span className="text-dragon">
                        {appliedPromotion.freeShipping ? 'Envío gratis' : `−$${appliedPromotion.discountAmount.toFixed(2)}`}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between font-agency text-sm pt-2 border-t border-navy/40 mt-2">
                    <span className="text-ash uppercase">Total</span>
                    <span className="text-white">{formatPrice(subtotal + effectiveShippingCost - effectiveDiscountAmount)}</span>
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
