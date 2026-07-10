import { useState } from 'react'
import DOMPurify from 'dompurify'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { useBlogPost } from '@/hooks/useBlogPosts'
import { useAuth } from '@/hooks/useAuth'
import { blogApi } from '@/lib/api'
import BlogPostForm from '@/components/ui/BlogPostForm'
import type { BlogPostFormData } from '@/components/ui/BlogPostForm'
import ConfirmModal from '@/components/admin/ConfirmModal'

export default function BlogPostPage() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const { isAdmin } = useAuth()

  const { post, loading, error } = useBlogPost(slug ?? '')

  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // ── Guardar edición ──────────────────────────────────────────────────────────
  const handleSave = async (data: BlogPostFormData) => {
    if (!post) return
    setSaving(true)
    try {
      const tags = data.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)

      await blogApi.update(post.id, {
        title: data.title,
        slug: data.slug,
        excerpt: data.excerpt,
        body: data.body,
        categorySlug: data.categorySlug || null,
        tags,
        isPublished: data.isPublished,
        metaTitle: data.metaTitle || null,
        metaDescription: data.metaDescription || null,
        featuredImageBase64: data.featuredImageBase64,
        featuredImageExt: data.featuredImageExt,
      })

      setShowForm(false)
      navigate(0) // recarga la página para reflejar cambios
    } catch (err) {
      // console.error('Error al guardar el post:', err)
    } finally {
      setSaving(false)
    }
  }

  // ── Toggle publicar / despublicar ────────────────────────────────────────────
  const handleTogglePublish = async () => {
    if (!post) return
    const publishing = !post.isPublished
    try {
      await blogApi.update(post.id, { isPublished: publishing })
      // Al despublicar, el post ya no es accesible públicamente → ir al panel admin
      if (!publishing) {
        navigate('/admin/blog')
      } else {
        navigate(0)
      }
    } catch (err) {
      // console.error('Error al cambiar estado de publicación:', err)
    }
  }

  // ── Eliminar post ────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!post) return
    try {
      await blogApi.delete(post.id)
      navigate('/blog')
    } catch (err) {
      // console.error('Error al eliminar el post:', err)
    }
  }

  // ── Estado de carga ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="bg-night min-h-screen pt-32 md:pt-48">
        <div className="page-container py-8 max-w-3xl mx-auto">
          {/* Skeleton */}
          <div className="animate-pulse space-y-6">
            <div className="h-4 bg-navy/40 rounded w-48" />
            <div className="h-48 bg-navy/40 rounded" />
            <div className="h-8 bg-navy/40 rounded w-3/4" />
            <div className="space-y-2">
              <div className="h-4 bg-navy/40 rounded" />
              <div className="h-4 bg-navy/40 rounded w-5/6" />
              <div className="h-4 bg-navy/40 rounded w-4/6" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Error ────────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="bg-night min-h-screen pt-32 md:pt-48 flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="font-exo text-dragon text-sm">{error}</p>
          <Link
            to="/blog"
            className="font-agency text-xs uppercase tracking-wider text-frost hover:text-white transition-colors"
          >
            ← Volver al blog
          </Link>
        </div>
      </div>
    )
  }

  // ── Post no encontrado ───────────────────────────────────────────────────────
  if (!post) {
    return (
      <div className="bg-night min-h-screen pt-32 md:pt-48 flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="font-exo text-ash text-sm">Post no encontrado.</p>
          <Link
            to="/blog"
            className="font-agency text-xs uppercase tracking-wider text-frost hover:text-white transition-colors"
          >
            ← Volver al blog
          </Link>
        </div>
      </div>
    )
  }

  const displayDate = new Date(post.publishedAt ?? post.createdAt).toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <>
      <Helmet>
        <title>{post.metaTitle || `${post.title} — Double-I TCG`}</title>
        <meta name="description" content={post.metaDescription || post.excerpt || ''} />
        <meta property="og:title" content={post.title} />
        <meta property="og:description" content={post.excerpt || ''} />
        {post.featuredImageUrl && (
          <meta property="og:image" content={post.featuredImageUrl} />
        )}
        <link rel="canonical" href={window.location.href} />
      </Helmet>

      <ConfirmModal
        open={showDeleteConfirm}
        title="Eliminar post"
        message="Esta acción no se puede deshacer. ¿Seguro que deseas eliminar este artículo?"
        confirmLabel="Eliminar"
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />

      {/* Formulario de edición (modal) */}
      {showForm && (
        <BlogPostForm
          post={post}
          onSave={handleSave}
          onCancel={() => setShowForm(false)}
          loading={saving}
        />
      )}

      <div className="bg-night min-h-screen pt-32 md:pt-48">
        {/* ── Barra de admin ───────────────────────────────────────────────── */}
        {isAdmin && (
          <div className="sticky top-0 z-40 bg-amber-400/95 backdrop-blur-sm border-b border-amber-500 shadow-sm">
            <div className="page-container py-2 flex items-center gap-3 flex-wrap">
              <span className="font-agency text-xs uppercase tracking-wider text-amber-900 mr-2">
                Admin
              </span>

              <button
                onClick={() => setShowForm(true)}
                className="px-3 py-1 text-xs font-medium bg-amber-900 text-amber-100 rounded hover:bg-amber-800 transition-colors"
              >
                Editar
              </button>

              <button
                onClick={handleTogglePublish}
                className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                  post.isPublished
                    ? 'bg-amber-700 text-amber-100 hover:bg-amber-600'
                    : 'bg-green-700 text-green-100 hover:bg-green-600'
                }`}
              >
                {post.isPublished ? 'Despublicar' : 'Publicar'}
              </button>

              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="px-3 py-1 text-xs font-medium bg-red-700 text-red-100 rounded hover:bg-red-600 transition-colors"
              >
                Eliminar
              </button>

              {!post.isPublished && (
                <span className="ml-auto text-xs text-amber-800 font-exo italic">
                  Borrador — no visible al público
                </span>
              )}
            </div>
          </div>
        )}

        <div className="page-container py-8">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-xs text-ash font-exo mb-8">
            <Link to="/" className="hover:text-frost transition-colors">Inicio</Link>
            <span>›</span>
            <Link to="/blog" className="hover:text-frost transition-colors">Blog</Link>
            <span>›</span>
            <span className="text-frost line-clamp-1">{post.title}</span>
          </nav>

          <article className="max-w-3xl mx-auto">
            {/* Imagen destacada */}
            {post.featuredImageUrl && (
              <div className="w-full max-h-72 overflow-hidden mb-8 border border-navy/40">
                <img
                  src={post.featuredImageUrl}
                  alt={post.title}
                  loading="lazy"
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {/* Meta: categoría + fecha */}
            <div className="flex flex-wrap items-center gap-3 mb-4">
              {post.categorySlug && (
                <span className="badge-base bg-deep border border-navy/60 text-ash text-xs">
                  {post.categorySlug}
                </span>
              )}
              <span className="text-xs text-ash/50 font-exo">{displayDate}</span>
            </div>

            {/* Título */}
            <h1 className="font-agency text-3xl md:text-4xl text-white uppercase leading-tight mb-4">
              {post.title}
            </h1>

            {/* Extracto */}
            {post.excerpt && (
              <p className="font-exo text-frost/80 text-lg leading-relaxed mb-8 border-l-2 border-dragon/60 pl-4">
                {post.excerpt}
              </p>
            )}

            {/* Tags */}
            {post.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-8">
                {post.tags.map((tag) => (
                  <span key={tag} className="badge-base bg-deep border border-navy/50 text-ash/70">
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            {/* Cuerpo del artículo */}
            <div
              className="prose prose-invert max-w-none font-exo text-ash text-sm leading-relaxed"
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(post.body ?? '') }}
            />

            {/* Volver */}
            <div className="mt-10 pt-6 border-t border-navy/40">
              <Link
                to="/blog"
                className="font-agency text-xs uppercase tracking-wider text-dragon hover:text-frost transition-colors"
              >
                ← Volver al blog
              </Link>
            </div>
          </article>
        </div>
      </div>
    </>
  )
}
