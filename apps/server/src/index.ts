import express from 'express'
import cors from 'cors'
import { env } from './envs'
import logger from './logger/winston.logger'
import morganMiddleware from './logger/morgan.logger'
import { errorHandler } from './middlewares/error.middlewares'
import router from './routes/index'
import { rateLimit } from 'express-rate-limit'

/**
 * Image Transformation Server (Express)
 * Acts as the primary API for image management and a transformation gateway.
 */
const app = express()
const port = env.PORT

// 0. Rate Limiting Protection (Protect against abuse and DDoS)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 100, // Limit each IP to 100 requests per `window`
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: 'Too many requests from this IP, please try again after 15 minutes.',
})

// 1. Enable CORS for local development and Dashboard communication
app.use(cors())
// 2. Standard JSON body parsing for image confirmation and metadata
app.use(express.json())
// 3. HTTP Request Logging
app.use(morganMiddleware)
// 4. Rate Limiting (Applied globally)
app.use(limiter)

// --- Routes ---
// Aggregated routes from /src/routes
app.use('/', router)

// 4. Error Handling Middleware
app.use(errorHandler)

// 5. Final API Initialization
app.listen(port, () => {
  logger.info(`SERVER LIVE at http://localhost:${port}`)
})
