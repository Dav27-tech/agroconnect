import { Router } from 'express';
import { OrderController } from './order.controller.js';

const router = Router();

router.post('/', OrderController.createOrder);
router.get('/:id', OrderController.getOrderById);

export { router as orderRoutes };

