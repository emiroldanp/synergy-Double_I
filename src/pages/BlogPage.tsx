import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { MOCK_BLOG_POSTS } from '@/lib/mockData'
import { FRANCHISE_LABELS } from '@/lib/utils'
import type { Franchise } from '@/types'

export default function BlogPage() {
  const posts = MOCK_BLOG_POSTS.filter((p) => !p.isDraft)

  return (
    <>
      <Helmet>
        <title>Blog TCG — Double-I</title>
        <meta name="description" content="Guías, análisis y novedades del mundo TCG: Pokémon, Yu-Gi-Oh! y Lorcana." />
      </Helmet>

      <div className="bg-brand-navy min-h-screen pt-20">
        <div className="page-container py-8">
          <div className="mb-8">
            <p className="section-subtitle mb-2">Noticias y guías</p>
            <h1 className="section-title">Blog TCG</h1>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map((post, i) => (
              <Link
                key={post.id}
                to={`/blog/${post.slug}`}
                className="group block bg-deep border border-navy/40 hover:border-dragon/40 transition-all duration-300 hover:shadow-card-hover overflow-hidden"
                style={{ animation: `slideUp 0.5s ease-out ${i * 0.1}s both` }}
              >
                <div className="aspect-video overflow-hidden">
                  <img
                    src={post.image}
                    alt={post.title}
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
                <div className="p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="badge-base bg-deep border border-navy/60 text-ash text-xs">
                      {post.category === 'general' ? 'Coleccionismo' : FRANCHISE_LABELS[post.category as Franchise]}
                    </span>
                    <span className="text-xs text-ash/50 font-exo">
                      {new Date(post.publishedAt).toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  <h2 className="font-agency text-base text-white uppercase leading-tight mb-2 group-hover:text-dragon transition-colors">
                    {post.title}
                  </h2>
                  <p className="font-exo text-ash text-xs leading-relaxed line-clamp-3">
                    {post.excerpt}
                  </p>
                  <p className="font-agency text-xs text-dragon mt-3 uppercase tracking-wider">
                    Leer más →
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
