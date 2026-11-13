import { Router } from 'express';
import { FinanceController } from './finance.controller.js';
import { authenticate, requireRole } from '../../common/middleware/auth.middleware.js';

const router = Router();

router.get('/commissions', FinanceController.getCommissionRates);
router.get('/summary', authenticate, requireRole(['ADMIN']), FinanceController.getPlatformSummary);
router.get('/seller/:sellerId', authenticate, FinanceController.getSellerFinancials);
router.post('/payout/:subOrderId', authenticate, requireRole(['ADMIN']), FinanceController.processPayout);

// Route compatibilité
router.get('/payouts', authenticate, FinanceController.getPlatformSummary);

export { router as financeRoutes };
