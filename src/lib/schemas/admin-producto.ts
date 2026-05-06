import { z } from 'zod'

export const adminProductoSchema = z.object({
  name: z.string().min(2, 'Nombre requerido'),
  franchise: z.enum(['pokemon', 'yugioh', 'lorcana', 'magic', 'accessories']),
  productType: z.enum([
    'single', 'graded', 'booster_pack', 'booster_box', 'booster_bundle',
    'elite_trainer_box', 'starter_deck', 'build_and_battle', 'deck',
    'sleeves', 'playmat', 'dice', 'deck_box', 'binder', 'tin', 'box_set', 'accessories',
  ]),
  set: z.string().min(1, 'Set requerido'),
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
