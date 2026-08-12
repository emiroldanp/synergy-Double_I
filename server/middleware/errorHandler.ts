import { Request, Response, NextFunction } from 'express'
import { Prisma } from '@prisma/client'

// Manejador global de errores — captura cualquier error no manejado en controllers
export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction) {
  const isDev = process.env.NODE_ENV === 'development'
  console.error(err)

  // Violación de constraint único (ej. slug duplicado) — error del cliente, no del servidor.
  // Sin este caso, cualquier colisión de un campo unique se veía como "Error interno del
  // servidor" sin pista de qué pasó realmente.
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
    const fields = (err.meta?.target as string[] | undefined)?.join(', ') ?? 'un campo único'
    return res.status(409).json({
      error: `Ya existe un registro con ese valor en: ${fields}. Cambia el valor e intenta de nuevo.`,
    })
  }

  res.status(500).json({
    error: 'Error interno del servidor',
    ...(isDev && { message: err.message, stack: err.stack }),
  })
}
