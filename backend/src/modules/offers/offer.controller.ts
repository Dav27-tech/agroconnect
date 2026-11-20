import { Request, Response } from 'express';
import { sendSuccess, sendError } from '../../common/response.js';
import { dbManager } from '../../database/client.js';
import { publishInventoryUpdated } from '../../common/realtime.js';
import { AgroStore } from '../../database/store.js';
import { isValidDRCProvince } from '../../config/drc.js';
import crypto from 'node:crypto';

export class OfferController {
  public static async listOffers(req: Request, res: Response): Promise<Response> {
    const { category, province, sellerId, productId, search, featured } = req.query;

    const values: string[] = [];
    const filters = ['o."isAvailable" = true'];
    for (const [field, value, expression] of [
      ['category', category, 'c."name" ILIKE'],
      ['province', province, 'o."originProvince" ILIKE'],
      ['sellerId', sellerId, 'o."sellerId"::text ='],
      ['productId', productId, 'o."productId"::text ='],
    ] as const) {
      if (typeof value === 'string') {
        values.push(field === 'category' || field === 'province' ? `%${value}%` : value);
        filters.push(`${expression} $${values.length}`);
      }
    }
    if (typeof search === 'string') {
      values.push(`%${search}%`);
      const position = values.length;
      filters.push(`(p."name" ILIKE $${position} OR s."businessName" ILIKE $${position} OR o."originProvince" ILIKE $${position})`);
    }
    if (featured === 'true') {
      filters.push('o."isFeatured" = true AND (o."featuredUntil" IS NULL OR o."featuredUntil" > NOW())');
    }

    const result = await dbManager.query(
      `SELECT o."id", o."sellerId", s."businessName" AS "sellerName", s."sellerType",
              o."productId", p."name" AS "productName", c."name" AS "categoryName",
              o."unit", o."stockQuantity", o."isAvailable",
              (o."isFeatured" AND (o."featuredUntil" IS NULL OR o."featuredUntil" > NOW())) AS "isFeatured",
              o."retailPriceCdf",
              o."retailMinQuantity", o."wholesalePriceCdf", o."wholesaleMinQuantity",
              (SELECT ARRAY_REMOVE(ARRAY_AGG(ss."title"), NULL)
               FROM "offer_services" os JOIN "seller_services" ss ON ss."id" = os."serviceId" AND ss."isActive"
               WHERE os."offerId" = o."id") AS "servicesOffered",
              o."qualityGrade", o."originProvince", o."originCity", o."imageUrl"
       FROM "offers" o
       JOIN "seller_profiles" s ON s."id" = o."sellerId"
       JOIN "users" u ON u."id" = s."userId" AND u."isActive" = true
       JOIN "products" p ON p."id" = o."productId"
       JOIN "categories" c ON c."id" = p."categoryId"
       WHERE ${filters.join(' AND ')}
       ORDER BY o."createdAt" DESC`,
      values
    );
    return sendSuccess(res, result.rows.map(mapOffer), 'Offres agricoles récupérées avec succès', 200, {
      total: result.rows.length,
    });
  }

  public static async getOfferById(req: Request, res: Response): Promise<Response> {
    const rawId = req.params.id;
    const id = (Array.isArray(rawId) ? rawId[0] : rawId) || '';
    const result = await dbManager.query(
      `SELECT o."id", o."sellerId", s."businessName" AS "sellerName", s."sellerType",
              o."productId", p."name" AS "productName", c."name" AS "categoryName",
              o."unit", o."stockQuantity", o."isAvailable",
              (o."isFeatured" AND (o."featuredUntil" IS NULL OR o."featuredUntil" > NOW())) AS "isFeatured",
              o."retailPriceCdf",
              o."retailMinQuantity", o."wholesalePriceCdf", o."wholesaleMinQuantity",
              (SELECT ARRAY_REMOVE(ARRAY_AGG(ss."title"), NULL)
               FROM "offer_services" os JOIN "seller_services" ss ON ss."id" = os."serviceId" AND ss."isActive"
               WHERE os."offerId" = o."id") AS "servicesOffered",
              o."qualityGrade", o."originProvince", o."originCity", o."imageUrl",
              s."province" AS "sellerProvince", s."city" AS "sellerCity", s."verificationStatus"
       FROM "offers" o
       JOIN "seller_profiles" s ON s."id" = o."sellerId"
       JOIN "users" u ON u."id" = s."userId" AND u."isActive" = true
       JOIN "products" p ON p."id" = o."productId"
       JOIN "categories" c ON c."id" = p."categoryId"
       WHERE o."id"::text = $1 AND o."isAvailable" = true LIMIT 1`,
      [id]
    );
    const offer = result.rows[0];

    if (!offer) {
      return sendError(res, `Offre agricole '${id}' introuvable`, 404, 'OFFER_NOT_FOUND');
    }

    return sendSuccess(res, {
      ...mapOffer(offer),
      seller: {
        id: offer.sellerId,
        sellerType: offer.sellerType,
        businessName: offer.sellerName,
        province: offer.sellerProvince,
        city: offer.sellerCity,
        verificationStatus: offer.verificationStatus,
      },
      product: { id: offer.productId, name: offer.productName, categoryName: offer.categoryName },
    });
  }

