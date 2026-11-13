import { Router } from 'express';
import { OfferController } from './offer.controller.js';

const router = Router();

router.get('/', OfferController.listOffers);
router.get('/:id', OfferController.getOfferById);

export { router as offerRoutes };
