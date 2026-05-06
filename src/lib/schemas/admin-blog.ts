import { z } from 'zod'

export const adminBlogSchema = z.object({
  title: z.string().min(5, 'Título muy corto'),
  slug: z.string().min(3, 'Slug requerido').regex(/^[a-z0-9-]+$/, 'Solo minúsculas, números y guiones'),
  excerpt: z.string().min(20, 'Extracto muy corto').max(300),
  body: z.string().min(50, 'Contenido muy corto'),
  category: z.enum(['pokemon', 'yugioh', 'lorcana', 'general']),
  tags: z.array(z.string()).optional(),
  isDraft: z.boolean(),
  metaTitle: z.string().max(70).optional(),
  metaDescription: z.string().max(160).optional(),
})

export type AdminBlogFormData = z.infer<typeof adminBlogSchema>
