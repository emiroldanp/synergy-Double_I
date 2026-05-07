import { useState, useEffect, useCallback } from 'react'
import { blogApi } from '@/lib/api'
import type { BlogPost } from '@/types'

// Opciones para el hook de listado de posts
interface UseBlogPostsOptions {
  category?: string
  page?: number
  limit?: number
  adminAll?: boolean // cuando true, llama /api/admin/blog (requiere auth)
}

interface UseBlogPostsResult {
  posts: BlogPost[]
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useBlogPosts(options: UseBlogPostsOptions = {}): UseBlogPostsResult {
  const { category, page, limit, adminAll } = options

  const [posts, setPosts] = useState<BlogPost[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchPosts = useCallback(async () => {
    setLoading(true)
    setError(null)

    // Construir params omitiendo valores undefined
    const params: Record<string, unknown> = {}
    if (category !== undefined) params.category = category
    if (page !== undefined) params.page = page
    if (limit !== undefined) params.limit = limit

    try {
      const res = adminAll
        ? await blogApi.listAll(params)
        : await blogApi.getAll(params)
      setPosts(res.data)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al cargar los posts'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [category, page, limit, adminAll])

  useEffect(() => {
    fetchPosts()
  }, [fetchPosts])

  return { posts, loading, error, refetch: fetchPosts }
}

// Hook para obtener un post individual por slug
interface UseBlogPostResult {
  post: BlogPost | null
  loading: boolean
  error: string | null
}

export function useBlogPost(slug: string): UseBlogPostResult {
  const [post, setPost] = useState<BlogPost | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!slug) return

    let cancelled = false

    const fetchPost = async () => {
      setLoading(true)
      setError(null)

      try {
        const res = await blogApi.getBySlug(slug)
        if (!cancelled) setPost(res.data)
      } catch (err: unknown) {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : 'Error al cargar el post'
          setError(msg)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchPost()

    return () => {
      cancelled = true
    }
  }, [slug])

  return { post, loading, error }
}
