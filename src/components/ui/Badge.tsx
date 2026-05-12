import { cn } from '@/lib/utils'
import {
  CONDITION_COLORS,
  CONDITION_LABELS,
  FRANCHISE_COLORS,
  FRANCHISE_LABELS,
  RARITY_COLORS,
  RARITY_LABELS,
  LANGUAGE_LABELS,
  VARIANT_LABELS,
  EDITION_LABELS,
} from '@/lib/utils'
import type { Condition, Franchise, Rarity, Language, Variant, Edition } from '@/types'

interface BadgeProps {
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
}

export function Badge({ children, className, style }: BadgeProps) {
  return (
    <span
      className={cn('badge-base', className)}
      style={style}
    >
      {children}
    </span>
  )
}

export function FranchiseBadge({ franchise }: { franchise: Franchise }) {
  return (
    <Badge
      className="text-white"
      style={{
        backgroundColor: FRANCHISE_COLORS[franchise] + '33',
        border: `1px solid ${FRANCHISE_COLORS[franchise]}66`,
        color: FRANCHISE_COLORS[franchise],
      }}
    >
      {FRANCHISE_LABELS[franchise]}
    </Badge>
  )
}

export function ConditionBadge({ condition }: { condition: Condition }) {
  return (
    <Badge
      style={{
        backgroundColor: CONDITION_COLORS[condition] + '22',
        border: `1px solid ${CONDITION_COLORS[condition]}55`,
        color: CONDITION_COLORS[condition],
      }}
    >
      {CONDITION_LABELS[condition]}
    </Badge>
  )
}

export function RarityBadge({ rarity }: { rarity: Rarity }) {
  return (
    <Badge
      style={{
        backgroundColor: RARITY_COLORS[rarity] + '22',
        border: `1px solid ${RARITY_COLORS[rarity]}55`,
        color: RARITY_COLORS[rarity],
      }}
    >
      {RARITY_LABELS[rarity]}
    </Badge>
  )
}

export function LanguageBadge({ language }: { language: Language }) {
  const flags: Record<Language, string> = { es: '🇲🇽', en: '🇺🇸', jp: '🇯🇵' }
  return (
    <Badge className="bg-deep border border-navy/60 text-ash">
      {flags[language]} {LANGUAGE_LABELS[language]}
    </Badge>
  )
}

export function VariantBadge({ variant }: { variant: Variant }) {
  const variantColors = {
    holo: '#FFD700',
    reverse_holo: '#C0A0FF',
    standard: '#8A90A8',
  }
  return (
    <Badge
      style={{
        backgroundColor: variantColors[variant] + '22',
        border: `1px solid ${variantColors[variant]}55`,
        color: variantColors[variant],
      }}
    >
      {VARIANT_LABELS[variant]}
    </Badge>
  )
}

export function EditionBadge({ edition }: { edition: Edition }) {
  if (edition === 'ilimitada' || edition === 'unlimited') return null
  const editionColors = {
    primera: '#E02222',
    shadowless: '#6BB8EC',
    ilimitada: null,
    first_edition: '#E02222',
    unlimited: null,
  }
  const color = editionColors[edition]
  if (!color) return null
  return (
    <Badge
      style={{
        backgroundColor: color + '22',
        border: `1px solid ${color}55`,
        color,
      }}
    >
      {EDITION_LABELS[edition]}
    </Badge>
  )
}

export function StockBadge({ stock }: { stock: number }) {
  if (stock === 0) {
    return (
      <Badge className="bg-red-900/30 border border-red-700/50 text-red-400">
        Agotado
      </Badge>
    )
  }
  if (stock === 1) {
    return (
      <Badge className="bg-yellow-900/30 border border-yellow-700/50 text-yellow-400">
        ¡Último!
      </Badge>
    )
  }
  return (
    <Badge className="bg-green-900/30 border border-green-700/50 text-green-400">
      {stock} en stock
    </Badge>
  )
}
