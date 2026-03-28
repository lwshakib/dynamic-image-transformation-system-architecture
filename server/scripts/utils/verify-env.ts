import { env } from '../../src/config/env'

console.log(
  'Loaded SIGNING_SECRET:',
  env.SIGNING_SECRET === 'placeholder-change-me-for-security' ? 'DEFAULT' : 'LOADED'
)
console.log('Secret value (start):', env.SIGNING_SECRET.substring(0, 5))
