import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(__dirname, '../.env.test') })

jest.spyOn(console, 'error').mockImplementation(() => {})
jest.spyOn(console, 'log').mockImplementation(() => {})
