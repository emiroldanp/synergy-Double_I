import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'
import pg from 'pg'

// Pool persistente — evita cold-start de Neon en cada request
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL!,
  max: 5,
  idleTimeoutMillis: 30000,
})

// Prisma 7 requiere adaptador explícito — no hay conexión automática por string
const adapter = new PrismaPg(pool)

export const prisma = new PrismaClient({ adapter })

// Warmup: establece la conexión al iniciar el servidor en lugar de en el primer request del usuario
prisma.$connect().catch(() => {})
