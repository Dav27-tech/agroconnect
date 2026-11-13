import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env.js';
import { DRC_PROVINCES, SUPPORTED_CURRENCIES } from './config/drc.js';
import { dbManager } from './database/client.js';
import { exchangeRateService } from './integrations/exchangeRate/ConfigExchangeRateProvider.js';
import { errorHandler } from './common/middleware/error.middleware.js';
import { requestLogger } from './common/middleware/logger.middleware.js';
import { rateLimiter } from './common/middleware/rateLimiter.middleware.js';
import { sendSuccess, sendError } from './common/response.js';

// Import des routes des modules métiers
import { authRoutes } from './modules/auth/auth.routes.js';
import { userRoutes } from './modules/users/user.routes.js';
import { sellerRoutes } from './modules/sellers/seller.routes.js';
import { categoryRoutes } from './modules/categories/category.routes.js';
import { productRoutes } from './modules/products/product.routes.js';
import { offerRoutes } from './modules/offers/offer.routes.js';
import { inventoryRoutes } from './modules/inventory/inventory.routes.js';
import { sellerServicesRoutes } from './modules/seller-services/seller-services.routes.js';
import { cartRoutes } from './modules/cart/cart.routes.js';
import { orderRoutes } from './modules/orders/order.routes.js';
import { paymentRoutes } from './modules/payments/payment.routes.js';
import { deliveryRoutes } from './modules/deliveries/delivery.routes.js';
import { notificationRoutes } from './modules/notifications/notification.routes.js';
import { financeRoutes } from './modules/finance/finance.routes.js';
import { adminRoutes } from './modules/admin/admin.routes.js';

export function createApp(): Express {
  const app = express();

  // 1. Sécurité et en-têtes HTTP
  app.use(helmet());
  app.use(
    cors({
      origin: env.CORS_ORIGIN,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Correlation-ID'],
    })
  );

  // 2. Débit et journaux
  app.use(rateLimiter());
  app.use(requestLogger);

  // 3. Analyseurs de corps de requête
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // 4. Point de terminaison de santé (Health check)
  app.get('/api/health', async (_req: Request, res: Response) => {
    const rateSnapshot = await exchangeRateService.getCurrentRate('USD', 'CDF');
    const dbStatus = dbManager.getStatus();

    return sendSuccess(res, {
      status: 'UP',
      service: 'agroconnect-backend-api',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      country: 'République Démocratique du Congo (RDC)',
      provincesCount: DRC_PROVINCES.length,
      supportedCurrencies: SUPPORTED_CURRENCIES,
      exchangeRateSnapshot: {
        pair: 'USD/CDF',
        rate: rateSnapshot.rate,
        source: rateSnapshot.source,
      },
      database: dbStatus,
      criticalBusinessRule: 'Intermédiaire strict : AgroConnect n\'achète, ne stocke, ne possède ni ne revend aucun produit agricole.',
    }, 'Système AgroConnect opérationnel');
  });

  // 5. Montage des routes métiers sous /api/v1
  const v1 = express.Router();
  v1.use('/auth', authRoutes);
  v1.use('/users', userRoutes);
  v1.use('/sellers', sellerRoutes);
  v1.use('/categories', categoryRoutes);
  v1.use('/products', productRoutes);
  v1.use('/offers', offerRoutes);
  v1.use('/inventory', inventoryRoutes);
  v1.use('/seller-services', sellerServicesRoutes);
  v1.use('/cart', cartRoutes);
  v1.use('/orders', orderRoutes);
  v1.use('/payments', paymentRoutes);
  v1.use('/deliveries', deliveryRoutes);
  v1.use('/notifications', notificationRoutes);
  v1.use('/finance', financeRoutes);
  v1.use('/admin', adminRoutes);

  app.use('/api/v1', v1);

  // 6. Gestion des routes non trouvées (404)
  app.use((req: Request, res: Response) => {
    sendError(res, `Route ${req.method} ${req.originalUrl} introuvable sur l'API AgroConnect`, 404, 'NOT_FOUND');
  });

  // 7. Gestionnaire d'erreurs global
  app.use(errorHandler);

  return app;
}

