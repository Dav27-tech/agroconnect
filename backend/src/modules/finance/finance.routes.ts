import { Router } from 'express';
import { FinanceController } from './finance.controller.js';

const router = Router();

router.get('/commissions', FinanceController.getCommissionRates);
router.get('/payouts', FinanceController.listSellerPayouts);

export { router as financeRoutes };

