import { z } from 'zod'

export const adminProductoSchema = z.object({
  name: z.string().min(2, 'Nombre requerido'),
  franchise: z.enum(['pokemon', 'lorcana', 'magic']),
  set: z.string().min(2, 'Set requerido'),
  rarity: z.enum(['comun', 'poco_comun', 'rara', 'ultra_rara', 'secret_rare', 'full_art', 'gold_rare', 'prismatic']),
  edition: z.enum(['primera', 'shadowless', 'ilimitada']),
  condition: z.enum(['mint', 'near_mint', 'lightly_played']),
  variant: z.enum(['holo', 'reverse_holo', 'standard']),
  language: z.enum(['es', 'en', 'jp']),
  price: z.number().positive('Precio debe ser mayor a 0'),
  stock: z.number().int().min(0, 'Stock no puede ser negativo'),
  cardNumber: z.string().optional(),
  description: z.string().optional(),
  isActive: z.boolean(),
})

export type AdminProductoFormData = z.infer<typeof adminProductoSchema>
