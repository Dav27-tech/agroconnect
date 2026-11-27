import express, { Express, Request, Response } from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env.js';
import { DRC_PROVINCES, SUPPORTED_CURRENCIES } from './config/drc.js';
import { dbManager } from './database/client.js';
import { errorHandler } from './common/middleware/error.middleware.js';
import { requestLogger } from './common/middleware/logger.middleware.js';
import { rateLimiter } from './common/middleware/rateLimiter.middleware.js';
import { sendSuccess, sendError } from './common/response.js';
import { openApiSpecification, getSwaggerHtml } from './docs/swagger.js';

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
import { deliveryRoutes } from './modules/deliveries/delivery.routes.js';
import { notificationRoutes } from './modules/notifications/notification.routes.js';
import { financeRoutes } from './modules/finance/finance.routes.js';
import { adminRoutes } from './modules/admin/admin.routes.js';

export function createApp(): Express {
  const app = express();
  const uploadsDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../uploads');
  const allowedOrigins = env.CORS_ORIGIN.split(',').map((origin) => origin.trim()).filter(Boolean);

  // 1. En-têtes HTTP sécurisés
  app.use(helmet());
  app.use(
    cors({
      origin: (origin, callback) => {
        callback(null, !origin || allowedOrigins.includes(origin));
      },
      credentials: false,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Correlation-ID', 'X-Session-ID', 'Idempotency-Key'],
    })
  );

  // 2. Débit et journaux
  app.use(rateLimiter());
  app.use(requestLogger);

  // 3. Analyseurs de corps de requête
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '100kb' }));
  app.use('/uploads', express.static(uploadsDirectory, { dotfiles: 'deny', index: false }));

  // 4. Point de terminaison de santé (Health check)
  app.get('/api/health', async (_req: Request, res: Response) => {
    const dbStatus = dbManager.getStatus();

    return sendSuccess(
      res,
      {
        status: 'UP',
        service: 'agroconnect-backend-api',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        country: 'République Démocratique du Congo (RDC)',
        provincesCount: DRC_PROVINCES.length,
        supportedCurrencies: SUPPORTED_CURRENCIES,
        database: dbStatus,
        criticalBusinessRule:
          'Intermédiaire strict : AgroConnect n\'achète, ne stocke, ne possède ni ne revend aucun produit agricole.',
      },
      'Système AgroConnect opérationnel'
    );
  });

  // 5. Documentation OpenAPI 3.0 & Swagger UI
  app.get('/api-docs', (_req: Request, res: Response) => {
    res.redirect('/api/v1/docs');
  });

  // 6. Montage des routes métiers sous /api/v1
  const v1 = express.Router();

  // Endpoints Documentation Swagger
  v1.get('/openapi.json', (_req: Request, res: Response) => {
    res.json(openApiSpecification);
  });
  v1.get('/docs', (_req: Request, res: Response) => {
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self' 'unsafe-inline' https://unpkg.com; style-src 'self' 'unsafe-inline' https://unpkg.com; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'"
    );
    res.setHeader('Content-Type', 'text/html');
    res.send(getSwaggerHtml());
  });

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
  v1.use('/deliveries', deliveryRoutes);
  v1.use('/notifications', notificationRoutes);
  v1.use('/finance', financeRoutes);
  v1.use('/admin', adminRoutes);

  app.use('/api/v1', v1);

  // 7. Gestion des routes non trouvées (404)
  app.use((req: Request, res: Response) => {
    sendError(res, `Route ${req.method} ${req.originalUrl} introuvable sur l'API AgroConnect`, 404, 'NOT_FOUND');
  });

  // 8. Gestionnaire d'erreurs global
  app.use(errorHandler);

  return app;
}
