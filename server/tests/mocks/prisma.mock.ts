export const prismaMock = {
  order: {
    findUnique: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    aggregate: jest.fn(),
    groupBy: jest.fn(),
    create: jest.fn(),
  },
  product: {
    findUnique: jest.fn(),
    updateMany: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  invoice: {
    findUnique: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
  },
  emailSubscriber: {
    findUnique: jest.fn(),
    create: jest.fn(),
    upsert: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    delete: jest.fn(),
  },
  shippingQuote: {
    create: jest.fn(),
  },
  pokemonCardCache: {
    findMany: jest.fn(),
    count: jest.fn(),
    upsert: jest.fn(),
  },
  systemConfig: {
    findUnique: jest.fn(),
    upsert: jest.fn(),
  },
  discountCode: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  promotion: {
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  category: {
    findMany: jest.fn(),
  },
  $transaction: jest.fn(),
}

jest.mock('../../lib/prisma', () => ({
  prisma: prismaMock,
}))
