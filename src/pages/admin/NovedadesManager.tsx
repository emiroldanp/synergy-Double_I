import { useState } from 'react'
import { Navigate, Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuth } from '@/hooks/useAuth'
import { MOCK_NOVEDADES, MOCK_PRODUCTS } from '@/lib/mockData'
import type { Novedad } from '@/types'
import { cn } from '@/lib/utils'

const MAX_NOVEDADES = 10

const novedadSchema = z.object({
  title: z.string().min(2, 'Título requerido'),
  image: z.string().url('URL de imagen válida requerida'),
  productSlug: z.string().optional(),
  text: z.string().max(200, 'Máximo 200 caracteres').optional(),
  order: z.number().int().min(1).max(MAX_NOVEDADES),
  isActive: z.boolean(),
})

type NovedadFormData = z.infer<typeof novedadSchema>

const activeProducts = MOCK_PRODUCTS.filter((p) => p.isActive)

export default function NovedadesManager() {
  const { isSignedIn, isAdmin, isLoaded } = useAuth()
  const [novedades, setNovedades] = useState<Novedad[]>(MOCK_NOVEDADES)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<NovedadFormData>({
    resolver: zodResolver(novedadSchema),
    defaultValues: {
      isActive: true,
      order: novedades.length + 1,
    },
  })

  if (!isLoaded) return null
  if (!isSignedIn || !isAdmin) return <Navigate to="/mi-cuenta" replace />

  const onSubmit = (data: NovedadFormData) => {
    if (editingId) {
      setNovedades((prev) =>
        prev.map((n) =>
          n.id === editingId ? { ...n, ...data, productSlug: data.productSlug || undefined, text: data.text || undefined } : n
        )
      )
    } else {
      const newNovedad: Novedad = {
        id: `nov-${Date.now()}`,
        title: data.title,
        image: data.image,
        productSlug: data.productSlug || undefined,
        text: data.text || undefined,
        order: data.order,
        isActive: data.isActive,
      }
      setNovedades((prev) => [...prev, newNovedad])
    }
    console.info('Novedad guardada (pendiente backend):', data)
    closeForm()
  }

  const openNew = () => {
    setEditingId(null)
    reset({ isActive: true, order: novedades.length + 1 })
    setShowForm(true)
  }

  const openEdit = (n: Novedad) => {
    setEditingId(n.id)
    reset({
      title: n.title,
      image: n.image,
      productSlug: n.productSlug ?? '',
      text: n.text ?? '',
      order: n.order,
      isActive: n.isActive,
    })
    setShowForm(true)
  }

  const toggleActive = (id: string) => {
    setNovedades((prev) => prev.map((n) => (n.id === id ? { ...n, isActive: !n.isActive } : n)))
  }

  const closeForm = () => {
    setShowForm(false)
    setEditingId(null)
    reset()
  }

  const sorted = [...novedades].sort((a, b) => a.order - b.order)
  const canAdd = novedades.length < MAX_NOVEDADES

  const textValue = watch('text') ?? ''

  const FormRow = ({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) => (
    <div>
      <label className="block font-agency text-xs text-ash uppercase tracking-wider mb-1">{label}</label>
      {children}
      {error && <p className="text-xs text-crimson mt-1">{error}</p>}
    </div>
  )

  return (
    <>
      <Helmet>
        <title>Novedades — Admin Double-I TCG</title>
      </Helmet>

      <div className="bg-night min-h-screen pt-20">
        <div className="page-container py-8">
          {/* Admin nav */}
          <div className="flex gap-3 mb-6 overflow-x-auto pb-2">
            {[
              { to: '/admin', label: 'Dashboard' },
              { to: '/admin/productos', label: 'Productos' },
              { to: '/admin/novedades', label: 'Novedades' },
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

          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="section-title">Novedades</h1>
              <p className="font-exo text-ash/60 text-xs mt-1">
                {novedades.length} / {MAX_NOVEDADES} novedades · Solo las activas aparecen en home
              </p>
            </div>
            <button
              onClick={showForm ? closeForm : openNew}
              disabled={!canAdd && !showForm}
              className={cn('btn-primary text-xs px-4 py-2', !canAdd && !showForm && 'opacity-40 cursor-not-allowed')}
            >
              {showForm ? '✕ Cancelar' : '+ Nueva novedad'}
            </button>
          </div>

          {!canAdd && !showForm && (
            <p className="font-exo text-xs text-yellow-400 mb-4">
              Límite de {MAX_NOVEDADES} novedades alcanzado. Desactiva o elimina una para agregar otra.
            </p>
          )}

          {/* Form */}
          {showForm && (
            <form onSubmit={handleSubmit(onSubmit)} noValidate className="mb-6">
              <div className="bg-deep border border-navy/40 p-6 space-y-4">
                <h2 className="font-agency text-white uppercase tracking-wider">
                  {editingId ? 'Editar novedad' : 'Nueva novedad'}
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <FormRow label="Título" error={errors.title?.message}>
                      <input {...register('title')} className="input-dark" placeholder="Charizard ex — Base Set 1999" />
                    </FormRow>
                  </div>

                  <div className="md:col-span-2">
                    <FormRow label="URL de imagen" error={errors.image?.message}>
                      <input
                        {...register('image')}
                        className="input-dark"
                        placeholder="https://..."
                      />
                      <p className="text-xs text-ash/50 mt-1">
                        Imagen de 1440×540 recomendada (16:6). Sube a Cloudflare R2 desde el panel de backend.
                      </p>
                    </FormRow>
                  </div>

                  <FormRow label="Producto vinculado (opcional)" error={errors.productSlug?.message}>
                    <select {...register('productSlug')} className="input-dark cursor-pointer">
                      <option value="">— Ninguno —</option>
                      {activeProducts.map((p) => (
                        <option key={p.id} value={p.slug}>
                          {p.name} ({p.set})
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-ash/50 mt-1">Al hacer click en la imagen, el cliente va a ese producto.</p>
                  </FormRow>

                  <FormRow label="Orden de aparición" error={errors.order?.message}>
                    <input
                      {...register('order', { valueAsNumber: true })}
                      type="number"
                      className="input-dark"
                      min={1}
                      max={MAX_NOVEDADES}
                    />
                  </FormRow>

                  <div className="md:col-span-2">
                    <FormRow label={`Texto breve (opcional · ${textValue.length}/200)`} error={errors.text?.message}>
                      <textarea
                        {...register('text')}
                        className="input-dark h-20 resize-none"
                        placeholder="Una frase que acompañe la imagen..."
                        maxLength={200}
                      />
                    </FormRow>
                  </div>
                </div>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" {...register('isActive')} className="sr-only" />
                  <div
                    className={cn(
                      'w-5 h-5 border flex items-center justify-center transition-colors',
                      watch('isActive') ? 'bg-royal border-royal' : 'border-navy/60'
                    )}
                    onClick={() => setValue('isActive', !watch('isActive'))}
                  >
                    {watch('isActive') && (
                      <svg className="w-3 h-3 text-white" viewBox="0 0 10 10" fill="none">
                        <path d="M8.5 2L4 7.5 1.5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                  <span className="font-agency text-xs text-frost uppercase tracking-wider">Visible en home</span>
                </label>

                <button type="submit" className="btn-primary w-full">
                  {editingId ? 'Guardar cambios' : 'Agregar novedad'}
                </button>
              </div>
            </form>
          )}

          {/* Novedades table */}
          <div className="bg-deep border border-navy/40 overflow-x-auto">
            <table className="w-full text-xs font-exo">
              <thead>
                <tr className="border-b border-navy/40">
                  {['#', 'Imagen', 'Título', 'Producto', 'Texto', 'Activa', 'Acciones'].map((h) => (
                    <th key={h} className="text-left text-ash uppercase tracking-wider p-3 whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.map((n) => (
                  <tr key={n.id} className="border-b border-navy/20 hover:bg-abyss/50 transition-colors">
                    <td className="p-3 font-agency text-ash">{n.order}</td>
                    <td className="p-3">
                      <img
                        src={n.image}
                        alt={n.title}
                        className="w-24 h-9 object-cover"
                        onError={(e) => {
                          ;(e.target as HTMLImageElement).src = 'https://placehold.co/96x36/1A2338/6BB8EC?text=img'
                        }}
                      />
                    </td>
                    <td className="p-3">
                      <p className="text-frost font-medium max-w-[160px] truncate">{n.title}</p>
                    </td>
                    <td className="p-3 text-ash">
                      {n.productSlug ? (
                        <span className="text-royal">{n.productSlug}</span>
                      ) : (
                        <span className="text-ash/40">—</span>
                      )}
                    </td>
                    <td className="p-3 text-ash/70 max-w-[140px] truncate">{n.text || '—'}</td>
                    <td className="p-3">
                      <button
                        onClick={() => toggleActive(n.id)}
                        className={cn(
                          'badge-base text-xs px-2 py-0.5 transition-colors',
                          n.isActive
                            ? 'bg-green-900/30 border border-green-700/50 text-green-400 hover:bg-red-900/20'
                            : 'bg-red-900/30 border border-red-700/50 text-red-400 hover:bg-green-900/20'
                        )}
                      >
                        {n.isActive ? 'Activa' : 'Inactiva'}
                      </button>
                    </td>
                    <td className="p-3">
                      <button
                        onClick={() => openEdit(n)}
                        className="text-dragon hover:text-frost transition-colors mr-3"
                      >
                        Editar
                      </button>
                    </td>
                  </tr>
                ))}
                {novedades.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-ash/50">
                      No hay novedades. Agrega la primera con el botón de arriba.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <p className="font-exo text-xs text-ash/40 mt-4">
            Los cambios se aplicarán en tiempo real cuando el backend esté conectado. Por ahora, los datos se guardan en memoria local.
          </p>
        </div>
      </div>
    </>
  )
}
