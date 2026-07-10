export const mpPaymentGetMock = jest.fn()
export const mpPreferenceCreateMock = jest.fn()

const MockMercadoPagoConfig = jest.fn().mockImplementation(() => ({}))

jest.mock('mercadopago', () => ({
  __esModule: true,
  default: MockMercadoPagoConfig,
  MercadoPagoConfig: MockMercadoPagoConfig,
  Payment: jest.fn().mockImplementation(() => ({
    get: mpPaymentGetMock,
  })),
  Preference: jest.fn().mockImplementation(() => ({
    create: mpPreferenceCreateMock,
  })),
}))
