import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { useAuth } from '@/hooks/useAuth'
import { useBlogPosts } from '@/hooks/useBlogPosts'
import { blogApi } from '@/lib/api'
import BlogPostForm from '@/components/ui/BlogPostForm'
import type { BlogPostFormData } from '@/components/ui/BlogPostForm'
import type { BlogPost } from '@/types'

// ── Tabs de categoría ─────────────────────────────────────────────────────────

const CATEGORY_TABS = [
  { label: 'Todos', value: '' },
  { label: 'Pokémon', value: 'pokemon' },
  { label: 'Yu-Gi-Oh!', value: 'yugioh' },
  { label: 'Lorcana', value: 'lorcana' },
  { label: 'General', value: 'general' },
]

// ── Skeleton de carga ─────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="bg-deep border border-navy/40 overflow-hidden animate-pulse">
      <div className="aspect-video bg-navy/30" />
      <div className="p-5 space-y-3">
        <div className="flex gap-2">
          <div className="h-4 w-20 bg-navy/30 rounded" />
          <div className="h-4 w-16 bg-navy/20 rounded" />
        </div>
        <div className="h-4 bg-navy/30 rounded w-3/4" />
        <div className="h-3 bg-navy/20 rounded w-full" />
        <div className="h-3 bg-navy/20 rounded w-5/6" />
      </div>
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function BlogPage() {
  const { isAdmin } = useAuth()

  // Filtro de categoría activo
  const [selectedCategory, setSelectedCategory] = useState('')

  // Estado del formulario admin
  const [showForm, setShowForm] = useState(false)
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null)
  const [saving, setSaving] = useState(false)

  // Datos reales del backend
  const { posts, loading, error, refetch } = useBlogPosts({
    category: selectedCategory || undefined,
    page: 1,
    limit: 12,
  })

  // ── Handlers admin ──────────────────────────────────────────────────────────

  const handleNewPost = () => {
    setEditingPost(null)
    setShowForm(true)
  }

  const handleEditPost = (post: BlogPost) => {
    setEditingPost(post)
    setShowForm(true)
  }

  const handleSave = async (data: BlogPostFormData) => {
    setSaving(true)
    try {
      // Convertir tags de string separado por comas a array
      const payload = {
        ...data,
        tags: data.tags
          ? data.tags.split(',').map((t) => t.trim()).filter(Boolean)
          : [],
      }

      if (editingPost) {
        await blogApi.update(editingPost.id, payload)
      } else {
        await blogApi.create(payload)
      }

      refetch()
      setShowForm(false)
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setShowForm(false)
    setEditingPost(null)
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <>
      <Helmet>
        <title>Blog TCG — Double-I</title>
        <meta
          name="description"
          content="Guías, análisis y novedades del mundo TCG: Pokémon, Yu-Gi-Oh! y Lorcana."
        />
      </Helmet>

      <div className="bg-night min-h-screen pt-20">
        <div className="page-container py-8">

          {/* Encabezado */}
          <div className="mb-6 flex items-end justify-between gap-4 flex-wrap">
            <div>
              <p className="section-subtitle mb-2">Noticias y guías</p>
              <h1 className="section-title">Blog TCG</h1>
            </div>

            {/* Botón "Nuevo post" — solo admin */}
            {isAdmin && (
              <button
                onClick={handleNewPost}
                className="flex items-center gap-2 px-4 py-2 bg-dragon text-white text-sm font-agency uppercase tracking-wider rounded hover:bg-dragon/80 transition-colors"
              >
                + Nuevo post
              </button>
            )}
          </div>

          {/* Tabs de categoría */}
          <div className="flex gap-1 mb-8 border-b border-navy/40 overflow-x-auto">
            {CATEGORY_TABS.map((tab) => {
              const isActive = selectedCategory === tab.value
              return (
                <button
                  key={tab.value}
                  onClick={() => setSelectedCategory(tab.value)}
                  className={[
                    'px-4 py-2 text-sm font-exo whitespace-nowrap transition-colors',
                    isActive
                      ? 'text-blue-400 border-b-2 border-blue-400 -mb-px'
                      : 'text-ash/60 hover:text-ash',
                  ].join(' ')}
                >
                  {tab.label}
                </button>
              )
            })}
          </div>

          {/* Error */}
          {error && (
            <p className="text-center text-red-400 font-exo text-sm py-12">{error}</p>
          )}

          {/* Skeleton mientras carga */}
          {loading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </div>
          )}

          {/* Estado vacío */}
          {!loading && !error && posts.length === 0 && (
            <div className="text-center py-20">
              <p className="font-exo text-ash/60 text-sm">Aún no hay posts publicados.</p>
            </div>
          )}

          {/* Grid de posts */}
          {!loading && !error && posts.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {posts.map((post, i) => (
                <div
                  key={post.id}
                  className="group relative bg-deep border border-navy/40 hover:border-dragon/40 transition-all duration-300 hover:shadow-card-hover overflow-hidden"
                  style={{ animation: `slideUp 0.5s ease-out ${i * 0.08}s both` }}
                >
                  {/* Botón Editar — solo admin */}
                  {isAdmin && (
                    <button
                      onClick={() => handleEditPost(post)}
                      className="absolute top-2 right-2 z-10 px-2 py-1 bg-black/70 text-white text-xs font-exo rounded hover:bg-indigo-600 transition-colors"
                      title="Editar post"
                    >
                      ✏ Editar
                    </button>
                  )}

                  <Link to={`/blog/${post.slug}`} className="block">
                    {/* Imagen destacada */}
                    <div className="aspect-video overflow-hidden bg-navy/20">
                      {post.featuredImageUrl ? (
                        <img
                          src={post.featuredImageUrl}
                          alt={post.title}
                          loading="lazy"
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-ash/20 font-agency text-4xl uppercase">
                          TCG
                        </div>
                      )}
                    </div>

                    {/* Contenido */}
                    <div className="p-5">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="badge-base bg-deep border border-navy/60 text-ash text-xs capitalize">
                          {post.categorySlug ?? 'General'}
                        </span>
                        {post.publishedAt && (
                          <span className="text-xs text-ash/50 font-exo">
                            {new Date(post.publishedAt).toLocaleDateString('es-MX', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </span>
                        )}
                      </div>

                      <h2 className="font-agency text-base text-white uppercase leading-tight mb-2 group-hover:text-dragon transition-colors">
                        {post.title}
                      </h2>

                      {post.excerpt && (
                        <p className="font-exo text-ash text-xs leading-relaxed line-clamp-3">
                          {post.excerpt}
                        </p>
                      )}

                      <p className="font-agency text-xs text-dragon mt-3 uppercase tracking-wider">
                        Leer más →
                      </p>
                    </div>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal de creación/edición — solo admin */}
      {isAdmin && showForm && (
        <BlogPostForm
          post={editingPost}
          onSave={handleSave}
          onCancel={handleCancel}
          loading={saving}
        />
      )}
    </>
  )
}
