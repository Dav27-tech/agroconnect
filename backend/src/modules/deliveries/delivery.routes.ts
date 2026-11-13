import { Router } from 'express';
import { DeliveryController } from './delivery.controller.js';

const router = Router();

router.get('/track/:code', DeliveryController.trackByCode);
router.patch('/:id/status', DeliveryController.updateStatus);

export { router as deliveryRoutes };
