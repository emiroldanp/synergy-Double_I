// server/controllers/blogController.ts
import { Request, Response, NextFunction } from 'express'
import { prisma } from '../lib/prisma'
import { uploadToR2, deleteFromR2ByUrl } from '../lib/r2'

// ─────────────────────────────────────────────────────────────────────────────
// RUTAS PÚBLICAS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/blog
 * Lista entradas publicadas. Soporta filtro ?category=pokemon y paginación.
 * Query params: category (string), page (default 1), limit (default 9)
 */
export async function listPosts(req: Request, res: Response, next: NextFunction) {
  try {
    const { category } = req.query
    const page = Math.max(1, parseInt(req.query.page as string) || 1)
    const limit = Math.min(50, parseInt(req.query.limit as string) || 9)
    const skip = (page - 1) * limit

    const where: { isPublished: boolean; categorySlug?: string } = { isPublished: true }
    if (category) where.categorySlug = category as string

    const [posts, total] = await Promise.all([
      prisma.blogPost.findMany({
        where,
        skip,
        take: limit,
        orderBy: { publishedAt: 'desc' },
        select: {
          id: true,
          slug: true,
          title: true,
          excerpt: true,
          featuredImageUrl: true,
          categorySlug: true,
          tags: true,
          publishedAt: true,
          createdAt: true,
        },
      }),
      prisma.blogPost.count({ where }),
    ])

    res.json({ data: posts, meta: { page, limit, total } })
  } catch (error) {
    next(error)
  }
}

/**
 * GET /api/blog/:slug
 * Devuelve una entrada publicada por slug. 404 si no existe o está en borrador.
 */
export async function getPostBySlug(req: Request, res: Response, next: NextFunction) {
  try {
    const slug = String(req.params.slug)

    const post = await prisma.blogPost.findFirst({
      where: { slug, isPublished: true },
    })

    if (!post) {
      return res.status(404).json({ error: 'Entrada no encontrada', code: 'POST_NOT_FOUND' })
    }

    res.json({ data: post })
  } catch (error) {
    next(error)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// RUTAS ADMIN (llamadas desde adminRoutes con requireAdmin ya aplicado)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/admin/blog
 * Lista TODAS las entradas (publicadas y borradores) con paginación.
 */
export async function listAllPosts(req: Request, res: Response, next: NextFunction) {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1)
    const limit = Math.min(50, parseInt(req.query.limit as string) || 20)
    const skip = (page - 1) * limit

    const [posts, total] = await Promise.all([
      prisma.blogPost.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.blogPost.count(),
    ])

    res.json({ data: posts, meta: { page, limit, total } })
  } catch (error) {
    next(error)
  }
}

/**
 * POST /api/admin/blog
 * Crea una nueva entrada de blog.
 * Body puede incluir base64 para imagen destacada → se sube a R2.
 */
export async function createPost(req: Request, res: Response, next: NextFunction) {
  try {
    const {
      title, slug, body, excerpt, categorySlug,
      tags, isPublished, metaTitle, metaDescription,
      featuredImageBase64, featuredImageMimeType,
    } = req.body

    let featuredImageUrl: string | undefined

    if (featuredImageBase64) {
      const buffer = Buffer.from(featuredImageBase64, 'base64')
      const mimeType = featuredImageMimeType || 'image/jpeg'
      const ext = mimeType.split('/')[1] || 'jpg'
      const filename = `${Date.now()}.${ext}`
      featuredImageUrl = await uploadToR2(`blog/${slug}/${filename}`, buffer, mimeType)
    }

    const publish = Boolean(isPublished)

    const post = await prisma.blogPost.create({
      data: {
        title,
        slug,
        body,
        excerpt,
        categorySlug,
        tags: tags ?? [],
        isPublished: publish,
        publishedAt: publish ? new Date() : null,
        metaTitle,
        metaDescription,
        featuredImageUrl,
      },
    })

    res.status(201).json({ data: post })
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return res.status(409).json({ error: 'El slug ya está en uso', code: 'SLUG_CONFLICT' })
    }
    next(error)
  }
}

/**
 * PATCH /api/admin/blog/:id
 * Edita campos de una entrada. Sube nueva imagen si viene base64.
 * Si isPublished cambia de false a true, establece publishedAt = now().
 */
export async function updatePost(req: Request, res: Response, next: NextFunction) {
  try {
    const id = String(req.params.id)
    const {
      title, slug, body, excerpt, categorySlug,
      tags, isPublished, metaTitle, metaDescription,
      featuredImageBase64, featuredImageMimeType,
    } = req.body

    const existing = await prisma.blogPost.findUnique({
      where: { id },
      select: { isPublished: true, featuredImageUrl: true, slug: true },
    })
    if (!existing) {
      return res.status(404).json({ error: 'Entrada no encontrada' })
    }

    const updateData: Record<string, unknown> = {}
    const allowed = ['title', 'slug', 'body', 'excerpt', 'categorySlug', 'metaTitle', 'metaDescription']
    for (const field of allowed) {
      if (req.body[field] !== undefined) updateData[field] = req.body[field]
    }
    if (tags !== undefined) updateData.tags = tags
    if (isPublished !== undefined) {
      updateData.isPublished = Boolean(isPublished)
      const justPublished = !existing.isPublished && Boolean(isPublished)
      if (justPublished) updateData.publishedAt = new Date()
    }

    if (featuredImageBase64) {
      if (existing.featuredImageUrl) {
        await deleteFromR2ByUrl(existing.featuredImageUrl).catch(() => {})
      }
      const buffer = Buffer.from(featuredImageBase64, 'base64')
      const mimeType = featuredImageMimeType || 'image/jpeg'
      const ext = mimeType.split('/')[1] || 'jpg'
      const filename = `${Date.now()}.${ext}`
      const postSlug = (slug as string) || existing.slug
      updateData.featuredImageUrl = await uploadToR2(`blog/${postSlug}/${filename}`, buffer, mimeType)
    }

    const post = await prisma.blogPost.update({ where: { id }, data: updateData })

    res.json({ data: post })
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return res.status(409).json({ error: 'El slug ya está en uso', code: 'SLUG_CONFLICT' })
    }
    if (error?.code === 'P2025') {
      return res.status(404).json({ error: 'Entrada no encontrada' })
    }
    next(error)
  }
}

/**
 * DELETE /api/admin/blog/:id
 * Elimina la entrada y su imagen de R2 si existe.
 */
export async function deletePost(req: Request, res: Response, next: NextFunction) {
  try {
    const id = String(req.params.id)

    const post = await prisma.blogPost.findUnique({
      where: { id },
      select: { featuredImageUrl: true },
    })

    if (!post) {
      return res.status(404).json({ error: 'Entrada no encontrada' })
    }

    await prisma.blogPost.delete({ where: { id } })

    if (post.featuredImageUrl) {
      await deleteFromR2ByUrl(post.featuredImageUrl).catch(() => {})
    }

    res.json({ success: true })
  } catch (error: any) {
    if (error?.code === 'P2025') {
      return res.status(404).json({ error: 'Entrada no encontrada' })
    }
    next(error)
  }
}
