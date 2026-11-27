import { Router } from 'express';
import { NotificationController } from './notification.controller.js';
import { authenticate, requireRole } from '../../common/middleware/auth.middleware.js';

const router = Router();

router.get('/', authenticate, NotificationController.listNotifications);
router.patch('/:id/read', authenticate, NotificationController.markAsRead);
router.post('/', authenticate, requireRole(['ADMIN']), NotificationController.createNotification);

export { router as notificationRoutes };
