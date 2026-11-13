import { Router } from 'express';
import { AdminController } from './admin.controller.js';

const router = Router();

router.get('/exchange-rate', AdminController.getExchangeRate);
router.post('/exchange-rate', AdminController.updateExchangeRate);
router.get('/stats', AdminController.getPlatformStats);

export { router as adminRoutes };
