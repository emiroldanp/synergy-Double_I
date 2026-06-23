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

      <div className="space-y-4">
          {/* Encabezado de página */}
          <div className="flex items-center justify-between">
            <div />
            <button
              onClick={openCreate}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors whitespace-nowrap"
            >
              + Nuevo post
            </button>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
              Error al cargar posts: {error}
            </div>
          )}

          {/* Tabla de posts */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {['Imagen', 'Título', 'Categoría', 'Estado', 'Fecha', 'Acciones'].map((h) => (
                      <th
                        key={h}
                        className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto" />
                      </td>
                    </tr>
                  ) : posts.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center text-gray-400">
                        No hay posts aún.
                      </td>
                    </tr>
                  ) : (
                    posts.map((post) => (
                      <tr key={post.id} className="hover:bg-gray-50">
                        {/* Miniatura */}
                        <td className="px-4 py-3">
                          <div className="w-10 h-10 rounded bg-gray-100 overflow-hidden flex-shrink-0">
                            {post.featuredImageUrl ? (
                              <img
                                src={post.featuredImageUrl}
                                alt={post.title}
                                loading="lazy"
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-400 text-xs">
                                📄
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Título + slug */}
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-900 leading-tight">{post.title}</p>
                          <p className="text-xs text-gray-400 font-mono">{post.slug}</p>
                        </td>

                        {/* Categoría */}
                        <td className="px-4 py-3 text-gray-500">
                          {post.categorySlug ?? '—'}
                        </td>

                        {/* Estado */}
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                              post.isPublished
                                ? 'bg-green-100 text-green-800'
                                : 'bg-yellow-100 text-yellow-800',
                            )}
                          >
                            {post.isPublished ? 'Publicado' : 'Borrador'}
                          </span>
                        </td>

                        {/* Fecha */}
                        <td className="px-4 py-3 text-gray-500">
                          {post.publishedAt
                            ? new Date(post.publishedAt).toLocaleDateString('es-MX')
                            : new Date(post.createdAt).toLocaleDateString('es-MX')}
                        </td>

                        {/* Acciones */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => openEdit(post)}
                              className="px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded hover:bg-blue-100 transition-colors"
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(post.id)}
                              className="px-2 py-1 text-xs bg-red-50 text-red-600 rounded hover:bg-red-100 transition-colors"
                            >
                              Eliminar
                            </button>
                            {post.isPublished && (
                              <Link
                                to={`/blog/${post.slug}`}
                                target="_blank"
                                className="px-2 py-1 text-xs bg-gray-50 text-gray-600 rounded hover:bg-gray-100 transition-colors"
                              >
                                Ver →
                              </Link>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
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
