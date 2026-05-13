import { Router } from 'express'
import imagesRouter from './images.routes'

const router = Router()

/**
 * Root Router
 * Aggregates all specific domain routers.
 */

// We use the root for these routes as per the original index.ts setup
router.use('/', imagesRouter)

export default router
