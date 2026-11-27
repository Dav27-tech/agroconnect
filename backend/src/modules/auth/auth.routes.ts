import { Router } from 'express';
import { AuthController } from './auth.controller.js';
import { validate } from '../../common/middleware/validate.middleware.js';
import { authenticate } from '../../common/middleware/auth.middleware.js';
import { registerSchema, loginSchema, changePasswordSchema } from './auth.schema.js';

const router = Router();

router.post('/register', validate({ body: registerSchema }), AuthController.register);
router.post('/login', validate({ body: loginSchema }), AuthController.login);
router.get('/me', authenticate, AuthController.me);
router.post('/change-password', authenticate, validate({ body: changePasswordSchema }), AuthController.changePassword);

export { router as authRoutes };

