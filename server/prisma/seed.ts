import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

async function main() {
  // Categorías
  const [pokemon, yugioh, lorcana] = await Promise.all([
    prisma.category.upsert({
      where: { slug: 'pokemon' },
      update: {},
      create: { name: 'Pokémon', slug: 'pokemon', description: 'Tarjetas coleccionables de la franquicia Pokémon' },
    }),
    prisma.category.upsert({
      where: { slug: 'yu-gi-oh' },
      update: {},
      create: { name: 'Yu-Gi-Oh!', slug: 'yu-gi-oh', description: 'Tarjetas coleccionables de la franquicia Yu-Gi-Oh!' },
    }),
    prisma.category.upsert({
      where: { slug: 'lorcana' },
      update: {},
      create: { name: 'Lorcana', slug: 'lorcana', description: 'Tarjetas coleccionables de la franquicia Disney Lorcana' },
    }),
  ])
  console.log('✓ Categorías')

  // Productos
  const productos = [
    {
      categoryId: pokemon.id,
      name: 'Charizard Holo Base Set',
      slug: 'charizard-holo-base-set',
      cardNumber: '4/102',
      setName: 'Base Set',
      edition: 'unlimited' as const,
      language: 'en' as const,
      rarity: 'ultra_rara',
      condition: 'near_mint' as const,
      variant: 'holo' as const,
      price: 4500,
      stock: 3,
      isActive: true,
    },
    {
      categoryId: pokemon.id,
      name: 'Pikachu Promo',
      slug: 'pikachu-promo',
      cardNumber: '1',
      setName: 'Promo',
      edition: 'unlimited' as const,
      language: 'en' as const,
      rarity: 'rara',
      condition: 'mint' as const,
      variant: 'standard' as const,
      price: 850,
      stock: 10,
      isActive: true,
    },
    {
      categoryId: pokemon.id,
      name: 'Blastoise Base Set',
      slug: 'blastoise-base-set',
      cardNumber: '2/102',
      setName: 'Base Set',
      edition: 'unlimited' as const,
      language: 'en' as const,
      rarity: 'ultra_rara',
      condition: 'lightly_played' as const,
      variant: 'holo' as const,
      price: 2200,
      stock: 1,
      isActive: true,
    },
    {
      categoryId: yugioh.id,
      name: 'Blue-Eyes White Dragon LOB',
      slug: 'blue-eyes-white-dragon-lob',
      cardNumber: 'LOB-001',
      setName: 'Legend of Blue Eyes White Dragon',
      language: 'en' as const,
      rarity: 'ultra_rara',
      condition: 'near_mint' as const,
      variant: 'standard' as const,
      price: 1800,
      stock: 5,
      isActive: true,
    },
    {
      categoryId: yugioh.id,
      name: 'Dark Magician LOB',
      slug: 'dark-magician-lob',
      cardNumber: 'LOB-005',
      setName: 'Legend of Blue Eyes White Dragon',
      language: 'en' as const,
      rarity: 'rara',
      condition: 'near_mint' as const,
      variant: 'standard' as const,
      price: 650,
      stock: 8,
      isActive: true,
    },
    {
      categoryId: lorcana.id,
      name: 'Elsa — Spirit of Winter',
      slug: 'elsa-spirit-of-winter',
      setName: 'The First Chapter',
      language: 'en' as const,
      rarity: 'secret_rare',
      condition: 'mint' as const,
      variant: 'holo' as const,
      price: 3200,
      stock: 2,
      isActive: true,
    },
    {
      categoryId: lorcana.id,
      name: 'Mickey Mouse — True Friend',
      slug: 'mickey-mouse-true-friend',
      setName: 'The First Chapter',
      language: 'en' as const,
      rarity: 'comun',
      condition: 'mint' as const,
      variant: 'standard' as const,
      price: 120,
      stock: 25,
      isActive: true,
    },
    {
      categoryId: pokemon.id,
      name: 'Umbreon VMAX Alt Art',
      slug: 'umbreon-vmax-alt-art',
      setName: 'Evolving Skies',
      language: 'en' as const,
      rarity: 'full_art',
      condition: 'near_mint' as const,
      variant: 'holo' as const,
      price: 9800,
      stock: 1,
      isActive: true,
    },
  ]

  for (const p of productos) {
    await prisma.product.upsert({
      where: { slug: p.slug },
      update: {},
      create: p,
    })
  }
  console.log(`✓ ${productos.length} productos`)

  // Órdenes de prueba
  const productList = await prisma.product.findMany({ take: 3 })

  const ordenes = [
    {
      guestEmail: 'juan.perez@gmail.com',
      guestName: 'Juan Pérez',
      guestPhone: '5512345678',
      shippingAddress: { calle: 'Av. Insurgentes Sur 123', ciudad: 'CDMX', cp: '06600' },
      shippingMethod: 'Estafeta Express',
      shippingCost: 120,
      subtotal: 4500,
      total: 4620,
      paymentStatus: 'confirmed' as const,
      orderStatus: 'preparing' as const,
      paymentMethod: 'mercado_pago',
      paymentReference: 'MP-001-TEST',
    },
    {
      guestEmail: 'maria.lopez@hotmail.com',
      guestName: 'María López',
      guestPhone: '5598765432',
      shippingAddress: { calle: 'Calle Reforma 456', ciudad: 'Guadalajara', cp: '44100' },
      shippingMethod: 'DHL Express',
      shippingCost: 180,
      subtotal: 2200,
      total: 2380,
      paymentStatus: 'confirmed' as const,
      orderStatus: 'shipped' as const,
      paymentMethod: 'mercado_pago',
      paymentReference: 'MP-002-TEST',
      trackingNumber: 'DHL123456789',
    },
    {
      guestEmail: 'carlos.garcia@gmail.com',
      guestName: 'Carlos García',
      guestPhone: '5567891234',
      shippingAddress: { calle: 'Blvd. Kukulcan 789', ciudad: 'Cancún', cp: '77500' },
      shippingCost: 0,
      subtotal: 850,
      total: 850,
      paymentStatus: 'pending' as const,
      orderStatus: 'pending_payment' as const,
      paymentMethod: 'mercado_pago',
    },
    {
      guestEmail: 'ana.martinez@gmail.com',
      guestName: 'Ana Martínez',
      guestPhone: '5545678901',
      shippingAddress: { calle: 'Av. Constitución 321', ciudad: 'Monterrey', cp: '64000' },
      shippingMethod: 'Estafeta',
      shippingCost: 99,
      subtotal: 9800,
      total: 9899,
      paymentStatus: 'confirmed' as const,
      orderStatus: 'delivered' as const,
      paymentMethod: 'mercado_pago',
      paymentReference: 'MP-004-TEST',
    },
  ]

  for (const [i, o] of ordenes.entries()) {
    const product = productList[i % productList.length]
    await prisma.order.create({
      data: {
        ...o,
        items: {
          create: [{
            productId: product.id,
            quantity: 1,
            unitPrice: product.price,
            subtotal: product.price,
          }],
        },
      },
    })
  }
  console.log(`✓ ${ordenes.length} órdenes`)

  // Suscriptores
  const suscriptores = [
    { email: 'fan1@pokemon.com', fullName: 'Roberto Sánchez', source: 'homepage_form' as const },
    { email: 'collector@yugioh.mx', fullName: 'Sofía Torres', source: 'checkout' as const, isBuyer: true },
    { email: 'lorcana.fan@gmail.com', fullName: 'Diego Ramírez', source: 'homepage_form' as const },
    { email: 'tcg.mx.fan@hotmail.com', source: 'homepage_form' as const },
    { email: 'comprador@gmail.com', fullName: 'Valeria Cruz', source: 'checkout' as const, isBuyer: true },
  ]

  for (const s of suscriptores) {
    await prisma.emailSubscriber.upsert({
      where: { email: s.email },
      update: {},
      create: s,
    })
  }
  console.log(`✓ ${suscriptores.length} suscriptores`)

  console.log('\n✅ Seed completado')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
