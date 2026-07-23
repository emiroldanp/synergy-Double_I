/**
 * Migración única: adapta los productType viejos al nuevo esquema de tabs.
 *
 * Cambios:
 *   display → booster-box
 *   etb     → etb (ya es correcto, no cambia)
 *   carta   → carta (ya es correcto, no cambia)
 *   dado    → productType queda 'dado', categoría se mueve a 'accesorios'
 *   binder  → productType queda 'binder', categoría se mueve a 'accesorios'
 *   sleeve  → ya debe estar en accesorios, asegurar
 *   playmat → ya debe estar en accesorios, asegurar
 *
 * Ejecutar una sola vez:
 *   cd server && npx tsx scripts/migrate-product-types.ts
 */

import * as dotenv from 'dotenv'
import path from 'path'
dotenv.config({ path: path.resolve(__dirname, '../.env') })

import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'
import pg from 'pg'

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL!,
  max: 2,
})
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('Iniciando migración de tipos de producto...\n')

  // Obtener categoría accesorios
  const accesoriosCategory = await prisma.category.findUnique({
    where: { slug: 'accesorios' },
  })
  if (!accesoriosCategory) {
    throw new Error('Categoría "accesorios" no encontrada. Ejecutar seed primero.')
  }

  // 1. display → booster-box
  const displayResult = await prisma.product.updateMany({
    where: { productType: 'display' },
    data: { productType: 'booster-box' },
  })
  console.log(`display → booster-box: ${displayResult.count} productos actualizados`)

  // 2. dado → mover a categoría accesorios
  const dadoResult = await prisma.product.updateMany({
    where: { productType: 'dado' },
    data: { categoryId: accesoriosCategory.id },
  })
  console.log(`dado → categoría accesorios: ${dadoResult.count} productos actualizados`)

  // 3. binder → mover a categoría accesorios
  const binderResult = await prisma.product.updateMany({
    where: { productType: 'binder' },
    data: { categoryId: accesoriosCategory.id },
  })
  console.log(`binder → categoría accesorios: ${binderResult.count} productos actualizados`)

  // 4. sleeve → mover a categoría accesorios (por si acaso no están ahí)
  const sleeveResult = await prisma.product.updateMany({
    where: { productType: 'sleeve' },
    data: { categoryId: accesoriosCategory.id },
  })
  console.log(`sleeve → categoría accesorios: ${sleeveResult.count} productos actualizados`)

  // 5. playmat → mover a categoría accesorios
  const playmatResult = await prisma.product.updateMany({
    where: { productType: 'playmat' },
    data: { categoryId: accesoriosCategory.id },
  })
  console.log(`playmat → categoría accesorios: ${playmatResult.count} productos actualizados`)

  console.log('\nMigración completada.')

  // Resumen del estado actual
  const summary = await prisma.product.groupBy({
    by: ['productType'],
    _count: { productType: true },
    where: { isActive: true },
  })
  console.log('\nResumen de productType en BD:')
  summary
    .sort((a, b) => (b._count.productType) - (a._count.productType))
    .forEach(({ productType, _count }) => {
      console.log(`  ${productType ?? 'NULL'}: ${_count.productType}`)
    })
}

main()
  .catch((e) => {
    console.error('Error en migración:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
    await pool.end()
  })
