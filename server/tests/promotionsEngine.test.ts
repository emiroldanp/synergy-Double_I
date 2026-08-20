import { evaluatePromotions, type PromotionRule, type CartLineForPromotion } from '../lib/promotionsEngine'

const NOW = new Date('2026-08-19T12:00:00Z')

function rule(overrides: Partial<PromotionRule> = {}): PromotionRule {
  return {
    id: 'promo_1',
    title: 'Promo de prueba',
    type: 'free_shipping',
    categoryId: null,
    value: null,
    minAmount: null,
    startsAt: null,
    endsAt: null,
    ...overrides,
  }
}

describe('evaluatePromotions', () => {
  it('devuelve null si no hay promociones', () => {
    expect(evaluatePromotions([], [], 1000, 150, NOW)).toBeNull()
  })

  it('free_shipping: no aplica si el subtotal no alcanza el mínimo', () => {
    const rules = [rule({ minAmount: 3500 })]
    const result = evaluatePromotions(rules, [], 3000, 150, NOW)
    expect(result).toBeNull()
  })

  it('free_shipping: aplica cuando el subtotal alcanza el mínimo', () => {
    const rules = [rule({ id: 'promo_envio', title: 'Envío gratis', minAmount: 3500 })]
    const result = evaluatePromotions(rules, [], 3600, 150, NOW)
    expect(result).toEqual({ promotionId: 'promo_envio', title: 'Envío gratis', discountAmount: 0, freeShipping: true })
  })

  it('free_shipping sin minAmount siempre aplica', () => {
    const rules = [rule({ minAmount: null })]
    const result = evaluatePromotions(rules, [], 10, 150, NOW)
    expect(result?.freeShipping).toBe(true)
  })

  it('percentage_off sobre todo el carrito', () => {
    const rules = [rule({ id: 'promo_10', title: '10% off', type: 'percentage_off', value: 10, minAmount: 1000 })]
    const result = evaluatePromotions(rules, [], 2000, 150, NOW)
    expect(result).toEqual({ promotionId: 'promo_10', title: '10% off', discountAmount: 200, freeShipping: false })
  })

  it('fixed_off no puede superar el subtotal base', () => {
    const rules = [rule({ type: 'fixed_off', value: 500 })]
    const result = evaluatePromotions(rules, [], 300, 0, NOW)
    expect(result?.discountAmount).toBe(300)
  })

  it('percentage_off por categoría solo cuenta las líneas de esa categoría', () => {
    const rules = [rule({ id: 'promo_lorcana', title: '15% Lorcana', type: 'percentage_off', value: 15, categoryId: 'cat_lorcana' })]
    const cartLines: CartLineForPromotion[] = [
      { categoryId: 'cat_lorcana', lineSubtotal: 1000 },
      { categoryId: 'cat_pokemon', lineSubtotal: 2000 },
    ]
    const result = evaluatePromotions(rules, cartLines, 3000, 150, NOW)
    expect(result?.discountAmount).toBe(150) // 15% de 1000, no de 3000
  })

  it('promo por categoría no aplica si el carrito no tiene productos de esa categoría', () => {
    const rules = [rule({ type: 'percentage_off', value: 15, categoryId: 'cat_lorcana' })]
    const cartLines: CartLineForPromotion[] = [{ categoryId: 'cat_pokemon', lineSubtotal: 2000 }]
    const result = evaluatePromotions(rules, cartLines, 2000, 150, NOW)
    expect(result).toBeNull()
  })

  it('cuando dos promociones califican, gana la de mayor beneficio en pesos', () => {
    const rules = [
      rule({ id: 'promo_envio', title: 'Envío gratis', type: 'free_shipping', minAmount: 1000 }),
      rule({ id: 'promo_20', title: '20% off', type: 'percentage_off', value: 20, minAmount: 1000 }),
    ]
    // envío gratis vale $150 de beneficio; 20% de $2000 vale $400 — gana el 20%
    const result = evaluatePromotions(rules, [], 2000, 150, NOW)
    expect(result?.promotionId).toBe('promo_20')
  })

  it('en empate exacto, gana la primera del arreglo (prioridad manual del admin)', () => {
    const rules = [
      rule({ id: 'promo_a', type: 'fixed_off', value: 100 }),
      rule({ id: 'promo_b', type: 'fixed_off', value: 100 }),
    ]
    const result = evaluatePromotions(rules, [], 500, 0, NOW)
    expect(result?.promotionId).toBe('promo_a')
  })

  it('excluye promociones que todavía no empiezan', () => {
    const rules = [rule({ type: 'fixed_off', value: 100, startsAt: new Date('2026-09-01T00:00:00Z') })]
    const result = evaluatePromotions(rules, [], 500, 0, NOW)
    expect(result).toBeNull()
  })

  it('excluye promociones que ya terminaron', () => {
    const rules = [rule({ type: 'fixed_off', value: 100, endsAt: new Date('2026-08-01T00:00:00Z') })]
    const result = evaluatePromotions(rules, [], 500, 0, NOW)
    expect(result).toBeNull()
  })

  it('incluye promociones dentro de su ventana de vigencia', () => {
    const rules = [rule({
      type: 'fixed_off',
      value: 100,
      startsAt: new Date('2026-08-01T00:00:00Z'),
      endsAt: new Date('2026-09-01T00:00:00Z'),
    })]
    const result = evaluatePromotions(rules, [], 500, 0, NOW)
    expect(result?.discountAmount).toBe(100)
  })
})
