export interface Category {
  id: string
  name: string
  slug: string
  description: string | null
  imageUrl: string | null
  createdAt: string
}

export interface Product {
  id: string
  categoryId: string
  name: string
  cardNumber: string | null
  setName: string | null
  edition: 'first_edition' | 'shadowless' | 'unlimited' | null
  language: 'es' | 'en' | 'jp' | null
  rarity: string | null
  condition: 'mint' | 'near_mint' | 'lightly_played' | null
  variant: 'standard' | 'holo' | 'reverse_holo' | null
  price: number
  stock: number
  isActive: boolean
  slug: string
  description: string | null
  createdAt: string
  updatedAt: string
  category?: Category
  images?: ProductImage[]
}

export interface ProductImage {
  id: string
  productId: string
  url: string
  isPrimary: boolean
  sortOrder: number
}

export interface Customer {
  id: string
  email: string
  fullName: string | null
  phone: string | null
  defaultAddress: ShippingAddress | null
  createdAt: string
}

export interface ShippingAddress {
  street: string
  number: string
  neighborhood: string
  city: string
  state: string
  zipCode: string
}

export interface Order {
  id: string
  customerId: string | null
  guestEmail: string | null
  guestName: string | null
  guestPhone: string | null
  shippingAddress: ShippingAddress
  shippingMethod: string | null
  shippingCost: number
  subtotal: number
  total: number
  paymentMethod: string | null
  paymentStatus: 'pending' | 'confirmed' | 'failed'
  paymentReference: string | null
  orderStatus: 'pending_payment' | 'confirmed' | 'preparing' | 'shipped' | 'delivered' | 'cancelled'
  trackingNumber: string | null
  requiresInvoice: boolean
  createdAt: string
  updatedAt: string
}

export interface OrderItem {
  id: string
  orderId: string
  productId: string
  quantity: number
  unitPrice: number
  subtotal: number
  product?: Product
}

export interface ShippingOption {
  carrier: string
  service: string
  price: number
  eta: string
}

export interface CartItem {
  product: Product
  quantity: number
}
