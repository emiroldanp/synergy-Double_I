export type PromotionRuleType = 'free_shipping' | 'percentage_off' | 'fixed_off'

export interface PromotionRule {
  id: string
  title: string
  type: PromotionRuleType
  categoryId: string | null
  value: number | null
  minAmount: number | null
  startsAt: Date | null
  endsAt: Date | null
}

export interface CartLineForPromotion {
  categoryId: string
  lineSubtotal: number
}

export interface PromotionEffect {
  promotionId: string
  title: string
  discountAmount: number
  freeShipping: boolean
}

function calcDiscountAmount(type: 'percentage_off' | 'fixed_off', value: number, base: number): number {
  if (type === 'percentage_off') return Math.min(base, (base * value) / 100)
  return Math.min(base, value)
}

/** Ventana de vigencia inclusiva en ambos extremos: `now === startsAt` y `now === endsAt` califican. */
function isWithinDateWindow(rule: PromotionRule, now: Date): boolean {
  if (rule.startsAt && rule.startsAt > now) return false
  if (rule.endsAt && rule.endsAt < now) return false
  return true
}

/**
 * Evalúa promociones activas contra el carrito y devuelve la de mayor beneficio
 * en pesos, o null si ninguna califica. `rules` debe venir ordenado por
 * sortOrder ascendente — en empate exacto gana la primera del arreglo
 * (prioridad manual del admin). Nunca combina dos promociones entre sí.
 */
export function evaluatePromotions(
  rules: PromotionRule[],
  cartLines: CartLineForPromotion[],
  cartSubtotal: number,
  shippingCost: number,
  now: Date = new Date()
): PromotionEffect | null {
  let best: PromotionEffect | null = null
  let bestBenefit = 0

  for (const rule of rules) {
    if (!isWithinDateWindow(rule, now)) continue

    let benefit = 0
    let discountAmount = 0
    const freeShipping = rule.type === 'free_shipping'

    if (rule.type === 'free_shipping') {
      const eligible = rule.minAmount == null || cartSubtotal >= rule.minAmount
      benefit = eligible ? shippingCost : 0
    } else {
      const base = rule.categoryId
        ? cartLines.filter((l) => l.categoryId === rule.categoryId).reduce((sum, l) => sum + l.lineSubtotal, 0)
        : cartSubtotal
      const eligible = base > 0 && (rule.minAmount == null || base >= rule.minAmount)
      if (eligible && rule.value != null) {
        discountAmount = calcDiscountAmount(rule.type, rule.value, base)
        benefit = discountAmount
      }
    }

    if (benefit > bestBenefit) {
      bestBenefit = benefit
      best = { promotionId: rule.id, title: rule.title, discountAmount, freeShipping }
    }
  }

  return best
}
