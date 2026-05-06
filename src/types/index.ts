export type Franchise = 'pokemon' | 'yugioh' | 'lorcana' | 'magic' | 'accessories'

export type Rarity =
  | 'comun'
  | 'poco_comun'
  | 'rara'
  | 'ultra_rara'
  | 'secret_rare'
  | 'full_art'
  | 'gold_rare'
  | 'prismatic'

export type ProductType =
  | 'single'
  | 'graded'
  | 'booster_pack'
  | 'booster_box'
  | 'booster_bundle'
  | 'elite_trainer_box'
  | 'starter_deck'
  | 'build_and_battle'
  | 'deck'
  | 'sleeves'
  | 'playmat'
  | 'dice'
  | 'deck_box'
  | 'binder'
  | 'tin'
  | 'box_set'
  | 'accessories'

export type Edition = 'primera' | 'shadowless' | 'ilimitada'

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

export interface Product {
  id: string
  slug: string
  name: string
  franchise: Franchise
  productType: ProductType
  set: string
  rarity: Rarity
  edition: Edition
  condition: Condition
  variant: Variant
  language: Language
  price: number
  stock: number
  images: string[]
  description?: string
  cardNumber?: string
  isActive: boolean
  createdAt: string
  salesCount?: number
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

export interface OrderItem {
  productId: string
  name: string
  price: number
  quantity: number
  image: string
}

export interface Order {
  id: string
  orderNumber: string
  status: OrderStatus
  items: OrderItem[]
  subtotal: number
  shippingCost: number
  total: number
  shippingOption: ShippingOption
  trackingNumber?: string
  createdAt: string
  customer: {
    name: string
    email: string
    phone: string
  }
  address: {
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
}

export interface Novedad {
  id: string
  title: string
  image: string
  productSlug?: string
  text?: string
  order: number
  isActive: boolean
}

export interface BlogPost {
  id: string
  slug: string
  title: string
  excerpt: string
  body: string
  image: string
  category: Franchise | 'general'
  tags: string[]
  publishedAt: string
  isDraft: boolean
  metaTitle?: string
  metaDescription?: string
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
  rarity: Rarity[]
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

export interface DashboardStats {
  revenueToday: number
  revenueWeek: number
  revenueMonth: number
  ordersByStatus: Record<OrderStatus, number>
  totalProducts: number
  lowStockProducts: number
}
