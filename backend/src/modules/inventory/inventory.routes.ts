import { Router } from 'express';
import { InventoryController } from './inventory.controller.js';

const router = Router();

router.get('/:offerId', InventoryController.getOfferInventory);
router.post('/check', InventoryController.checkAvailability);

export { router as inventoryRoutes };

