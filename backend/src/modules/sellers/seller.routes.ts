import { Router } from 'express';
import { SellerController } from './seller.controller.js';
import { authenticate, requireSellerOwnership } from '../../common/middleware/auth.middleware.js';

const router = Router();

router.get('/', SellerController.listSellers);
router.get('/:id', SellerController.getSellerById);
router.post('/', authenticate, SellerController.createSellerProfile);
router.put('/:id', authenticate, requireSellerOwnership((req) => req.params.id as string), SellerController.updateSellerProfile);

export { router as sellerRoutes };
