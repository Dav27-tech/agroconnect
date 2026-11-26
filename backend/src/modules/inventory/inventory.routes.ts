import { Router } from 'express';
import { InventoryController } from './inventory.controller.js';
import { authenticate, requireRole } from '../../common/middleware/auth.middleware.js';

const router = Router();

router.get('/offer/:offerId', authenticate, requireRole(['SELLER', 'ADMIN']), InventoryController.getOfferInventory);
router.get('/seller/:sellerId', authenticate, requireRole(['SELLER', 'ADMIN']), InventoryController.getSellerInventory);
router.post('/check', InventoryController.checkAvailability);
router.post('/movement', authenticate, requireRole(['SELLER', 'ADMIN']), InventoryController.recordMovement);

// Route de repli pour compatibilité
router.get('/:offerId', authenticate, requireRole(['SELLER', 'ADMIN']), InventoryController.getOfferInventory);

export { router as inventoryRoutes };
