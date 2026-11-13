import { Router } from 'express';
import { OrderController } from './order.controller.js';
import { authenticate, optionalAuth } from '../../common/middleware/auth.middleware.js';

const router = Router();

router.post('/', optionalAuth, OrderController.createOrder);
router.get('/seller/:sellerId', authenticate, OrderController.getSellerSubOrders);
router.patch('/suborder/:subOrderId/status', authenticate, OrderController.updateSubOrderStatus);
router.get('/:id', optionalAuth, OrderController.getOrderById);

export { router as orderRoutes };
