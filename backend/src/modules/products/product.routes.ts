import { Router } from 'express';
import { ProductController } from './product.controller.js';

const router = Router();

router.get('/', ProductController.listProducts);
router.get('/:slug', ProductController.getProductBySlug);

export { router as productRoutes };

