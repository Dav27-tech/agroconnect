import { Router } from 'express';
import { OrderController } from './order.controller.js';
import { authenticate, requireRole } from '../../common/middleware/auth.middleware.js';
import { validate } from '../../common/middleware/validate.middleware.js';
import { createOrderSchema } from './order.schema.js';

const router = Router();

router.get('/mine', authenticate, requireRole(['BUYER']), OrderController.getMyOrders);
router.post('/', authenticate, requireRole(['BUYER']), validate({ body: createOrderSchema }), OrderController.createOrder);
router.get('/seller/:sellerId', authenticate, requireRole(['SELLER', 'ADMIN']), OrderController.getSellerSubOrders);
router.patch('/suborder/:subOrderId/status', authenticate, requireRole(['SELLER', 'ADMIN']), OrderController.updateSubOrderStatus);
router.post('/suborder/:subOrderId/confirm-payout', authenticate, requireRole(['SELLER']), OrderController.confirmSellerPayout);
router.get('/:id', authenticate, OrderController.getOrderById);

export { router as orderRoutes };
