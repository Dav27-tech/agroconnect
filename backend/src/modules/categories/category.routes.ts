import { Router } from 'express';
import { CategoryController } from './category.controller.js';

const router = Router();

router.get('/', CategoryController.listCategories);
router.get('/:slug', CategoryController.getCategoryBySlug);

export { router as categoryRoutes };
