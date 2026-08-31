export type Franchise = 'pokemon' | 'yugioh' | 'lorcana' | 'magic' | 'accesorios'

export type CatalogTab = 'sealed' | 'singles' | 'accesorios'

// Tipos de producto cerrado (sealed)
export const SEALED_PRODUCT_TYPES = [
  'booster-box',
  'etb',
  'booster-bundle',
  'ultra-premium',
  'special-box',
  'decks',
  'sobres-sueltos',
  'blisters',
  'build-battle',
  'tins',
  'display', // legacy — mapear a booster-box vía script de migración
] as const

// Tipos de producto que se muestran en el tab Accesorios
export const ACCESSORY_PRODUCT_TYPES = [
  'sleeve',
  'playmat',
  'dado',
  'binder',
  'accessory',
] as const

export type ProductType =
  | 'carta'           // Singles
  | 'booster-box'     // Producto cerrado
  | 'etb'             // Producto cerrado
  | 'booster-bundle'  // Producto cerrado
  | 'ultra-premium'   // Producto cerrado
  | 'special-box'     // Producto cerrado
  | 'decks'           // Producto cerrado
  | 'sobres-sueltos'  // Producto cerrado
  | 'blisters'        // Producto cerrado
  | 'build-battle'    // Producto cerrado
  | 'tins'            // Producto cerrado
  | 'display'         // Legacy → booster-box
  | 'sleeve'          // Accesorio
  | 'playmat'         // Accesorio
  | 'dado'            // Accesorio
  | 'binder'          // Accesorio
  | 'accessory'       // Accesorio genérico

export type Rarity =
  | 'comun'
  | 'poco_comun'
  | 'rara'
  | 'ultra_rara'
  | 'secret_rare'
  | 'full_art'
  | 'gold_rare'
  | 'prismatic'

export type Edition = 'primera' | 'shadowless' | 'ilimitada' | 'first_edition' | 'unlimited'

export type Condition = 'mint' | 'near_mint' | 'lightly_played'

export type Variant = 'holo' | 'reverse_holo' | 'standard'

export type Language = 'es' | 'en' | 'jp'

export type OrderStatus =
  | 'pendiente_pago'
  | 'pago_confirmado'
  | 'en_preparacion'
  | 'enviado'
  | 'entregado'
  | 'cancelado'

export interface ProductImage {
  url: string
  isPrimary: boolean
}

export interface Category {
  id: string
  name: string
  slug: string
}

export interface Product {
  id: string
  slug: string
  name: string
  franchise?: Franchise
  productType?: ProductType
  categoryId?: string
  set?: string
  setName?: string | null
  rarity?: Rarity | string | null
  edition?: Edition | string | null
  condition?: Condition | string | null
  variant?: Variant | string | null
  language?: Language | string | null
  price: number
  stock: number
  images: string[]
  description?: string | null
  cardNumber?: string | null
  isActive: boolean
  isNew?: boolean
  createdAt: string
  salesCount?: number
  // Campos TCG — presentes solo en productos importados desde API
  externalId?: string | null
  externalSource?: 'pokemontcg' | 'scryfall' | 'lorcast' | 'tcgdex' | null
  tcgMetadata?: Record<string, unknown> | null
  marketPriceUsd?: number | null
  externalUrl?: string | null
}

export interface AdminProduct extends Omit<Product, 'images'> {
  images: ProductImage[]
  externalId?: string | null
  externalSource?: 'pokemontcg' | 'scryfall' | 'lorcast' | 'tcgdex' | null
  tcgMetadata?: Record<string, unknown> | null
  marketPriceUsd?: number | null
}

export interface TcgCardResult {
  externalId: string
  externalSource: 'pokemontcg' | 'scryfall' | 'lorcast' | 'tcgdex'
  name: string
  cardNumber: string | null
  setName: string | null
  rarity: string | null
  language: string | null
  imageUrl: string | null
  marketPriceUsd: number | null
  externalUrl: string | null
  metadata: Record<string, unknown>
}

export interface CartItem {
  product: Product
  quantity: number
}

export interface Cart {
  items: CartItem[]
}

export interface ShippingOption {
  id: string
  carrier: 'estafeta' | 'dhl' | 'fedex' | 'whatsapp_local'
  service: string
  price: number
  eta: string
}

export interface Customer {
  id: string
  email: string
  fullName?: string | null
  phone?: string | null
}

export interface OrderItem {
  id?: string
  productId: string
  name: string
  price: number
  unitPrice?: number   // campo real que devuelve Prisma
  quantity: number
  subtotal?: number
  image?: string
  product?: { name: string; slug?: string; images?: string[] } | null
}

export interface ShippingAddress {
  street: string
  number?: string
  colonia?: string
  city: string
  state: string
  zip: string
}

export interface Order {
  id: string
  orderNumber?: string
  status?: OrderStatus
  orderStatus?: string
  items: OrderItem[]
  subtotal: number
  shippingCost: number
  total: number
  shippingOption?: ShippingOption
  shippingMethod?: string | null
  trackingNumber?: string | null
  paymentMethod?: string | null
  paymentStatus?: 'pending' | 'awaiting_verification' | 'confirmed' | 'failed'
  guestEmail?: string | null
  guestName?: string | null
  guestPhone?: string | null
  shippingAddress?: ShippingAddress | null
  createdAt: string
  customer?: Customer | null
  address?: {
    street: string
    number: string
    colonia: string
    city: string
    state: string
    zip: string
  }
  cfdi?: {
    rfc: string
    razonSocial: string
    usoCfdi: string
  }
  requiresInvoice?: boolean
  invoice?: {
    status: 'draft' | 'valid' | 'cancelled'
    pdfUrl?: string | null
    xmlUrl?: string | null
  } | null
}

export interface BlogPost {
  id: string
  slug: string
  title: string
  excerpt: string | null
  body: string | null
  featuredImageUrl: string | null
  categorySlug: string | null
  tags: string[]
  isPublished: boolean
  publishedAt: string | null
  createdAt: string
  metaTitle?: string | null
  metaDescription?: string | null
}

export interface Promotion {
  id: string
  badgeLabel: string
  title: string
  description: string
  ctaHref: string
  isActive: boolean
  sortOrder?: number
  type?: 'free_shipping' | 'percentage_off' | 'fixed_off' | null
  categoryId?: string | null
  value?: number | null
  minAmount?: number | null
  startsAt?: string | null
  endsAt?: string | null
}

export interface AppliedPromotion {
  id: string
  title: string
  discountAmount: number
  freeShipping: boolean
}

export interface FilterState {
  tab: CatalogTab
  franchise: Franchise[]
  productType: ProductType[]
  rarity: string[]
  edition: Edition[]
  condition: Condition[]
  variant: Variant[]
  language: Language[]
  priceMin: number | null
  priceMax: number | null
  search: string
  sortBy: 'price_asc' | 'price_desc' | 'newest'
  page: number
}

export interface BannerSlide {
  id: string
  imageUrl: string
  imageUrlMobile?: string | null
  title: string
  subtitle: string
  ctaLabel: string
  ctaHref: string
  isActive: boolean
}

export interface DashboardStats {
  revenueToday: number
  revenueWeek: number
  revenueMonth: number
  ordersByStatus: Record<OrderStatus, number>
  totalProducts: number
  lowStockProducts: number
}
