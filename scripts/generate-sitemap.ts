/**
 * Generador de sitemap.xml para Double-I TCG.
 *
 * Se ejecuta en el build (script `prebuild` de package.json) antes de `vite build`.
 * Genera `public/sitemap.xml` con:
 *   - Rutas estáticas: /, /catalogo, /blog, /contacto
 *   - Una entrada por producto consultando la API real (GET ${VITE_API_URL}/api/products)
 *
 * Degradación con gracia: si la API no responde dentro del timeout, se genera
 * únicamente el sitemap con las rutas estáticas y el build NO falla.
 */
import { writeFileSync, mkdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

// Base del sitio en producción (dominio confirmado con Irving)
const SITE_URL = 'https://doubleicards.com'

// URL de la API: misma variable que usa el frontend; fallback a localhost en dev
const API_URL = process.env.VITE_API_URL || 'http://localhost:3001'

// Timeout corto para no bloquear el build si la API no responde
const API_TIMEOUT_MS = 5000
// Tamaño de página para paginar el catálogo (máximo permitido por la API)
const PAGE_SIZE = 100

// Resolver la ruta de salida (public/sitemap.xml) relativa a este archivo
const __dirname = dirname(fileURLToPath(import.meta.url))
const OUTPUT_PATH = resolve(__dirname, '..', 'public', 'sitemap.xml')

// Rutas estáticas indexables del sitio
const STATIC_ROUTES: { path: string; changefreq: string; priority: string }[] = [
  { path: '/', changefreq: 'daily', priority: '1.0' },
  { path: '/catalogo', changefreq: 'daily', priority: '0.9' },
  { path: '/blog', changefreq: 'weekly', priority: '0.7' },
  { path: '/contacto', changefreq: 'monthly', priority: '0.5' },
]

interface ProductLite {
  slug?: string
}

interface ProductsApiResponse {
  data?: {
    products?: ProductLite[]
    total?: number
    totalPages?: number
    page?: number
  }
}

/** Consulta una página de productos de la API con timeout corto. */
async function fetchProductsPage(page: number): Promise<ProductsApiResponse | null> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), API_TIMEOUT_MS)
  try {
    const url = `${API_URL}/api/products?page=${page}&limit=${PAGE_SIZE}`
    const res = await fetch(url, { signal: controller.signal })
    if (!res.ok) return null
    return (await res.json()) as ProductsApiResponse
  } catch {
    // Timeout, red caída o JSON inválido → degradar con gracia
    return null
  } finally {
    clearTimeout(timer)
  }
}

/** Obtiene todos los slugs de producto paginando la API. Devuelve [] si falla. */
async function fetchAllProductSlugs(): Promise<string[]> {
  const first = await fetchProductsPage(1)
  if (!first?.data?.products) {
    console.warn('[sitemap] API no disponible o sin productos — generando solo rutas estáticas.')
    return []
  }

  const slugs: string[] = []
  const totalPages = first.data.totalPages ?? 1

  // Acumular slugs de la primera página
  for (const p of first.data.products) {
    if (p.slug) slugs.push(p.slug)
  }

  // Páginas restantes
  for (let page = 2; page <= totalPages; page++) {
    const res = await fetchProductsPage(page)
    if (!res?.data?.products) break // si una página falla, cortar y usar lo acumulado
    for (const p of res.data.products) {
      if (p.slug) slugs.push(p.slug)
    }
  }

  return slugs
}

/** Construye una entrada <url> del sitemap. */
function urlEntry(loc: string, changefreq: string, priority: string): string {
  return [
    '  <url>',
    `    <loc>${SITE_URL}${loc}</loc>`,
    `    <changefreq>${changefreq}</changefreq>`,
    `    <priority>${priority}</priority>`,
    '  </url>',
  ].join('\n')
}

/** Escapa el slug para uso seguro en XML. */
function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

async function generateSitemap(): Promise<void> {
  const slugs = await fetchAllProductSlugs()

  const entries: string[] = STATIC_ROUTES.map((r) =>
    urlEntry(r.path, r.changefreq, r.priority)
  )

  // Una entrada por producto: /catalogo/:slug
  for (const slug of slugs) {
    entries.push(urlEntry(`/catalogo/${escapeXml(slug)}`, 'weekly', '0.6'))
  }

  const xml =
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    entries.join('\n') +
    '\n</urlset>\n'

  mkdirSync(dirname(OUTPUT_PATH), { recursive: true })
  writeFileSync(OUTPUT_PATH, xml, 'utf-8')

  console.log(
    `[sitemap] Generado con ${STATIC_ROUTES.length} rutas estáticas y ${slugs.length} productos → public/sitemap.xml`
  )
}

// Nunca romper el build: cualquier error inesperado se registra pero no propaga
generateSitemap().catch((err) => {
  console.warn('[sitemap] Error inesperado, se omite el sitemap de productos:', err)
})
