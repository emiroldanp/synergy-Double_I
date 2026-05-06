import { useState } from 'react'
import { Navigate, Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAuth } from '@/hooks/useAuth'
import { MOCK_BLOG_POSTS } from '@/lib/mockData'
import { adminBlogSchema, type AdminBlogFormData } from '@/lib/schemas/admin-blog'
import { FRANCHISE_LABELS } from '@/lib/utils'
import { cn } from '@/lib/utils'
import type { Franchise } from '@/types'

export default function BlogManager() {
  const { isSignedIn, isAdmin, isLoaded } = useAuth()
  const [showForm, setShowForm] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<AdminBlogFormData>({
    resolver: zodResolver(adminBlogSchema),
    defaultValues: { isDraft: true, category: 'general' },
  })

  if (!isLoaded) return null
  if (!isSignedIn || !isAdmin) return <Navigate to="/mi-cuenta" replace />

  const watchTitle = watch('title', '')
  const onSubmit = (data: AdminBlogFormData) => {
    console.info('Nueva entrada (pendiente backend):', data)
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
        <title>Blog — Admin Double-I TCG</title>
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
            <h1 className="section-title">Blog</h1>
            <button onClick={() => setShowForm(!showForm)} className="btn-primary text-xs px-4 py-2">
              {showForm ? '✕ Cancelar' : '+ Nueva entrada'}
            </button>
          </div>

          {/* Form */}
          {showForm && (
            <form onSubmit={handleSubmit(onSubmit)} noValidate>
              <div className="bg-deep border border-navy/40 p-6 mb-6 space-y-4">
                <h2 className="font-agency text-white uppercase tracking-wider mb-2">Nueva entrada</h2>
                <FormRow label="Título" error={errors.title?.message}>
                  <input {...register('title')} className="input-dark" placeholder="Título de la entrada" />
                </FormRow>
                <FormRow label="Slug URL" error={errors.slug?.message}>
                  <input {...register('slug')} className="input-dark" placeholder="titulo-de-la-entrada" />
                </FormRow>
                <div className="grid grid-cols-2 gap-4">
                  <FormRow label="Categoría" error={errors.category?.message}>
                    <select {...register('category')} className="input-dark cursor-pointer">
                      <option value="general">Coleccionismo general</option>
                      <option value="pokemon">Pokémon</option>
                      <option value="yugioh">Yu-Gi-Oh!</option>
                      <option value="lorcana">Lorcana</option>
                    </select>
                  </FormRow>
                  <FormRow label="Estado" error={errors.isDraft?.message}>
                    <select {...register('isDraft', { setValueAs: (v) => v === 'true' })} className="input-dark cursor-pointer">
                      <option value="true">Borrador</option>
                      <option value="false">Publicado</option>
                    </select>
                  </FormRow>
                </div>
                <FormRow label="Extracto (máx 300 caracteres)" error={errors.excerpt?.message}>
                  <textarea {...register('excerpt')} className="input-dark h-20 resize-none" placeholder="Resumen breve de la entrada..." />
                </FormRow>
                <FormRow label="Contenido (HTML / Markdown)" error={errors.body?.message}>
                  <textarea {...register('body')} className="input-dark h-48 resize-none font-mono text-xs" placeholder="<p>Contenido de la entrada...</p>" />
                </FormRow>
                <FormRow label="Meta title (máx 70 chars)" error={errors.metaTitle?.message}>
                  <input {...register('metaTitle')} className="input-dark" placeholder={watchTitle} maxLength={70} />
                </FormRow>
                <FormRow label="Meta description (máx 160 chars)" error={errors.metaDescription?.message}>
                  <textarea {...register('metaDescription')} className="input-dark h-16 resize-none" maxLength={160} />
                </FormRow>
                <button type="submit" className="btn-primary w-full">Guardar entrada</button>
              </div>
            </form>
          )}

          {/* Posts table */}
          <div className="bg-deep border border-navy/40 overflow-x-auto">
            <table className="w-full text-xs font-exo">
              <thead>
                <tr className="border-b border-navy/40">
                  {['Título', 'Categoría', 'Estado', 'Fecha', 'Acciones'].map((h) => (
                    <th key={h} className="text-left text-ash uppercase tracking-wider p-3 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {MOCK_BLOG_POSTS.map((post) => (
                  <tr key={post.id} className="border-b border-navy/20 hover:bg-abyss/50 transition-colors">
                    <td className="p-3">
                      <p className="text-frost">{post.title}</p>
                      <p className="text-ash/50 text-xs">{post.slug}</p>
                    </td>
                    <td className="p-3 text-ash">
                      {post.category === 'general' ? 'General' : FRANCHISE_LABELS[post.category as Franchise]}
                    </td>
                    <td className="p-3">
                      <span className={cn('badge-base text-xs', post.isDraft ? 'bg-yellow-900/30 border border-yellow-700/50 text-yellow-400' : 'bg-green-900/30 border border-green-700/50 text-green-400')}>
                        {post.isDraft ? 'Borrador' : 'Publicado'}
                      </span>
                    </td>
                    <td className="p-3 text-ash">
                      {new Date(post.publishedAt).toLocaleDateString('es-MX')}
                    </td>
                    <td className="p-3">
                      <button className="text-dragon hover:text-frost transition-colors mr-3">Editar</button>
                      <Link to={`/blog/${post.slug}`} target="_blank" className="text-ash/60 hover:text-frost transition-colors">
                        Ver →
                      </Link>
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
