import { Request, Response, NextFunction } from 'express'
import { uploadToR2 } from '../lib/r2'
import {
  searchPokemon,
  getPokemonCard,
  searchScryfall,
  getScryfallCard,
  searchLorcast,
  getLorcastCard,
  TcgCardResult,
} from '../lib/tcgAdapters'

type Franchise = 'pokemon' | 'magic' | 'lorcana'

function getFranchise(req: Request): Franchise | null {
  const f = req.query.franchise as string
  if (f === 'pokemon' || f === 'magic' || f === 'lorcana') return f
  return null
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/tcg/search?franchise=<f>&q=<texto>
// ─────────────────────────────────────────────────────────────────────────────
export async function searchCards(req: Request, res: Response, next: NextFunction) {
  const franchise = getFranchise(req)
  const q = (req.query.q as string | undefined)?.trim()
  // full=1 pide el resto de resultados más allá de los primeros mostrados ("mostrar más")
  const full = req.query.full === '1' || req.query.full === 'true'

  if (!franchise) return res.status(400).json({ error: 'franchise requerida: pokemon | magic | lorcana' })
  if (!q || q.length < 2) return res.status(400).json({ error: 'q debe tener al menos 2 caracteres' })

  let results: TcgCardResult[] = []
  let hasMore = false
  let apiAvailable = true

  try {
    const out = franchise === 'pokemon' ? await searchPokemon(q, full)
      : franchise === 'magic' ? await searchScryfall(q, full)
      : await searchLorcast(q, full)
    results = out.results
    hasMore = out.hasMore
  } catch {
    apiAvailable = false
  }

  // Si la API falla o regresa vacío, informamos sin romper la respuesta
  if (!apiAvailable) {
    return res.json({
      data: [],
      hasMore: false,
      warning: 'La API de la franquicia no está disponible temporalmente. Ingresa los datos manualmente.',
    })
  }

  res.json({ data: results, hasMore })
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/tcg/card?franchise=<f>&id=<externalId>
// ─────────────────────────────────────────────────────────────────────────────
export async function getCardDetail(req: Request, res: Response, next: NextFunction) {
  const franchise = getFranchise(req)
  const id = (req.query.id as string | undefined)?.trim()

  if (!franchise) return res.status(400).json({ error: 'franchise requerida' })
  if (!id) return res.status(400).json({ error: 'id requerido' })

  let card: TcgCardResult | null = null

  try {
    if (franchise === 'pokemon') card = await getPokemonCard(id)
    else if (franchise === 'magic') card = await getScryfallCard(id)
    else card = await getLorcastCard(id)
  } catch {
    return res.json({
      data: null,
      warning: 'API no disponible temporalmente. Ingresa los datos manualmente.',
    })
  }

  if (!card) {
    return res.status(404).json({ error: 'Carta no encontrada' })
  }

  res.json({ data: card })
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/admin/tcg/import-image
// Body: { imageUrl: string, productId?: string }
// Descarga la imagen externa a R2 y devuelve la URL pública
// ─────────────────────────────────────────────────────────────────────────────
export async function importCardImage(req: Request, res: Response, next: NextFunction) {
  const { imageUrl, productId } = req.body as { imageUrl?: string; productId?: string }

  if (!imageUrl || !imageUrl.startsWith('http')) {
    return res.status(400).json({ error: 'imageUrl inválida' })
  }

  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 10000)

    let httpRes: Awaited<ReturnType<typeof fetch>>
    try {
      httpRes = await fetch(imageUrl, { signal: controller.signal })
    } finally {
      clearTimeout(timer)
    }

    if (!httpRes.ok) {
      return res.status(502).json({
        error: 'No se pudo descargar la imagen. Sube una imagen manualmente.',
      })
    }

    const contentType = httpRes.headers.get('content-type') ?? 'image/jpeg'
    const buffer = Buffer.from(await httpRes.arrayBuffer())

    // Extensión según content-type
    const ext = contentType.includes('png') ? 'png'
      : contentType.includes('avif') ? 'avif'
      : contentType.includes('webp') ? 'webp'
      : 'jpg'

    const folder = productId ? `products/${productId}` : 'products/temp'
    const key = `${folder}/tcg-import-${Date.now()}.${ext}`

    const publicUrl = await uploadToR2(key, buffer, contentType)

    res.json({ data: { url: publicUrl } })
  } catch (error: any) {
    if (error?.name === 'AbortError') {
      return res.json({
        data: null,
        warning: 'Tiempo de espera agotado al descargar la imagen. Sube una imagen manualmente.',
      })
    }
    next(error)
  }
}
