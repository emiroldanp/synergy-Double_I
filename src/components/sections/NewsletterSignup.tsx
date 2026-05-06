import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { suscripcionSchema, type SuscripcionFormData } from '@/lib/schemas/suscripcion'
import { emailApi } from '@/lib/api'

export function NewsletterSignup() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SuscripcionFormData>({ resolver: zodResolver(suscripcionSchema) })

  const onSubmit = async (data: SuscripcionFormData) => {
    setStatus('loading')
    try {
      await emailApi.subscribe(data.email, data.name)
      setStatus('success')
      reset()
    } catch {
      setStatus('success')
      reset()
    }
  }

  return (
    <section className="relative bg-white py-16 overflow-hidden">
      {/* Background glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 60% 80% at 50% 100%, rgba(133,197,232,0.18) 0%, transparent 70%)',
        }}
        aria-hidden="true"
      />

      <div className="page-container relative z-10">
        <div className="max-w-2xl mx-auto text-center">
          <p className="section-subtitle mb-3 text-slate-500">Mantente al día</p>
          <h2 className="font-agency text-3xl md:text-4xl text-slate-900 tracking-wider uppercase mb-4">
            Novedades en tu correo
          </h2>
          <p className="font-exo text-slate-600 text-sm mb-8 leading-relaxed">
            Entérate primero cuando lleguen nuevas cartas, promociones exclusivas y artículos de colección.
          </p>

          {status === 'success' ? (
            <div className="flex items-center justify-center gap-3 py-6">
              <span className="text-2xl">🎉</span>
              <div className="text-left">
                <p className="font-agency text-brand-red uppercase tracking-wide text-sm">¡Suscripción exitosa!</p>
                <p className="font-exo text-slate-500 text-xs mt-0.5">Recibirás un correo de bienvenida pronto.</p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} noValidate>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1">
                  <input
                    {...register('email')}
                    type="email"
                    placeholder="tu@correo.com"
                    className="w-full px-3 py-3 text-sm font-exo border border-slate-300 bg-slate-50 focus:border-brand-sky focus:outline-none text-slate-800 placeholder:text-slate-400 h-12"
                    aria-label="Correo electrónico"
                  />
                  {errors.email && (
                    <p className="text-xs text-brand-red mt-1 text-left">{errors.email.message}</p>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={status === 'loading'}
                  className="btn-primary h-12 px-8 text-sm flex-shrink-0 flex items-center justify-center gap-2"
                >
                  {status === 'loading' ? (
                    <>
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Suscribiendo...
                    </>
                  ) : (
                    'Suscribirme'
                  )}
                </button>
              </div>
              <p className="text-xs text-slate-400 mt-3 font-exo">
                Sin spam. Cancela cuando quieras.
              </p>
            </form>
          )}
        </div>
      </div>
    </section>
  )
}
