import { Request, Response, NextFunction } from 'express'
import { Prisma } from '@prisma/client'

// Manejador global de errores — captura cualquier error no manejado en controllers
export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction) {
  const isDev = process.env.NODE_ENV === 'development'
  console.error(err)

  // Body más grande que el límite configurado en express.json() para esa ruta (body-parser) —
  // sin este caso, cualquier archivo/imagen que excediera el límite se veía como "Error interno
  // del servidor" sin pista de qué pasó (así se reportó con la subida de banners).
  const errWithMeta = err as Error & { type?: string; status?: number; statusCode?: number }
  if (errWithMeta.type === 'entity.too.large' || errWithMeta.status === 413 || errWithMeta.statusCode === 413) {
    return res.status(413).json({
      error: 'El archivo enviado es demasiado grande. Usa una imagen más ligera e intenta de nuevo.',
    })
  }

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
