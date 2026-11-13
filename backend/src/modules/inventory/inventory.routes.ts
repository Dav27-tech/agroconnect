import { Router } from 'express';
import { InventoryController } from './inventory.controller.js';
import { authenticate } from '../../common/middleware/auth.middleware.js';

const router = Router();

router.get('/offer/:offerId', InventoryController.getOfferInventory);
router.get('/seller/:sellerId', authenticate, InventoryController.getSellerInventory);
router.post('/check', InventoryController.checkAvailability);
router.post('/movement', authenticate, InventoryController.recordMovement);

// Route de repli pour compatibilité
router.get('/:offerId', InventoryController.getOfferInventory);

export { router as inventoryRoutes };
