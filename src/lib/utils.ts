import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { Condition, Franchise, Rarity, Language, Variant, Edition, OrderStatus } from '@/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatPrice(amount: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
  }).format(amount)
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export const FRANCHISE_LABELS: Record<Franchise, string> = {
  pokemon: 'Pokémon',
  yugioh: 'Yu-Gi-Oh!',
  lorcana: 'Lorcana',
  magic: 'Magic: The Gathering',
}

export const FRANCHISE_COLORS: Record<Franchise, string> = {
  pokemon: '#F5C400',
  yugioh: '#C8950A',
  lorcana: '#6B5ECD',
  magic: '#A82FBB',
}

export const CONDITION_LABELS: Record<Condition, string> = {
  mint: 'Mint',
  near_mint: 'Near Mint',
  lightly_played: 'Lightly Played',
}

export const CONDITION_COLORS: Record<Condition, string> = {
  mint: '#22C55E',
  near_mint: '#3B82F6',
  lightly_played: '#EAB308',
}

export const RARITY_LABELS: Record<Rarity, string> = {
  comun: 'Común',
  poco_comun: 'Poco Común',
  rara: 'Rara',
  ultra_rara: 'Ultra Rara',
  secret_rare: 'Secret Rare',
  full_art: 'Full Art',
  gold_rare: 'Gold Rare',
  prismatic: 'Prismatic',
}

export const RARITY_COLORS: Record<Rarity, string> = {
  comun: '#6B7280',
  poco_comun: '#22C55E',
  rara: '#3B82F6',
  ultra_rara: '#A855F7',
  secret_rare: '#F59E0B',
  full_art: '#EC4899',
  gold_rare: '#EAB308',
  prismatic: '#6BB8EC',
}

export const LANGUAGE_LABELS: Record<Language, string> = {
  es: 'Español',
  en: 'Inglés',
  jp: 'Japonés',
}

export const VARIANT_LABELS: Record<Variant, string> = {
  holo: 'Holo',
  reverse_holo: 'Reverse Holo',
  standard: 'Estándar',
}

export const EDITION_LABELS: Record<Edition, string> = {
  primera: '1ª Edición',
  shadowless: 'Shadowless',
  ilimitada: 'Ilimitada',
}

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pendiente_pago: 'Pendiente de pago',
  pago_confirmado: 'Pago confirmado',
  en_preparacion: 'En preparación',
  enviado: 'Enviado',
  entregado: 'Entregado',
  cancelado: 'Cancelado',
}

export const ORDER_STATUS_COLORS: Record<OrderStatus, string> = {
  pendiente_pago: '#EAB308',
  pago_confirmado: '#22C55E',
  en_preparacion: '#3B82F6',
  enviado: '#6BB8EC',
  entregado: '#10B981',
  cancelado: '#EF4444',
}

export const CFDI_USES = [
  { value: 'G01', label: 'G01 — Adquisición de mercancias' },
  { value: 'G03', label: 'G03 — Gastos en general' },
  { value: 'D01', label: 'D01 — Honorarios médicos, dentales y gastos hospitalarios' },
  { value: 'D10', label: 'D10 — Pagos por servicios educativos (colegiaturas)' },
  { value: 'P01', label: 'P01 — Por definir' },
  { value: 'S01', label: 'S01 — Sin efectos fiscales' },
  { value: 'CP01', label: 'CP01 — Pagos' },
]
