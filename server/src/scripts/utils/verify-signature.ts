import logger from '../../logger/winston.logger'
import crypto from 'crypto'
import { env } from '../../config/env'

const SECRET = env.SIGNING_SECRET
const key = 'secure/uploads/1774695251001-A standalone digital print of Kyoto in a refined vintage tra.jpg'
const opsString = 'original'

const basePath = `cdn/${key}/${opsString}`
const signableString = basePath // NO EXPIRY

const signature = crypto.createHmac('sha256', SECRET).update(signableString).digest('hex').substring(0, 16)

logger.info('Path:', signableString)
logger.info('Expected Signature:', signature)
logger.info('Log Signature:', '3ceeb1b6d183197e')

