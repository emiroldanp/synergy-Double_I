// Entry point para Hostinger Node.js Web App.
// Cambia el cwd al subdirectorio /server para que Prisma encuentre su schema
// y luego arranca el server Express compilado.
const path = require('path')
process.chdir(path.join(__dirname, 'server'))
require('./server/dist/index.js')
