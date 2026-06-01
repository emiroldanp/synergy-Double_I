/**
 * seed-catalog.ts — Carga masiva de productos desde Excel + carpeta de imágenes
 *
 * Uso:
 *   npx ts-node scripts/seed-catalog.ts <ruta-excel> <carpeta-imagenes>
 *
 * Ejemplo:
 *   npx ts-node scripts/seed-catalog.ts "../public/Imagenes tienda/Catalogo producto cerrado.xlsx" "../public/Imagenes tienda"
 *
 * El Excel debe tener las columnas:
 *   Category | Set | Nombre del Producto | Cantidad | Precio
 *
 * La carpeta de imágenes debe tener subcarpetas con el nombre del producto
 * (o una coincidencia parcial suficiente).
 */

import 'dotenv/config'
import fs from 'fs'
import path from 'path'
import * as XLSX from 'xlsx'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'

// ─── Prisma ──────────────────────────────────────────────────────────────────

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

// ─── R2 ──────────────────────────────────────────────────────────────────────

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.CLOUDFLARE_R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!,
  },
})

async function uploadImage(key: string, filePath: string): Promise<string> {
  const body = fs.readFileSync(filePath)
  const ext = path.extname(filePath).toLowerCase()
  const contentType =
    ext === '.png' ? 'image/png' :
    ext === '.webp' ? 'image/webp' :
    ext === '.avif' ? 'image/avif' :
    'image/jpeg'

  await r2.send(
    new PutObjectCommand({
      Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME!,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  )
  return `${process.env.CLOUDFLARE_R2_PUBLIC_URL}/${key}`
}

// ─── Utilidades ──────────────────────────────────────────────────────────────

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

// Busca la carpeta más parecida al nombre del producto (coincidencia parcial)
function findImageFolder(imagesDir: string, productName: string): string | null {
  const entries = fs.readdirSync(imagesDir, { withFileTypes: true })
  const folders = entries.filter(e => e.isDirectory()).map(e => e.name)

  // Coincidencia exacta primero
  const exact = folders.find(f => f.toLowerCase() === productName.toLowerCase())
  if (exact) return path.join(imagesDir, exact)

  // Coincidencia parcial: el nombre del producto contiene al nombre de la carpeta o viceversa
  const normalizedProduct = productName.toLowerCase().replace(/[^a-z0-9\s]/g, '')
  const partial = folders.find(f => {
    const normalizedFolder = f.toLowerCase().replace(/[^a-z0-9\s]/g, '')
    return (
      normalizedProduct.includes(normalizedFolder) ||
      normalizedFolder.includes(normalizedProduct) ||
      // Comparar palabras clave (al menos 3 palabras coincidan)
      matchKeywords(normalizedProduct, normalizedFolder, 3)
    )
  })

  return partial ? path.join(imagesDir, partial) : null
}

function matchKeywords(a: string, b: string, minMatches: number): boolean {
  const wordsA = new Set(a.split(/\s+/).filter(w => w.length > 2))
  const wordsB = b.split(/\s+/).filter(w => w.length > 2)
  const matches = wordsB.filter(w => wordsA.has(w)).length
  return matches >= minMatches
}

function getImageFiles(folder: string): string[] {
  return fs
    .readdirSync(folder)
    .filter(f => /\.(jpg|jpeg|png|webp|avif)$/i.test(f))
    .sort()
    .map(f => path.join(folder, f))
}

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface CatalogRow {
  category: string
  set: string
  name: string
  stock: number
  price: number
}

// ─── Lectura del Excel ────────────────────────────────────────────────────────

function readCatalog(excelPath: string): CatalogRow[] {
  const wb = XLSX.readFile(excelPath)
  const sheet = wb.Sheets[wb.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet)

  return rows
    .map(row => {
      // Nombre del producto puede estar en columna con espacios
      const nameKey = Object.keys(row).find(k => k.trim() === 'Nombre del Producto')
      if (!nameKey) return null

      const name = String(row[nameKey] ?? '').trim()
      if (!name) return null

      return {
        category: String(row['Category'] ?? '').trim(),
        set: String(row['Set'] ?? '').trim(),
        name,
        stock: Number(row['Cantidad'] ?? 0),
        price: Number(row['Precio'] ?? 0),
      }
    })
    .filter((r): r is CatalogRow => r !== null)
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const [, , excelArg, imagesDirArg] = process.argv

  if (!excelArg || !imagesDirArg) {
    console.error('Uso: npx ts-node scripts/seed-catalog.ts <ruta-excel> <carpeta-imagenes>')
    process.exit(1)
  }

  const excelPath = path.resolve(excelArg)
  const imagesDir = path.resolve(imagesDirArg)

  if (!fs.existsSync(excelPath)) {
    console.error(`Excel no encontrado: ${excelPath}`)
    process.exit(1)
  }
  if (!fs.existsSync(imagesDir)) {
    console.error(`Carpeta de imágenes no encontrada: ${imagesDir}`)
    process.exit(1)
  }

  const rows = readCatalog(excelPath)
  console.log(`\n📋 ${rows.length} productos encontrados en el Excel\n`)

  const stats = { ok: 0, skipped: 0, noImages: 0, errors: 0 }

  for (const row of rows) {
    const slug = slugify(row.name)

    // Verificar si ya existe
    const existing = await prisma.product.findUnique({ where: { slug } })
    if (existing) {
      console.log(`  ⏭  Ya existe: ${row.name}`)
      stats.skipped++
      continue
    }

    // Buscar carpeta de imágenes
    const imageFolder = findImageFolder(imagesDir, row.name)
    if (!imageFolder) {
      console.warn(`  ⚠️  Sin carpeta de imágenes: ${row.name}`)
      stats.noImages++
    }

    const imageFiles = imageFolder ? getImageFiles(imageFolder) : []

    try {
      // Buscar o crear categoría
      const categorySlug = slugify(row.category)
      const category = await prisma.category.upsert({
        where: { slug: categorySlug },
        update: {},
        create: { name: row.category, slug: categorySlug },
      })

      // Subir imágenes a R2
      const uploadedUrls: string[] = []
      for (let i = 0; i < imageFiles.length; i++) {
        const ext = path.extname(imageFiles[i])
        const key = `products/${slug}/imagen-${i + 1}${ext}`
        process.stdout.write(`  📤 Subiendo imagen ${i + 1}/${imageFiles.length} de "${row.name}"...`)
        const url = await uploadImage(key, imageFiles[i])
        uploadedUrls.push(url)
        console.log(' ✓')
      }

      // Crear producto + imágenes en una sola transacción
      await prisma.product.create({
        data: {
          name: row.name,
          slug,
          setName: row.set || null,
          price: row.price,
          stock: row.stock,
          categoryId: category.id,
          isActive: true,
          images: {
            create: uploadedUrls.map((url, i) => ({
              url,
              isPrimary: i === 0,
              sortOrder: i,
            })),
          },
        },
      })

      const imageCount = uploadedUrls.length
      console.log(`  ✅ ${row.name} — ${imageCount} imagen${imageCount !== 1 ? 'es' : ''} — $${row.price} MXN — stock: ${row.stock}`)
      stats.ok++
    } catch (err) {
      console.error(`  ❌ Error en "${row.name}":`, err)
      stats.errors++
    }
  }

  console.log('\n─────────────────────────────────────')
  console.log(`✅ Cargados:    ${stats.ok}`)
  console.log(`⏭  Omitidos:   ${stats.skipped} (ya existían)`)
  console.log(`⚠️  Sin imágenes: ${stats.noImages}`)
  console.log(`❌ Errores:     ${stats.errors}`)
  console.log('─────────────────────────────────────\n')

  await prisma.$disconnect()
}

main().catch(async err => {
  console.error(err)
  await prisma.$disconnect()
  process.exit(1)
})
