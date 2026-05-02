import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

// Crear el adaptador pg con la URL de conexión de las variables de entorno
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

async function main() {
  await prisma.category.createMany({
    data: [
      { name: 'Pokémon', slug: 'pokemon', description: 'Tarjetas coleccionables de la franquicia Pokémon' },
      { name: 'Yu-Gi-Oh!', slug: 'yu-gi-oh', description: 'Tarjetas coleccionables de la franquicia Yu-Gi-Oh!' },
      { name: 'Lorcana', slug: 'lorcana', description: 'Tarjetas coleccionables de la franquicia Disney Lorcana' },
    ],
    skipDuplicates: true,
  })
  console.log('Seed completado: 3 categorías creadas')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
