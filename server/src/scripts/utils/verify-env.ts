import logger from '../../logger/winston.logger'
import { env } from '../../config/env'

logger.info(
  'Loaded SIGNING_SECRET:',
  env.SIGNING_SECRET === 'placeholder-change-me-for-security' ? 'DEFAULT' : 'LOADED'
)
logger.info('Secret value (start):', env.SIGNING_SECRET.substring(0, 5))

