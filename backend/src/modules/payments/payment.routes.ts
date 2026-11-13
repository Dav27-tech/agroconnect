import { Router } from 'express';
import { PaymentController } from './payment.controller.js';

const router = Router();

router.post('/checkout', PaymentController.initiateCheckout);
router.get('/verify/:transactionId', PaymentController.verifyTransaction);

export { router as paymentRoutes };
