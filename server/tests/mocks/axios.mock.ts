export const axiosMock = {
  post: jest.fn().mockResolvedValue({ data: { success: true } }),
  get: jest.fn().mockResolvedValue({ data: {} }),
  create: jest.fn().mockReturnThis(),
}

jest.mock('axios', () => axiosMock)
