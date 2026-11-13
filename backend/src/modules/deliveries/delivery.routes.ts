import { Router } from 'express';
import { DeliveryController } from './delivery.controller.js';
import { authenticate, optionalAuth } from '../../common/middleware/auth.middleware.js';

const router = Router();

router.get('/track/:code', DeliveryController.trackDelivery);
router.patch('/:id/status', optionalAuth, DeliveryController.updateStatus);
router.post('/:id/assign', authenticate, DeliveryController.assignPersonnel);

export { router as deliveryRoutes };
