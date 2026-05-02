import { Request, Response, NextFunction } from 'express'

// Manejador global de errores — captura cualquier error no manejado en controllers
export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction) {
  const isDev = process.env.NODE_ENV === 'development'
  console.error(err)
  res.status(500).json({
    error: 'Error interno del servidor',
    ...(isDev && { message: err.message, stack: err.stack }),
  })
}