  public static async createOffer(req: Request, res: Response): Promise<Response> {
    const {
      productId,
      productName,
      categoryName,
      stockQuantity,
      unit,
      retailPriceCdf,
      retailMinQuantity = 1,
      wholesalePriceCdf,
      wholesaleMinQuantity,
      originProvince,
      originCity,
      qualityGrade,
      imageUrl,
      isFeatured = false,
      servicesOffered = [],
    } = req.body;

    if (!req.user) {
      return sendError(res, 'Non authentifié', 401, 'UNAUTHORIZED');
    }
    if (typeof isFeatured !== 'boolean') {
      return sendError(res, 'La valeur de mise en avant est invalide.', 400, 'INVALID_FEATURED_VALUE');
    }

    const sellerResult = await dbManager.query(
      'SELECT "id", "sellerType", "businessName", "verificationStatus" FROM "seller_profiles" WHERE "userId" = $1 LIMIT 1',
      [req.user.userId]
    );
    const seller = sellerResult.rows[0];
    if (!seller) {
      return sendError(res, 'Aucun profil vendeur associé à cet utilisateur', 403, 'SELLER_PROFILE_REQUIRED');
    }
    if (seller.verificationStatus !== 'VERIFIED') {
      return sendError(res, 'Le profil vendeur doit être vérifié avant de publier une offre', 403, 'SELLER_NOT_VERIFIED');
    }
    let product: { id: string; name: string; standardUnit: string; categoryId: string; categoryName: string } | undefined;
    if (productId) {
      const productResult = await dbManager.query<{ id: string; name: string; standardUnit: string; categoryId: string; categoryName: string }>(
        'SELECT p."id", p."name", p."standardUnit", p."categoryId", c."name" AS "categoryName" FROM "products" p JOIN "categories" c ON c."id" = p."categoryId" WHERE p."id"::text = $1 LIMIT 1',
        [productId]
      );
      product = productResult.rows[0];
    } else if (typeof productName === 'string' && productName.trim() && typeof categoryName === 'string' && categoryName.trim()) {
      product = await dbManager.transaction(async (client) => {
        const categoryLookup = await client.query<{ id: string }>(
          'SELECT "id" FROM "categories" WHERE LOWER("name") = LOWER($1) LIMIT 1',
          [categoryName.trim()]
        );
        let categoryId = categoryLookup.rows[0]?.id;
        if (!categoryId) {
          const categorySlug = `${slugify(categoryName)}-${crypto.randomUUID().slice(0, 8)}`;
          const createdCategory = await client.query<{ id: string }>(
            'INSERT INTO "categories" ("name", "slug") VALUES ($1, $2) RETURNING "id"',
            [categoryName.trim(), categorySlug]
          );
          categoryId = createdCategory.rows[0].id;
        }

        const productLookup = await client.query<{ id: string; name: string; standardUnit: string; categoryId: string; categoryName: string }>(
          `SELECT p."id", p."name", p."standardUnit", p."categoryId", c."name" AS "categoryName"
           FROM "products" p JOIN "categories" c ON c."id" = p."categoryId"
           WHERE LOWER(p."name") = LOWER($1) AND p."categoryId" = $2 LIMIT 1`,
          [productName.trim(), categoryId]
        );
        if (productLookup.rows[0]) return productLookup.rows[0];

        const productSlug = `${slugify(productName)}-${crypto.randomUUID().slice(0, 8)}`;
        const createdProduct = await client.query<{ id: string; name: string; standardUnit: string; categoryId: string; categoryName: string }>(
          `INSERT INTO "products" ("name", "slug", "categoryId") VALUES ($1, $2, $3)
           RETURNING "id", "name", "standardUnit", "categoryId"`,
          [productName.trim(), productSlug, categoryId]
        );
        return { ...createdProduct.rows[0], categoryName: categoryName.trim() };
      });
    }
    if (!product) {
      return sendError(res, 'Sélectionnez un produit existant ou fournissez son nom et sa catégorie.', 400, 'PRODUCT_REQUIRED');
    }

    if (!originProvince || !isValidDRCProvince(originProvince)) {
      return sendError(res, `Province d'origine '${originProvince}' invalide en RDC`, 422, 'INVALID_DRC_PROVINCE');
    }

    if (stockQuantity === undefined || stockQuantity < 0) {
      return sendError(res, 'La quantité en stock doit être un nombre positif', 400, 'INVALID_STOCK');
    }

    if (typeof imageUrl !== 'string') {
      return sendError(res, 'Téléversez une photo depuis votre appareil avant de publier l’offre.', 400, 'IMAGE_REQUIRED');
    }
    try {
      const parsedImageUrl = new URL(imageUrl);
      if (!/^\/uploads\/[0-9a-f-]+\.(jpg|png|webp)$/i.test(parsedImageUrl.pathname)) {
        return sendError(res, 'La photo doit provenir du téléversement local AgroConnect.', 400, 'INVALID_IMAGE_URL');
      }
    } catch {
      return sendError(res, 'La photo téléversée est invalide.', 400, 'INVALID_IMAGE_URL');
    }

    const created = await dbManager.query(
      `INSERT INTO "offers" ("sellerId", "productId", "stockQuantity", "unit", "isAvailable", "isFeatured", "retailPriceCdf", "retailPriceUsd", "retailMinQuantity", "wholesalePriceCdf", "wholesalePriceUsd", "wholesaleMinQuantity", "originProvince", "originCity", "qualityGrade", "imageUrl")
       VALUES ($1, $2, $3, COALESCE($4::"UnitOfMeasure", $5::"UnitOfMeasure"), $6, $7, $8, 0, $9, $10, NULL, $11, $12, $13, $14, $15)
       RETURNING "id"`,
      [seller.id, product.id, stockQuantity, unit ?? null, product.standardUnit, Number(stockQuantity) > 0, isFeatured, retailPriceCdf, retailMinQuantity, wholesalePriceCdf ?? null, wholesaleMinQuantity ?? null, originProvince, originCity ?? null, qualityGrade ?? null, imageUrl]
    );
    const offerId = created.rows[0].id;
    await dbManager.query(
      `INSERT INTO "stock_movements" ("offerId", "sellerId", "movementType", "quantityChange", "previousStock", "newStock", "referenceType", "referenceId", "createdByUserId")
       VALUES ($1, $2, 'INITIAL_STOCK', $3, 0, $3, 'OFFER_CREATION', $5, $4)`,
      [offerId, seller.id, stockQuantity, req.user.userId, offerId]
    );
    if (Array.isArray(servicesOffered) && servicesOffered.length) {
      await dbManager.query(
        `INSERT INTO "offer_services" ("offerId", "serviceId")
         SELECT $1, "id" FROM "seller_services" WHERE "sellerId" = $2 AND "title" = ANY($3::text[])
         ON CONFLICT DO NOTHING`,
        [offerId, seller.id, servicesOffered]
      );
    }

    publishInventoryUpdated([{
      offerId,
      stockQuantity: Number(stockQuantity),
      isAvailable: Number(stockQuantity) > 0,
    }]);

    return sendSuccess(res, { id: offerId }, 'Offre agricole créée avec succès', 201);
  }

