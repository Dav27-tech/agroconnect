import { Router } from 'express';
import { DeliveryController } from './delivery.controller.js';
import { authenticate, requireRole } from '../../common/middleware/auth.middleware.js';

const router = Router();

router.get('/mine', authenticate, requireRole(['DELIVERY_PERSON']), DeliveryController.listMine);
router.get('/operations', authenticate, requireRole(['ADMIN']), DeliveryController.listOperations);
router.post('/:id/assign', authenticate, requireRole(['ADMIN']), DeliveryController.assignPersonnel);
router.patch('/:id/status', authenticate, requireRole(['DELIVERY_PERSON']), DeliveryController.updateStatus);
router.post('/:id/collection', authenticate, requireRole(['DELIVERY_PERSON']), DeliveryController.recordCollection);
router.post('/:id/platform-deposit', authenticate, requireRole(['ADMIN']), DeliveryController.confirmPlatformDeposit);

export { router as deliveryRoutes };
