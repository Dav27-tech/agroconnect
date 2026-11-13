import { Router } from 'express';
import { CartController } from './cart.controller.js';

const router = Router();

router.post('/calculate', CartController.calculateCart);

export { router as cartRoutes };
