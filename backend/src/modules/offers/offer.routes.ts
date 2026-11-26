import { NextFunction, Request, Response, Router } from 'express';
import { mkdirSync } from 'node:fs';
import multer from 'multer';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { OfferController } from './offer.controller.js';
import { authenticate, requireRole, requireSellerOwnership } from '../../common/middleware/auth.middleware.js';
import { dbManager } from '../../database/client.js';
import { AppError } from '../../common/errors.js';
import { sendError, sendSuccess } from '../../common/response.js';

const router = Router();
const uploadDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../uploads');
mkdirSync(uploadDirectory, { recursive: true });
const imageExtensions: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};
const upload = multer({
  storage: multer.diskStorage({
    destination: uploadDirectory,
    filename: (_req, file, callback) => callback(null, `${randomUUID()}${imageExtensions[file.mimetype] || ''}`),
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    if (!imageExtensions[file.mimetype]) {
      callback(new AppError('Formats acceptés : JPEG, PNG et WebP.', 415, 'UNSUPPORTED_IMAGE_FORMAT'));
      return;
    }
    callback(null, true);
  },
});

function uploadOfferImage(req: Request, res: Response, next: NextFunction): void {
  upload.single('image')(req, res, (error) => {
    if (error instanceof multer.MulterError) {
      const status = error.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
      next(new AppError(error.message, status, error.code));
      return;
    }
    if (error) {
      next(error);
      return;
    }
    next();
  });
}

router.get('/', OfferController.listOffers);
router.get('/:id', OfferController.getOfferById);
router.post('/image', authenticate, requireRole(['SELLER']), uploadOfferImage, (req, res) => {
  if (!req.file) {
    return sendError(res, 'Sélectionnez une photo à téléverser.', 400, 'IMAGE_REQUIRED');
  }
  return sendSuccess(res, { imageUrl: `/uploads/${req.file.filename}` }, 'Photo téléversée avec succès', 201);
});
router.post('/', authenticate, requireRole(['SELLER']), OfferController.createOffer);
router.put(
  '/:id',
  authenticate,
  requireSellerOwnership(async (req) => {
    const result = await dbManager.query<{ sellerId: string }>(
      'SELECT "sellerId" FROM "offers" WHERE "id"::text = $1 LIMIT 1',
      [req.params.id]
    );
    return result.rows[0]?.sellerId;
  }),
  OfferController.updateOffer
);
router.delete(
  '/:id',
  authenticate,
  requireSellerOwnership(async (req) => {
    const result = await dbManager.query<{ sellerId: string }>(
      'SELECT "sellerId" FROM "offers" WHERE "id"::text = $1 LIMIT 1',
      [req.params.id]
    );
    return result.rows[0]?.sellerId;
  }),
  OfferController.deleteOffer
);

export { router as offerRoutes };
