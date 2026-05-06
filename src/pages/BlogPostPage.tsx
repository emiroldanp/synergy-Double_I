import { useParams, Navigate, Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { MOCK_BLOG_POSTS } from '@/lib/mockData'
import { FRANCHISE_LABELS } from '@/lib/utils'
import type { Franchise } from '@/types'

export default function BlogPostPage() {
  const { slug } = useParams<{ slug: string }>()
  const post = MOCK_BLOG_POSTS.find((p) => p.slug === slug && !p.isDraft)

  if (!post) return <Navigate to="/blog" replace />

  return (
    <>
      <Helmet>
        <title>{post.metaTitle || `${post.title} — Double-I TCG`}</title>
        <meta name="description" content={post.metaDescription || post.excerpt} />
        <meta property="og:title" content={post.title} />
        <meta property="og:description" content={post.excerpt} />
        <meta property="og:image" content={post.image} />
        <link rel="canonical" href={window.location.href} />
      </Helmet>

      <div className="bg-brand-navy min-h-screen pt-20">
        <div className="page-container py-8">
          <nav className="flex items-center gap-2 text-xs text-ash font-exo mb-8">
            <Link to="/" className="hover:text-frost transition-colors">Inicio</Link>
            <span>›</span>
            <Link to="/blog" className="hover:text-frost transition-colors">Blog</Link>
            <span>›</span>
            <span className="text-frost line-clamp-1">{post.title}</span>
          </nav>

          <article className="max-w-3xl mx-auto">
            {/* Hero image */}
            <div className="aspect-video overflow-hidden mb-8 border border-navy/40">
              <img
                src={post.image}
                alt={post.title}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Meta */}
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <span className="badge-base bg-deep border border-navy/60 text-ash text-xs">
                {post.category === 'general' ? 'Coleccionismo' : FRANCHISE_LABELS[post.category as Franchise]}
              </span>
              <span className="text-xs text-ash/50 font-exo">
                {new Date(post.publishedAt).toLocaleDateString('es-MX', {
                  year: 'numeric', month: 'long', day: 'numeric'
                })}
              </span>
            </div>

            <h1 className="font-agency text-3xl md:text-4xl text-white uppercase leading-tight mb-4">
              {post.title}
            </h1>
            <p className="font-exo text-frost/80 text-lg leading-relaxed mb-8 border-l-2 border-dragon/60 pl-4">
              {post.excerpt}
            </p>

            {/* Body */}
            <div
              className="font-exo text-ash text-sm leading-relaxed space-y-4 prose-invert"
              dangerouslySetInnerHTML={{ __html: post.body }}
            />

            {/* Tags */}
            {post.tags && post.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-8 pt-6 border-t border-navy/40">
                {post.tags.map((tag) => (
                  <span key={tag} className="badge-base bg-deep border border-navy/50 text-ash/70">
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            <div className="mt-10 pt-6 border-t border-navy/40">
              <Link to="/blog" className="font-agency text-xs uppercase tracking-wider text-dragon hover:text-frost transition-colors">
                ← Volver al blog
              </Link>
            </div>
          </article>
        </div>
      </div>
    </>
  )
}
