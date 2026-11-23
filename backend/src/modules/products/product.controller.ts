import { Request, Response } from 'express';
import { sendSuccess, sendError } from '../../common/response.js';
import { dbManager } from '../../database/client.js';

export class ProductController {
  public static async listProducts(req: Request, res: Response): Promise<Response> {
    const { category, search } = req.query;

    const result = await dbManager.query(
      `SELECT p."id", p."name", p."slug", p."description", p."standardUnit", p."scientificName",
              p."categoryId", c."name" AS "categoryName",
              COUNT(o."id") FILTER (WHERE o."isAvailable" AND u."id" IS NOT NULL)::int AS "offersCount",
              MIN(o."retailPriceCdf") FILTER (WHERE o."isAvailable" AND u."id" IS NOT NULL) AS "minPriceCdf",
              MAX(o."retailPriceCdf") FILTER (WHERE o."isAvailable" AND u."id" IS NOT NULL) AS "maxPriceCdf"
       FROM "products" p
       JOIN "categories" c ON c."id" = p."categoryId"
       LEFT JOIN "offers" o ON o."productId" = p."id"
       LEFT JOIN "seller_profiles" s ON s."id" = o."sellerId"
       LEFT JOIN "users" u ON u."id" = s."userId" AND u."isActive" = true
       WHERE ($1::text IS NULL OR c."slug" = $1 OR p."categoryId"::text = $1)
         AND ($2::text IS NULL OR p."name" ILIKE '%' || $2 || '%' OR p."description" ILIKE '%' || $2 || '%' OR p."scientificName" ILIKE '%' || $2 || '%')
       GROUP BY p."id", c."name"
       ORDER BY p."name"`,
      [typeof category === 'string' ? category : null, typeof search === 'string' ? search : null]
    );

    return sendSuccess(res, result.rows, 'Catalogue des produits communs récupéré avec succès', 200, {
      total: result.rows.length,
      strictIntermediary: true,
    });
  }

  public static async getProductBySlug(req: Request, res: Response): Promise<Response> {
    const rawSlug = req.params.slug;
    const slug = (Array.isArray(rawSlug) ? rawSlug[0] : rawSlug) || '';

    const productResult = await dbManager.query(
      `SELECT p."id", p."name", p."slug", p."description", p."standardUnit", p."scientificName",
              p."imageUrl", p."categoryId", c."name" AS "categoryName", c."slug" AS "categorySlug"
       FROM "products" p JOIN "categories" c ON c."id" = p."categoryId"
       WHERE p."slug" = $1 OR p."id"::text = $1 LIMIT 1`,
      [slug]
    );
    const product = productResult.rows[0];

    if (!product) {
      return sendError(res, `Produit agricole '${slug}' introuvable au catalogue`, 404, 'PRODUCT_NOT_FOUND');
    }

    const offers = await dbManager.query(
      `SELECT o."id", o."sellerId", s."businessName" AS "sellerName", s."sellerType",
              o."productId", p."name" AS "productName", c."name" AS "categoryName",
              o."unit", o."stockQuantity", o."isAvailable", o."retailPriceCdf",
              o."retailMinQuantity", o."wholesalePriceCdf", o."wholesaleMinQuantity",
              o."originProvince", o."originCity", o."qualityGrade", o."imageUrl",
              ARRAY_REMOVE(ARRAY_AGG(ss."title"), NULL) AS "servicesOffered"
       FROM "offers" o
       JOIN "seller_profiles" s ON s."id" = o."sellerId"
       JOIN "users" u ON u."id" = s."userId" AND u."isActive" = true
       JOIN "products" p ON p."id" = o."productId"
       JOIN "categories" c ON c."id" = p."categoryId"
       LEFT JOIN "offer_services" os ON os."offerId" = o."id"
       LEFT JOIN "seller_services" ss ON ss."id" = os."serviceId" AND ss."isActive"
       WHERE o."productId" = $1 AND o."isAvailable"
       GROUP BY o."id", s."id", p."name", c."name"
       ORDER BY o."createdAt" DESC`,
      [product.id]
    );

    return sendSuccess(res, {
      ...product,
      offers: offers.rows.map((offer) => ({
        ...offer,
        stockQuantity: Number(offer.stockQuantity),
        retailPriceCdf: Number(offer.retailPriceCdf),
        retailMinQuantity: Number(offer.retailMinQuantity),
        wholesalePriceCdf: offer.wholesalePriceCdf === null ? undefined : Number(offer.wholesalePriceCdf),
        wholesaleMinQuantity: offer.wholesaleMinQuantity === null ? undefined : Number(offer.wholesaleMinQuantity),
      })),
    });
  }
}
