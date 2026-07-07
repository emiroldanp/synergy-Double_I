export const axiosMock = {
  post: jest.fn().mockResolvedValue({ data: { success: true } }),
  get: jest.fn().mockResolvedValue({ data: {} }),
  create: jest.fn().mockReturnThis(),
  // withRetry usa axios.isAxiosError para decidir si reintentar
  isAxiosError: jest.fn().mockReturnValue(false),
}

jest.mock('axios', () => axiosMock)
