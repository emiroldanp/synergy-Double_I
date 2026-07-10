import dotenv from 'dotenv'
import path from 'path'

// Silenciar antes de dotenv para evitar el banner de tips que imprime v17
const noop = () => {}
const _log = console.log
console.log = noop
dotenv.config({ path: path.resolve(__dirname, '../.env.test') })
console.log = _log

jest.spyOn(console, 'error').mockImplementation(noop)
jest.spyOn(console, 'log').mockImplementation(noop)
