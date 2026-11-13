import { Router } from 'express';
import { AdminController } from './admin.controller.js';
import { authenticate, requireRole, optionalAuth } from '../../common/middleware/auth.middleware.js';

const router = Router();

router.get('/exchange-rate', AdminController.getExchangeRate);
router.post('/exchange-rate', authenticate, requireRole(['ADMIN']), AdminController.updateExchangeRate);
router.get('/stats', optionalAuth, AdminController.getPlatformStats);
router.patch('/users/:userId/roles', authenticate, requireRole(['ADMIN']), AdminController.updateUserRoles);

export { router as adminRoutes };
