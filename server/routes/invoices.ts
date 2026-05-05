import { Router } from 'express'

// Las facturas se generan internamente desde el webhook de pagos.
// Este router existe como punto de extensión para rutas admin futuras
// (consultar estado de factura, reintento manual, etc.).
export const invoicesRoutes = Router()
