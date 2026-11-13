import { Router } from 'express';
import { ProductController } from './product.controller.js';

const router = Router();

router.get('/', ProductController.listProducts);
router.get('/:id', ProductController.getProductById);

export { router as productRoutes };
