import { Router } from 'express';
import { SellerServicesController } from './seller-services.controller.js';

const router = Router();

router.get('/', SellerServicesController.listServices);

export { router as sellerServicesRoutes };

