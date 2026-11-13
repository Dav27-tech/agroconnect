import { Router } from 'express';
import { NotificationController } from './notification.controller.js';

const router = Router();

router.get('/', NotificationController.listNotifications);

export { router as notificationRoutes };
