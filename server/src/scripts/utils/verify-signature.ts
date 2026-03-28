import crypto from 'crypto'
import { env } from '../../config/env'

const SECRET = env.SIGNING_SECRET
const key = 'secure/uploads/1774695251001-A standalone digital print of Kyoto in a refined vintage tra.jpg'
const opsString = 'original'

const basePath = `cdn/${key}/${opsString}`
const signableString = basePath // NO EXPIRY

const signature = crypto.createHmac('sha256', SECRET).update(signableString).digest('hex').substring(0, 16)

console.log('Path:', signableString)
console.log('Expected Signature:', signature)
console.log('Log Signature:', '3ceeb1b6d183197e')

