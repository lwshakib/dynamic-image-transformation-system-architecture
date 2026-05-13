import { Router } from 'express'
import { imagesController } from '../controllers/images.controller'

const router = Router()

/**
 * Image Transformation Routes
 */

// 1. Dynamic CDN Transformation Proxy
router.get('/cdn/:key(*)', imagesController.cdnProxy)

// 2. Dashboard Gallery & Management
router.get('/images', imagesController.getAllImages)
router.post('/images/presigned-url', imagesController.getPresignedUrl)
router.get('/images/:id/sign', imagesController.signImage)
router.post('/images/confirm', imagesController.confirmImage)
router.delete('/images/:id', imagesController.deleteImage)

export default router
