import { z } from 'zod'

export const suscripcionSchema = z.object({
  email: z.string().email('Correo inválido'),
  name: z.string().min(2, 'Nombre muy corto').optional(),
})

export type SuscripcionFormData = z.infer<typeof suscripcionSchema>
