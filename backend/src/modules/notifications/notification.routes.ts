import { Router } from 'express';
import { NotificationController } from './notification.controller.js';
import { optionalAuth, authenticate } from '../../common/middleware/auth.middleware.js';

const router = Router();

router.get('/', optionalAuth, NotificationController.listNotifications);
router.patch('/:id/read', optionalAuth, NotificationController.markAsRead);
router.post('/', authenticate, NotificationController.createNotification);

export { router as notificationRoutes };