  public static async updateOffer(req: Request, res: Response): Promise<Response> {
    const rawId = req.params.id;
    const id = (Array.isArray(rawId) ? rawId[0] : rawId) || '';
    const {
      retailPriceCdf,
      retailMinQuantity,
      wholesalePriceCdf,
      wholesaleMinQuantity,
      isAvailable,
      isFeatured,
      qualityGrade,
    } = req.body;
    if (isFeatured !== undefined && isFeatured !== null && typeof isFeatured !== 'boolean') {
      return sendError(res, 'La valeur de mise en avant est invalide.', 400, 'INVALID_FEATURED_VALUE');
    }

    const existing = await dbManager.query('SELECT "id" FROM "offers" WHERE "id" = $1 LIMIT 1', [id]);
    if (!existing.rowCount) {
      return sendError(res, `Offre '${id}' introuvable`, 404, 'OFFER_NOT_FOUND');
    }

    const updated = await dbManager.query(
      `UPDATE "offers" SET
         "retailPriceCdf" = COALESCE($2, "retailPriceCdf"),
         "retailMinQuantity" = COALESCE($3, "retailMinQuantity"),
         "wholesalePriceCdf" = COALESCE($4, "wholesalePriceCdf"),
         "wholesaleMinQuantity" = COALESCE($5, "wholesaleMinQuantity"),
         "isAvailable" = COALESCE($6, "isAvailable"),
         "qualityGrade" = COALESCE($7, "qualityGrade"),
         "isFeatured" = COALESCE($8, "isFeatured"),
         "featuredUntil" = CASE WHEN $8 IS NOT NULL THEN NULL ELSE "featuredUntil" END,
         "updatedAt" = NOW()
       WHERE "id" = $1
       RETURNING "id", "sellerId", "productId", "stockQuantity", "unit", "isAvailable", "isFeatured",
                 "retailPriceCdf", "retailMinQuantity", "wholesalePriceCdf", "wholesaleMinQuantity",
                 "qualityGrade", "imageUrl"`,
      [id, retailPriceCdf ?? null, retailMinQuantity ?? null, wholesalePriceCdf ?? null, wholesaleMinQuantity ?? null, isAvailable ?? null, qualityGrade ?? null, isFeatured ?? null]
    );
    if (!updated.rows[0]) {
      return sendError(res, `Offre '${id}' introuvable`, 404, 'OFFER_NOT_FOUND');
    }

    publishInventoryUpdated([{
      offerId: updated.rows[0].id,
      stockQuantity: Number(updated.rows[0].stockQuantity),
      isAvailable: Boolean(updated.rows[0].isAvailable),
    }]);

    return sendSuccess(res, updated.rows[0], 'Offre mise à jour avec succès');
  }

