import { Router } from 'express';
import { OfferController } from './offer.controller.js';
import { authenticate, requireSellerOwnership } from '../../common/middleware/auth.middleware.js';
import { AgroStore } from '../../database/store.js';

const router = Router();

router.get('/', OfferController.listOffers);
router.get('/:id', OfferController.getOfferById);
router.post('/', authenticate, OfferController.createOffer);
router.put(
  '/:id',
  authenticate,
  requireSellerOwnership((req) => {
    const offer = AgroStore.offers.get(req.params.id as string);
    return offer?.sellerId;
  }),
  OfferController.updateOffer
);

export { router as offerRoutes };
