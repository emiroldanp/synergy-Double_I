export type Franchise = 'pokemon' | 'yugioh' | 'lorcana' | 'magic' | 'accesorios'

export type ProductType = 'carta' | 'sleeve' | 'playmat' | 'etb' | 'display' | 'dado' | 'binder' | 'accessory'

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
  externalSource?: 'pokemontcg' | 'scryfall' | 'lorcast' | null
  tcgMetadata?: Record<string, unknown> | null
  marketPriceUsd?: number | null
  externalUrl?: string | null
}

export interface AdminProduct extends Omit<Product, 'images'> {
  images: ProductImage[]
  externalId?: string | null
  externalSource?: 'pokemontcg' | 'scryfall' | 'lorcast' | null
  tcgMetadata?: Record<string, unknown> | null
  marketPriceUsd?: number | null
}

export interface TcgCardResult {
  externalId: string
  externalSource: 'pokemontcg' | 'scryfall' | 'lorcast'
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
  carrier: 'estafeta' | 'dhl' | 'fedex'
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
  product?: { name: string; slug?: string } | null
}

export interface ShippingAddress {
  street: string
  number?: string
  neighborhood?: string
  city: string
  state: string
  zipCode: string
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
  trackingNumber?: string | null
  paymentMethod?: string | null
  paymentStatus?: 'pending' | 'awaiting_verification' | 'confirmed' | 'failed'
  guestEmail?: string | null
  guestName?: string | null
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
  title: string
  description: string
  discountType: 'monto' | 'porcentaje'
  discountValue: number
  validFrom: string
  validTo: string
  isActive: boolean
  image?: string
}

export interface FilterState {
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
