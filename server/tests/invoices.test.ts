import './mocks/prisma.mock'
import './mocks/axios.mock'
import './mocks/facturapi.mock'
import { prismaMock } from './mocks/prisma.mock'
import { facturapiInvoiceMock } from './mocks/facturapi.mock'
import { createInvoice } from '../controllers/invoicesController'

jest.mock('../lib/r2', () => ({
  uploadToR2: jest.fn().mockResolvedValue('https://test.r2.dev/invoices/order_1/factura.pdf'),
}))

const baseInvoice = {
  id: 'inv_1',
  rfc: 'XAXX010101000',
  razonSocial: 'PÚBLICO EN GENERAL',
  cfdiUse: 'G03',
  status: 'draft',
}

const baseOrder = {
  id: 'order_1',
  guestEmail: 'comprador@example.com',
  paymentMethod: 'credit_card',
  items: [
    {
      productId: 'prod_1',
      quantity: 1,
      unitPrice: 1500,
      product: { name: 'Charizard Base Set' },
    },
  ],
  invoice: baseInvoice,
  customer: null,
}

describe('createInvoice', () => {
  beforeEach(() => {
    prismaMock.order.findUnique.mockResolvedValue(baseOrder as any)
    prismaMock.invoice.update.mockResolvedValue({ status: 'valid' } as any)
  })

  it('emite CFDI y actualiza invoice a valid cuando Facturapi responde', async () => {
    await createInvoice('order_1')
    expect(facturapiInvoiceMock.create).toHaveBeenCalledTimes(1)
    expect(prismaMock.invoice.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'valid',
          facturapiInvoiceId: 'facturapi_invoice_id_123',
        }),
      })
    )
  })

  it('deja invoice en draft y no lanza excepción cuando Facturapi falla', async () => {
    facturapiInvoiceMock.create.mockRejectedValue(new Error('Facturapi error simulado'))
    await expect(createInvoice('order_1')).resolves.toBeUndefined()
    expect(prismaMock.invoice.update).not.toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'valid' }) })
    )
  })

  it('retorna sin error si la orden no existe', async () => {
    prismaMock.order.findUnique.mockResolvedValue(null)
    await expect(createInvoice('orden_inexistente')).resolves.toBeUndefined()
  })
})
