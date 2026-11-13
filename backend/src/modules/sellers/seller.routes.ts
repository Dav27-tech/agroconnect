import { Router } from 'express';
import { SellerController } from './seller.controller.js';

const router = Router();

router.get('/', SellerController.listSellers);
router.get('/:id', SellerController.getSellerById);

export { router as sellerRoutes };