  public static async deleteOffer(req: Request, res: Response): Promise<Response> {
    const rawId = req.params.id;
    const id = (Array.isArray(rawId) ? rawId[0] : rawId) || '';
    const deleted = await dbManager.query<{ id: string; stockQuantity: string }>(
      `UPDATE "offers"
       SET "isAvailable" = false, "isFeatured" = false, "updatedAt" = NOW()
       WHERE "id"::text = $1 AND "isAvailable" = true
       RETURNING "id", "stockQuantity"::text AS "stockQuantity"`,
      [id]
    );

    if (!deleted.rowCount) {
      return sendError(res, `Offre '${id}' introuvable`, 404, 'OFFER_NOT_FOUND');
    }

    publishInventoryUpdated([{
      offerId: deleted.rows[0].id,
      stockQuantity: Number(deleted.rows[0].stockQuantity),
      isAvailable: false,
    }]);

    const storedOffer = AgroStore.offers.get(id);
    if (storedOffer) {
      storedOffer.isAvailable = false;
      storedOffer.updatedAt = new Date();
    }

    return sendSuccess(res, { id }, 'Offre supprimée du catalogue avec succès');
  }
}

function mapOffer(offer: Record<string, unknown>) {
  return {
    ...offer,
    stockQuantity: Number(offer.stockQuantity),
    retailPriceCdf: Number(offer.retailPriceCdf),
    retailMinQuantity: Number(offer.retailMinQuantity),
    wholesalePriceCdf: offer.wholesalePriceCdf == null ? undefined : Number(offer.wholesalePriceCdf),
    wholesaleMinQuantity: offer.wholesaleMinQuantity == null ? undefined : Number(offer.wholesaleMinQuantity),
    servicesOffered: Array.isArray(offer.servicesOffered) ? offer.servicesOffered : [],
  };
}

function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
