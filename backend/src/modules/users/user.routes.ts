import { Router } from 'express';
import { UserController } from './user.controller.js';
import { authenticate } from '../../common/middleware/auth.middleware.js';

const router = Router();

router.use(authenticate);
router.get('/profile', UserController.getProfile);
router.patch('/preferences', UserController.updatePreferences);

export { router as userRoutes };

