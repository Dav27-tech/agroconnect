import { Router } from 'express';
import { FinanceController } from './finance.controller.js';
import { authenticate, requireRole, requireSellerOwnership } from '../../common/middleware/auth.middleware.js';

const router = Router();

router.get('/summary', authenticate, requireRole(['ADMIN']), FinanceController.getPlatformSummary);
router.get(
  '/seller/:sellerId',
  authenticate,
  requireSellerOwnership((req) => req.params.sellerId as string),
  FinanceController.getSellerFinancials
);

export { router as financeRoutes };
