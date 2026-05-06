import { useState } from 'react'
import { Navigate, Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAuth } from '@/hooks/useAuth'
import { MOCK_PRODUCTS } from '@/lib/mockData'
import { adminProductoSchema, type AdminProductoFormData } from '@/lib/schemas/admin-producto'
import {
  formatPrice,
  CONDITION_LABELS,
  RARITY_LABELS,
  FRANCHISE_LABELS,
} from '@/lib/utils'
import { cn } from '@/lib/utils'

export default function ProductsManager() {
  const { isSignedIn, isAdmin, isLoaded } = useAuth()
  const [showForm, setShowForm] = useState(false)
  const [search, setSearch] = useState('')

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AdminProductoFormData>({
    resolver: zodResolver(adminProductoSchema),
    defaultValues: { isActive: true, stock: 0, price: 0, edition: 'ilimitada', condition: 'near_mint', language: 'en', variant: 'standard', franchise: 'pokemon', rarity: 'comun' },
  })

  if (!isLoaded) return null
  if (!isSignedIn || !isAdmin) return <Navigate to="/mi-cuenta" replace />

  const filtered = MOCK_PRODUCTS.filter((p) =>
    search === '' || p.name.toLowerCase().includes(search.toLowerCase()) || p.set.toLowerCase().includes(search.toLowerCase())
  )

  const onSubmit = (data: AdminProductoFormData) => {
    console.info('Nuevo producto (pendiente backend):', data)
    setShowForm(false)
    reset()
  }

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
        <title>Productos — Admin Double-I TCG</title>
      </Helmet>

      <div className="bg-night min-h-screen pt-20">
        <div className="page-container py-8">
          {/* Admin nav */}
          <div className="flex gap-3 mb-6 overflow-x-auto pb-2">
            {[
              { to: '/admin', label: 'Dashboard' },
              { to: '/admin/productos', label: 'Productos' },
              { to: '/admin/pedidos', label: 'Pedidos' },
              { to: '/admin/blog', label: 'Blog' },
            ].map((link) => (
              <Link key={link.to} to={link.to} className="flex-shrink-0 font-agency text-xs uppercase tracking-wider px-4 py-2 border border-navy/40 hover:border-dragon/60 text-ash hover:text-dragon transition-colors">
                {link.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center justify-between mb-6">
            <h1 className="section-title">Productos</h1>
            <button onClick={() => setShowForm(!showForm)} className="btn-primary text-xs px-4 py-2">
              {showForm ? '✕ Cancelar' : '+ Nuevo producto'}
            </button>
          </div>

          {/* New product form */}
          {showForm && (
            <form onSubmit={handleSubmit(onSubmit)} noValidate>
              <div className="bg-deep border border-navy/40 p-6 mb-6 space-y-4">
                <h2 className="font-agency text-white uppercase tracking-wider mb-4">Nuevo producto</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="col-span-2 md:col-span-3">
                    <FormRow label="Nombre" error={errors.name?.message}>
                      <input {...register('name')} className="input-dark" placeholder="Charizard Holo" />
                    </FormRow>
                  </div>
                  <FormRow label="Franquicia" error={errors.franchise?.message}>
                    <select {...register('franchise')} className="input-dark cursor-pointer">
                      <option value="pokemon">Pokémon</option>
                      <option value="yugioh">Yu-Gi-Oh!</option>
                      <option value="lorcana">Lorcana</option>
                    </select>
                  </FormRow>
                  <FormRow label="Set" error={errors.set?.message}>
                    <input {...register('set')} className="input-dark" placeholder="Base Set" />
                  </FormRow>
                  <FormRow label="Número de carta" error={errors.cardNumber?.message}>
                    <input {...register('cardNumber')} className="input-dark" placeholder="4/102" />
                  </FormRow>
                  <FormRow label="Condición" error={errors.condition?.message}>
                    <select {...register('condition')} className="input-dark cursor-pointer">
                      {Object.entries(CONDITION_LABELS).map(([v, l]) => (
                        <option key={v} value={v}>{l}</option>
                      ))}
                    </select>
                  </FormRow>
                  <FormRow label="Rareza" error={errors.rarity?.message}>
                    <select {...register('rarity')} className="input-dark cursor-pointer">
                      {Object.entries(RARITY_LABELS).map(([v, l]) => (
                        <option key={v} value={v}>{l}</option>
                      ))}
                    </select>
                  </FormRow>
                  <FormRow label="Edición" error={errors.edition?.message}>
                    <select {...register('edition')} className="input-dark cursor-pointer">
                      <option value="primera">1ª Edición</option>
                      <option value="shadowless">Shadowless</option>
                      <option value="ilimitada">Ilimitada</option>
                    </select>
                  </FormRow>
                  <FormRow label="Variante" error={errors.variant?.message}>
                    <select {...register('variant')} className="input-dark cursor-pointer">
                      <option value="standard">Estándar</option>
                      <option value="holo">Holo</option>
                      <option value="reverse_holo">Reverse Holo</option>
                    </select>
                  </FormRow>
                  <FormRow label="Idioma" error={errors.language?.message}>
                    <select {...register('language')} className="input-dark cursor-pointer">
                      <option value="en">Inglés</option>
                      <option value="es">Español</option>
                      <option value="jp">Japonés</option>
                    </select>
                  </FormRow>
                  <FormRow label="Precio (MXN)" error={errors.price?.message}>
                    <input {...register('price', { valueAsNumber: true })} type="number" className="input-dark" placeholder="0.00" min="0" step="0.01" />
                  </FormRow>
                  <FormRow label="Stock" error={errors.stock?.message}>
                    <input {...register('stock', { valueAsNumber: true })} type="number" className="input-dark" placeholder="0" min="0" />
                  </FormRow>
                </div>

                <FormRow label="Descripción (opcional)" error={errors.description?.message}>
                  <textarea {...register('description')} className="input-dark h-20 resize-none" />
                </FormRow>

                <div className="border border-dragon/20 bg-dragon/5 p-3 text-xs font-exo text-ash">
                  📎 Upload de imágenes a Cloudflare R2 — disponible cuando el backend esté listo.
                </div>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" {...register('isActive')} className="sr-only" />
                  <div className="w-5 h-5 bg-royal border border-royal flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" viewBox="0 0 10 10" fill="none">
                      <path d="M8.5 2L4 7.5 1.5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <span className="font-agency text-xs text-frost uppercase tracking-wider">Visible en el catálogo</span>
                </label>

                <button type="submit" className="btn-primary w-full">Guardar producto</button>
              </div>
            </form>
          )}

          {/* Search */}
          <div className="mb-4">
            <input
              type="search"
              placeholder="Buscar producto..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-dark text-sm h-10 max-w-xs"
            />
          </div>

          {/* Table */}
          <div className="bg-deep border border-navy/40 overflow-x-auto">
            <table className="w-full text-xs font-exo">
              <thead>
                <tr className="border-b border-navy/40">
                  {['Imagen', 'Nombre', 'Franquicia', 'Condición', 'Precio', 'Stock', 'Visible', 'Acciones'].map((h) => (
                    <th key={h} className="text-left text-ash uppercase tracking-wider p-3 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id} className="border-b border-navy/20 hover:bg-abyss/50 transition-colors">
                    <td className="p-3">
                      <img src={p.images[0]} alt={p.name} className="w-10 h-14 object-cover" />
                    </td>
                    <td className="p-3">
                      <p className="text-frost font-medium">{p.name}</p>
                      <p className="text-ash/60">{p.set}</p>
                    </td>
                    <td className="p-3 text-ash">{FRANCHISE_LABELS[p.franchise]}</td>
                    <td className="p-3 text-ash">{CONDITION_LABELS[p.condition]}</td>
                    <td className="p-3 font-agency text-white">{formatPrice(p.price)}</td>
                    <td className="p-3">
                      <span className={cn('font-agency', p.stock === 0 ? 'text-crimson' : p.stock <= 2 ? 'text-yellow-400' : 'text-green-400')}>
                        {p.stock}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className={cn('badge-base text-xs', p.isActive ? 'bg-green-900/30 border border-green-700/50 text-green-400' : 'bg-red-900/30 border border-red-700/50 text-red-400')}>
                        {p.isActive ? 'Sí' : 'No'}
                      </span>
                    </td>
                    <td className="p-3">
                      <button className="text-dragon hover:text-frost transition-colors mr-3">Editar</button>
                      <button className="text-ash/60 hover:text-crimson transition-colors">Ocultar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  )
}
