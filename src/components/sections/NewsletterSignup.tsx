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
      setStatus('error')
    }
  }

  return (
    <section className="relative bg-deep py-16 overflow-hidden">
      {/* Background glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 60% 80% at 50% 100%, rgba(48,64,196,0.15) 0%, transparent 70%)',
        }}
        aria-hidden="true"
      />

      {/* Watermark logo */}
      <div
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
        aria-hidden="true"
      >
        <img
          src="/logo-color.png"
          alt=""
          className="w-64 md:w-80 opacity-[0.04] select-none"
        />
      </div>

      <div className="page-container relative z-10">
        <div className="max-w-2xl mx-auto text-center">
          <p className="section-subtitle mb-3">Mantente al día</p>
          <h2 className="section-title mb-4">
            Novedades en tu correo
          </h2>
          <p className="font-exo text-ash text-sm mb-8 leading-relaxed">
            Entérate primero cuando lleguen nuevas cartas, promociones exclusivas y artículos de colección.
          </p>

          {status === 'error' && (
            <p className="font-exo text-crimson text-xs mb-4">
              Ocurrió un error. Por favor intenta de nuevo.
            </p>
          )}

          {status === 'success' ? (
            <div className="flex items-center justify-center gap-3 py-6">
              <div className="w-8 h-8 bg-dragon/20 border border-dragon/40 flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-dragon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="text-left">
                <p className="font-agency text-dragon uppercase tracking-wide text-sm">Suscripcion exitosa</p>
                <p className="font-exo text-ash text-xs mt-0.5">Recibirás un correo de bienvenida pronto.</p>
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
                    className="input-dark text-sm h-12"
                    aria-label="Correo electrónico"
                  />
                  {errors.email && (
                    <p className="text-xs text-crimson mt-1 text-left">{errors.email.message}</p>
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
              <p className="text-xs text-ash/50 mt-3 font-exo">
                Sin spam. Cancela cuando quieras.
              </p>
            </form>
          )}
        </div>
      </div>
    </section>
  )
}
