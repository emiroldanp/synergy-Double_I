import type { Product, Franchise } from '@/types'

const FRANCHISE_MAP: Record<string, Franchise> = {
  pokemon: 'pokemon',
  'yu-gi-oh': 'yugioh',
  yugioh: 'yugioh',
  lorcana: 'lorcana',
  magic: 'magic',
}

export function normalizeProduct(raw: any): Product {
  const categorySlug = raw.category?.slug as string | undefined
  return {
    ...raw,
    franchise: categorySlug ? FRANCHISE_MAP[categorySlug] : undefined,
    set: raw.set ?? raw.setName ?? undefined,
    images: Array.isArray(raw.images)
      ? raw.images.map((img: any) => (typeof img === 'string' ? img : img.url)).filter(Boolean)
      : [],
    price: Number(raw.price),
    isNew: raw.isNew ?? false,
  }
}

export function normalizeProductList(data: any): Product[] {
  const raw = data?.data?.products ?? data?.data?.data ?? data?.products ?? data?.data ?? []
  return Array.isArray(raw) ? raw.map(normalizeProduct) : []
}
