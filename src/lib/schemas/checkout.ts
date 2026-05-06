import { z } from 'zod'

export const contactSchema = z.object({
  name: z.string().min(2, 'Nombre muy corto').max(100),
  email: z.string().email('Correo inválido'),
  phone: z
    .string()
    .regex(/^[0-9]{10}$/, 'Teléfono debe tener 10 dígitos'),
})

export const addressSchema = z.object({
  street: z.string().min(3, 'Calle requerida'),
  number: z.string().min(1, 'Número requerido'),
  colonia: z.string().min(2, 'Colonia requerida'),
  city: z.string().min(2, 'Ciudad requerida'),
  state: z.string().min(2, 'Estado requerido'),
  zip: z.string().regex(/^[0-9]{5}$/, 'CP debe tener 5 dígitos'),
})

export const cfdiSchema = z.object({
  requestCfdi: z.boolean(),
  rfc: z.string().optional(),
  razonSocial: z.string().optional(),
  usoCfdi: z.string().optional(),
}).superRefine((val, ctx) => {
  if (val.requestCfdi) {
    if (!val.rfc || !/^[A-ZÑ&]{3,4}[0-9]{6}[A-Z0-9]{3}$/.test(val.rfc.toUpperCase())) {
      ctx.addIssue({ code: 'custom', path: ['rfc'], message: 'RFC inválido' })
    }
    if (!val.razonSocial || val.razonSocial.length < 2) {
      ctx.addIssue({ code: 'custom', path: ['razonSocial'], message: 'Razón social requerida' })
    }
    if (!val.usoCfdi) {
      ctx.addIssue({ code: 'custom', path: ['usoCfdi'], message: 'Uso de CFDI requerido' })
    }
  }
})

export type ContactFormData = z.infer<typeof contactSchema>
export type AddressFormData = z.infer<typeof addressSchema>
export type CfdiFormData = z.infer<typeof cfdiSchema>
