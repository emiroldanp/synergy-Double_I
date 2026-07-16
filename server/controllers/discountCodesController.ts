import { Request, Response, NextFunction } from 'express'
import { prisma } from '../lib/prisma'
import { Prisma } from '@prisma/client'
import { z } from 'zod'

// --- Helpers ---

function calcDiscount(type: 'percentage' | 'fixed', value: Prisma.Decimal, subtotal: number): number {
  if (type === 'percentage') {
    return Math.min(subtotal, (subtotal * Number(value)) / 100)
  }
  return Math.min(subtotal, Number(value))
}

function isCodeValid(code: {
  isActive: boolean
  expiresAt: Date | null
  usageLimit: number | null
  usageCount: number
  minAmount: Prisma.Decimal | null
}, subtotal: number): { valid: boolean; reason?: string } {
  if (!code.isActive) return { valid: false, reason: 'Código inactivo' }
  if (code.expiresAt && code.expiresAt < new Date()) return { valid: false, reason: 'Código expirado' }
  if (code.usageLimit !== null && code.usageCount >= code.usageLimit) {
    return { valid: false, reason: 'Código agotado' }
  }
  if (code.minAmount !== null && subtotal < Number(code.minAmount)) {
    return { valid: false, reason: `Monto mínimo de compra: $${Number(code.minAmount).toFixed(2)}` }
  }
  return { valid: true }
}

// --- Endpoint público ---

const validateSchema = z.object({
  code: z.string().min(1).max(50),
  subtotal: z.number().positive(),
})

/**
 * POST /api/discount-codes/validate
 * Valida un código y devuelve el monto de descuento calculado.
 * No incrementa usageCount — eso ocurre al crear la orden.
 */
export async function validateDiscountCode(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = validateSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ error: 'Datos inválidos', details: parsed.error.flatten().fieldErrors })
    }
    const { code, subtotal } = parsed.data

    const discountCode = await prisma.discountCode.findUnique({
      where: { code: code.toUpperCase().trim() },
    })

    if (!discountCode) {
      return res.status(404).json({ error: 'Código no encontrado', code: 'CODE_NOT_FOUND' })
    }

    const { valid, reason } = isCodeValid(discountCode, subtotal)
    if (!valid) {
      return res.status(400).json({ error: reason, code: 'CODE_INVALID' })
    }

    const discountAmount = calcDiscount(discountCode.type, discountCode.value, subtotal)

    res.json({
      data: {
        discountAmount: parseFloat(discountAmount.toFixed(2)),
        type: discountCode.type,
        value: Number(discountCode.value),
      },
    })
  } catch (error) {
    next(error)
  }
}

// --- CRUD admin ---

const createSchema = z.object({
  code: z.string().min(1).max(50).transform((s) => s.toUpperCase().trim()),
  type: z.enum(['percentage', 'fixed']),
  value: z.number().positive(),
  minAmount: z.number().positive().nullable().optional(),
  usageLimit: z.number().int().positive().nullable().optional(),
  expiresAt: z.string().datetime().nullable().optional(),
  isActive: z.boolean().optional().default(true),
}).refine(
  (data) => data.type !== 'percentage' || data.value <= 100,
  { message: 'El porcentaje no puede exceder 100', path: ['value'] }
)

/**
 * GET /api/admin/discount-codes
 */
export async function listDiscountCodes(_req: Request, res: Response, next: NextFunction) {
  try {
    const codes = await prisma.discountCode.findMany({
      orderBy: { createdAt: 'desc' },
    })
    res.json({ data: codes })
  } catch (error) {
    next(error)
  }
}

/**
 * POST /api/admin/discount-codes
 */
export async function createDiscountCode(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = createSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ error: 'Datos inválidos', details: parsed.error.flatten().fieldErrors })
    }
    const { code, type, value, minAmount, usageLimit, expiresAt, isActive } = parsed.data

    const existing = await prisma.discountCode.findUnique({ where: { code } })
    if (existing) {
      return res.status(409).json({ error: 'Ya existe un código con ese nombre', code: 'CODE_DUPLICATE' })
    }

    const created = await prisma.discountCode.create({
      data: {
        code,
        type,
        value: new Prisma.Decimal(value),
        minAmount: minAmount != null ? new Prisma.Decimal(minAmount) : null,
        usageLimit: usageLimit ?? null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        isActive,
      },
    })
    res.status(201).json({ data: created })
  } catch (error) {
    next(error)
  }
}

const updateSchema = z.object({
  code: z.string().min(1).max(50).transform((s) => s.toUpperCase().trim()).optional(),
  type: z.enum(['percentage', 'fixed']).optional(),
  value: z.number().positive().optional(),
  minAmount: z.number().positive().nullable().optional(),
  usageLimit: z.number().int().positive().nullable().optional(),
  expiresAt: z.string().datetime().nullable().optional(),
  isActive: z.boolean().optional(),
})

/**
 * PATCH /api/admin/discount-codes/:id
 */
export async function updateDiscountCode(req: Request, res: Response, next: NextFunction) {
  try {
    const id = String(req.params.id)
    const parsed = updateSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ error: 'Datos inválidos', details: parsed.error.flatten().fieldErrors })
    }

    const existing = await prisma.discountCode.findUnique({ where: { id } })
    if (!existing) return res.status(404).json({ error: 'Código no encontrado' })

    const { code, type, value, minAmount, usageLimit, expiresAt, isActive } = parsed.data

    const updated = await prisma.discountCode.update({
      where: { id },
      data: {
        ...(code !== undefined && { code }),
        ...(type !== undefined && { type }),
        ...(value !== undefined && { value: new Prisma.Decimal(value) }),
        ...(minAmount !== undefined && { minAmount: minAmount != null ? new Prisma.Decimal(minAmount) : null }),
        ...(usageLimit !== undefined && { usageLimit: usageLimit ?? null }),
        ...(expiresAt !== undefined && { expiresAt: expiresAt ? new Date(expiresAt) : null }),
        ...(isActive !== undefined && { isActive }),
      },
    })
    res.json({ data: updated })
  } catch (error) {
    next(error)
  }
}

/**
 * DELETE /api/admin/discount-codes/:id
 * Bloquea el borrado si el código ya fue usado — protege el audit trail financiero.
 */
export async function deleteDiscountCode(req: Request, res: Response, next: NextFunction) {
  try {
    const id = String(req.params.id)
    const existing = await prisma.discountCode.findUnique({ where: { id } })
    if (!existing) return res.status(404).json({ error: 'Código no encontrado' })
    if (existing.usageCount > 0) {
      return res.status(409).json({
        error: `Este código ha sido utilizado ${existing.usageCount} vez/veces. Desactívalo en lugar de eliminarlo.`,
        code: 'CODE_IN_USE',
      })
    }
    await prisma.discountCode.delete({ where: { id } })
    res.json({ data: { id } })
  } catch (error) {
    next(error)
  }
}

// Exportar helper para uso en ordersController
export { calcDiscount, isCodeValid }
