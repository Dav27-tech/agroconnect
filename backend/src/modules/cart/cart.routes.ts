import { Router } from 'express';
import { CartController } from './cart.controller.js';
import { optionalAuth } from '../../common/middleware/auth.middleware.js';

const router = Router();

router.post('/calculate', CartController.calculateCart);
router.get('/', optionalAuth, CartController.getCart);
router.post('/item', optionalAuth, CartController.addItem);

export { router as cartRoutes };
