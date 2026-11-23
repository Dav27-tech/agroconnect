import { Router } from 'express';
import { SellerServicesController } from './seller-services.controller.js';
import { authenticate, requireRole } from '../../common/middleware/auth.middleware.js';

const router = Router();

router.get('/', SellerServicesController.listServices);
router.post('/', authenticate, requireRole(['SELLER']), SellerServicesController.createService);

export { router as sellerServicesRoutes };
