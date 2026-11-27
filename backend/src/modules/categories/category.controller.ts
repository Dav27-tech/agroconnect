import { Request, Response } from 'express';
import { sendSuccess, sendError } from '../../common/response.js';
import { dbManager } from '../../database/client.js';

export class CategoryController {
  public static async listCategories(_req: Request, res: Response): Promise<Response> {
    const result = await dbManager.query(
      `SELECT c."id", c."name", c."slug", COALESCE(c."description", '') AS "description",
              COALESCE(c."icon", '') AS "icon",
              COUNT(DISTINCT p."id")::int AS "productsCount",
              COUNT(DISTINCT o."id") FILTER (WHERE o."isAvailable" AND u."id" IS NOT NULL)::int AS "offersCount",
              (COUNT(DISTINCT p."id") + COUNT(DISTINCT o."id") FILTER (WHERE o."isAvailable" AND u."id" IS NOT NULL))::int AS "itemCount"
       FROM "categories" c
       LEFT JOIN "products" p ON p."categoryId" = c."id"
       LEFT JOIN "offers" o ON o."productId" = p."id"
       LEFT JOIN "seller_profiles" s ON s."id" = o."sellerId"
       LEFT JOIN "users" u ON u."id" = s."userId" AND u."isActive" = true
       GROUP BY c."id"
       ORDER BY c."name"`
    );

    return sendSuccess(res, result.rows, 'Liste des catégories agricoles récupérée avec succès');
  }

  public static async getCategoryBySlug(req: Request, res: Response): Promise<Response> {
    const rawSlug = req.params.slug;
    const slug = (Array.isArray(rawSlug) ? rawSlug[0] : rawSlug) || '';
    const categoryResult = await dbManager.query(
      'SELECT "id", "name", "slug", "description", "icon" FROM "categories" WHERE "slug" = $1 OR "id"::text = $1 LIMIT 1',
      [slug]
    );
    const category = categoryResult.rows[0];

    if (!category) {
      return sendError(res, `Catégorie agricole '${slug}' introuvable`, 404, 'CATEGORY_NOT_FOUND');
    }

    const products = await dbManager.query(
      'SELECT "id", "name", "slug", "description", "standardUnit", "scientificName", "imageUrl", "categoryId" FROM "products" WHERE "categoryId" = $1 ORDER BY "name"',
      [category.id]
    );

    return sendSuccess(res, {
      ...category,
      products: products.rows,
    });
  }
}
