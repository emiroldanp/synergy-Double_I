import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'

// Prisma 7 requiere adaptador explícito — no hay conexión automática por string
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })

export const prisma = new PrismaClient({ adapter })
