import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { useBlogPosts } from '@/hooks/useBlogPosts'
import BlogPostForm, { type BlogPostFormData } from '@/components/ui/BlogPostForm'
import ConfirmModal from '@/components/admin/ConfirmModal'
import { blogApi } from '@/lib/api'
import { cn } from '@/lib/utils'
import type { BlogPost } from '@/types'

export default function BlogManager() {
  // Datos reales desde el backend (endpoint admin que incluye borradores)
  const { posts, loading, error, refetch } = useBlogPosts({ adminAll: true })

  // Estado local del CRUD
  const [showForm, setShowForm] = useState(false)
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  // ── Handlers ────────────────────────────────────────────────────────────────

  function openCreate() {
    setEditingPost(null)
    setShowForm(true)
  }

  function openEdit(post: BlogPost) {
    setEditingPost(post)
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setEditingPost(null)
  }

  async function handleSave(data: BlogPostFormData) {
    setSaving(true)
    try {
      const payload = {
        ...data,
        tags: data.tags.split(',').map((t) => t.trim()).filter(Boolean),
      }
      if (editingPost) {
        await blogApi.update(editingPost.id, payload)
      } else {
        await blogApi.create(payload)
      }
      closeForm()
      refetch()
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error al guardar el post')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteConfirm) return
    try {
      await blogApi.delete(deleteConfirm)
      refetch()
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error al eliminar el post')
    } finally {
      setDeleteConfirm(null)
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <>
      <Helmet>
        <title>Blog — Admin Double-I TCG</title>
      </Helmet>

      <div className="bg-night min-h-screen pt-20">
        <div className="page-container py-8">

          {/* Navegación admin */}
          <div className="flex gap-3 mb-6 overflow-x-auto pb-2">
            {[
              { to: '/admin', label: 'Dashboard' },
              { to: '/admin/productos', label: 'Productos' },
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

          {/* Encabezado de página */}
          <div className="flex items-center justify-between mb-6">
            <h1 className="section-title">Blog</h1>
            <button onClick={openCreate} className="btn-primary text-xs px-4 py-2">
              + Nuevo post
            </button>
          </div>

          {/* Estados de carga / error */}
          {loading && (
            <p className="text-ash text-sm py-8 text-center">Cargando posts…</p>
          )}

          {error && (
            <p className="text-red-400 text-sm py-4 text-center">{error}</p>
          )}

          {/* Tabla de posts */}
          {!loading && !error && (
            <div className="bg-deep border border-navy/40 overflow-x-auto">
              {posts.length === 0 ? (
                <p className="text-ash text-sm py-10 text-center">No hay posts aún.</p>
              ) : (
                <table className="w-full text-xs font-exo">
                  <thead>
                    <tr className="border-b border-navy/40">
                      {['Imagen', 'Título', 'Categoría', 'Estado', 'Fecha', 'Acciones'].map((h) => (
                        <th
                          key={h}
                          className="text-left text-ash uppercase tracking-wider p-3 whitespace-nowrap"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {posts.map((post) => (
                      <tr
                        key={post.id}
                        className="border-b border-navy/20 hover:bg-abyss/50 transition-colors"
                      >
                        {/* Miniatura */}
                        <td className="p-3">
                          {post.featuredImageUrl ? (
                            <img
                              src={post.featuredImageUrl}
                              alt={post.title}
                              loading="lazy"
                              className="w-12 h-12 object-cover rounded"
                            />
                          ) : (
                            <div className="w-12 h-12 bg-navy/30 rounded flex items-center justify-center">
                              <span className="text-ash/40 text-lg">📄</span>
                            </div>
                          )}
                        </td>

                        {/* Título + slug */}
                        <td className="p-3">
                          <p className="text-frost font-medium">{post.title}</p>
                          <p className="text-ash/50 text-xs">{post.slug}</p>
                        </td>

                        {/* Categoría */}
                        <td className="p-3 text-ash">
                          {post.categorySlug ?? '—'}
                        </td>

                        {/* Estado */}
                        <td className="p-3">
                          <span
                            className={cn(
                              'badge-base text-xs',
                              post.isPublished
                                ? 'bg-green-900/30 border border-green-700/50 text-green-400'
                                : 'bg-yellow-900/30 border border-yellow-700/50 text-yellow-400',
                            )}
                          >
                            {post.isPublished ? 'Publicado' : 'Borrador'}
                          </span>
                        </td>

                        {/* Fecha */}
                        <td className="p-3 text-ash">
                          {post.publishedAt
                            ? new Date(post.publishedAt).toLocaleDateString('es-MX')
                            : new Date(post.createdAt).toLocaleDateString('es-MX')}
                        </td>

                        {/* Acciones */}
                        <td className="p-3 whitespace-nowrap">
                          <button
                            onClick={() => openEdit(post)}
                            className="text-dragon hover:text-frost transition-colors mr-3"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(post.id)}
                            className="text-red-500 hover:text-red-300 transition-colors mr-3"
                          >
                            Eliminar
                          </button>
                          {post.isPublished && (
                            <Link
                              to={`/blog/${post.slug}`}
                              target="_blank"
                              className="text-ash/60 hover:text-frost transition-colors"
                            >
                              Ver →
                            </Link>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal de formulario (crear / editar) */}
      {showForm && (
        <BlogPostForm
          post={editingPost}
          onSave={handleSave}
          onCancel={closeForm}
          loading={saving}
        />
      )}

      {/* Modal de confirmación para eliminar */}
      <ConfirmModal
        open={deleteConfirm !== null}
        title="Eliminar post"
        message="Esta acción no se puede deshacer. ¿Seguro que deseas eliminar este artículo?"
        confirmLabel="Eliminar"
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirm(null)}
      />
    </>
  )
}
