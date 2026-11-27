import { Router } from 'express';
import { AdminController } from './admin.controller.js';
import { authenticate, requireRole } from '../../common/middleware/auth.middleware.js';

const router = Router();

router.get('/commission-settings', authenticate, requireRole(['ADMIN']), AdminController.getCommissionSettings);
router.patch('/commission-settings', authenticate, requireRole(['ADMIN']), AdminController.updateCommissionSettings);
router.get('/couriers', authenticate, requireRole(['ADMIN']), AdminController.listCouriers);
router.post('/couriers', authenticate, requireRole(['ADMIN']), AdminController.createCourier);
router.patch('/couriers/:courierId/availability', authenticate, requireRole(['ADMIN']), AdminController.updateCourierAvailability);
router.get('/stats', authenticate, requireRole(['ADMIN']), AdminController.getPlatformStats);
router.get('/seller-profiles', authenticate, requireRole(['ADMIN']), AdminController.listSellerProfiles);
router.patch('/seller-profiles/:sellerId/verification', authenticate, requireRole(['ADMIN']), AdminController.updateSellerVerification);
router.patch('/seller-profiles/:sellerId/status', authenticate, requireRole(['ADMIN']), AdminController.updateSellerActiveStatus);
router.get('/admins', authenticate, requireRole(['SUPER_ADMIN']), AdminController.listAdmins);
router.post('/admins', authenticate, requireRole(['SUPER_ADMIN']), AdminController.createManagedAdmin);
router.patch('/admins/:userId/status', authenticate, requireRole(['SUPER_ADMIN']), AdminController.updateManagedAdminStatus);
router.patch('/users/:userId/roles', authenticate, requireRole(['SUPER_ADMIN']), AdminController.updateUserRoles);

export { router as adminRoutes };
