export const facturapiInvoiceMock = {
  create: jest.fn().mockResolvedValue({
    id: 'facturapi_invoice_id_123',
    status: 'valid',
  }),
  downloadPdf: jest.fn().mockResolvedValue(Buffer.from('fake-pdf')),
  downloadXml: jest.fn().mockResolvedValue(Buffer.from('fake-xml')),
}

export const facturapiMock = {
  invoices: facturapiInvoiceMock,
}

jest.mock('facturapi', () => {
  return jest.fn().mockImplementation(() => facturapiMock)
})
